import { exportTableData } from './src/renderer/services/reportExportService'

async function runTest() {
  try {
    const format = 'pdf'
    const columns = ['Lease No', 'Property', 'Unit', 'Tenant', 'Start Date', 'End Date', 'Rental Value', 'Status']
    const rows: string[][] = []
    const currency = 'AED'
    
    console.log("Calling exportTableData...")
    await exportTableData({
      format,
      title: 'Lease Management',
      subtitle: 'List of all property leases',
      filename: `Property_Leases_${new Date().toISOString().split('T')[0]}`,
      columns,
      rows,
      currency
    })
    console.log("Done calling exportTableData")
  } catch (e) {
    console.error("Caught error:", e)
  }
}

runTest()
