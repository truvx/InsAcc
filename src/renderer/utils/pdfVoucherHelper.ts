import { jsPDF } from 'jspdf'
import type { Voucher, Account } from '../accounting/types'


export function exportVoucherToPDF(voucher: Voucher, accounts: Account[], currency: string = 'AED') {
  const doc = new jsPDF()

  // Title
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(17, 24, 39)
  doc.text('INSACC VOUCHER', 20, 25)

  // Subtitle
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('INVESTMENT / PROPERTY ACCOUNTING SYSTEM', 20, 31)

  // Voucher Number & Date
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(10, 10, 111)
  doc.text(voucher.number, 190 - doc.getTextWidth(voucher.number), 25)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(75, 85, 99)
  const dateStr = `Date: ${voucher.date}`
  doc.text(dateStr, 190 - doc.getTextWidth(dateStr), 31)

  // Decorative header line
  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(0.5)
  doc.line(20, 36, 190, 36)

  // Info details grid
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text('VOUCHER TYPE', 20, 46)
  doc.text('STATUS', 75, 46)
  doc.text('CREATED BY', 130, 46)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text(voucher.type, 20, 52)
  doc.text(voucher.status, 75, 52)
  doc.text(voucher.createdBy, 130, 52)

  const isJournal = voucher.type === 'Journal'

  if (voucher.type === 'Receipt') {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175)
    doc.text('PAYMENT MODE', 20, 62)
    doc.text('CHANNEL', 75, 62)
    doc.text('REF NUMBER', 130, 62)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(17, 24, 39)
    doc.text(voucher.paymentMode || 'Unknown', 20, 68)
    doc.text(voucher.paymentChannel || 'Unknown', 75, 68)
    doc.text(voucher.paymentReference || '—', 130, 68)
  } else if (voucher.type === 'Payment') {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175)
    doc.text('PAYMENT MODE', 20, 62)
    doc.text('REF NUMBER', 75, 62)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(17, 24, 39)
    doc.text(voucher.paymentMode || 'Unknown', 20, 68)
    doc.text(voucher.paymentReference || '—', 75, 68)
  }

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text('DESCRIPTION', 20, isJournal ? 62 : 78)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  // Support description wrapping
  const splitDesc = doc.splitTextToSize(voucher.description, 170)
  const descY = isJournal ? 68 : 84
  doc.text(splitDesc, 20, descY)

  let y = descY + (splitDesc.length * 6)

  if (voucher.reference) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175)
    doc.text('REFERENCE', 20, y)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(17, 24, 39)
    doc.text(voucher.reference, 20, y + 6)
    y += 16
  }

  // Draw table header
  y += 10
  doc.setFillColor(243, 244, 246)
  doc.rect(20, y, 170, 8, 'F')
  doc.setDrawColor(229, 231, 235)
  doc.rect(20, y, 170, 8, 'S')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(55, 65, 81)
  doc.text('ACCOUNT', 24, y + 5.5)
  doc.text('DEBIT', 95, y + 5.5)
  doc.text('CREDIT', 130, y + 5.5)
  doc.text('NARRATION', 160, y + 5.5)

  y += 8
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)

  voucher.lines.forEach((line) => {
    const acct = accounts.find(a => a.id === line.accountId)
    const acctName = acct ? `${acct.code} — ${acct.name}` : line.accountId
    const splitAcct = doc.splitTextToSize(acctName, 70)
    const splitNarration = doc.splitTextToSize(line.narration || '', 30)

    const rowHeight = Math.max(splitAcct.length, splitNarration.length) * 5 + 4
    
    // Draw row boundaries
    doc.rect(20, y, 170, rowHeight, 'S')

    doc.text(splitAcct, 24, y + 5)
    const debitText = line.type === 'Debit' ? `${currency} ${line.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—'
    const creditText = line.type === 'Credit' ? `${currency} ${line.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—'
    doc.text(debitText, 95, y + 5)
    doc.text(creditText, 130, y + 5)
    doc.text(splitNarration, 160, y + 5)

    y += rowHeight
  })

  // Signatures
  y += 30
  doc.setDrawColor(156, 163, 175)
  doc.line(20, y, 65, y)
  doc.line(82.5, y, 127.5, y)
  doc.line(145, y, 190, y)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  doc.text('Prepared By', 32, y + 5)
  doc.text('Reviewed By', 95, y + 5)
  doc.text('Authorized Signatory', 152, y + 5)

  doc.save(`Voucher_${voucher.number}.pdf`)
}
