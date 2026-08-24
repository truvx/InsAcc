import type { Voucher, Account } from '../accounting/types'

export function printVoucher(voucher: Voucher, accounts: Account[], currency: string = 'AED', moduleName: string = 'Investment Accounting Module') {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const isProperties = moduleName.toLowerCase().includes('propert')
  const themeColor = isProperties ? '#DE8DA9' : '#0F4C35'
  const themeColorRGB = isProperties ? '222, 141, 169' : '15, 76, 53'

  const formatAmount = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  let totalDebit = 0
  let totalCredit = 0

  const linesHtml = voucher.lines.map(line => {
    const acct = accounts.find(a => a.id === line.accountId)
    const acctName = acct ? `${acct.code} — ${acct.name}` : line.accountId
    if (line.type === 'Debit') totalDebit += line.amount
    if (line.type === 'Credit') totalCredit += line.amount
    return `
      <tr>
        <td class="td-acct">${acctName}</td>
        <td class="td-num">${line.type === 'Debit' ? `${currency} ${formatAmount(line.amount)}` : '—'}</td>
        <td class="td-num">${line.type === 'Credit' ? `${currency} ${formatAmount(line.amount)}` : '—'}</td>
        <td class="td-narration">${line.narration || ''}</td>
      </tr>
    `
  }).join('')

  const actualGeneratedBy = (typeof localStorage !== 'undefined' ? localStorage.getItem('loggedInUser') : null) || 'User'
  const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
  const generatedOn = new Date().toLocaleString('en-GB', dateOptions).replace(',', '')

  const isJournal = voucher.type === 'Journal'

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Voucher ${voucher.number}</title>
        <style>
          @page { margin: 0; size: A4 portrait; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-inside: avoid; }
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #000; 
            background: #fff; 
            margin: 0;
            padding: 15mm;
            font-size: 13px;
          }
          .header { text-align: center; margin-bottom: 30px; }
          .header h2 { font-size: 16px; margin: 0 0 10px 0; font-weight: 700; color: #000; }
          .divider { border-top: 1px solid #c8c8c8; margin: 0 0 15px 0; }
          .title { font-size: 16px; font-weight: 700; margin: 0 0 20px 0; color: #000; text-transform: uppercase; }
          
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .meta-item { display: flex; align-items: baseline; }
          .meta-label { font-size: 11px; font-weight: 700; color: #64748b; width: 100px; flex-shrink: 0; }
          .meta-value { font-size: 12px; font-weight: 400; color: #000; }
          
          .vch-number-display {
            font-size: 18px;
            font-weight: 600;
            color: ${themeColor};
            margin-bottom: 10px;
          }

          .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 30px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            row-gap: 15px;
            column-gap: 20px;
          }
          .info-col-2 { grid-column: span 2; }
          .info-col-3 { grid-column: span 3; }
          
          .info-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
          .info-value { font-size: 13px; font-weight: 400; color: #111827; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { 
            background-color: ${themeColor}; 
            color: #fff; 
            font-weight: 700; 
            text-align: left; 
            padding: 10px 12px; 
            font-size: 12px; 
            border: 1px solid #e5e7eb; 
          }
          td { 
            padding: 10px 12px; 
            border: 1px solid #e5e7eb; 
            font-size: 12px; 
            color: #111827;
          }
          tr:nth-child(even) td { background-color: #f8fbf9; }
          .td-num { text-align: right; font-variant-numeric: tabular-nums; }
          .td-acct { width: 45%; }
          .td-narration { width: 25%; }
          
          .tfoot td {
            background-color: #f8fbf9 !important;
            font-weight: 700;
            color: ${themeColor};
            border-top: 2px solid ${themeColor};
          }

          .footer-sigs { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 60px;
          }
          .sig-line { 
            width: 25%; 
            border-top: 1px solid #9ca3af; 
            text-align: center; 
            padding-top: 8px; 
            font-size: 12px; 
            color: #64748b; 
          }

          .page-footer {
            position: fixed;
            bottom: 15mm;
            left: 15mm;
            right: 15mm;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #969696;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Sameer Ishaq Harmoudi</h2>
          <div class="divider"></div>
          <div class="title">${voucher.type.toUpperCase()} VOUCHER</div>
        </div>
        
        <div class="meta-grid">
          <div class="meta-item"><div class="meta-label">Voucher #:</div><div class="meta-value">${voucher.number}</div></div>
          <div class="meta-item"><div class="meta-label">Date:</div><div class="meta-value">${voucher.date}</div></div>
          <div class="meta-item"><div class="meta-label">Status:</div><div class="meta-value">${voucher.status}</div></div>
          <div class="meta-item"><div class="meta-label">Generated On:</div><div class="meta-value">${generatedOn}</div></div>
          <div class="meta-item"><div class="meta-label">Generated By:</div><div class="meta-value">${actualGeneratedBy}</div></div>
          <div class="meta-item"><div class="meta-label">Portfolio:</div><div class="meta-value">${moduleName}</div></div>
        </div>
        
        <div class="vch-number-display">${voucher.number}</div>
        
        <div class="info-box">
          <div class="info-grid">
            <div>
              <div class="info-label">Voucher Type</div>
              <div class="info-value">${voucher.type}</div>
            </div>
            <div>
              <div class="info-label">Status</div>
              <div class="info-value">${voucher.status}</div>
            </div>
            <div></div> <!-- empty col -->

            ${!isJournal ? `
            <div>
              <div class="info-label">Payment Mode</div>
              <div class="info-value">${voucher.paymentMode || '—'}</div>
            </div>
            ${voucher.type === 'Receipt' ? `
            <div>
              <div class="info-label">Channel</div>
              <div class="info-value">${voucher.paymentChannel || '—'}</div>
            </div>
            ` : ''}
            <div>
              <div class="info-label">${voucher.type === 'Receipt' ? 'Ref Number' : 'Payment Reference'}</div>
              <div class="info-value">${voucher.paymentReference || '—'}</div>
            </div>
            ` : ''}
            
            <div class="info-col-3">
              <div class="info-label">Description / Narration</div>
              <div class="info-value">${voucher.description}</div>
            </div>
            
            <div>
              <div class="info-label">Created By</div>
              <div class="info-value">${voucher.createdBy || '—'}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="td-acct">Account</th>
              <th style="text-align: right">Debit</th>
              <th style="text-align: right">Credit</th>
              <th class="td-narration">Narration</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
          <tfoot>
            <tr class="tfoot">
              <td>Total</td>
              <td class="td-num">${currency} ${formatAmount(totalDebit)}</td>
              <td class="td-num">${currency} ${formatAmount(totalCredit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-sigs page-break">
          <div class="sig-line">Prepared By</div>
          <div class="sig-line">Reviewed By</div>
          <div class="sig-line">Authorized Signatory</div>
        </div>

        <div class="page-footer">
          <div>Powered By INSACC</div>
          <div></div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
