export function mergeTags(voucherTags: string[] | undefined, voucherId: string, reference: string | undefined, purchaseRecords: any[] = []): string[] {
  let allTags = voucherTags ? [...voucherTags] : []
  
  if (reference) {
    const pr = purchaseRecords.find(p => p.id === reference)
    if (pr && pr.tags) allTags.push(...pr.tags)
  }

  // A voucher might also have its own ID saved in a purchase record's voucherId
  const pr2 = purchaseRecords.find(p => p.voucherId === voucherId)
  if (pr2 && pr2.tags) allTags.push(...pr2.tags)

  return Array.from(new Set(allTags)).filter(Boolean)
}

export function mergePurchaseTags(purchaseTags: string[] | undefined, voucherId: string | undefined, vouchers: any[] = []): string[] {
  let allTags = purchaseTags ? [...purchaseTags] : []
  
  if (voucherId) {
    const v = vouchers.find(vc => vc.id === voucherId)
    if (v && v.tags) allTags.push(...v.tags)
  }

  return Array.from(new Set(allTags)).filter(Boolean)
}
