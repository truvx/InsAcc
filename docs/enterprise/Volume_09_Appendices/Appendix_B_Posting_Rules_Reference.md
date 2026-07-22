---
title: "Volume 09: Technical Appendices - Appendix B: Posting Rules Reference"
document_id: "INSACC-DOC-V09-APPB"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 09: Technical Appendices & Reference Manual
## Appendix B: Posting Rules Reference

> **Reference Specification**: Posting rules strictly mirror `postingRules.ts` and [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### B.1 Overview

This appendix documents the rule resolution interfaces and entry specifications defined in `src/renderer/accounting/postingRules.ts`.

---

### B.2 Core Posting Rule Data Models

```typescript
export interface PostingRuleEntry {
  accountCode: string        // System account code or dynamic account resolver
  type: 'Debit' | 'Credit'   // Normal line entry direction
  amountFormula: string      // Formula / property key resolving line amount
  memoTemplate: string       // Dynamic line memo format string
}

export interface PostingRule {
  eventType: string          // Event type identifier
  description: string        // Human-readable description
  voucherType: VoucherType   // 'Receipt' | 'Payment' | 'Journal'
  entries: PostingRuleEntry[]// Array of debit and credit line specifications
}
```

---

### B.3 Posting Rule Definitions Matrix

#### 1. Event: `RENT_COLLECTED`
- **Description**: Direct rent collection deposit from tenant.
- **Voucher Type**: `Receipt` (`RV`)
- **Entries**:
  1. `Debit`: System Account `1120` (Bank Account). Amount = `event.amount`.
  2. `Credit`: System Account `2110` (Unearned Rent Liability). Amount = `event.amount`.

#### 2. Event: `PDC_CLEARED`
- **Description**: Post-Dated Cheque cleared by bank upon maturity.
- **Voucher Type**: `Receipt` (`RV`)
- **Entries**:
  1. `Debit`: System Account `1120` (Bank Account). Amount = `event.amount`.
  2. `Credit`: System Account `1410` (PDC Held). Amount = `event.amount`.
  3. `Debit`: System Account `2110` (Unearned Rent Liability). Amount = `event.amount`.
  4. `Credit`: System Account `4120` (Rental Revenue). Amount = `event.amount`.

#### 3. Event: `SECURITY_DEPOSIT_RECEIVED`
- **Description**: Tenant security deposit received upon lease signing.
- **Voucher Type**: `Receipt` (`RV`)
- **Entries**:
  1. `Debit`: System Account `1120` (Bank Account). Amount = `event.amount`.
  2. `Credit`: System Account `2120` (Security Deposit Liability). Amount = `event.amount`.

---

*Next Appendix: [Appendix C: LocalStorage Key Dictionary](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_C_LocalStorage_Key_Dictionary.md)*
