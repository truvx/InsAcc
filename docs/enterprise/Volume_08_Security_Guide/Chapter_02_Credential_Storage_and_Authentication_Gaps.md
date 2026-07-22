---
title: "Volume 08: Security Guide - Chapter 02: Credential Storage and Authentication Gaps"
document_id: "INSACC-DOC-V08-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 08: InsAcc Security Guide
## Chapter 02: Credential Storage and Authentication Gaps

> **Single Source of Truth Reference**: All security audit findings, credential storage analysis, and authentication gap documentation defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Security Audit Findings & Executive Summary](#71-security-audit-findings--executive-summary)
  - [7.2 Finding 1: Plaintext Password Storage (`storedPassword` in `App.tsx`)](#72-finding-1-plaintext-password-storage-storedpassword-in-apptsx)
  - [7.3 Finding 2: Lack of Cryptographic Password Hashing (PBKDF2 / Argon2id)](#73-finding-2-lack-of-cryptographic-password-hashing-pbkdf2--argon2id)
  - [7.4 Finding 3: Unencrypted Storage at Rest (`localStorage`)](#74-finding-3-unencrypted-storage-at-rest-localstorage)
  - [7.5 Finding 4: Session Expiration & Role Escalation Gaps](#75-finding-4-session-expiration--role-escalation-gaps)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides a security audit analysis of credential storage mechanisms, authentication gaps, and data-at-rest vulnerabilities identified in InsAcc v1.0.0.

---

## 2. Scope

This specification covers:
- In-depth technical analysis of security audit findings in InsAcc v1.0.0.
- Finding 1: Plaintext password storage in `localStorage` (`storedPassword` state in `App.tsx`).
- Finding 2: Lack of salted cryptographic password hashing (bcrypt / Argon2id / PBKDF2).
- Finding 3: Unencrypted data at rest in browser `localStorage`.
- Finding 4: In-memory session timeout and role escalation vulnerabilities.
- Operational mitigation controls for deployment teams.

Out of Scope:
- General Electron client process isolation (covered in [Volume 08 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_01_Client_Security_and_Isolation.md)).
- Enterprise security hardening roadmap `[To Be Implemented]` (covered in [Volume 08 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_03_Security_Hardening_Roadmap_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Chief Information Security Officers (CISOs) & Security Auditors
- Enterprise Risk & Compliance Assessment Officers
- Lead Software Engineers & Security Architects

---

## 4. Prerequisites

Before reviewing security audit findings:
1. Review the security architecture in [MASTER_ARCHITECTURE.md#8-security-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#8-security-architecture).
2. Understand Web Crypto API standards, key derivation functions (PBKDF2), and local data storage mechanics.

---

## 5. Warnings & Operational Hazards

> [!IMPORTANT]
> **TRANSPARENT AUDIT MANDATE**: InsAcc documentation adheres strictly to the single source of truth mandate. Security vulnerabilities present in v1.0.0 source code MUST be documented transparently rather than obfuscated. Enterprise deployment teams must implement compensating controls (Section 7.5) until release v2.0.0 hardening is deployed.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Threat Boundary Context**: Because InsAcc v1.0.0 executes locally without external network endpoints, these credential findings represent **local workstation physical access threats** rather than remote network exploitation vectors.

---

## 7. Main Content

### 7.1 Security Audit Findings & Executive Summary

A comprehensive source code security review of InsAcc v1.0.0 identified four primary authentication and data storage gaps:

| Finding ID | Severity | Vulnerability Summary | Source Code Location |
|---|---|---|---|
| **SEC-01** | **High** | Plaintext Password Storage | `src/renderer/App.tsx` (`storedPassword`) |
| **SEC-02** | **High** | Absence of Cryptographic Hashing | `src/renderer/components/Login.tsx` |
| **SEC-03** | **Medium** | Unencrypted Data at Rest | Browser `localStorage` (All 16 Keys) |
| **SEC-04** | **Medium** | Absence of Session Auto-Timeout | Client App Shell (`App.tsx`) |

---

### 7.2 Finding 1: Plaintext Password Storage (`storedPassword` in `App.tsx`)

#### Technical Vulnerability Analysis:
In `src/renderer/App.tsx`, the application security PIN / master password is read and persisted as a **raw, unencrypted string**:

```typescript
// Code Snippet from App.tsx (v1.0.0 Production State)
const [storedPassword, setStoredPassword] = usePersistedState<string>('insacc_password', '1234')
```

#### Risk Impact:
Any local user or process with read access to the workstation filesystem can inspect `%APPDATA%\InsAcc\Local Storage\leveldb` (Windows) or `~/Library/Application Support/InsAcc/Local Storage/leveldb` (macOS) and extract the master password in plain text.

---

### 7.3 Finding 2: Lack of Cryptographic Password Hashing (PBKDF2 / Argon2id)

#### Technical Vulnerability Analysis:
During authentication in `src/renderer/components/Login.tsx`, PIN validation performs a direct string comparison:

```typescript
// Code Snippet from Login.tsx (v1.0.0 Production State)
if (inputPin === storedPassword) {
  setIsAuthenticated(true)
} else {
  setError('Invalid Security PIN')
}
```

#### Risk Impact:
Because passwords are not passed through a salted Key Derivation Function (KDF) like Argon2id or PBKDF2, credential storage lacks resistance to offline dictionary and brute-force inspection attacks.

---

### 7.4 Finding 3: Unencrypted Storage at Rest (`localStorage`)

#### Technical Vulnerability Analysis:
All 16 operational storage keys (`insacc_investments`, `insacc_transactions`, `insacc_prop_tenants`) are serialized as unencrypted JSON text strings into `localStorage`.

#### Risk Impact:
If a workstation is stolen or decommissioned without disk wiping, unencrypted financial ledgers can be extracted directly from disk files.

---

### 7.5 Finding 4: Session Expiration & Role Escalation Gaps

#### Technical Vulnerability Analysis:
Once authenticated, InsAcc maintains active session state indefinitely until the window is closed or the user explicitly clicks **Logout**. There is no automated inactivity timeout lock.

#### Compensating Controls for Deployment Teams:
1. Enforce OS-level full disk encryption (BitLocker / FileVault).
2. Configure OS screen lock inactivity timeouts (5 minutes max).
3. Restrict physical workstation access to authorized personnel.

---

## 8. Summary

The security audit of InsAcc v1.0.0 highlights key areas for hardening, including plaintext password persistence (`storedPassword` in `App.tsx`) and unencrypted `localStorage` data at rest. By implementing compensating physical security controls and OS disk encryption, deployment teams can mitigate workstation threats until enterprise release v2.0.0 hardening is deployed.

---

## 9. Chapter Appendix

### Security Vulnerability Matrix & Remediation Target

| Finding ID | Vulnerability Description | Target Fix Architecture | Planned Target Version |
|---|---|---|---|
| **SEC-01** | Plaintext password in `localStorage` | Web Crypto API PBKDF2 Hashing | Version 2.0.0 `[Planned]` |
| **SEC-02** | Direct string PIN comparison | Salted Argon2id / PBKDF2 KDF | Version 2.0.0 `[Planned]` |
| **SEC-03** | Unencrypted storage at rest | SQLCipher Encrypted Database | Version 2.0.0 `[Planned]` |
| **SEC-04** | Missing idle session timeout | 15-Minute Auto-Lock Timer | Version 1.1.0 `[Planned]` |

---

## 10. Glossary

- **Argon2id**: A modern, memory-hard key derivation function recommended for secure password hashing.
- **Data at Rest**: Inactive data stored physically in databases, data warehouses, or local disk files.
- **PBKDF2 (Password-Based Key Derivation Function 2)**: A key derivation function that applies a pseudorandom function to the input password along with a salt value.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Client Security & Isolation: [Volume 08 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_01_Client_Security_and_Isolation.md)
- Security Hardening Roadmap: [Volume 08 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_03_Security_Hardening_Roadmap_[To_Be_Implemented].md)
