export function mergeTxnTags(txnTags: string[] | undefined, txnId: string, vouchers: any[]): string[] {
  let allTags = txnTags ? [...txnTags] : []
  
  let v = vouchers.find(vc => vc.reference === txnId)
  if (!v) v = vouchers.find(vc => vc.id === txnId)
  if (!v) v = vouchers.find(vc => vc.id === `vch-exp-${txnId}`)
  if (!v) v = vouchers.find(vc => vc.id === `vch-${txnId}`)
  
  if (v && v.tags) {
    allTags.push(...v.tags)
  }

  return Array.from(new Set(allTags)).filter(Boolean)
}
