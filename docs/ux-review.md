# UX Review — InsAcc

## Accessibility Findings

### Passed
- All interactive elements have visible `:focus-visible` outlines (2px solid blue, 2px offset)
- Color contrast ratios meet WCAG AA standards across light and dark modes:
  - Text on backgrounds: minimum 4.5:1 for body text, 3:1 for large text
  - All status colors (success, warning, danger, info) paired with light tinted backgrounds
- Semantic HTML: buttons use `<button>`, navigation uses `<button>` with `aria-current`
- All icon-only buttons include `aria-label` attributes
- Modal dialogs use `role="dialog"` and `aria-modal="true"`
- Tab components use `role="tab"` and `aria-selected`
- Form inputs are properly associated with labels via `htmlFor`/`id`
- Reduced motion: all animations use `ms` durations; no parallax or motion-triggered effects
- Keyboard navigation is fully supported: tab through all controls, enter/space to activate

### Findings & Fixes Applied
- **Toast icons replaced**: Emoji characters (✓, ✕) replaced with SVG icons for consistent rendering across platforms and screen reader compatibility
- **Toast CSS classes fixed**: Previously used bare `success`/`error` classes that didn't match CSS `.toast-success`/`.toast-error` selectors — now uses `toast-${type}` pattern
- **Modal class mismatch fixed**: Standalone Modal component used `.modal-content` class that had no CSS definition — corrected to use `.modal` (matching DesignSystem Modal)
- **Modal backdrop restored**: Added `.modal-backdrop` with `onClick={onClose}` for dismiss-on-backdrop behavior
- **Toast message structure**: Message now wrapped in `.toast-message` span for proper layout
- **Toast closing animation**: CSS class changed from `out` to `toast-out` to match the defined animation

## Consistency Findings

### Passed
- All buttons follow the `.btn` + `.btn-{variant}` pattern — 5 variants (primary, secondary, ghost, danger, icon)
- Button sizes consistent: `.btn-sm` (26px), default (32px), `.btn-lg` (40px)
- All inputs use consistent `.input` class with 36px height, same border/radius/typography
- Form structure: `.form-group` > `.form-label` + `.input` + optional `.form-error`/`.form-hint`
- Table structure: `.table-container` > `table` > `thead` + `tbody`, sticky headers
- KPI cards: `.kpi-card` > `.kpi-label` + `.kpi-value` + optional `.kpi-change`
- Badges: `.badge` + `.badge-{variant}` — 5 color variants
- Cards: `.card` > `.card-header` + `.card-body`
- Modal pattern: `.modal-overlay` > `.modal-backdrop` + `.modal` > `.modal-header` + `.modal-body` + `.modal-footer`
- Page layout: `.page-header` + `.page-body` consistently across all 10+ pages
- Empty states: `.empty-state` > `.empty-state-icon` + `.empty-state-title` + `.empty-state-text` + optional action
- Design language unified via CSS custom properties (`--primary`, `--border`, `--text-*`, `--bg-*`, etc.)
- Spacing uses consistent 4px grid: `--space-{1,2,3,4,5,6,8,10,12,16}`
- Typography uses consistent scale: `--font-size-{xs,sm,base,md,lg,xl,2xl,3xl,4xl}`

### Inline Style Audit
- **Before**: Dashboard used 4 inline `style={{}}` blocks for layout spacing and grid
- **After**: All replaced with CSS classes: `.chart-grid`, `.card-table`, `.mb-6`, `.mb-0`
- **Remaining**: Some third-party chart components (Recharts) use inline styles via their API, which is acceptable

### Component Import Audit
- `Button` and `Badge` consistently imported from `./design/DesignSystem` in 4 components
- `KpiCard` used from `DesignSystem` in Dashboard
- `Modal` imports: uses standalone Modal component (Property.tsx) — could be migrated to DesignSystem Modal in future
- `Toast` used consistently across all interactive components

## Trust and Readability Improvements

### Visual Hierarchy
- Page headers with clear title/subtitle pattern provide orientation
- Section grouping via cards with headers and borders
- Numeric columns right-aligned with `font-variant-numeric: tabular-nums` for financial readability
- Table rows highlight on hover for tracking position during scanning
- Sticky table headers keep context visible during scroll

### Data Density
- Font calibrated at 13px base for data-dense views without sacrificing readability
- Table cells use compact 8px/12px vertical padding — tight enough for scanning, spacious enough for touch
- KPI grid auto-fits to available width with `repeat(auto-fit, minmax(180px, 1fr))`
- Grid-2 and grid-3 layouts for side-by-side comparison views

### Visual Communication
- Status badges use color + text (never color alone)
- KPI changes show direction arrows (↑↓→) + numeric value + color coding
- Toast notifications use left-border accent for type identification
- Empty states provide actionable guidance, not dead ends
- All modals have clear titles and close buttons

### Dark Mode
- Full dark mode via `.dark-mode` class on `<html>`
- All 28 CSS variables remapped for dark backgrounds
- Shadows adjusted for dark mode (lower opacity, darker tones)
- All components tested in both modes

### Responsive Behavior
- Sidebar collapses to icon-only at 768px
- Grid layouts collapse to single column at 1024px
- KPI grid adapts: 4 columns > 2 columns > 1 column
- Forms and filter bars stack vertically on small screens
- Tables horizontally scroll rather than wrap

## Design System Components
All defined in `src/renderer/components/design/DesignSystem.tsx`:
- `Button` — 4 variants, 3 sizes, loading state, icon support
- `IconButton` — compact icon-only button with aria-label
- `Input` — with label, error, hint, forwarded ref
- `Select` — with label, error, options
- `Badge` — 5 color variants
- `Card` — with optional title and actions
- `KpiCard` — with label, value, optional change indicator
- `Tabs` — with aria roles and active state
- `EmptyState` — with icon, title, text, optional action
- `Modal` — portal-based with backdrop, header, body, footer
- `Spinner` — animated loading indicator
- SVG Icons — Close, ChevronDown, Plus, Search, Trash, Edit, Download, Upload, Filter, Refresh, ChevronLeft

## Assumptions
1. **Inter font is the best open-source alternative to SF Pro** — installed as webfonts (woff2) for cross-platform consistency
2. **All users are on modern browsers** (Chrome/Edge/Firefox/Safari within 2 major versions) — CSS custom properties and Grid layout used
3. **Financial users prefer density over whitespace** — base font 13px, compact tables
4. **Indigo (#6366F1) is the safest enterprise accent color** — widely used in financial/professional software, conveys trust
5. **Slate gray neutrals avoid brand conflicts** — neutral enough to feel institutional, warm enough to not feel cold
6. **No external icon library needed** — all icons are inline SVGs in DesignSystem.tsx, zero HTTP requests
7. **localStorage persistence is acceptable for a desktop app** — per the existing architecture decision
8. **Electron context is assumed** — no external font loading, no network-dependent assets
