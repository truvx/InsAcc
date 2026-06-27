# AI Rules — InsAcc

This document defines how all AI assistants must work on the InsAcc project.

## Before Making Changes

- Always read `docs/PRD.md`, `docs/DESIGN_SYSTEM.md`, and `docs/ARCHITECTURE.md` first.
- Understand the full context of the codebase before editing.
- Reference the design system for every UI decision.

## Business Logic & Data

- Preserve all business logic unless explicitly instructed.
- Never modify authentication without permission.
- Never change database models without approval.
- Never remove existing functionality.
- Never introduce breaking changes to persisted data.

## Code Quality

- Follow the design system exactly.
- Reuse existing components whenever possible.
- Prefer composition over duplication.
- Keep code modular and maintainable.
- Use TypeScript best practices.
- Write readable code with meaningful names.
- Avoid unnecessary dependencies.
- Prefer performance and accessibility.
- Generate reusable components instead of one-off implementations.

## Decision Making

- If unsure, explain your reasoning before making major changes.
- If a requested change conflicts with the design system, explain the conflict before proceeding.
- Choose the option that best matches the design system when ambiguous.

## Version Control

- Keep commits focused on a single feature or fix.
- Write clear commit messages describing what and why.

## Compatibility

- Maintain compatibility with Electron, React, and Vite.
- Do not modify Electron configuration, main process, or preload scripts unless explicitly asked.
- Do not modify Vite configuration without explicit instruction.

## Scope

- Focus on frontend UI and component work unless directed otherwise.
- Backend logic, APIs, database models, authentication, and build tooling are out of scope unless explicitly requested.
