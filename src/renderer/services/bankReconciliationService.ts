import type { BankStatementLine, Voucher, VoucherLine } from '../accounting/types'

function generateId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `stmt-${ts}-${rand}`
}

/**
 * Parses an OFX statement file string and returns statement lines.
 */
export function parseOFXStatement(ofxContent: string): Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[] {
  const lines: Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[] = []
  
  // Extract all <STMTTRN> blocks
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
  let match
  
  while ((match = transactionRegex.exec(ofxContent)) !== null) {
    const block = match[1]
    
    // Parse tag contents using simple regex
    const amountMatch = /<TRNAMT>([\d.-]+)/.exec(block)
    const dateMatch = /<DTPOSTED>(\d{8})/.exec(block)
    const nameMatch = /<NAME>([^<\r\n]+)/.exec(block)
    const fitIdMatch = /<FITID>([^<\r\n]+)/.exec(block)
    const checkNumMatch = /<CHECKNUM>([^<\r\n]+)/.exec(block)
    
    if (amountMatch && dateMatch && nameMatch) {
      const amount = parseFloat(amountMatch[1])
      
      // Convert DTPOSTED YYYYMMDD to YYYY-MM-DD
      const dateStr = dateMatch[1]
      const year = dateStr.slice(0, 4)
      const month = dateStr.slice(4, 6)
      const day = dateStr.slice(6, 8)
      const date = `${year}-${month}-${day}`
      
      lines.push({
        id: fitIdMatch ? fitIdMatch[1].trim() : generateId(),
        date,
        amount,
        description: nameMatch[1].trim(),
        reference: checkNumMatch ? checkNumMatch[1].trim() : undefined,
      })
    }
  }
  
  return lines
}

/**
 * Parses a standard CSV statement file string.
 */
