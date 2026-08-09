export function mergeTags(voucherTags: string[] | undefined, voucherId: string, reference: string | undefined, propTransactions: any[] = [], propExpenses: any[] = [], pdcCheques: any[] = [], securityDeposits: any[] = []): string[] {
  let allTags = voucherTags ? [...voucherTags] : []
  
  const txnId1 = reference
  const txnId2 = voucherId.startsWith('vch-exp-') ? voucherId.replace('vch-exp-', '') : voucherId.replace('vch-', '')

  const txn = propTransactions.find(t => t.id === txnId1 || t.id === txnId2)
  if (txn && txn.tags) allTags.push(...txn.tags)
  
  const exp = propExpenses.find(e => e.id === txnId1 || e.id === txnId2)
  if (exp && exp.tags) allTags.push(...exp.tags)
  
  const pdc = pdcCheques.find(p => p.id === txnId1 || p.id === txnId2)
  if (pdc && pdc.tags) allTags.push(...pdc.tags)

  if (txnId1 || txnId2) {
    for (const sd of securityDeposits) {
      if (sd.transactions) {
        const tx = sd.transactions.find((t: any) => t.id === txnId1 || t.id === txnId2)
        if (tx && tx.tags) allTags.push(...tx.tags)
      }
    }
  }

  return Array.from(new Set(allTags)).filter(Boolean)
}
