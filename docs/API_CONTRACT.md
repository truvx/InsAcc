# InsAcc Interface & API Contract Specification

**Document ID:** API_CONTRACT.md  
**Version:** 1.0.0  
**Status:** Official Interface & API Specification  
**Release Date:** 2026-07-22  
**Target Software:** InsAcc Enterprise Asset & Investment Accounting Platform v1.0.0  
**Single Source of Truth Reference:** [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)

---

> [!IMPORTANT]
> **GOVERNANCE DIRECTIVE**: InsAcc v1.0.0 runs as a local desktop application using Electron 28. The desktop process communicates via the Electron IPC bridge (`window.api.saveFile()`). All REST API HTTP endpoints documented in Section 3 represent the **Target Enterprise Server API Contract [To Be Implemented]** for server release v2.0.0.

---

## Table of Contents

1. [API Architecture & Protocol Overview](#1-api-architecture--protocol-overview)
2. [Desktop Electron IPC Bridge API (v1.0.0 Production)](#2-desktop-electron-ipc-bridge-api-v100-production)
   - [2.1 IPC Channel: `save-file`](#21-ipc-channel-save-file)
3. [Target Enterprise REST API Contract [To Be Implemented]](#3-target-enterprise-rest-api-contract-to-be-implemented)
   - [3.1 Authentication Endpoints](#31-authentication-endpoints)
     - [`POST /api/v1/auth/login`](#post-apiv1authlogin)
     - [`POST /api/v1/auth/refresh`](#post-apiv1authrefresh)
   - [3.2 Investment Module Endpoints](#32-investment-module-endpoints)
     - [`GET /api/v1/investments`](#get-apiv1investments)
     - [`POST /api/v1/investments`](#post-apiv1investments)
     - [`POST /api/v1/investments/purchases`](#post-apiv1investments-purchases)
   - [3.3 Property Management Endpoints](#33-property-management-endpoints)
     - [`GET /api/v1/properties/units`](#get-apiv1propertiesunits)
     - [`POST /api/v1/properties/leases`](#post-apiv1propertiesleases)
     - [`POST /api/v1/properties/pdc/transition`](#post-apiv1propertiespdctransition)
   - [3.4 Double-Entry Accounting Endpoints](#34-double-entry-accounting-endpoints)
     - [`GET /api/v1/accounting/accounts`](#get-apiv1accountingaccounts)
     - [`POST /api/v1/accounting/vouchers`](#post-apiv1accountingvouchers)
     - [`POST /api/v1/accounting/vouchers/{id}/post`](#post-apiv1accountingvouchersidpost)
     - [`POST /api/v1/accounting/vouchers/{id}/reverse`](#post-apiv1accountingvouchersidreverse)
   - [3.5 Financial Statement Endpoints](#35-financial-statement-endpoints)
     - [`GET /api/v1/reports/balance-sheet`](#get-apiv1reportsbalance-sheet)
     - [`GET /api/v1/reports/profit-loss`](#get-apiv1reportsprofit-loss)
4. [Standard Error Code Reference](#4-standard-error-code-reference)

---

## 1. API Architecture & Protocol Overview

InsAcc interfaces operate across two architectural layers:

1. **Desktop Client IPC Layer (Active v1.0.0)**: Secure asynchronous IPC bridge (`ipcRenderer.invoke` / `ipcMain.handle`) connecting the React renderer process to the Electron main process via `src/main/preload.js`.
2. **Server REST API Layer [To Be Implemented]**: Target OpenAPI 3.0 compliant HTTPS REST API communicating over TLS 1.3 with JSON payloads and Bearer JWT authentication.

---

## 2. Desktop Electron IPC Bridge API (v1.0.0 Production)

### 2.1 IPC Channel: `save-file`

- **Purpose**: Writes formatted financial reports (CSV, PDF, Excel) or system backup snapshots to the client filesystem.
- **HTTP Method / Protocol**: Electron IPC Protocol (`ipcRenderer.invoke('save-file', payload)`).
- **Authentication**: Native OS local desktop context (No HTTP auth header required).
- **Headers**: Internal Electron Context Bridge.
- **Request (JavaScript Object Payload)**:
  ```typescript
  interface SaveFilePayload {
    filename: string  // Target filename (e.g. "Balance_Sheet_2026-06-30.csv")
    content: string   // Raw text, CSV string, or Base64 file payload
  }
  ```
- **Validation**:
  - `filename` must be a non-empty string ending with valid extension (`.csv`, `.pdf`, `.xlsx`, `.json`, `.txt`).
  - `content` must be a non-empty string payload.
- **Response**: Returns a `Promise<string>` resolving to the absolute output filepath on disk.
  ```typescript
  // Resolves to absolute path:
  "C:\\Users\\Username\\Downloads\\Balance_Sheet_2026-06-30.csv"
  ```
- **Status Codes**:
  - `SUCCESS`: File written successfully to disk.
  - `EACCES`: Permission denied writing to Downloads directory.
  - `ENOSPC`: No disk space available.
- **Error Codes**: `ERR_IPC_BRIDGE_FAILED`, `ERR_FILE_WRITE_DENIED`.
- **Permissions**: Desktop user account file writing privileges.
- **Examples**:
  ```typescript
  // Renderer Call (Reports.tsx)
  const outputPath = await window.api.saveFile('Trial_Balance_2026.csv', csvContent)
  console.log('Saved to:', outputPath)
  ```
- **Rate Limits**: Unrestricted local IPC invocations.
- **Future Extensions**: Support custom user-selected target save directories via native OS Save Dialog.

---

## 3. Target Enterprise REST API Contract `[To Be Implemented]`

### 3.1 Authentication Endpoints

#### `POST /api/v1/auth/login` `[To Be Implemented]`
- **Purpose**: Authenticates user credentials and issues a JWT Bearer Access Token.
- **HTTP Method**: `POST`
- **Authentication**: None (Public Endpoint).
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "email": "admin@insacc.com",
    "password": "SecurePassword123"
  }
  ```
- **Validation**:
  - `email`: Must be a valid email string format.
  - `password`: Must be non-empty string, min 8 characters.
- **Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 86400,
      "user": {
        "id": "u-1719500000000",
        "email": "admin@insacc.com",
        "role": "Admin"
      }
    }
  }
  ```
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `429 Too Many Requests`.
- **Error Codes**: `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`.
- **Permissions**: Public.
- **Examples**:
  ```bash
  curl -X POST https://erp.insacc.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@insacc.com","password":"SecurePassword123"}'
  ```
- **Rate Limits**: 10 requests / minute per IP address.
- **Future Extensions**: Multi-factor authentication (MFA / TOTP) support.

---

#### `POST /api/v1/auth/refresh` `[To Be Implemented]`
- **Purpose**: Refreshes an expired JWT Access Token using a valid Refresh Token.
- **HTTP Method**: `POST`
- **Authentication**: Refresh Token Cookie / Bearer.
- **Headers**: `Content-Type: application/json`
- **Request Body**: `{"refreshToken": "d9a8c7b6..."}`
- **Validation**: `refreshToken` must be active and non-revoked.
- **Response (`200 OK`)**: Returns new `accessToken` and `expiresIn`.
- **Status Codes**: `200 OK`, `401 Unauthorized`.
- **Error Codes**: `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_INVALID`.
- **Permissions**: Public.
- **Examples**: `curl -X POST https://erp.insacc.com/api/v1/auth/refresh -d '{"refreshToken":"..."}'`
- **Rate Limits**: 20 requests / minute per IP.
- **Future Extensions**: Automated token rotation with reuse detection.

---

### 3.2 Investment Module Endpoints

#### `GET /api/v1/investments` `[To Be Implemented]`
- **Purpose**: Retrieves all active portfolio investment holdings and valuation metrics.
- **HTTP Method**: `GET`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Query Parameters**: `?type=Gold&status=active`
- **Validation**: `type` must match known asset classes (`Gold`, `Silver`, `Stocks`, `Bonds`, `ETFs`).
- **Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "inv-1719500000000",
        "assetName": "24K Gold Bar 1kg",
        "assetType": "Gold",
        "quantity": 2.0,
        "purchaseValue": 500000.00,
        "currentPrice": 285000.00,
        "marketValue": 570000.00,
        "unrealizedGain": 70000.00,
        "returnPercentage": 14.0
      }
    ]
  }
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`.
- **Error Codes**: `INVESTMENT_NOT_FOUND`, `UNAUTHORIZED_ACCESS`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/investments`
- **Rate Limits**: 100 requests / minute per user.
- **Future Extensions**: Live market feed ticker price synchronization.

---

#### `POST /api/v1/investments` `[To Be Implemented]`
- **Purpose**: Records a new investment holding position.
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "assetName": "Apple Inc. (AAPL)",
    "assetType": "Stocks",
    "quantity": 100,
    "purchaseValue": 65000.00,
    "currentPrice": 720.00
  }
  ```
- **Validation**:
  - `assetName`: Required string, 1-255 characters.
  - `quantity`: Finite positive number $> 0$.
  - `purchaseValue`: Finite positive number $\ge 0$.
- **Response (`201 Created`)**: Returns created investment object with assigned `id`.
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`.
- **Error Codes**: `VALIDATION_FAILED`, `DUPLICATE_ASSET_NAME`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/investments -d '{...}'`
- **Rate Limits**: 30 requests / minute.
- **Future Extensions**: Link asset purchase to a specific bank account for automated cash deduction.

---

#### `POST /api/v1/investments/purchases` `[To Be Implemented]`
- **Purpose**: Records an asset purchase lot in the Purchase Ledger.
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "purchaseDate": "2026-06-15",
    "assetType": "Gold",
    "assetName": "24K Gold Bar 100g",
    "quantity": 5,
    "unitPrice": 28500.00
  }
  ```
- **Validation**: `quantity` $> 0$, `unitPrice` $\ge 0$, `purchaseDate` valid ISO date.
- **Response (`201 Created`)**: Returns created purchase record and updated item weighted average cost.
- **Status Codes**: `201 Created`, `400 Bad Request`.
- **Error Codes**: `PURCHASE_INVALID_DATA`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/investments/purchases -d '{...}'`
- **Rate Limits**: 30 requests / minute.
- **Future Extensions**: Automated FIFO/LIFO tax lot allocation.

---

### 3.3 Property Management Endpoints

#### `GET /api/v1/properties/units` `[To Be Implemented]`
- **Purpose**: Retrieves all property units with occupancy status and rent rates.
- **HTTP Method**: `GET`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters**: `?buildingId=bld-101&status=Vacant`
- **Validation**: `status` must be `Occupied`, `Vacant`, or `Under Maintenance`.
- **Response (`200 OK`)**: List of unit records with building names and current lease attachments.
- **Status Codes**: `200 OK`, `401 Unauthorized`.
- **Error Codes**: `PROPERTY_INVALID_BUILDING`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/properties/units`
- **Rate Limits**: 100 requests / minute.
- **Future Extensions**: Unit floor plan vector diagram links.

---

#### `POST /api/v1/properties/leases` `[To Be Implemented]`
- **Purpose**: Registers a tenant contract, activates unit lease, and generates PDC cheque entries.
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "tenantName": "John Doe",
    "nationalId": "784-1990-1234567-1",
    "phone": "+971501234567",
    "unitId": "unit-101",
    "startDate": "2026-07-01",
    "endDate": "2027-06-30",
    "annualRent": 120000.00,
    "paymentFrequency": "Quarterly",
    "securityDeposit": 5000.00
  }
  ```
- **Validation**: `unitId` must reference a unit in `Vacant` status. `endDate` must be $> \text{startDate}$.
- **Response (`201 Created`)**: Returns created lease record, updated unit status (`Occupied`), and generated PDC cheque IDs.
- **Status Codes**: `201 Created`, `400 Bad Request`, `409 Conflict`.
- **Error Codes**: `UNIT_ALREADY_OCCUPIED`, `INVALID_LEASE_DATES`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/properties/leases -d '{...}'`
- **Rate Limits**: 20 requests / minute.
- **Future Extensions**: Digital lease document e-signature workflow.

---

#### `POST /api/v1/properties/pdc/transition` `[To Be Implemented]`
- **Purpose**: Transitions a Post-Dated Cheque through its state machine (`Deposited`, `Cleared`, `Bounced`).
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "pdcId": "pdc-1001",
    "targetStatus": "Cleared",
    "bankAccountId": "ba-1719500000000",
    "transitionDate": "2026-07-01"
  }
  ```
- **Validation**: `targetStatus` must be valid state machine transition (`Received` $\rightarrow$ `Deposited` $\rightarrow$ `Cleared`/`Bounced`).
- **Response (`200 OK`)**: Returns updated PDC record and generated accounting voucher ID.
- **Status Codes**: `200 OK`, `400 Bad Request`, `422 Unprocessable Entity`.
- **Error Codes**: `PDC_INVALID_STATE_TRANSITION`, `PDC_NOT_FOUND`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/properties/pdc/transition -d '{...}'`
- **Rate Limits**: 30 requests / minute.
- **Future Extensions**: Automated bank API feed PDC clearance matching.

---

### 3.4 Double-Entry Accounting Endpoints

#### `GET /api/v1/accounting/accounts` `[To Be Implemented]`
- **Purpose**: Retrieves the complete Chart of Accounts hierarchy tree.
- **HTTP Method**: `GET`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response (`200 OK`)**: Complete account tree array with calculated running balances.
- **Status Codes**: `200 OK`, `401 Unauthorized`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/accounting/accounts`
- **Rate Limits**: 60 requests / minute.
- **Future Extensions**: Filter accounts by specific fiscal cost center.

---

#### `POST /api/v1/accounting/vouchers` `[To Be Implemented]`
- **Purpose**: Creates a new double-entry accounting voucher (`RV`, `PV`, `JV`).
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "voucherType": "Receipt",
    "voucherDate": "2026-06-15",
    "narration": "Rent collection Unit 101",
    "lines": [
      {
        "accountId": "1120.001",
        "lineType": "Debit",
        "amount": 10000.00,
        "memo": "Deposit to Emirates Islamic Bank"
      },
      {
        "accountId": "4120",
        "lineType": "Credit",
        "amount": 10000.00,
        "memo": "Rental Revenue"
      }
    ]
  }
  ```
- **Validation**:
  - `voucherType`: Must be `Receipt`, `Payment`, or `Journal`.
  - `lines`: Must contain $\ge 2$ entries.
  - **Balance Assertion**: $\sum \text{Debits} = \sum \text{Credits}$ ($\left| \sum D - \sum C \right| < 0.001$).
- **Response (`201 Created`)**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "v-1719500000000",
      "voucherNumber": "RV-2026-0042",
      "status": "Draft",
      "createdAt": "2026-06-15T10:00:00Z"
    }
  }
  ```
- **Status Codes**: `201 Created`, `400 Bad Request`, `422 Unprocessable Entity`.
- **Error Codes**: `VOUCHER_UNBALANCED`, `ACCOUNT_NOT_FOUND`, `INVALID_LINE_AMOUNT`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/accounting/vouchers -d '{...}'`
- **Rate Limits**: 30 requests / minute.
- **Future Extensions**: Multi-currency line item conversion.

---

#### `POST /api/v1/accounting/vouchers/{id}/post` `[To Be Implemented]`
- **Purpose**: Posts an approved voucher to the General Ledger, rendering it immutable.
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response (`200 OK`)**: Returns posted voucher object with `status: "Posted"` and `postedAt` timestamp.
- **Status Codes**: `200 OK`, `400 Bad Request`, `409 Conflict`.
- **Error Codes**: `VOUCHER_ALREADY_POSTED`, `VOUCHER_UNAPPROVED`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/accounting/vouchers/v-1001/post`
- **Rate Limits**: 30 requests / minute.
- **Future Extensions**: Automated email notification to auditors upon posting large vouchers.

---

#### `POST /api/v1/accounting/vouchers/{id}/reverse` `[To Be Implemented]`
- **Purpose**: Creates an offsetting Reversal Voucher for a posted transaction.
- **HTTP Method**: `POST`
- **Authentication**: Bearer JWT Access Token.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**: `{"reversalReason": "Correction of duplicate entry"}`
- **Validation**: Voucher `{id}` must have `status === "Posted"`.
- **Response (`201 Created`)**: Returns newly created Reversal Voucher object and updates target voucher status to `Reversed`.
- **Status Codes**: `201 Created`, `400 Bad Request`, `409 Conflict`.
- **Error Codes**: `VOUCHER_NOT_POSTED`, `VOUCHER_ALREADY_REVERSED`.
- **Permissions**: Roles: `Admin` only.
- **Examples**: `curl -X POST -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/accounting/vouchers/v-1001/reverse -d '{...}'`
- **Rate Limits**: 10 requests / minute.
- **Future Extensions**: Automatic reversal pairing audit reports.

---

### 3.5 Financial Statement Endpoints

#### `GET /api/v1/reports/balance-sheet` `[To Be Implemented]`
- **Purpose**: Generates the Balance Sheet financial statement as of a target date.
- **HTTP Method**: `GET`
- **Authentication**: Bearer JWT Access Token.
- **Query Parameters**: `?asOfDate=2026-06-30`
- **Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "asOfDate": "2026-06-30",
    "currency": "AED",
    "data": {
      "totalAssets": 1275000.00,
      "totalLiabilities": 50000.00,
      "totalEquity": 1225000.00,
      "netProfit": 0.00,
      "isBalanced": true
    }
  }
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/reports/balance-sheet?asOfDate=2026-06-30`
- **Rate Limits**: 60 requests / minute.
- **Future Extensions**: Comparative prior period side-by-side reporting.

---

#### `GET /api/v1/reports/profit-loss` `[To Be Implemented]`
- **Purpose**: Generates the Profit & Loss statement over a specified date range.
- **HTTP Method**: `GET`
- **Authentication**: Bearer JWT Access Token.
- **Query Parameters**: `?fromDate=2026-01-01&toDate=2026-06-30`
- **Response (`200 OK`)**: Returns Total Revenue, Total Expense, Net Profit, and Category breakdowns.
- **Status Codes**: `200 OK`, `400 Bad Request`.
- **Error Codes**: `INVALID_DATE_RANGE`.
- **Permissions**: Roles: `Admin`, `Accounts`.
- **Examples**: `curl -H "Authorization: Bearer $TOKEN" https://erp.insacc.com/api/v1/reports/profit-loss?fromDate=2026-01-01&toDate=2026-06-30`
- **Rate Limits**: 60 requests / minute.
- **Future Extensions**: Multi-currency conversion for foreign operations.

---

## 4. Standard Error Code Reference

All target REST API endpoints return errors in a standardized RFC 7807 JSON payload:

```json
{
  "status": "error",
  "errorCode": "VOUCHER_UNBALANCED",
  "message": "Voucher lines are unbalanced. Total Debits (AED 10,000.00) != Total Credits (AED 9,500.00).",
  "timestamp": "2026-07-22T14:30:00.000Z",
  "path": "/api/v1/accounting/vouchers"
}
```

### Standard Error Dictionary

| Error Code | HTTP Status | Root Cause & Resolution |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Incorrect email or password. Verify credentials. |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token expired. Issue request to `/auth/refresh`. |
| `UNAUTHORIZED_ACCESS` | 403 | User role lacks permissions for target resource. |
| `VOUCHER_UNBALANCED` | 422 | Debit line total does not equal Credit line total. |
| `VOUCHER_ALREADY_POSTED` | 409 | Attempted to post an already posted voucher. |
| `UNIT_ALREADY_OCCUPIED` | 409 | Attempted to assign lease to non-vacant unit. |
| `PDC_INVALID_STATE_TRANSITION` | 422 | Invalid PDC transition (e.g. `Received` $\rightarrow$ `Cleared` without `Deposited`). |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded API rate limits. Retry after `Retry-After` seconds. |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error. Contact engineering support. |

---

*End of API Contract Specification.*
