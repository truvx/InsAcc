import { jsPDF } from 'jspdf'

try {
  const doc = new jsPDF()
  doc.text(undefined as any, 10, 10)
  console.log("Success")
} catch (e) {
  console.error("jsPDF error:", e)
}
