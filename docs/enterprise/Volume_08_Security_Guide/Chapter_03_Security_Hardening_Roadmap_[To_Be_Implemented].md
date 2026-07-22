---
title: "Volume 08: Security Guide - Chapter 03: Security Hardening Roadmap [To Be Implemented]"
document_id: "INSACC-DOC-V08-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Target Architecture Specification"
classification: "Commercial Enterprise Documentation"
---

# Volume 08: InsAcc Security Guide
## Chapter 03: Security Hardening Roadmap `[To Be Implemented]`

> **Single Source of Truth Reference**: All security hardening specifications, cryptographic hash standards, and database encryption plans defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Hardening Roadmap Architecture Overview](#71-hardening-roadmap-architecture-overview)
  - [7.2 Cryptographic Password Hashing Implementation (PBKDF2 / Web Crypto API)](#72-cryptographic-password-hashing-implementation-pbkdf2--web-crypto-api)
  - [7.3 Local Database Encryption at Rest via SQLCipher](#73-local-database-encryption-at-rest-via-sqlcipher)
  - [7.4 Session Auto-Lock Timer & Inactivity Invalidation](#74-session-auto-lock-timer--inactivity-invalidation)
  - [7.5 Code Signing & Binary Integrity Verification](#75-code-signing--binary-integrity-verification)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the technical security hardening roadmap for InsAcc `[To Be Implemented]`. It details planned cryptographic updates, local database encryption at rest using SQLCipher, automated session auto-lock timers, and code signing certification planned for release v2.0.0.

---

## 2. Scope

This specification covers:
- Web Crypto API PBKDF2 / Argon2id salted password hashing implementation specs.
- Local database encryption at rest using SQLCipher (AES-256).
- Automated 15-minute idle session auto-lock timer (`useIdleTimer.ts`).
- Code signing certification (EV Code Signing for Windows, Apple Notarization for macOS).
- Role-based permission enforcement at the API service layer.

Out of Scope:
- Current client security isolation parameters (covered in [Volume 08 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_01_Client_Security_and_Isolation.md)).
- Audit findings for v1.0.0 (covered in [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md)).

---

## 3. Audience

This document is authored for:
- Security Engineers and Cryptographic Software Developers
- Enterprise IT Security Compliance Officers
- Chief Information Security Officers (CISOs)

---

## 4. Prerequisites

Before evaluating security hardening specifications:
1. Review the security architecture in [MASTER_ARCHITECTURE.md#8-security-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#8-security-architecture).
2. Review current audit findings in [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **To Be Implemented**: The cryptographic hashing algorithms, SQLCipher database encryption, and code signing procedures documented in this chapter are target security specifications planned for release v2.0.0.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Native Web Crypto Integration**: Password hashing will leverage the browser's native `window.crypto.subtle` API, eliminating external JavaScript crypto library dependencies while ensuring hardware-accelerated performance.

---

## 7. Main Content

### 7.1 Hardening Roadmap Architecture Overview `[To Be Implemented]`

```
                       Security Hardening Roadmap (Release v2.0.0)
                                           │
     ┌─────────────────────────────────────┼─────────────────────────────────────┐
     │                                     │                                     │
     ▼                                     ▼                                     ▼
1. Web Crypto PBKDF2                 2. SQLCipher AES-256                   3. Code Signing &
   Salted Password Hashing               Encrypted Local Database                 Apple Notarization
```

---

### 7.2 Cryptographic Password Hashing Implementation (PBKDF2 / Web Crypto API) `[To Be Implemented]`

Target implementation using `window.crypto.subtle` (`securityService.ts`):

```typescript
export async function hashPasswordPBKDF2(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    'PBKDF2', 
    false, 
    ['deriveBits', 'deriveKey']
  )

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000, // OWASP 2026 PBKDF2 Iteration Baseline
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  const exported = await window.crypto.subtle.exportKey('raw', derivedKey)
  return Buffer.from(exported).toString('hex')
}
```

---

### 7.3 Local Database Encryption at Rest via SQLCipher `[To Be Implemented]`

In enterprise release v2.0.0, browser `localStorage` will be replaced by an embedded **SQLCipher SQLite Database** encrypted with AES-256:

- **Encryption Standard**: AES-256-CBC with PBKDF2 key derivation (64,000 iterations).
- **Master Encryption Key**: Derived from user PIN and stored securely in OS credential vaults:
  - **Windows**: Windows Credential Manager (`wincred`).
  - **macOS**: Apple Keychain Services (`keychain`).
  - **Linux**: Secret Service API / `libsecret`.

---

### 7.4 Session Auto-Lock Timer & Inactivity Invalidation `[To Be Implemented]`

A custom React hook (`useIdleTimer.ts`) will track user activity:

```typescript
// Target Idle Timer Hook Spec
export function useIdleTimer(timeoutMs: number = 900000, onIdle: () => void) {
  useEffect(() => {
    let timer: NodeJS.Timeout
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(onIdle, timeoutMs) // 15-Minute Default (900,000 ms)
    }

    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    resetTimer()

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
    }
  }, [timeoutMs, onIdle])
}
```

---

### 7.5 Code Signing & Binary Integrity Verification `[To Be Implemented]`

To ensure client binary authenticity:
1. **Windows**: Executables signed with an Extended Validation (EV) Code Signing Certificate via SignTool.
2. **macOS**: App bundles signed with Apple Developer ID Application certificates and submitted to Apple Notarization service (`xcrun notarytool`).

---

## 8. Summary

The security hardening roadmap defines a comprehensive security architecture for release v2.0.0. By implementing Web Crypto PBKDF2 password hashing, SQLCipher AES-256 database encryption, 15-minute idle session auto-locking, and OS code signing, InsAcc achieves enterprise security compliance.

---

## 9. Chapter Appendix

### Security Feature Release Schedule Matrix

| Security Feature | Cryptographic Primitive / Tool | Target Release Version | Implementation Status |
|---|---|---|---|
| **PBKDF2 Password Hashing** | SHA-256 (600,000 Iterations) | Version 2.0.0 | `[To Be Implemented]` |
| **SQLCipher Storage** | AES-256-CBC Encrypted DB | Version 2.0.0 | `[To Be Implemented]` |
| **OS Keychain Storage** | `keytar` / Apple Keychain | Version 2.0.0 | `[To Be Implemented]` |
| **Idle Session Auto-Lock** | 15-Minute Activity Timer | Version 1.1.0 | `[To Be Implemented]` |
| **EV Code Signing** | Windows EV & Apple Notary | Version 1.1.0 | `[To Be Implemented]` |

---

## 10. Glossary

- **AES-256**: Advanced Encryption Standard using a 256-bit key size, widely recognized as computationally unbreakable.
- **SQLCipher**: An open-source extension to SQLite that provides transparent 256-bit AES encryption of database files.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Client Security & Isolation: [Volume 08 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_01_Client_Security_and_Isolation.md)
- Credential Storage Audit: [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md)
