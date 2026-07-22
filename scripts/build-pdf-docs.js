const fs = require('fs')
const path = require('path')
const { marked } = require('marked')
const { chromium } = require('playwright')

// Ensure PDF output directory exists
const pdfOutputDir = path.join(__dirname, '..', 'docs', 'enterprise', 'pdf')
if (!fs.existsSync(pdfOutputDir)) {
  fs.mkdirSync(pdfOutputDir, { recursive: true })
}

// Enterprise Print CSS Stylesheet
const enterpriseCSS = `
@page {
  size: A4;
  margin: 20mm 15mm 20mm 15mm;
  @bottom-right {
    content: counter(page);
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #1F2937;
  background: #FFFFFF;
  margin: 0;
  padding: 0;
}

h1 {
  font-size: 22pt;
  font-weight: 700;
  color: #0F172A;
  border-bottom: 2px solid #6366F1;
  padding-bottom: 6px;
  margin-top: 24px;
  margin-bottom: 16px;
  page-break-after: avoid;
}

h2 {
  font-size: 16pt;
  font-weight: 600;
  color: #1E293B;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 4px;
  margin-top: 20px;
  margin-bottom: 12px;
  page-break-after: avoid;
}

h3 {
  font-size: 13pt;
  font-weight: 600;
  color: #334155;
  margin-top: 16px;
  margin-bottom: 8px;
  page-break-after: avoid;
}

h4 {
  font-size: 11pt;
  font-weight: 600;
  color: #475569;
  margin-top: 14px;
  margin-bottom: 6px;
  page-break-after: avoid;
}

p {
  margin-top: 0;
  margin-bottom: 10px;
}

a {
  color: #4F46E5;
  text-decoration: none;
}

code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 9pt;
  background-color: #F1F5F9;
  color: #0F172A;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid #E2E8F0;
}

pre {
  background-color: #0F172A;
  color: #F8FAFC;
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 8.5pt;
  line-height: 1.45;
  margin-top: 10px;
  margin-bottom: 14px;
  page-break-inside: avoid;
}

pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
  border: none;
}

blockquote {
  margin: 12px 0;
  padding: 10px 16px;
  border-left: 4px solid #6366F1;
  background-color: #F8FAFC;
  color: #334155;
  border-radius: 0 6px 6px 0;
}

blockquote p {
  margin: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  margin-bottom: 16px;
  font-size: 9.5pt;
  page-break-inside: avoid;
}

th {
  background-color: #0F172A;
  color: #FFFFFF;
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid #0F172A;
}

td {
  padding: 7px 12px;
  border: 1px solid #CBD5E1;
}

tr:nth-child(even) td {
  background-color: #F8FAFC;
}

hr {
  border: none;
  border-top: 1px solid #E2E8F0;
  margin: 20px 0;
}

ul, ol {
  margin-top: 0;
  margin-bottom: 10px;
  padding-left: 20px;
}

li {
  margin-bottom: 4px;
}

.cover-page {
  page-break-after: always;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 850px;
  background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
  color: #FFFFFF;
  text-align: center;
  padding: 40px;
  border-radius: 12px;
  box-sizing: border-box;
}

.cover-title {
  font-size: 28pt;
  font-weight: 800;
  color: #FFFFFF;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.cover-subtitle {
  font-size: 16pt;
  font-weight: 400;
  color: #C7D2FE;
  margin-bottom: 32px;
}

.cover-meta {
  font-size: 10.5pt;
  color: #94A3B8;
  margin-top: 40px;
  line-height: 1.8;
}

.page-break {
  page-break-after: always;
}
`

// Parse GitHub Alert Blockquotes (> [!NOTE], > [!WARNING], > [!IMPORTANT], etc.)
function processAlerts(html) {
  return html
    .replace(/blockquote>\s*<p>\s*\[!NOTE\]/gi, 'blockquote style="border-left-color: #3B82F6; background-color: #EFF6FF;"><p><strong style="color: #1D4ED8;">NOTE:</strong>')
    .replace(/blockquote>\s*<p>\s*\[!WARNING\]/gi, 'blockquote style="border-left-color: #F59E0B; background-color: #FFFBEB;"><p><strong style="color: #B45309;">WARNING:</strong>')
    .replace(/blockquote>\s*<p>\s*\[!IMPORTANT\]/gi, 'blockquote style="border-left-color: #6366F1; background-color: #EEF2FF;"><p><strong style="color: #4338CA;">IMPORTANT:</strong>')
    .replace(/blockquote>\s*<p>\s*\[!TIP\]/gi, 'blockquote style="border-left-color: #10B981; background-color: #ECFDF5;"><p><strong style="color: #047857;">TIP:</strong>')
    .replace(/blockquote>\s*<p>\s*\[!CAUTION\]/gi, 'blockquote style="border-left-color: #EF4444; background-color: #FEF2F2;"><p><strong style="color: #B91C1C;">CAUTION:</strong>')
}

