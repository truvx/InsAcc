import type { Voucher, Account } from '../accounting/types'


export function printVoucher(voucher: Voucher, accounts: Account[], currency: string = 'AED', moduleName: string = 'Investment Accounting Module') {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const formatAmount = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const linesHtml = voucher.lines.map(line => {
    const acct = accounts.find(a => a.id === line.accountId)
    const acctName = acct ? `${acct.code} — ${acct.name}` : line.accountId
    return `
      <tr>
        <td style="border: 1px solid #E5E7EB; padding: 12px; font-size: 13px;">${acctName}</td>
        <td style="border: 1px solid #E5E7EB; padding: 12px; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; -moz-font-feature-settings: 'tnum'; -webkit-font-feature-settings: 'tnum'; font-feature-settings: 'tnum'; font-weight: 700; letter-spacing: -0.02em;">${line.type === 'Debit' ? `${currency} ${formatAmount(line.amount)}` : '—'}</td>
        <td style="border: 1px solid #E5E7EB; padding: 12px; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; -moz-font-feature-settings: 'tnum'; -webkit-font-feature-settings: 'tnum'; font-feature-settings: 'tnum'; font-weight: 700; letter-spacing: -0.02em;">${line.type === 'Credit' ? `${currency} ${formatAmount(line.amount)}` : '—'}</td>
        <td style="border: 1px solid #E5E7EB; padding: 12px; font-size: 13px; color: #4B5563;">${line.narration || ''}</td>
      </tr>
    `
  }).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Voucher ${voucher.number}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1F2937; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #111827; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #111827; margin: 0; }
          .subtitle { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; margin-top: 4px; }
          .vch-info { text-align: right; }
          .vch-number { font-size: 24px; font-weight: 700; color: #0A0A6F; margin: 0; }
          .vch-date { font-size: 14px; color: #4B5563; margin-top: 4px; }
          .details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; background: #F9FAFB; padding: 20px; border-radius: 8px; border: 1px solid #F3F4F6; }
          .detail-item { font-size: 14px; }
          .detail-label { font-size: 11px; text-transform: uppercase; color: #9CA3AF; font-weight: 600; margin-bottom: 4px; }
          .detail-value { font-weight: 500; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
          th { background-color: #F3F4F6; color: #374151; font-weight: 600; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #E5E7EB; }
          .footer-sigs { margin-top: 80px; display: flex; justify-content: space-between; }
          .sig-line { width: 220px; border-top: 1px dashed #9CA3AF; text-align: center; padding-top: 8px; font-size: 13px; color: #4B5563; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">INSACC VOUCHER</h1>
            <div class="subtitle">${moduleName}</div>
          </div>
          <div class="vch-info">
            <h1 class="vch-number">${voucher.number}</h1>
            <div class="vch-date">Date: ${voucher.date}</div>
          </div>
        </div>
        <div class="details">
          <div class="detail-item">
            <div class="detail-label">Voucher Type</div>
            <div class="detail-value">${voucher.type}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Status</div>
            <div class="detail-value">${voucher.status}</div>
          </div>
          <div class="detail-item" style="grid-column: span 2;">
            <div class="detail-label">Description / Narration</div>
            <div class="detail-value">${voucher.description}</div>
          </div>
          ${voucher.reference ? `
          <div class="detail-item" style="grid-column: span 2;">
            <div class="detail-label">Reference</div>
            <div class="detail-value">${voucher.reference}</div>
          </div>
          ` : ''}
          ${voucher.type !== 'Journal' ? `
          <div class="detail-item">
            <div class="detail-label">Payment Mode</div>
            <div class="detail-value">${voucher.paymentMode || 'Unknown'}</div>
          </div>
          ${voucher.type === 'Receipt' ? `
          <div class="detail-item">
            <div class="detail-label">Payment Channel</div>
            <div class="detail-value">${voucher.paymentChannel || 'Unknown'}</div>
          </div>
          ` : ''}
          <div class="detail-item" style="grid-column: span 2;">
            <div class="detail-label">Payment Reference</div>
            <div class="detail-value">${voucher.paymentReference || '—'}</div>
          </div>
          ` : ''}
          <div class="detail-item">
            <div class="detail-label">Created By</div>
            <div class="detail-value">${voucher.createdBy}</div>
          </div>
          ${voucher.modifiedAt ? `
          <div class="detail-item">
            <div class="detail-label">Last Modified</div>
            <div class="detail-value">${voucher.modifiedAt.split('T')[0]} by ${voucher.modifiedBy || 'user'}</div>
          </div>
          ` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Account</th>
              <th style="width: 20%; text-align: right;">Debit</th>
              <th style="width: 20%; text-align: right;">Credit</th>
              <th style="width: 25%;">Narration</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>
        <div class="footer-sigs">
          <div class="sig-line">Prepared By</div>
          <div class="sig-line">Reviewed By</div>
          <div class="sig-line">Authorized Signatory</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
