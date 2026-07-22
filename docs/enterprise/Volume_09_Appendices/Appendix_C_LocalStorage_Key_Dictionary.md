---
title: "Volume 09: Technical Appendices - Appendix C: LocalStorage Key Dictionary"
document_id: "INSACC-DOC-V09-APPC"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 09: Technical Appendices & Reference Manual
## Appendix C: LocalStorage Key Dictionary

> **Reference Specification**: Storage key dictionary strictly mirrors `App.tsx` and [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### C.1 Overview

This appendix provides an exhaustive reference dictionary of all 16 `localStorage` keys utilized by the InsAcc v1.0.0 application.

---

### C.2 Master Storage Key Dictionary

| # | Storage Key | Data Interface | Description & Contents |
|---|---|---|---|
| 1 | `insacc_investments` | `Investment[]` | Investment portfolio position records. |
| 2 | `insacc_transactions` | `Transaction[]` | General income, expense, and journal transactions. |
| 3 | `insacc_statement` | `StatementEntry[]` | Bank statement lines (Legacy model). |
| 4 | `insacc_balance` | `number` | Bank balance scalar (Deprecated; derived balance enforced). |
| 5 | `insacc_documents` | `DocItem[]` | Uploaded document metadata and Base64 attachments. |
| 6 | `insacc_logs` | `LogEntry[]` | System operational audit log entries. |
| 7 | `insacc_purchase_categories` | `PurchaseCategory[]` | Purchase ledger category taxonomy. |
| 8 | `insacc_purchases` | `Purchase[]` | Purchase ledger lot acquisition entries. |
| 9 | `insacc_inv_users` | `UserEntry[]` | Investment module user profile definitions. |
| 10 | `insacc_prop_users` | `UserEntry[]` | Property module user profile definitions. |
| 11 | `insacc_prop_categories` | `PropertyCategory[]` | Property classification categories. |
| 12 | `insacc_prop_buildings` | `PropertyBuilding[]` | Building master records. |
| 13 | `insacc_prop_units` | `PropertyUnit[]` | Rentable property units. |
| 14 | `insacc_prop_tenants` | `PropertyTenant[]` | Tenant profiles and active lease agreements. |
| 15 | `insacc_prop_rent` | `RentPayment[]` | Rent collection records. |
| 16 | `insacc_clear_version` | `string` | Schema migration tracker (`CLEAR_VERSION = '8'`). |

---

*Next Appendix: [Appendix D: Glossary and Acronyms](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_D_Glossary_and_Acronyms.md)*
