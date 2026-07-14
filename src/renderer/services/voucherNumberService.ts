import type { Voucher, VoucherType } from '../accounting/types'

export type VoucherNumberType = VoucherType | 'Purchase'

export class VoucherNumberService {
  private static sessionGenerated = new Set<string>()

  /**
   * Clears the session-level generation cache (useful for tests or refresh)
   */
  public static clearSessionCache() {
    this.sessionGenerated.clear()
  }

  /**
   * Automatically determines the number type (Purchase vs Payment vs Receipt vs Journal)
   */
  public static getNumberType(
    type: VoucherType,
    description: string,
    lines: { referenceType?: string }[] = [],
    reference?: string
  ): VoucherNumberType {
    if (
      lines.some(l => l.referenceType === 'Purchase') ||
      description.toLowerCase().startsWith('purchase:') ||
      description.toLowerCase().includes('purchase record') ||
      (reference && reference.toLowerCase().includes('pur-'))
    ) {
      return 'Purchase'
    }
    return type
  }

  /**
   * Returns the prefix for the voucher number type
   */
  public static getPrefix(type: VoucherNumberType): string {
    switch (type) {
      case 'Purchase':
        return 'PUR'
      case 'Payment':
        return 'PV'
      case 'Receipt':
        return 'RV'
      case 'Journal':
        return 'JV'
      case 'Contra':
        return 'CV'
      default:
        return 'JV'
    }
  }

  /**
   * Generates the next unique sequential voucher number of a given type and year
   */
  public static generateNextNumber(
    type: VoucherType,
    dateStr: string,
    existingVouchers: Voucher[],
    isPurchaseExplicit?: boolean
  ): string {
    const d = new Date(dateStr)
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear()

    let numType: VoucherNumberType = type
    if (isPurchaseExplicit) {
      numType = 'Purchase'
    }

    const prefix = this.getPrefix(numType)
    const pattern = `${prefix}-${year}-`

    // Step 1: Scan existing vouchers for the highest sequence number of this prefix and year
    let maxSeq = 0
    for (const v of existingVouchers) {
      if (v.number && v.number.startsWith(pattern)) {
        const seqStr = v.number.slice(pattern.length)
        const seq = parseInt(seqStr, 10)
        if (!isNaN(seq)) {
          maxSeq = Math.max(maxSeq, seq)
        }
      }
    }

    // Step 2: Propose the next sequential number
    let nextSeq = maxSeq + 1
    let proposedNumber = `${prefix}-${year}-${String(nextSeq).padStart(6, '0')}`

    // Step 3: Concurrency protection — loop until we find a number that has not been used or generated in this session
    while (
      existingVouchers.some(v => v.number === proposedNumber) ||
      this.sessionGenerated.has(proposedNumber)
    ) {
      nextSeq++
      proposedNumber = `${prefix}-${year}-${String(nextSeq).padStart(6, '0')}`
    }

    // Add to session cache to prevent duplicates generated in quick succession
    this.sessionGenerated.add(proposedNumber)
    return proposedNumber
  }

  /**
   * Detects duplicate voucher numbers and repairs them on startup
   */
  public static repairDuplicateVouchers(vouchers: Voucher[]): Voucher[] {
    if (!vouchers || vouchers.length === 0) return vouchers

    const seenNumbers = new Set<string>()
    const repairedVouchers: Voucher[] = []
    let modified = false

    // We process the vouchers in chronological order (oldest first) so that the older ones keep their original number,
    // and only the duplicates (which were created later) get bumped to the next sequential numbers.
    const sorted = [...vouchers].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    for (const v of sorted) {
      if (!v.number) {
        // Automatically generate missing voucher number
        const year = new Date(v.date).getFullYear()
        const isPurchase = this.getNumberType(v.type, v.description, v.lines, v.reference) === 'Purchase'
        const nextNum = this.generateNextNumber(v.type, v.date, repairedVouchers, isPurchase)
        repairedVouchers.push({ ...v, number: nextNum })
        seenNumbers.add(nextNum)
        modified = true
      } else if (seenNumbers.has(v.number)) {
        // Duplicate voucher number found! Generate the next sequence number.
        const isPurchase = v.number.startsWith('PUR-') || this.getNumberType(v.type, v.description, v.lines, v.reference) === 'Purchase'
        const nextNum = this.generateNextNumber(v.type, v.date, repairedVouchers, isPurchase)
        console.warn(`Repaired duplicate voucher: ID ${v.id} from "${v.number}" to "${nextNum}"`)
        repairedVouchers.push({ ...v, number: nextNum })
        seenNumbers.add(nextNum)
        modified = true
      } else {
        repairedVouchers.push(v)
        seenNumbers.add(v.number)
      }
    }

    return modified ? repairedVouchers : vouchers
  }
}
