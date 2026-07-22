---
title: "Volume 05: Interface and Integration Spec - Chapter 02: Import and Export Interfaces"
document_id: "INSACC-DOC-V05-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 05: Interface and Integration Specification
## Chapter 02: Import and Export Interfaces

> **Single Source of Truth Reference**: All state snapshot formats, CSV export generators, and import parsers defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

## Revision History

| Version | Release Date | Primary Author | Summary of Changes | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-07-22 | Lead Enterprise Documentation Architect | Initial publication-grade enterprise release | Chief Architecture Review Board |

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Audience](#3-audience)
- [4. Prerequisites](#4-prerequisites)
- [5. Warnings & Operational Hazards](#5-warnings--operational-hazards)
- [6. Notes & Architecture Context](#6-notes--architecture-context)
- [7. Main Content](#7-main-content)
  - [7.1 System State JSON Backup & Restore Specification](#71-system-state-json-backup--restore-specification)
  - [7.2 Financial Report CSV Export Generation (`reportService.ts`)](#72-financial-report-csv-export-generation-reportservicets)
  - [7.3 Bank Statement Electronic Import Parser (CSV / XLSX)](#73-bank-statement-electronic-import-parser-csv--xlsx)
  - [7.4 Document Attachment Metadata & Base64 Store (`insacc_documents`)](#74-document-attachment-metadata--base64-store-insacc_documents)
  - [7.5 Import Data Validation & Schema Integrity Rules](#75-import-data-validation--schema-integrity-rules)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the file format specifications, data translation pipelines, and validation rules for importing and exporting data within InsAcc v1.0.0. It covers full-state JSON backups, financial report CSV generation, bank statement parsing, and document attachment storage.

---

## 2. Scope

This specification covers:
- Full system backup/restore JSON structure (`state_backup_YYYY-MM-DD.json`).
- Financial statement CSV formatting routines (`reportService.ts`).
- Electronic bank statement file import parser (CSV / Excel format).
- Document attachment management (`insacc_documents`).
- Data schema validation and sanitization.

Out of Scope:
- Desktop Electron IPC bridge implementation (covered in [Volume 05 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_01_Desktop_IPC_Bridge.md)).
- Target REST API HTTP endpoints `[To Be Implemented]` (covered in [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Systems Administrators and Integration Developers
- Data Migration Engineers and Technical Support Staff
- Financial Compliance & Audit Personnel

---

## 4. Prerequisites

Before importing or exporting data:
1. Confirm local file write permissions for target output directories.
2. Review storage key definitions in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **OVERWRITE RISK ON JSON STATE RESTORE**: Restoring a JSON state backup snapshot (`state_backup_YYYY-MM-DD.json`) completely replaces all existing operational ledgers, properties, and vouchers in `localStorage`. System administrators MUST perform a current backup export before executing a state restore.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Base64 Attachment Storage Limit**: Document attachments uploaded in `insacc_documents` are encoded as Base64 strings. To prevent exceeding browser `localStorage` quotas (~5MB–10MB), file uploads should be constrained to small PDF/image receipts (< 500 KB per file).

---

## 7. Main Content

### 7.1 System State JSON Backup & Restore Specification

InsAcc exports the complete application state into a single JSON snapshot file (`state_backup_YYYY-MM-DD.json`) via **Settings** $\rightarrow$ **Data Management**:

```json
{
  "version": "8",
  "exportedAt": "2026-07-22T12:00:00.000Z",
  "data": {
    "insacc_investments": [ ... ],
    "insacc_transactions": [ ... ],
    "insacc_purchase_categories": [ ... ],
    "insacc_purchases": [ ... ],
    "insacc_prop_buildings": [ ... ],
    "insacc_prop_units": [ ... ],
    "insacc_prop_tenants": [ ... ],
    "insacc_prop_rent": [ ... ],
    "insacc_inv_users": [ ... ],
    "insacc_prop_users": [ ... ],
    "insacc_documents": [ ... ],
    "insacc_logs": [ ... ]
  }
}
```

---

### 7.2 Financial Report CSV Export Generation (`reportService.ts`)

Financial statement views generate CSV exports by transforming internal data structures into RFC 4180-compliant CSV text:

```typescript
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '')
    return `"${str.replace(/"/g, '""')}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const dataLines = rows.map(row => row.map(escapeCell).join(','))
  return [headerLine, ...dataLines].join('\r\n')
}
```

---

### 7.3 Bank Statement Electronic Import Parser (CSV / XLSX)

InsAcc imports electronic bank statements to power statement reconciliation (`BankReconciliationDashboard.tsx`).

#### Target Import Schema:
- **Column 1**: Date (`YYYY-MM-DD` or `DD/MM/YYYY`)
- **Column 2**: Description / Transaction Narration
- **Column 3**: Reference Number / Cheque Number
- **Column 4**: Amount (`+` for deposits, `-` for payments)

---

### 7.4 Document Attachment Metadata & Base64 Store (`insacc_documents`)

Documents and lease attachments persist in `insacc_documents`:

```typescript
export interface DocItem {
  id: string              // Unique document ID (e.g. "doc-1719500000000")
  title: string           // Document title (e.g. "Tenancy_Contract_Unit_101.pdf")
  category: string        // "Lease" | "Invoice" | "Voucher Receipt" | "KYC"
  uploadDate: string      // ISO upload timestamp
  fileSize: number        // File size in bytes
  mimeType: string        // "application/pdf" | "image/png" | "image/jpeg"
  contentBase64: string   // Base64 encoded file payload
}
```

---

### 7.5 Import Data Validation & Schema Integrity Rules

When importing JSON backups or CSV statement files, InsAcc executes validation checks:

```
File Upload Event ──► JSON/CSV Schema Validator
                         ├── Rule 1: Check `version === "8"` in JSON Header
                         ├── Rule 2: Assert presence of mandatory key arrays
                         ├── Rule 3: Validate numeric parsing on amounts
                         └── Passed ──► Commit to State & Reload Window
```

---

## 8. Summary

InsAcc provides robust data transport capabilities through JSON full-state backups, RFC 4180 CSV report generators, electronic bank statement parsers, and Base64 document attachment storage.

---

## 9. Chapter Appendix

### Supported Import & Export Format Matrix

| Interface Feature | Input / Output Format | Primary Target Location | Validation Rule |
|---|---|---|---|
| **System Backup** | JSON Snapshot | `state_backup_YYYY-MM-DD.json` | Version `'8'` check |
| **Financial Reports** | CSV Text File | User Downloads Folder | RFC 4180 Escaping |
| **Bank Statements** | CSV / Excel File | Memory Parser | 4-Column Schema |
| **Document Store** | Base64 String | `insacc_documents` | Size limit $< 500\text{ KB}$ |

---

## 10. Glossary

- **Base64**: A group of binary-to-text encoding schemes that represent binary data in an ASCII string format.
- **RFC 4180**: The technical specification defining standard Common Format and MIME Type for Comma-Separated Values (CSV) files.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- LocalStorage Persistence Architecture: [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)
- Desktop IPC Bridge: [Volume 05 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_01_Desktop_IPC_Bridge.md)
- Target REST API: [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)
