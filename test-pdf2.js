import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

try {
  const doc = new jsPDF()
  let y = 15
  autoTable(doc, {
    startY: y,
    head: [['Account', 'Amount']],
    body: [
      [{ content: 'test', styles: { paddingLeft: 14, fontStyle: 'bold' } }, '100']
    ]
  })
  console.log("Success")
} catch (e) {
  console.error("Error generating PDF:", e.message)
}
