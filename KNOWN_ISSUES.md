# Known Issues — InsAcc v1.0.0

**Last Updated:** 2026-06-30

This document lists all known limitations, bugs, and unimplemented features in the current release.

---

## Security

| Issue | Severity | Details |
|-------|----------|---------|
| Password stored in plaintext | Medium | Password is saved to `localStorage` as plaintext. Anyone with local machine access can read it. |
| Any email accepted for login | Low | The login accepts any email string as long as the password matches. No email validation or user-specific credentials. |
| No session expiry | Low | Once logged in, there is no session timeout or token expiry. Closing the app is the only logout. |

---

## Functionality

| Issue | Severity | Details |
|-------|----------|---------|
| Auto-logout not implemented | Medium | The Settings page has an auto-logout timeout dropdown (15/30/60 min, Never), but no actual timeout logic executes. The user remains logged in indefinitely. |
| Language translations incomplete | Medium | Only 33 UI strings are translated across English, Arabic, and French. Many labels, tooltips, and messages are English-only. |
| Notification system is placeholder | Low | Notification toggle switches exist in Settings, but only produce toast messages. No push, email, SMS, or scheduling is implemented. |
| Pagination on Investment table | Low | The Investments page renders all records at once. No server-side or virtual pagination. Works fine for typical portfolio sizes (<500). |
| Chart data defaults empty | Low | Asset allocation, cash flow, and investment growth charts initially render with empty data. Charts populate as user adds records. Seed data provides demo content. |
| No full data export/backup | Low | Individual reports (CSV) and bank statements can be exported. No one-click export of all `insacc_*` localStorage data. |

---

## Data & Persistence

| Issue | Severity | Details |
|-------|----------|---------|
| Profiles are hardcoded | Medium | User profiles (Sameer Ishaq Harmoudi, Accounts) are defined in `App.tsx` source code. Cannot add/edit/delete profiles through the UI. |
| No real user creation | Medium | The Settings → Users tab has an "Add User" button but it only manages roles (Admin/Accounts) for existing hardcoded profiles. |
| Schema versioning wipes data | Medium | When `CLEAR_VERSION` increments, all localStorage data is deleted. Any future update that changes the schema will lose existing user data. |
| Contract files stored as base64 | Medium | Uploaded PDF and image files for tenant contracts are stored as base64 strings in localStorage. Large files (multiple MB) can exceed the ~5MB localStorage quota. |
| No data migration path | Low | Schema versioning is all-or-nothing. No incremental migration logic exists. |
| Dark mode not persisted | Low | Theme preference resets on app restart. The Settings toggle is remembered during session but not saved to localStorage. |

---

## UI/UX

| Issue | Severity | Details |
|-------|----------|---------|
| No responsive mobile layout | Low | The app is desktop-first. Sidebar collapses at 768px, but table layouts and forms may overflow on very small screens. |
| No keyboard shortcuts | Low | No global keyboard shortcuts for common actions (Ctrl+N for new entry, Ctrl+S for save, etc.). |
| No form auto-save | Low | Forms are not auto-saved. Closing a form discards unsaved input. |
| Toast notifications disappear quickly | Low | Success/error toasts auto-dismiss after ~2.2 seconds. May be too fast for some users to read. |
| Loading states inconsistent | Low | Some pages show loading spinners, others show instant content. No consistent loading pattern across all views. |

---

## Accounting System

| Issue | Severity | Details |
|-------|----------|---------|
| No contra accounts | Low | No support for contra-asset, contra-liability, or contra-equity accounts (accumulated depreciation, treasury stock, etc.). |
| No period closing | Low | There is no end-of-period closing process. Revenue and expense accounts do not get closed to retained earnings. |
| No multi-currency accounting | Low | All accounts are in a single currency (AED by default). No FX conversion or multi-currency support. |
| Limited audit trail | Low | Voucher lifecycle is tracked (Draft → Approved → Posted), but there is no full audit trail showing who changed what and when for voucher edits. |
| No reversing entries | Low | No automatic reversing entry generation for accruals or prepayments. |

---

## Testing

| Issue | Severity | Details |
|-------|----------|---------|
| No unit tests | Medium | The project has 76 Playwright end-to-end tests but zero unit tests for the accounting engine, services, or read models. |
| Test coverage gaps | Low | E2E tests cover investment transactions and purchase ledger. Property module accounting and property-specific workflows are not covered by automated tests. |
| Visual tests require baselines | Low | Reports visual tests capture screenshots but there are no CI pipeline to approve visual diffs. Baseline images must be manually updated. |

---

## Build & Deployment

| Issue | Severity | Details |
|-------|----------|---------|
| No CI/CD pipeline | Low | No GitHub Actions or other CI configuration. Builds and tests must be run manually. |
| Electron auto-updater not configured | Low | No auto-update mechanism. Users must download new versions manually. |
| macOS notarization not configured | Low | macOS builds are not notarized. Users may see security warnings on first launch. |
| Windows code signing not configured | Low | Windows installer is not code-signed. SmartScreen may show warnings. |

---

## Performance

| Issue | Severity | Details |
|-------|----------|---------|
| localStorage size limit | Low | Browsers typically limit localStorage to 5-10MB. With document uploads (base64), this limit can be reached. |
| No lazy loading | Low | All components are eagerly loaded. No code splitting or lazy loading implemented. |

---

## Planned Resolutions (Future Roadmap)

| Issue | Planned Fix | Priority |
|-------|-------------|----------|
| Password in plaintext | Hash password before storing (even in localStorage) | High |
| Dark mode not persisted | Save theme preference to localStorage | High |
| Profiles not editable | Add profile management to Settings | Medium |
| Auto-logout not implemented | Implement timeout logic using `setTimeout` on login | Medium |
| No full data export | Add JSON export of all localStorage keys | Medium |
| Contract file storage | Store files in Electron `userData` directory instead of base64 | Medium |
| No unit tests | Add Vitest + React Testing Library tests for accounting engine and services | Medium |
| No CI/CD | Add GitHub Actions pipeline for lint, typecheck, build, test | Low |
| No lazy loading | Code-split routes with React.lazy() | Low |
| Notification system | Implement scheduled notifications via Electron Notification API | Low |
