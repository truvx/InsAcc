import type { LeaseEntry, TenantEntry, PropertyEntry, UnitEntry, PdcCheque, SecurityDeposit } from '../data/propertyTypes'

export function printLease(
  lease: LeaseEntry, 
  tenant: TenantEntry | null, 
  property: PropertyEntry | null, 
  unit: UnitEntry | null,
  currency: string = 'AED',
  cheques: PdcCheque[] = [],
  depositRecord: SecurityDeposit | null = null,
  financials: { collectedRent: number, annualRent: number, outstandingRent: number, paidPercent: number } | null = null
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const themeColor = '#DE8DA9' // Properties management theme

  const formatAmount = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
  const generatedOn = new Date().toLocaleString('en-GB', dateOptions).replace(',', '')
  const actualGeneratedBy = (typeof localStorage !== 'undefined' ? localStorage.getItem('loggedInUser') : null) || 'User'
  const dateOnlyOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
  
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-GB', dateOnlyOptions)

  const pdcRows = cheques.map(c => `
    <tr>
      <td>${c.chequeNumber}</td>
      <td>${c.status === 'Cleared' && c.clearedAt ? formatDate(c.clearedAt) : '—'}</td>
      <td class="td-num">${currency} ${formatAmount(c.amount)}</td>
      <td>${c.bankAccountId ? 'Bank Transfer' : 'Post-Dated Cheque (PDC)'}</td>
      <td>${c.status}</td>
    </tr>
  `).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lease ${lease.leaseNumber}</title>
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
          
          .lease-number-display {
            font-size: 18px;
            font-weight: 600;
            color: ${themeColor};
            margin-bottom: 15px;
          }

          .section-title {
            font-size: 14px;
            font-weight: 600;
            color: ${themeColor};
            border-bottom: 1px solid ${themeColor};
            padding-bottom: 5px;
            margin-top: 25px;
            margin-bottom: 15px;
          }

          .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            row-gap: 15px;
            column-gap: 20px;
          }
          
          .info-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
          .info-value { font-size: 13px; font-weight: 400; color: #111827; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; margin-top: 15px; }
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
          <div class="title">LEASE AGREEMENT SUMMARY</div>
        </div>
        
        <div class="meta-grid">
          <div class="meta-item"><div class="meta-label">Lease #:</div><div class="meta-value">${lease.leaseNumber}</div></div>
          <div class="meta-item"><div class="meta-label">Status:</div><div class="meta-value">${lease.status}</div></div>
          <div class="meta-item"><div class="meta-label">Generated On:</div><div class="meta-value">${generatedOn}</div></div>
          <div class="meta-item"><div class="meta-label">Tenant:</div><div class="meta-value">${tenant?.name || '—'}</div></div>
          <div class="meta-item"><div class="meta-label">Portfolio:</div><div class="meta-value">Properties Management</div></div>
          <div class="meta-item"><div class="meta-label">Generated By:</div><div class="meta-value">${actualGeneratedBy}</div></div>
        </div>
        
        <div class="lease-number-display">${lease.leaseNumber}</div>
        
        <div class="section-title">Lease Details</div>
        <div class="info-box">
          <div class="info-grid">
            <div>
              <div class="info-label">Property / Building</div>
              <div class="info-value">${property?.name || '—'}</div>
            </div>
            <div>
              <div class="info-label">Unit / Floor</div>
              <div class="info-value">Unit ${unit?.unitNumber || '—'} (Floor ${unit?.floor || '—'})</div>
            </div>
            <div>
              <div class="info-label">Lease Period</div>
              <div class="info-value">${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}</div>
            </div>
            <div>
              <div class="info-label">Monthly Rental</div>
              <div class="info-value">${currency} ${formatAmount(lease.monthlyRent)}</div>
            </div>
            <div>
              <div class="info-label">Mode of Payment</div>
              <div class="info-value">${lease.modeOfPayment}</div>
            </div>
            <div>
              <div class="info-label">Security Deposit</div>
              <div class="info-value">${currency} ${formatAmount(lease.deposit)}</div>
            </div>
          </div>
        </div>

        <div class="section-title">Tenant Details</div>
        <div class="info-box">
          <div class="info-grid">
            <div>
              <div class="info-label">Tenant Name</div>
              <div class="info-value">${tenant?.name || '—'}</div>
            </div>
            <div>
              <div class="info-label">Email Address</div>
              <div class="info-value">${tenant?.email || '—'}</div>
            </div>
            <div>
              <div class="info-label">Phone Number</div>
              <div class="info-value">${tenant?.phone || '—'}</div>
            </div>
          </div>
        </div>

        ${financials ? `
        <div class="section-title">Financial Summary</div>
        <div class="info-box">
          <div class="info-grid">
            <div>
              <div class="info-label">Total Annual Rent</div>
              <div class="info-value">${currency} ${formatAmount(financials.annualRent)}</div>
            </div>
            <div>
              <div class="info-label">Already Received</div>
              <div class="info-value" style="color: #059669">${currency} ${formatAmount(financials.collectedRent)}</div>
            </div>
            <div>
              <div class="info-label">Remaining Rent</div>
              <div class="info-value" style="color: #d97706">${currency} ${formatAmount(financials.outstandingRent)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${cheques.length > 0 ? `
        <div class="section-title page-break">Post-Dated Cheques (PDC)</div>
        <table>
          <thead>
            <tr>
              <th>Cheque No.</th>
              <th>Cleared Date</th>
              <th style="text-align: right">Amount</th>
              <th>Mode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pdcRows}
          </tbody>
        </table>
        ` : ''}

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
