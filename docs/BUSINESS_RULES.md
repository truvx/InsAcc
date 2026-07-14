# InsAcc Business Rules Documentation

**Generated:** 2026-07-06  
**Purpose:** Comprehensive documentation of accounting rules, validation logic, and business constraints

## Table of Contents

1. [Accounting Fundamentals](#accounting-fundamentals)
2. [Voucher Rules](#voucher-rules)
3. [Module-Specific Rules](#module-specific-rules)
4. [PDC Management Rules](#pdc-management-rules)
5. [Security Deposit Rules](#security-deposit-rules)
6. [Bank Reconciliation Rules](#bank-reconciliation-rules)
7. [Purchase Ledger Rules](#purchase-ledger-rules)

---

## 1. Accounting Fundamentals

### Double-Entry Bookkeeping

**Core Principle**: Every transaction must have equal debits and credits

**Validation**:
```typescript
isBalanced(lines: VoucherLine[]): boolean {
  const { totalDebit, totalCredit } = calculateBaseTotals(lines)
  return Math.abs(totalDebit - totalCredit) < 0.001
}
```

**Tolerance**: 0.001 units for rounding differences

### Account Types and Normal Balances

| Type | Normal Balance | Increases | Decreases |
|------|---------------|-----------|-----------|
| Asset | Debit | Debit | Credit |
| Liability | Credit | Credit | Debit |
| Equity | Credit | Credit | Debit |
| Revenue | Credit | Credit | Debit |
| Expense | Debit | Debit | Credit |

### Chart of Accounts Structure

**Numbering Scheme**:
- `1xxx` - Assets
- `2xxx` - Liabilities
- `3xxx` - Equity
- `4xxx` - Revenue
- `5xxx` - Expenses

**Hierarchy Rules**:
- Parent accounts: 4-digit codes (e.g., `1200`)
- Child accounts: Parent code + `.` + sequence (e.g., `1200.001`)
- Maximum depth: 3 levels


---

## 2. Voucher Rules

### Voucher Lifecycle

**Valid Transitions**:
```
Draft → Pending Approval → Approved → Posted
Draft → Cancelled
Posted → Reversed (creates new reversal voucher)
```

**Invalid Transitions**:
- Cannot edit Posted vouchers (must reverse)
- Cannot approve non-Draft vouchers
- Cannot post non-Approved vouchers
- Cannot reverse non-Posted vouchers
- Cannot cancel Posted vouchers

### Voucher Number Generation

**Format**: `{PREFIX}-{YEAR}-{SEQUENCE}`

**Prefixes**:
- `PV` - Payment Voucher
- `RV` - Receipt Voucher
- `JV` - Journal Voucher
- `CV` - Contra Voucher

**Sequence Rules**:
- 6-digit padded sequence (e.g., `000001`)
- Resets yearly
- Continuous within type and year
- Special handling for purchase vouchers

**Example**: `PV-2026-000042`

### Voucher Validation Rules

1. **Minimum Lines**: At least 2 lines (1 debit + 1 credit minimum)
2. **Balanced Entries**: Sum of debits = Sum of credits (within 0.001 tolerance)
3. **Valid Accounts**: All referenced accounts must exist and be active
4. **Valid Dates**: Voucher date cannot be in future
5. **Currency Consistency**: All lines must use compatible currencies
6. **Exchange Rate**: Required if currency ≠ base currency
7. **No Duplicate References**: Voucher numbers must be unique

### Voucher Reversal Rules

**When Allowed**: Only Posted vouchers can be reversed

**Reversal Process**:
1. Create new Journal Voucher with opposite entries
2. Link original voucher: `reversalOfVoucherId`
3. Mark original as Reversed: `status = 'Reversed'`
4. Store reversal reference: `reversedVoucherId`
5. Reversal date can be different from original date

**Effect**: Net zero impact on ledger (original + reversal = 0)


---

## 3. Module-Specific Rules

### Module Isolation

**Investment Module Accounts**:
- Cash: `1110-inv`
- Bank Accounts: `1120.xxx`
- Investments: `1200` and children (`1210`, `1220`, etc.)
- Owner Account: `2200-inv`

**Property Module Accounts**:
- Cash: `1110-prop`
- Bank Accounts: `1120.xxx` (property-specific banks)
- Rent Receivable: `1130`
- Real Estate: `1270`
- PDC Receivable: `1410`
- Deferred Revenue: `2110`
- Security Deposits: `2120`
- Rental Income: `4120`
- Owner Account: `2200-prop`

**Isolation Rules**:
1. Investment accounts MUST NOT appear in Property reports
2. Property accounts MUST NOT appear in Investment reports
3. Bank accounts can be module-specific based on ID prefix
4. Shared account codes (e.g., `1120`) must have module-specific IDs

### Investment Module Rules

**Asset Purchase**:
- **Event**: `ASSET_PURCHASE`
- **Posting**: Dr Asset Account / Cr Bank Account
- **Triggers Purchase Ledger**: Creates PurchaseRecord

**Asset Sale**:
- **Event**: `ASSET_SALE`
- **Posting**: Dr Bank Account / Cr Asset Account
- **Gain/Loss**: Separate entry if sale price ≠ cost basis

**Dividend Income**:
- **Event**: `DIVIDEND_RECEIVED`
- **Posting**: Dr Bank Account / Cr Dividend Income (4110)

**Capital Contribution**:
- **Event**: `CAPITAL_CONTRIBUTION`
- **Posting**: Dr Bank Account / Cr Owner Account (2200-inv)

### Property Module Rules

**Lease Creation**:
- **Not Automated**: Lease contracts are reference data, not accounting events
- **Manual Voucher**: Optional JV for receivable recognition
  - Dr Rent Receivable (1130) / Cr Deferred Revenue (2110)

**Rent Received**:
- **Event**: `RENT_RECEIVED`
- **Posting**: Dr Bank Account / Cr Rental Income (4120)

**Security Deposit Received**:
- **Event**: `SECURITY_DEPOSIT_RECEIVED`
- **Posting**: Dr Bank Account / Cr Security Deposit Liability (2120)
- **NOT Revenue**: Deposits are liabilities, not income

**PDC Received**:
- **Event**: `FUTURE_PDC_RECEIVED`
- **Posting**: Dr PDC Receivable (1410) / Cr Rent Receivable (1130)


---

## 4. PDC Management Rules

### PDC Lifecycle

**States**:
1. **Pending**: Cheque received but not yet due
2. **Deposited**: Cheque deposited to bank (on/after due date)
3. **Cleared**: Bank confirmed clearance
4. **Bounced**: Bank rejected cheque
5. **Cancelled**: Cheque manually cancelled
6. **Replaced**: Cheque replaced with new cheque

**Valid Transitions**:
```
Pending → Deposited → Cleared
Pending → Deposited → Bounced
Pending → Cancelled
Pending → Replaced
Deposited → Cancelled
Deposited → Replaced
Bounced → Deposited (retry)
Bounced → Cancelled
Bounced → Replaced
```

**Invalid Transitions**:
- Cleared → Cancelled
- Cleared → Replaced
- Any transition from same status to itself

### PDC Accounting Events

**1. PDC Received (Future-dated)**:
```
Event: FUTURE_PDC_RECEIVED
Dr: PDC Receivable (1410)
Cr: Rent Receivable (1130)
```

**2. PDC Deposited**:
```
Event: PDC_DEPOSITED
Dr: Bank Account (1120.xxx)
Cr: PDC Receivable (1410)
```

**3. PDC Bounced**:
```
Event: PDC_BOUNCED
Dr: Rent Receivable (1130)
Cr: Bank Account (1120.xxx)
[Reverses the deposit]
```

**4. Bounce Fee Charged by Bank**:
```
Event: PDC_BOUNCE_FEE
Dr: Bank Charges Expense (5120)
Cr: Bank Account (1120.xxx)
```

**5. Penalty Charged to Tenant**:
```
Event: PDC_PENALTY
Dr: Rent Receivable (1130)
Cr: Late Fee Income (4150)
```

### PDC Generation Rules

**Auto-generation from Lease**:
- Number of cheques = `pdcCount` or derived from payment frequency
- Monthly rent = Annual rent ÷ Payment frequency count
- Due dates: First of month based on payment frequency
- Cheque number format: `{LeaseNumber}-CHQ-{SlotIndex}`

**Payment Frequency Mapping**:
- Monthly: 12 cheques
- Quarterly: 4 cheques
- Semi-Annual: 2 cheques
- Annual: 1 cheque


---

## 5. Security Deposit Rules

### Security Deposit Lifecycle

**Transaction Types**:
1. **Charge**: Expected deposit amount (from lease)
2. **Receipt**: Actual deposit received from tenant
3. **Refund**: Deposit returned to tenant
4. **Forfeit**: Deposit kept by landlord
5. **Adjustment**: Manual balance correction

**Status Derivation** (computed from transactions):
- **Expected**: No receipts yet
- **Held**: Balance > 0, no refunds/forfeitures
- **Partially Refunded**: Some refunded, balance > 0
- **Partially Forfeited**: Some forfeited, balance > 0
- **Fully Refunded**: All refunded, balance = 0
- **Fully Forfeited**: All forfeited, balance = 0
- **Closed**: Manually closed, balance = 0

### Security Deposit Accounting

**1. Deposit Received**:
```
Event: SECURITY_DEPOSIT_RECEIVED
Dr: Bank Account (1120.xxx)
Cr: Security Deposit Liability (2120)
```

**2. Deposit Refunded**:
```
Event: SECURITY_DEPOSIT_REFUNDED
Dr: Security Deposit Liability (2120)
Cr: Bank Account (1120.xxx)
```

**3. Deposit Forfeited**:
```
Event: SECURITY_DEPOSIT_FORFEITED
Dr: Security Deposit Liability (2120)
Cr: Property Income / Forfeiture Income (4200)
```

### Security Deposit Balance Rules

**Computation**:
```typescript
expectedAmount = Sum(Charge transactions)
receivedAmount = Sum(Posted Receipt transactions)
refundedAmount = Sum(Posted Refund transactions)
forfeitedAmount = Sum(Posted Forfeit transactions)
currentBalance = receivedAmount - refundedAmount - forfeitedAmount
outstandingAmount = max(0, expectedAmount - receivedAmount)
```

**Validation Rules**:
1. Current balance cannot be negative
2. Cannot refund more than held balance
3. Cannot forfeit more than held balance
4. Cannot close deposit with positive balance
5. Adjustments can be positive or negative


### Security Deposit GL Mapping

**Configuration**:
- Liability Account: `2120` (Security Deposits Held)
- Forfeiture Income Account: `4200` (Property Income)

**Rule**: All security deposit vouchers MUST use these accounts

---

## 6. Bank Reconciliation Rules

### Reconciliation Process

**Purpose**: Match bank statement transactions with GL vouchers

**States**:
- **Unreconciled**: Transaction exists but not matched
- **Reconciled**: Transaction matched to voucher
- **Discrepancy**: Mismatch between bank and GL

**Reconciliation Types**:
1. **Exact Match**: Amount and date match
2. **Date Mismatch**: Amount matches, date different (timing difference)
3. **Amount Mismatch**: Date matches, amount different (partial payments)
4. **Missing Entry**: Transaction in bank but not in GL (or vice versa)

### Bank Account Balance Rules

**Opening Balance**:
- Can be set on bank account creation
- Synced to mapped GL account opening balance
- Should be zeroed after initial data entry (v4 migration)

**Ledger Balance Calculation**:
```
Ledger Balance = GL Account Opening Balance + Posted Voucher Movements
```

**Book Balance vs Bank Balance**:
- **Book Balance**: From GL (accounting perspective)
- **Bank Balance**: From bank statement (bank's perspective)
- **Reconciled Balance**: Should match after reconciliation

### Reconciliation Validation

**Rules**:
1. Reconciled transactions cannot be unreconciled once period is closed
2. Bank account must have GL mapping
3. Reconciliation date cannot be in future
4. Opening balance adjustment must balance

---

## 7. Purchase Ledger Rules

### Purchase Recording

**Required Fields**:
- Asset Type (e.g., Gold, Silver, Stocks)
- Asset Name (specific item identifier)
- Quantity (>0)
- Unit Price (>0)
- Purchase Date
- Funding Bank Account

**Calculated Fields**:
- Total Value = Quantity × Unit Price
- Cost Basis = Total Value + Fees

### Cost Basis Calculation

**Weighted Average Method**:
```
Weighted Average = Total Cost of All Purchases ÷ Total Quantity
```

**FIFO Method** (not fully implemented):
```
Sell from oldest purchase first
```

### Purchase Status

**States**:
- **Active**: Currently held
- **Sold**: Fully disposed
- **Partially Sold**: Some quantity remaining

**Transition Rules**:
- Active → Sold (when quantity = 0)
- Active → Partially Sold (when quantity reduced but > 0)
- Cannot transition from Sold back to Active

### Purchase Ledger → Investment Sync

**Rule**: Purchase records automatically sync to Investment holdings

**Aggregation**:
- Group by Asset Type and Asset Name
- Sum quantities
- Calculate weighted average cost
- Compute current market value (if prices available)

### Validation Rules

1. Quantity must be positive decimal
2. Unit price must be positive
3. Purchase date cannot be in future
4. Asset type must be from predefined list
5. Asset name required and non-empty
6. Total value = quantity × unit price (within rounding tolerance)
7. Funding bank account must exist and have GL mapping