// Build HTML document from Markdown content
function buildHTMLDocument(title, subtitle, markdownContent) {
  const parsedContent = processAlerts(marked.parse(markdownContent))
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${enterpriseCSS}</style>
</head>
<body>
  <div class="cover-page">
    <div style="font-size: 12pt; text-transform: uppercase; tracking: 2px; color: #818CF8; font-weight: 600; margin-bottom: 16px;">InsAcc Enterprise ERP Documentation</div>
    <div class="cover-title">${title}</div>
    <div class="cover-subtitle">${subtitle}</div>
    <div style="width: 80px; height: 4px; background: #6366F1; margin: 20px auto;"></div>
    <div class="cover-meta">
      <strong>InsAcc Enterprise Asset & Investment Platform v1.0.0</strong><br>
      Single Source of Truth Specification — Complete Master Edition<br>
      Release Date: July 22, 2026 | Status: Official Publication<br>
      Classification: Commercial Enterprise Documentation
    </div>
  </div>
  ${parsedContent}
</body>
</html>`
}

// Convert HTML String to PDF using Playwright Chromium
async function convertHTMLToPDF(browser, htmlContent, outputPath) {
  const page = await browser.newPage()
  await page.setContent(htmlContent, { waitUntil: 'networkidle' })
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    }
  })
  await page.close()
}

async function main() {
  console.log('[INFO] Launching Playwright Chromium PDF Generator...')
  const browser = await chromium.launch()

  const rootDir = path.join(__dirname, '..')

  // Clean up any existing individual PDFs in docs/enterprise/pdf/
  const existingFiles = fs.readdirSync(pdfOutputDir)
  for (const file of existingFiles) {
    if (file.endsWith('.pdf')) {
      fs.unlinkSync(path.join(pdfOutputDir, file))
      console.log(`[CLEANUP] Deleted individual PDF: ${file}`)
    }
  }

  // Master Document Compilation List (In Sequential Order)
  const masterFilePaths = [
    // Core Specifications
    path.join(rootDir, 'docs', 'MASTER_ARCHITECTURE.md'),
    path.join(rootDir, 'docs', 'DATABASE_DESIGN_SPECIFICATION.md'),
    path.join(rootDir, 'docs', 'DATABASE_SERVER_SETUP_GUIDE.md'),
    path.join(rootDir, 'docs', 'ACCOUNTING_ENGINE_SPECIFICATION.md'),
    path.join(rootDir, 'docs', 'API_CONTRACT.md'),

    // Volume 01: System Installation & Deployment Guide
    path.join(rootDir, 'docs', 'enterprise', 'Volume_01_Installation_Guide', 'Chapter_01_System_Requirements_and_Prerequisites.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_01_Installation_Guide', 'Chapter_02_Desktop_Client_Deployment.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_01_Installation_Guide', 'Chapter_03_Build_From_Source.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_01_Installation_Guide', 'Chapter_04_Deployment_Verification.md'),

    // Volume 02: Data Management & Persistence Guide
    path.join(rootDir, 'docs', 'enterprise', 'Volume_02_Data_Management_Guide', 'Chapter_01_LocalStorage_Persistence_Architecture.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_02_Data_Management_Guide', 'Chapter_02_Schema_Versioning_and_Migrations.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_02_Data_Management_Guide', 'Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_02_Data_Management_Guide', 'Chapter_04_Database_Server_Setup_Guide_[To_Be_Implemented].md'),

    // Volume 03: System Administrator Guide
    path.join(rootDir, 'docs', 'enterprise', 'Volume_03_System_Administrator_Guide', 'Chapter_01_Initial_Setup_and_Company_Configuration.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_03_System_Administrator_Guide', 'Chapter_02_User_Profiles_and_Access_Control.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_03_System_Administrator_Guide', 'Chapter_03_Chart_of_Accounts_Management.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_03_System_Administrator_Guide', 'Chapter_04_Period_Closing_Operations.md'),

    // Volume 04: End-User Operations Manual
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_01_Getting_Started_and_Navigation.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_02_Investment_Portfolio_Management.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_03_Purchase_Ledger_Operations.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_04_Property_and_Lease_Management.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_05_PDC_and_Rent_Collection.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_06_Banking_and_Reconciliation.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_07_Double_Entry_Voucher_Operations.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_04_End_User_Manual', 'Chapter_08_Financial_Reporting_and_Exports.md'),

    // Volume 05: Interface and Integration Specification
    path.join(rootDir, 'docs', 'enterprise', 'Volume_05_Interface_and_Integration_Spec', 'Chapter_01_Desktop_IPC_Bridge.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_05_Interface_and_Integration_Spec', 'Chapter_02_Import_and_Export_Interfaces.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_05_Interface_and_Integration_Spec', 'Chapter_03_Target_REST_API_[To_Be_Implemented].md'),

    // Volume 06: Developer Architecture & Technical Specification
    path.join(rootDir, 'docs', 'enterprise', 'Volume_06_Developer_Architecture_Guide', 'Chapter_01_System_Architecture_and_CQRS.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_06_Developer_Architecture_Guide', 'Chapter_02_Double_Entry_Accounting_Engine.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_06_Developer_Architecture_Guide', 'Chapter_03_Read_Models_and_Formatters.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_06_Developer_Architecture_Guide', 'Chapter_04_UI_Design_System_and_Tokens.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_06_Developer_Architecture_Guide', 'Chapter_05_Playwright_Test_Framework.md'),

    // Volume 07: Disaster Recovery & Business Continuity Guide
    path.join(rootDir, 'docs', 'enterprise', 'Volume_07_Disaster_Recovery_Guide', 'Chapter_01_Backup_Strategy_and_Automation.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_07_Disaster_Recovery_Guide', 'Chapter_02_Data_Restoration_and_Emergency_Recovery.md'),

    // Volume 08: Security Guide
    path.join(rootDir, 'docs', 'enterprise', 'Volume_08_Security_Guide', 'Chapter_01_Client_Security_and_Isolation.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_08_Security_Guide', 'Chapter_02_Credential_Storage_and_Authentication_Gaps.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_08_Security_Guide', 'Chapter_03_Security_Hardening_Roadmap_[To_Be_Implemented].md'),

    // Volume 09: Enterprise Appendices
    path.join(rootDir, 'docs', 'enterprise', 'Volume_09_Appendices', 'Appendix_A_Accounting_Event_Registry.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_09_Appendices', 'Appendix_B_Posting_Rules_Table.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_09_Appendices', 'Appendix_C_Storage_Key_Dictionary.md'),
    path.join(rootDir, 'docs', 'enterprise', 'Volume_09_Appendices', 'Appendix_D_Glossary_and_Acronyms.md')
  ]

  let masterMarkdown = `# InsAcc Enterprise ERP Documentation Suite\n## Complete Master Edition\n\n`

  for (const filePath of masterFilePaths) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      masterMarkdown += content + '\n\n<div class="page-break"></div>\n\n'
    } else {
      console.warn(`[WARN] File not found: ${filePath}`)
    }
  }

  // Generate Single Master PDF
  const masterOutputName = 'InsAcc_Enterprise_Documentation_Suite_Master.pdf'
  const masterPdfPath = path.join(pdfOutputDir, masterOutputName)

  console.log(`[BUILDING SINGLE MASTER PDF] ${masterOutputName}...`)
  const masterHTML = buildHTMLDocument(
    'InsAcc Enterprise Documentation Suite',
    'Complete 9-Volume & Platform Core Master Edition',
    masterMarkdown
  )
  
  await convertHTMLToPDF(browser, masterHTML, masterPdfPath)
  console.log(`[SUCCESS] Single Master PDF Generated: ${masterPdfPath}`)

  await browser.close()
  console.log('[COMPLETE] Single Master PDF generated. All individual volume PDFs purged.')
}

main().catch(err => {
  console.error('[FATAL ERROR]', err)
  process.exit(1)
})
