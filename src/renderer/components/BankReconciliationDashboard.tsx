import React, { useState, useMemo, useEffect } from 'react'
import type { Account, Voucher, VoucherLine, BankStatementLine, BankReconciliationRecord } from '../accounting/types'
import { Button, Input, Select, Badge, Card, KpiCard, Modal } from './design/DesignSystem'
import { calculateMatchScore } from '../services/bankReconciliationService'
import { recordModuleEvent } from '../services/auditService'
import type { AuditEvent } from '../data/auditTypes'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { formatDate } from '../utils'

interface BankReconciliationDashboardProps {
  open: boolean
  onClose: () => void
  reconciliationRecord: BankReconciliationRecord
  onSave: (updatedRecord: BankReconciliationRecord) => void
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  accountingEngine: AccountingEngine
  currency?: string
  dateFormat?: string
  onAuditEvent?: (event: AuditEvent) => void
}

export default function BankReconciliationDashboard({
  open,
  onClose,
  reconciliationRecord,
  onSave,
  accounts,
  vouchers,
  setVouchers,
  accountingEngine,
  currency = 'AED',
  dateFormat = 'DD/MM/YYYY',
  onAuditEvent,
}: BankReconciliationDashboardProps) {
  if (!open) return null

  // State management
  const [statementLines, setStatementLines] = useState<BankStatementLine[]>(() => reconciliationRecord.statementLines)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  
  // Left Panel filters
  const [leftSearch, setLeftSearch] = useState('')
  const [leftFilter, setLeftFilter] = useState<'All' | 'Unmatched' | 'Matched' | 'Adjusted'>('All')

  // Right Panel filters
  const [rightSearch, setRightSearch] = useState('')
  const [rightFilterType, setRightFilterType] = useState<string>('All')

  // Manual multi-select checkboxes for Right Panel
  const [selectedErpLineIds, setSelectedErpLineIds] = useState<string[]>([])
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({})

  // Track rejected match voucherLineIds per statementLineId
  const [rejectedMatchesMap, setRejectedMatchesMap] = useState<Record<string, string[]>>({})

  // Adjustment posting state
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjType, setAdjType] = useState<'Payment' | 'Receipt'>('Payment')
  const [adjAmount, setAdjAmount] = useState('0')
  const [adjAccount, setAdjAccount] = useState('')
  const [adjDesc, setAdjDesc] = useState('')
  const [adjReference, setAdjReference] = useState('')

  // Selected statement line helper
  const selectedLine = useMemo(() => {
    return statementLines.find(l => l.id === selectedLineId) || null
  }, [statementLines, selectedLineId])

  // Automatically select first line if none selected
  useEffect(() => {
    if (statementLines.length > 0 && !selectedLineId) {
      setSelectedLineId(statementLines[0].id)
    }
  }, [statementLines, selectedLineId])

  // ERP Bank Voucher Lines mapping
  const bankVoucherLines = useMemo(() => {
    const list: { voucher: Voucher; line: VoucherLine }[] = []
    const bankAccountObj = accounts.find(a => a.id === reconciliationRecord.bankAccountId)
    if (!bankAccountObj) return list

    for (const v of vouchers) {
      if (v.status !== 'Posted') continue
      for (const l of v.lines) {
        if (l.accountId === bankAccountObj.id) {
          list.push({ voucher: v, line: l })
        }
      }
    }
    return list
  }, [vouchers, accounts, reconciliationRecord.bankAccountId])

  // Index map of ERP lines for faster lookup
  const erpLineIdMap = useMemo(() => {
    const map = new Map<string, { voucher: Voucher; line: VoucherLine }>()
    for (const item of bankVoucherLines) {
      map.set(item.line.id, item)
    }
    return map
  }, [bankVoucherLines])

  // Matching engine suggestion for selected statement line
  const suggestedMatch = useMemo(() => {
    if (!selectedLine || selectedLine.status === 'Matched') return null

    const rejected = rejectedMatchesMap[selectedLine.id] || []
    let bestScore = 0
    let bestMatch: { voucher: Voucher; line: VoucherLine } | null = null

    // Find all already matched line IDs in other statement lines
    const alreadyMatchedIds = new Set<string>()
    for (const line of statementLines) {
      if (line.id !== selectedLine.id && line.status === 'Matched') {
        if (line.matchedVoucherLineId) alreadyMatchedIds.add(line.matchedVoucherLineId)
        if (line.matchedVoucherLineIds) {
          line.matchedVoucherLineIds.forEach(id => alreadyMatchedIds.add(id))
        }
        if (line.allocations) {
          line.allocations.forEach(a => alreadyMatchedIds.add(a.voucherLineId))
        }
      }
    }

    for (const item of bankVoucherLines) {
      if (alreadyMatchedIds.has(item.line.id)) continue
      if (rejected.includes(item.line.id)) continue

      const score = calculateMatchScore(selectedLine, item.voucher, item.line, rejected)
      if (score > bestScore) {
        bestScore = score
        bestMatch = item
      }
    }

    if (bestMatch && bestScore >= 80) {
      return {
        score: bestScore,
        item: bestMatch,
        reason: bestScore >= 95 ? 'Exact Match (Amount, Date & Reference)' : 'Suggested Match (Date Tolerance)',
      }
    }
    return null
  }, [selectedLine, bankVoucherLines, statementLines, rejectedMatchesMap])

  // Filtered statement lines (Left Panel)
  const filteredStatementLines = useMemo(() => {
    return statementLines.filter(line => {
      const q = leftSearch.toLowerCase()
      const matchesSearch =
        line.description.toLowerCase().includes(q) ||
        (line.reference && line.reference.toLowerCase().includes(q))
      
      const matchesFilter =
        leftFilter === 'All' ||
        (leftFilter === 'Unmatched' && line.status === 'Unmatched') ||
        (leftFilter === 'Matched' && line.status === 'Matched') ||
        (leftFilter === 'Adjusted' && line.status === 'Adjusted')

      return matchesSearch && matchesFilter
    })
  }, [statementLines, leftSearch, leftFilter])

  // Filtered ERP lines (Right Panel)
  const filteredErpLines = useMemo(() => {
    // Find all already matched line IDs
    const alreadyMatchedIds = new Set<string>()
    for (const line of statementLines) {
      if (line.status === 'Matched') {
        if (line.matchedVoucherLineId) alreadyMatchedIds.add(line.matchedVoucherLineId)
        if (line.matchedVoucherLineIds) {
          line.matchedVoucherLineIds.forEach(id => alreadyMatchedIds.add(id))
        }
        if (line.allocations) {
          line.allocations.forEach(a => alreadyMatchedIds.add(a.voucherLineId))
        }
      }
    }

    return bankVoucherLines.filter(item => {
      if (alreadyMatchedIds.has(item.line.id)) return false

      const q = rightSearch.toLowerCase()
      const matchesSearch =
        item.voucher.number.toLowerCase().includes(q) ||
        item.voucher.description.toLowerCase().includes(q) ||
        (item.voucher.reference && item.voucher.reference.toLowerCase().includes(q))

      const matchesType =
        rightFilterType === 'All' ||
        (rightFilterType === 'Debit' && item.line.type === 'Debit') ||
        (rightFilterType === 'Credit' && item.line.type === 'Credit')

      return matchesSearch && matchesType
    })
  }, [bankVoucherLines, statementLines, rightSearch, rightFilterType])

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const totalLines = statementLines.length
    const matchedLines = statementLines.filter(l => l.status === 'Matched')
    const unmatchedLines = statementLines.filter(l => l.status === 'Unmatched')
    const adjustedLines = statementLines.filter(l => l.status === 'Adjusted')

    const matchedAmount = matchedLines.reduce((sum, l) => sum + Math.abs(l.amount), 0)
    const remainingAmount = unmatchedLines.reduce((sum, l) => sum + Math.abs(l.amount), 0)

    // Calculate current ledger reconciled balance
    // Reconciled balance = statementOpeningBalance + sum of matched statement transaction values
    const reconciled = reconciliationRecord.statementOpeningBalance + statementLines
      .filter(l => l.status === 'Matched' || l.status === 'Adjusted')
      .reduce((sum, l) => sum + l.amount, 0)

    const difference = reconciliationRecord.statementClosingBalance - reconciled

    return {
      totalLines,
      matchedCount: matchedLines.length,
      unmatchedCount: unmatchedLines.length,
      adjustedCount: adjustedLines.length,
      matchedAmount,
      remainingAmount,
      reconciled,
      difference,
    }
  }, [statementLines, reconciliationRecord])

  // Setup initial checkbox state when statement line selection changes
  useEffect(() => {
    if (selectedLine) {
      if (selectedLine.matchedVoucherLineIds) {
        setSelectedErpLineIds(selectedLine.matchedVoucherLineIds)
        const allocs: Record<string, number> = {}
        if (selectedLine.allocations) {
          selectedLine.allocations.forEach(a => {
            allocs[a.voucherLineId] = a.amount
          })
        } else {
          selectedLine.matchedVoucherLineIds.forEach(id => {
            const item = erpLineIdMap.get(id)
            if (item) allocs[id] = item.line.amount
          })
        }
        setManualAllocations(allocs)
      } else if (selectedLine.matchedVoucherLineId) {
        setSelectedErpLineIds([selectedLine.matchedVoucherLineId])
        setManualAllocations({ [selectedLine.matchedVoucherLineId]: Math.abs(selectedLine.amount) })
      } else {
        setSelectedErpLineIds([])
        setManualAllocations({})
      }
    }
  }, [selectedLineId, erpLineIdMap])

  // Action: Accept matching suggestion
  const handleAcceptSuggestion = () => {
    if (!selectedLine || !suggestedMatch) return
    const matchedId = suggestedMatch.item.line.id
    
    setStatementLines(prev =>
      prev.map(l =>
        l.id === selectedLine.id
          ? {
              ...l,
              status: 'Matched',
              matchConfidence: suggestedMatch.score >= 95 ? 'High' : 'Medium',
              matchedVoucherLineId: matchedId,
              matchedVoucherLineIds: [matchedId],
              allocations: [{ voucherLineId: matchedId, amount: Math.abs(l.amount) }],
            }
          : l
      )
    )

    onAuditEvent?.(
      recordModuleEvent(
        'Property Bank Accounts',
        'Transfer',
        `Statement Line: ${selectedLine.id}`,
        selectedLine.id,
        `Auto-matched line ${selectedLine.description} to voucher ${suggestedMatch.item.voucher.number} (${suggestedMatch.reason})`
      )
    )

    // Select next unmatched line automatically
    const idx = statementLines.findIndex(l => l.id === selectedLine.id)
    const nextUnmatched = statementLines.slice(idx + 1).find(l => l.status === 'Unmatched')
    if (nextUnmatched) {
      setSelectedLineId(nextUnmatched.id)
    }
  }

  // Action: Reject matching suggestion
  const handleRejectSuggestion = () => {
    if (!selectedLine || !suggestedMatch) return
    const lineId = selectedLine.id
    const matchLineId = suggestedMatch.item.line.id

    setRejectedMatchesMap(prev => {
      const existing = prev[lineId] || []
      return { ...prev, [lineId]: [...existing, matchLineId] }
    })
  }

  // Action: Apply manual match selections
  const handleApplyManualMatch = () => {
    if (!selectedLine) return

    const totalAllocated = Object.values(manualAllocations).reduce((sum, val) => sum + val, 0)
    const targetAbs = Math.abs(selectedLine.amount)

    if (Math.abs(totalAllocated - targetAbs) > 0.01) {
      alert(`Allocated amount (${totalAllocated.toLocaleString()}) must match statement line absolute amount (${targetAbs.toLocaleString()})`)
      return
    }

    const allocs = selectedErpLineIds.map(id => ({
      voucherLineId: id,
      amount: manualAllocations[id] || 0,
    }))

    setStatementLines(prev =>
      prev.map(l =>
        l.id === selectedLine.id
          ? {
              ...l,
              status: 'Matched',
              matchConfidence: 'None',
              matchedVoucherLineId: selectedErpLineIds[0],
              matchedVoucherLineIds: selectedErpLineIds,
              allocations: allocs,
            }
          : l
      )
    )

    onAuditEvent?.(
      recordModuleEvent(
        'Property Bank Accounts',
        'Transfer',
        `Statement Line: ${selectedLine.id}`,
        selectedLine.id,
        `Manually matched statement line ${selectedLine.description} to ${selectedErpLineIds.length} vouchers`
      )
    )
  }

  // Action: Unmatch a matched statement line
  const handleUnmatchLine = (lineId: string) => {
    setStatementLines(prev =>
      prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              status: 'Unmatched',
              matchedVoucherLineId: undefined,
              matchedVoucherLineIds: [],
              allocations: [],
            }
          : l
      )
    )
  }

  // Action: Post adjustment modal launch
  const handleOpenAdjustment = () => {
    if (!selectedLine) return
    setAdjType(selectedLine.amount >= 0 ? 'Receipt' : 'Payment')
    setAdjAmount(String(Math.abs(selectedLine.amount)))
    setAdjDesc(selectedLine.description)
    setAdjReference(selectedLine.reference || '')
    setAdjustmentOpen(true)
  }

  const handlePostAdjustment = () => {
    if (!selectedLine) return
    const amt = Number(adjAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Adjustment amount must be positive')
      return
    }
    if (!adjAccount) {
      alert('Please select an offsetting account')
      return
    }

    // Process Adjustment Voucher
    const event = adjType === 'Payment' ? 'EXPENSE_PAID' : 'INCOME_RECEIVED'
    
    // Call processAccountingEvent to generate draft
    const draftResult = accountingEngine.processAccountingEvent(
      event,
      {
        amount: amt,
        date: selectedLine.date,
        description: adjDesc + ' (Reconciliation Adjustment)',
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        bankAccount: reconciliationRecord.bankAccountId,
        debitAccount: adjType === 'Payment' ? adjAccount : undefined,
        creditAccount: adjType === 'Receipt' ? adjAccount : undefined,
        referenceType: 'BankReconciliation',
        referenceId: reconciliationRecord.id,
        createdBy: 'user',
      },
      accounts,
      vouchers
    )

    if (!draftResult.success || !draftResult.voucher) {
      alert('Failed to create adjustment voucher: ' + draftResult.errors.map(e => e.message).join(', '))
      return
    }

    // Approve and Post Adjustment Voucher directly
    const approveResult = accountingEngine.approve(draftResult.voucher, 'user')
    const postResult = accountingEngine.post(approveResult.voucher!, 'user', accounts, vouchers)

    if (!postResult.success || !postResult.voucher) {
      alert('Failed to post adjustment voucher: ' + postResult.errors.map(e => e.message).join(', '))
      return
    }

    const postedVoucher = postResult.voucher
    const bankLine = postedVoucher.lines.find(l => l.accountId === reconciliationRecord.bankAccountId)
    if (!bankLine) {
      alert('Could not find corresponding bank ledger line in posted voucher.')
      return
    }

    // Save adjustment voucher
    setVouchers(prev => [postedVoucher, ...prev])

    // Match statement line directly to this new voucher line
    setStatementLines(prev =>
      prev.map(l =>
        l.id === selectedLine.id
          ? {
              ...l,
              status: 'Matched',
              matchConfidence: 'High',
              matchedVoucherLineId: bankLine.id,
              matchedVoucherLineIds: [bankLine.id],
              allocations: [{ voucherLineId: bankLine.id, amount: amt }],
            }
          : l
      )
    )

    setAdjustmentOpen(false)
    
    onAuditEvent?.(
      recordModuleEvent(
        'Property Bank Accounts',
        'Create',
        postedVoucher.number,
        postedVoucher.id,
        `Created and posted adjustment voucher ${postedVoucher.number} for unmatched line: ${selectedLine.description}`
      )
    )
  }

  // Toggle checklist select
  const handleToggleErpCheckbox = (lineId: string, itemAmount: number) => {
    setSelectedErpLineIds(prev => {
      const isSelected = prev.includes(lineId)
      if (isSelected) {
        const filtered = prev.filter(id => id !== lineId)
        setManualAllocations(alloc => {
          const next = { ...alloc }
          delete next[lineId]
          return next
        })
        return filtered
      } else {
        const nextIds = [...prev, lineId]
        setManualAllocations(alloc => ({
          ...alloc,
          [lineId]: itemAmount,
        }))
        return nextIds
      }
    })
  }

  // Complete reconciliation save handler
  const handleCompleteReconciliation = () => {
    if (Math.abs(metrics.difference) > 0.01) {
      alert('Difference must be zero before completing reconciliation.')
      return
    }

    const unmatchedCount = statementLines.filter(l => l.status === 'Unmatched').length
    if (unmatchedCount > 0) {
      alert('Please reconcile or adjust all statement lines first.')
      return
    }

    // Save reconciled state
    const updatedRecord: BankReconciliationRecord = {
      ...reconciliationRecord,
      statementLines,
      status: 'Reconciled',
      reconciledBalance: metrics.reconciled,
      updatedAt: new Date().toISOString(),
    }

    onSave(updatedRecord)
    
    onAuditEvent?.(
      recordModuleEvent(
        'Property Bank Accounts',
        'Update',
        reconciliationRecord.id,
        reconciliationRecord.id,
        `Successfully completed bank reconciliation run for statement ${reconciliationRecord.statementStartDate} to ${reconciliationRecord.statementEndDate}`
      )
    )

    onClose()
  }

  // Save as Draft
  const handleSaveDraft = () => {
    const updatedRecord: BankReconciliationRecord = {
      ...reconciliationRecord,
      statementLines,
      status: 'Draft',
      reconciledBalance: metrics.reconciled,
      updatedAt: new Date().toISOString(),
    }
    onSave(updatedRecord)
    onClose()
  }

  // Print summary report
  const handlePrintReport = () => {
    window.print()
  }

  const offsetAccountOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Offset Account --' },
      ...accounts
        .filter(a => a.id !== reconciliationRecord.bankAccountId)
        .map(a => ({ value: a.id, label: `${a.code} - ${a.name}` })),
    ]
  }, [accounts, reconciliationRecord.bankAccountId])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#F8FAFC',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
        }}
      >
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>Bank Reconciliation Workspace</span>
          <span className="text-secondary text-xs block" style={{ marginTop: 2 }}>
            Account Ledger: {accounts.find(a => a.id === reconciliationRecord.bankAccountId)?.name || reconciliationRecord.bankAccountId}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button size="sm" variant="secondary" onClick={handleSaveDraft}>Save Draft</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Exit Workspace</Button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT PANEL: Imported Statement Lines */}
        <div
          style={{
            width: '30%',
            borderRight: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
          }}
        >
          <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
              Imported Statement Lines ({filteredStatementLines.length})
            </span>
            <input
              type="text"
              placeholder="Search statement lines..."
              value={leftSearch}
              onChange={e => setLeftSearch(e.target.value)}
              className="input btn-sm"
              style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 4 }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              {(['All', 'Unmatched', 'Matched', 'Adjusted'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setLeftFilter(tab)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    fontWeight: 600,
                    border: 'none',
                    background: leftFilter === tab ? 'var(--primary)' : '#E2E8F0',
                    color: leftFilter === tab ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Statement Lines Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredStatementLines.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                No statement lines matching filters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredStatementLines.map(line => {
                  const isSelected = selectedLineId === line.id
                  return (
                    <div
                      key={line.id}
                      onClick={() => setSelectedLineId(line.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>{line.date}</span>
                        <Badge variant={line.status === 'Matched' ? 'success' : line.status === 'Adjusted' ? 'warning' : 'neutral'}>
                          {line.status}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 4, wordBreak: 'break-word' }}>
                        {line.description}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>Ref: {line.reference || '—'}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: line.amount >= 0 ? '#10B981' : '#EF4444' }}>
                          {line.amount >= 0 ? '+' : ''}{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL: Matching Workspace */}
        <div
          style={{
            flex: 1,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: '#F1F5F9',
            gap: 16,
          }}
        >
          {selectedLine ? (
            <>
              {/* Highlight Statement Detail Card */}
              <Card title="Statement Line Details">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Description</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{selectedLine.description}</span>
                  </div>
                  <div>
                    <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Date</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{selectedLine.date}</span>
                  </div>
                  <div>
                    <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Amount</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: selectedLine.amount >= 0 ? '#10B981' : '#EF4444' }}>
                      {currency} {selectedLine.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </Card>

              {/* suggested Match Engine Output Card */}
              {selectedLine.status === 'Unmatched' && suggestedMatch && (
                <div style={{ border: '2px dashed #10B981', background: '#ECFDF5', padding: 16, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <Badge variant="success">{suggestedMatch.score}% Confidence</Badge>
                      <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: '#065F46' }}>
                        {suggestedMatch.reason}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" variant="primary" onClick={handleAcceptSuggestion}>Accept Match</Button>
                      <Button size="sm" variant="ghost" onClick={handleRejectSuggestion}>Reject</Button>
                    </div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid #A7F3D0', borderRadius: 6, background: '#FFFFFF' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>Voucher</span>
                        <span style={{ fontWeight: 600 }}>{suggestedMatch.item.voucher.number}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>Description</span>
                        <span style={{ fontWeight: 600 }}>{suggestedMatch.item.voucher.description}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>Amount</span>
                        <span style={{ fontWeight: 600 }}>{currency} {Math.abs(suggestedMatch.item.line.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Match State: Matched Information Display */}
              {selectedLine.status === 'Matched' && (
                <div style={{ border: '1px solid #10B981', background: '#ECFDF5', padding: 16, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <Badge variant="success">Reconciled & Linked</Badge>
                      <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: '#065F46' }}>
                        Linked to {selectedLine.matchedVoucherLineIds?.length || 1} ERP general ledger lines.
                      </span>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => handleUnmatchLine(selectedLine.id)}>Unmatch & Release</Button>
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(selectedLine.allocations || []).map((alloc, idx) => {
                      const item = erpLineIdMap.get(alloc.voucherLineId)
                      return (
                        <div key={idx} style={{ padding: 8, border: '1px solid #A7F3D0', borderRadius: 6, background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{item?.voucher.number || 'Voucher'}</span> · {item?.voucher.description || 'Description'}
                          </div>
                          <div style={{ fontWeight: 700 }}>
                            Allocated: {currency} {alloc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Manual Matching Controls panel */}
              {selectedLine.status === 'Unmatched' && (
                <Card title="Manual Matching / Allocations Workbench">
                  {selectedErpLineIds.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                      To match manually, choose one or more posted bank ledger items from the **ERP Transactions** panel on the right.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedErpLineIds.map(lineId => {
                          const item = erpLineIdMap.get(lineId)
                          if (!item) return null
                          return (
                            <div
                              key={lineId}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 10,
                                border: '1px solid #CBD5E1',
                                borderRadius: 6,
                                background: '#F8FAFC',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{item.voucher.number}</span>
                                <span style={{ fontSize: 11, color: '#64748B' }}>{item.voucher.description}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#64748B' }}>Voucher Amount: {currency} {Math.abs(item.line.amount).toLocaleString()}</span>
                                <input
                                  type="number"
                                  placeholder="Allocation"
                                  value={manualAllocations[lineId] || ''}
                                  onChange={e => {
                                    const val = Number(e.target.value)
                                    setManualAllocations(prev => ({
                                      ...prev,
                                      [lineId]: val,
                                    }))
                                  }}
                                  style={{ width: 100, padding: 4, fontSize: 12, border: '1px solid #CBD5E1', borderRadius: 4 }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Manual Matching Verification Summary */}
                      <div
                        style={{
                          borderTop: '1px solid #E2E8F0',
                          paddingTop: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: 13 }}>
                          <span>Target: <strong>{currency} {Math.abs(selectedLine.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                          <span style={{ marginLeft: 16 }}>
                            Allocated:{' '}
                            <strong>
                              {currency}{' '}
                              {Object.values(manualAllocations)
                                .reduce((s, v) => s + v, 0)
                                .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </strong>
                          </span>
                        </div>
                        <Button size="sm" variant="primary" onClick={handleApplyManualMatch}>Apply Match</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Adjustment Posting / Action Panel */}
              {selectedLine.status === 'Unmatched' && (
                <Card title="Ledger Exceptions & Adjustments">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      Statement transaction details do not correspond to any entries recorded in the internal ledger?
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleOpenAdjustment}>+ Post Adjustment</Button>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
              Select a statement line from the left panel to begin.
            </div>
          )}
        </div>

        {/* RIGHT PANEL: ERP Ledger Transactions */}
        <div
          style={{
            width: '35%',
            borderLeft: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
          }}
        >
          <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
              ERP General Ledger Transactions ({filteredErpLines.length})
            </span>
            <input
              type="text"
              placeholder="Search ERP lines..."
              value={rightSearch}
              onChange={e => setRightSearch(e.target.value)}
              className="input btn-sm"
              style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 4 }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              {(['All', 'Debit', 'Credit'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightFilterType(tab)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    fontWeight: 600,
                    border: 'none',
                    background: rightFilterType === tab ? 'var(--primary)' : '#E2E8F0',
                    color: rightFilterType === tab ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {tab}s
                </button>
              ))}
            </div>
          </div>

          {/* ERP Lines List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredErpLines.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                No active matching ledger entries found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredErpLines.map(item => {
                  const isChecked = selectedErpLineIds.includes(item.line.id)
                  const isDisabled = selectedLine?.status === 'Matched'
                  return (
                    <div
                      key={item.line.id}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #E2E8F0',
                        background: isChecked ? '#F0FDFA' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => handleToggleErpCheckbox(item.line.id, Math.abs(item.line.amount))}
                        style={{ marginTop: 4, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{item.voucher.number}</span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>{item.voucher.date}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>{item.voucher.description}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', background: '#F1F5F9', borderRadius: 4, color: '#475569' }}>
                            {item.line.type}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                            {currency} {Math.abs(item.line.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SUMMARY: Totals & Reconcile Triggers */}
      <div
        style={{
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Matched lines</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
              {metrics.matchedCount} / {metrics.totalLines} lines
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Reconciled Balance</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
              {currency} {metrics.reconciled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Statement Closing Balance</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
              {currency} {reconciliationRecord.statementClosingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Unreconciled Difference</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: Math.abs(metrics.difference) > 0.01 ? '#EF4444' : '#10B981' }}>
              {currency} {metrics.difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={handlePrintReport}>Export Report</Button>
          <Button variant="primary" onClick={handleCompleteReconciliation}>Complete Reconciliation</Button>
        </div>
      </div>

      {/* Post Adjustment Dialogue Modal */}
      {adjustmentOpen && (
        <Modal
          open={adjustmentOpen}
          onClose={() => setAdjustmentOpen(false)}
          title="Create Adjustment Transaction"
          footer={
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setAdjustmentOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handlePostAdjustment}>Post Adjustment</Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 400 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select
                label="Adjustment Type"
                value={adjType}
                onChange={e => setAdjType(e.target.value as any)}
                options={[{ value: 'Payment', label: 'Payment (Expense/Fee)' }, { value: 'Receipt', label: 'Receipt (Income)' }]}
              />
              <Input
                label={`Amount (${currency})`}
                type="number"
                value={adjAmount}
                onChange={e => setAdjAmount(e.target.value)}
              />
            </div>
            <Select
              label="Offset Account"
              value={adjAccount}
              onChange={e => setAdjAccount(e.target.value)}
              options={offsetAccountOptions}
            />
            <Input
              label="Description"
              value={adjDesc}
              onChange={e => setAdjDesc(e.target.value)}
            />
            <Input
              label="Reference"
              value={adjReference}
              onChange={e => setAdjReference(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
