import fs from 'fs'
import path from 'path'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const doc = new jsPDF()

autoTable(doc, {
  startY: 10,
  head: [
    [{ content: `Cash - Debits: $100 | Credits: $0`, colSpan: 8, styles: { halign: 'left', fillColor: [15, 76, 53], textColor: [255, 255, 255] } }],
    ['Date', 'Voucher', 'Reference', 'Type', 'Account', 'Description', 'Debit', 'Credit']
  ],
  body: [
    ['01/01/2026', 'V001', '-', 'Receipt', 'Cash', 'Sale', '100', '']
  ],
  theme: 'grid',
  styles: { fontSize: 8 },
  headStyles: { fillColor: [248, 251, 249], textColor: [15, 76, 53], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 251, 249] },
})

fs.writeFileSync('test.pdf', Buffer.from(doc.output('arraybuffer')))
console.log('PDF generated')
