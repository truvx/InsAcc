import { jsPDF } from 'jspdf'

function generatePdfCoverPage(doc: any, title: string, subtitle: string, periodLabel: string, currency: string, totalTxns?: number) {
  doc.setFillColor(15, 76, 53)
  doc.rect(0, 0, 210, 110, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.text('INSACC', 105, 45, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Intelligent Asset & Investment Accounting', 105, 55, { align: 'center' })

  doc.setDrawColor(251, 192, 45)
  doc.setLineWidth(1)
  doc.line(0, 70, 210, 70)

  doc.setTextColor(251, 192, 45)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), 105, 85, { align: 'center' })

  if (subtitle) {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, 105, 95, { align: 'center' })
  }

  doc.setTextColor(15, 76, 53)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  
  let myY = 130
  const labelX = 50
  const valX = 60
  
  doc.text('Reporting Period', labelX, myY, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(periodLabel, valX, myY)
  
  myY += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Currency', labelX, myY, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(currency, valX, myY)

  if (totalTxns !== undefined) {
    myY += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Total Records', labelX, myY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(String(totalTxns), valX, myY)
  }
}

try {
  const doc = new jsPDF()
  generatePdfCoverPage(doc, 'Lease Management', 'List of all property leases', 'All Time', 'AED', 0)
  console.log("Cover page generation succeeded")
} catch (e) {
  console.error("Cover page error:", e)
}