export function parseCSVStatement(
  csvContent: string,
  mappings: { dateCol: number; amountCol: number; descCol: number; refCol?: number }
): Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[] {
  const lines: Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[] = []
  const rows = csvContent.split(/\r?\n/)
  
  for (let i = 1; i < rows.length; i++) { // Skip header row
    const row = rows[i].trim()
    if (!row) continue
    
    // Basic CSV cell split (handles commas)
    const cells = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    
    const dateRaw = cells[mappings.dateCol]?.replace(/"/g, '').trim()
    const amountRaw = cells[mappings.amountCol]?.replace(/"/g, '').trim()
    const descRaw = cells[mappings.descCol]?.replace(/"/g, '').trim()
    const refRaw = mappings.refCol !== undefined ? cells[mappings.refCol]?.replace(/"/g, '').trim() : undefined
    
    if (dateRaw && amountRaw && descRaw) {
      const amount = parseFloat(amountRaw)
      if (isNaN(amount)) continue
      
      // Standardize date input YYYY-MM-DD or DD/MM/YYYY or MM/DD/YYYY
      let date = dateRaw
      if (dateRaw.includes('/')) {
        const parts = dateRaw.split('/')
        if (parts[0].length === 4) {
          date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        } else if (parts[2].length === 4) {
          // Assume DD/MM/YYYY
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }
      
      lines.push({
        id: generateId(),
        date,
        amount,
        description: descRaw,
        reference: refRaw,
      })
    }
  }
  
  return lines
}

/**
 * Calculates a match score between a statement transaction line and a general ledger voucher line.
 */
export function calculateMatchScore(
  stmtLine: { date: string; amount: number; description: string; reference?: string },
  voucher: Voucher,
  vLine: VoucherLine,
  rejectedVoucherLineIds?: string[]
): number {
  if (rejectedVoucherLineIds && rejectedVoucherLineIds.includes(vLine.id)) {
    return 0 // Hard rejection on previously rejected match
  }

  // Amount must match exactly (accounting absolute values matching debit/credit polarity)
  const stmtAbs = Math.abs(stmtLine.amount)
  const vLineAbs = Math.abs(vLine.amount)
  if (Math.abs(stmtAbs - vLineAbs) > 0.001) {
    return 0 // Hard rejection on amount mismatch
  }

  // Polarity match (Deposit -> Debit, Withdrawal -> Credit)
  const isDeposit = stmtLine.amount >= 0
  const isDebitLine = vLine.type === 'Debit'
  if (isDeposit !== isDebitLine) {
    return 0 // Hard rejection on polarity mismatch
  }
  
  let score = 50 // Base score for exact amount & polarity match
  
  // Date match calculation
  const stmtTime = new Date(stmtLine.date).getTime()
  const vTime = new Date(voucher.date).getTime()
  const diffDays = Math.abs(stmtTime - vTime) / (1000 * 60 * 60 * 24)
  
  if (diffDays === 0) {
    score += 30
  } else if (diffDays <= 3) {
    score += 15
  } else if (diffDays <= 7) {
    score += 5
  } else {
    return 0 // Rejects matches separated by more than 7 days
  }
  
  // Voucher Number matching
  if (stmtLine.reference && voucher.number) {
    const stmtRef = stmtLine.reference.toLowerCase()
    const vNum = voucher.number.toLowerCase()
    if (stmtRef.includes(vNum) || vNum.includes(stmtRef)) {
      score += 20
    }
  }
  
  // Reference matching
  if (stmtLine.reference && voucher.reference) {
    const stmtRef = stmtLine.reference.toLowerCase()
    const vRef = voucher.reference.toLowerCase()
    if (stmtRef.includes(vRef) || vRef.includes(stmtRef)) {
      score += 20
    }
  }

  // Description similarity
  const stmtDesc = stmtLine.description.toLowerCase()
  const vDesc = (voucher.description + ' ' + (vLine.narration ?? '')).toLowerCase()
  if (stmtDesc.includes(vDesc) || vDesc.includes(stmtDesc)) {
    score += 10
  }
  
  return Math.min(score, 100)
}

/**
 * Runs the matching algorithm for an imported statement against active bank ledger voucher lines.
 */
export function autoMatchStatement(
  statementLines: Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[],
  vouchers: Voucher[],
  bankAccountId: string,
  rejectedMatchesMap?: Record<string, string[]> // maps stmtLine.id to rejected voucherLine.ids
): BankStatementLine[] {
  const result: BankStatementLine[] = []
  
  // Extract all lines in active posted vouchers linked to this bank account
  const bankVoucherLines: { voucher: Voucher; line: VoucherLine }[] = []
  for (const v of vouchers) {
    if (v.status !== 'Posted') continue
    for (const l of v.lines) {
      if (l.accountId === bankAccountId) {
        bankVoucherLines.push({ voucher: v, line: l })
      }
    }
  }
  
  // Tracking used ledger line IDs to avoid double matching
  const matchedLedgerLineIds = new Set<string>()
  
  for (const stmt of statementLines) {
    let bestScore = 0
    let bestMatchLineId: string | undefined
    const rejected = rejectedMatchesMap?.[stmt.id] || []
    
    for (const item of bankVoucherLines) {
      if (matchedLedgerLineIds.has(item.line.id)) continue
      
      const score = calculateMatchScore(stmt, item.voucher, item.line, rejected)
      if (score > bestScore) {
        bestScore = score
        bestMatchLineId = item.line.id
      }
    }
    
    let confidence: 'High' | 'Medium' | 'None' = 'None'
    let status: 'Unmatched' | 'Matched' = 'Unmatched'
    let matchedLineId: string | undefined
    
    if (bestScore >= 95 && bestMatchLineId) {
      confidence = 'High'
      status = 'Matched'
      matchedLineId = bestMatchLineId
      matchedLedgerLineIds.add(bestMatchLineId)
    } else if (bestScore >= 80 && bestMatchLineId) {
      confidence = 'Medium'
      // Medium match is suggested but not auto-selected
      matchedLineId = bestMatchLineId
    }
    
    result.push({
      ...stmt,
      matchedVoucherLineId: matchedLineId,
      matchedVoucherLineIds: matchedLineId ? [matchedLineId] : [],
      matchConfidence: confidence,
      status,
    })
  }
  
  return result
}
