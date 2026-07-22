---
title: "Volume 05: Interface and Integration Specification - Chapter 02: File Import Export Interfaces"
document_id: "INSACC-DOC-V05-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 05: Interface & Integration Specification
## Chapter 02: File Import Export Interfaces

> **Reference Specification**: File formats and data export specifications strictly follow [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### 2.1 Overview

InsAcc supports bidirectional file integration with external tools, spreadsheet applications, and banking portals.

This chapter defines file structure specifications for bank statement imports, document file storage, full system JSON state snapshot exports, and report export schemas.

---

### 2.2 Bank Statement Import Specification (`BankImportModal.tsx`)

Users import bank statement files in CSV or Excel format for reconciliation.

#### Supported File Types: `.csv`, `.xlsx`

#### Standard CSV Column Mapping Schema:
```csv
Date,Description,Amount,Type,Reference
2026-06-01,"Rent Collection Unit 101",10000.00,Credit,"CHEQUE-40012"
2026-06-05,"Building Maintenance Service",-1250.00,Debit,"TRF-88402"
```

| Header Column | Data Type | Required | Formatting Rules |
|---|---|---|---|
| `Date` | `string` | Yes | ISO `YYYY-MM-DD` or `DD/MM/YYYY`. |
| `Description` | `string` | Yes | Free-text transaction memo. |
| `Amount` | `number` | Yes | Positive floating-point number. Discards embedded currency symbols. |
| `Type` | `string` | Yes | `'Credit'` / `'Deposit'` (increases balance) or `'Debit'` / `'Withdrawal'`. |
| `Reference` | `string` | No | External bank transaction ID or cheque number for matching. |

---

### 2.3 System State Backup JSON Schema

Full database snapshots are exported as a single JSON document (`state_backup_YYYY-MM-DD.json`) containing all 16 `insacc_*` keys:

```json
{
  "version": "8",
  "exportedAt": "2026-07-22T14:30:00.000Z",
  "data": {
    "insacc_investments": [ ... ],
    "insacc_transactions": [ ... ],
    "insacc_bank_accounts": [ ... ],
    "insacc_bank_transactions": [ ... ],
    "insacc_prop_properties": [ ... ],
    "insacc_prop_tenants": [ ... ],
    "insacc_prop_rent": [ ... ]
  }
}
```

---

### 2.4 Financial Report CSV Export Specification

When exporting report views to CSV, `reportExportService.ts` formats tabular output with standard headers:

```csv
InsAcc Financial Platform — Balance Sheet Report
As of Date: 2026-06-30
Base Currency: AED

Account Code,Account Name,Account Type,Debit (AED),Credit (AED),Net Balance (AED)
1110,Cash on Hand,Asset,25000.00,0.00,25000.00
1120,Emirates Islamic Bank,Asset,1250000.00,0.00,1250000.00
2120,Tenant Security Deposits,Liability,0.00,50000.00,-50000.00
2200,Retained Earnings,Equity,0.00,1225000.00,-1225000.00
TOTALS,,1275000.00,1275000.00,0.00
```

---

*Next Chapter: [Chapter 03: Target REST API Specification [To Be Implemented]](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)*
