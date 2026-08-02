import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

try {
  const doc = new jsPDF()
  autoTable(doc, {
    startY: 20,
    head: [['A', 'B']],
    body: [],
    theme: 'grid'
  })
  console.log("autoTable succeeded with empty body")
} catch (e) {
  console.error("autoTable failed:", e)
}
