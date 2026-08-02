import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

try {
  const doc = new jsPDF()
  doc.setFillColor(15, 76, 53) // from generatePdfCoverPage
  
  // Left column
  autoTable(doc, {
    startY: 15,
    margin: { left: 14, right: 100 },
    head: [[
      { content: 'Revenue', colSpan: 2, styles: { halign: 'left', fillColor: [255, 255, 255], textColor: '#22C55E', fontStyle: 'bold', fontSize: 12 } }
    ], ['Account', 'Amount']],
    body: [],
    foot: [['Total', '0.00']],
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [248, 251, 249], textColor: [100, 116, 139], fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: '#22C55E', fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 255, 255] },
  })
  
  const leftY = doc.lastAutoTable.finalY

  // Right column
  autoTable(doc, {
    startY: 15,
    margin: { left: 124, right: 14 },
    head: [[
      { content: 'Expenses', colSpan: 2, styles: { halign: 'left', fillColor: [255, 255, 255], textColor: '#EF4444', fontStyle: 'bold', fontSize: 12 } }
    ], ['Account', 'Amount']],
    body: [],
    foot: [['Total', '0.00']],
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [248, 251, 249], textColor: [100, 116, 139], fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: '#EF4444', fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 255, 255] },
  })
  
  let y = Math.max(doc.lastAutoTable.finalY, leftY) + 15
  
  doc.setFontSize(12)
  doc.setTextColor(15, 76, 53)
  doc.setFont('helvetica', 'bold')
  doc.text(`Net Income: AED 0.00`, 14, y)
  
  console.log("Success")
} catch (e) {
  console.error("Error:", e)
}
