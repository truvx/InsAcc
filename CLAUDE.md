# InsAcc - Intelligent Asset & Investment Accounting

## Tech Stack
- Electron
- React
- TypeScript
- SQLite
- Tailwind CSS

## Design Philosophy
Premium desktop ERP inspired by:
- Stripe
- Linear
- Mercury
- Zoho Books

## Development Rules

- Never hardcode balances.
- Never fabricate financial values.
- Always derive balances from ledger entries.
- Follow double-entry accounting.
- Investment and Property modules are completely isolated.
- Reuse existing services whenever possible.
- Preserve architecture unless explicitly instructed.
- Never break Electron compatibility.
- Never create duplicate business logic.
- Prefer reusable components.
- Keep UI consistent with the existing design system.
- Run TypeScript validation after modifications.
- Explain architectural decisions before major refactors.
