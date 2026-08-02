import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

try {
  const doc = new jsPDF()
  let y = 15
  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'Revenue', colSpan: 2, styles: { halign: 'left', fillColor: [255, 255, 255], textColor: '#22A45D', fontStyle: 'bold', fontSize: 12 } }
    ], ['Account', 'Amount']],
    body: [],
    foot: [['Total', '100']],
  })
  console.log("leftY:", doc.lastAutoTable?.finalY)
} catch (e) {
  console.error("Error generating PDF:", e)
}
