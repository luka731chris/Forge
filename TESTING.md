# Forge Pre-Launch Testing Record
## Kona Ironman Edition — Full End-to-End Audit
**Date:** April 26, 2026  
**Versions:** index.html (lean_4.0 / 5,431 lines / 273KB) · forge-pulse.html (2,590 lines / 139KB)  
**Status: ✓ ALL STRUCTURAL CHECKS PASSING**

---

## 1. Structural Integrity

| Check | Desktop | Pulse |
|---|---|---|
| Static HTML div balance | ✓ 169/169 | ✓ 72/72 |
| CSS brace balance | ✓ 156/156 | ✓ 171/171 |
| Undefined CSS variables | ✓ NONE | ✓ NONE |
| Duplicate functions | ✓ NONE | ✓ NONE |
| Missing critical functions | ✓ NONE | ✓ NONE |
| Total functions defined | 102 | 67 |

---

## 2. Pages & Navigation

### Desktop (12 pages)
`upload` · `dashboard` · `cashflow` · `categories` · `transactions` · `creditflow` · `balancesheet` · `financials` · `budget` · `calendar` · `validate` · `income`

### Pulse (5 tabs)
`snapshot` (The Gauge) · `alerts` (P&L) · `amazon` (Net Worth) · `analytics` · `chat` (Ask $id)

---

## 3. Data Layer

| Feature | Desktop | Pulse | Notes |
|---|---|---|---|
| Primary storage key | `forge_prod_v1` | reads `forge_prod_v1` first | Then falls back to `ledger_v3` |
| Settings key | `forge_settings_v2` | reads `forge_settings_v2` | Falls back to v1 |
| `spendable()` excludes transfers | ✓ | ✓ | Core dedup function |
| `isTransfer()` catches `[AccountName]` | ✓ | ✓ | Quicken bracket notation |
| `isTransfer()` catches Apple Card | ✓ | ✓ | Both category and payee-based |
| `isTransfer()` catches CC Payment category | ✓ | ✓ | Without brackets |
| `classifyTxn()` handles `--Split--` | ✓ | ✓ | 30+ payee patterns |
| `QUICKEN_CAT_MAP` defined | ✓ | ✓ | Raw Quicken → bucket mapping |
| `KW_MAP` defined | ✓ | ✓ | Keyword → bucket fallback |
| `BUCKET_META` defined | ✓ | ✓ | Bucket → label/icon/color |
| `WATERFALL` 7 sections | ✓ | ✓ | Income/Saving/Fixed/Util/Nec/Disc/Other |
| `acctMeta` declared | N/A | ✓ | Safe default `{}` |
| `acctMeta` populated from ledger | N/A | ✓ | From `d.acctMeta` in `load()` |
| `isCreditAcct()` null-safe | N/A | ✓ | Guards with `typeof acctMeta !== 'undefined'` |

---

## 4. Desktop Feature Matrix

### Import & Upload
- ✓ `handleFiles()` drop zone wiring
- ✓ `autoDetect` file format detection (Quicken CSV/QIF/QFX, Amazon, Apple Card, generic)
- ✓ `parseCSV()` with BOM, sep=, semicolon/pipe, European decimal
- ✓ Import hard-replaces data (no merge) — wipes stale data on each import
- ✓ Smart Scan via `WORKER_URL` → Cloudflare Worker `/scan` endpoint
- ✓ Demo data loads cleanly without contaminating real data

### Charts & Visualizations
- ✓ `svgBar()` with viewBox, overflow:hidden, bindChartTips
- ✓ `svgLine()` with fill areas and dash lines
- ✓ `svgHBar()` horizontal bars
- ✓ `svgWaterfall()` waterfall chart
- ✓ `makeDonut()` Chart.js donut for dashboard
- ✓ `showChartTip()` / `hideChartTip()` / `positionChartTip()` hover tooltips
- ✓ `bindChartTips()` post-render event binding (avoids SVG scope issue)
- ✓ `#chartTip` div in static HTML

### Income Statement Drilldown
- ✓ 3-level expansion: Section → Bucket → Payee → Individual Transactions
- ✓ `isDrillOpen` / `isBucketOpen` state dictionaries
- ✓ `chevron()` animated SVG chevrons
- ✓ `toggleSection()` / `toggleBucket()` click handlers
- ✓ `isSort` state for sort field + direction
- ✓ Sort dropdown (Date / Amount / Payee A-Z) in IS header
- ✓ 320px cap with scroll on payee transaction lists > 8 items
- ✓ `--Split--` transactions unmasked to real payee + descriptive sub-label
- ✓ `→ txns` drill link on every section row
- ✓ `→` drill link on every bucket row
- ✓ `drillToCategory()` navigates to Transactions page pre-filtered

### Transactions Page
- ✓ `txnSort` state — clickable `↑/↓` headers on all 5 columns
- ✓ `txnDrillCat` sticky drill filter from IS
- ✓ `txnDrillBanner` shows active filter + ✕ Clear button
- ✓ `drillToCategory()` → `clearDrill()` full drill cycle
- ✓ Pagination (PAGE_SZ rows per page)
- ✓ Search, account filter, category filter

### Categories Page
- ✓ Groups by `classifyTxn()` bucket, not raw Quicken category string
- ✓ `--Split--` never appears as a category
- ✓ Clickable rows drill to Transactions filtered by bucket
- ✓ SVG horizontal bar + donut both use classified labels

### Balance Sheet
- ✓ `renderBalanceSheet()` with historical comparison dropdown
- ✓ Assets / Liabilities / Net Worth calculation

### Family Financial Statements
- ✓ `renderFinancials()` VC-grade P&L with YTD and prior period comparison
- ✓ Uses `classifyTxn()` for category buckets (not raw strings)
- ✓ Top 10 categories, savings rate, expense ratio, 12-month projection
- ✓ Year selector and TTM mode

### Cloud Sync
- ✓ `WORKER_URL` constant (single place to set)
- ✓ `getSyncToken()` — prompts once, stores to `forge_sync_token` in localStorage
- ✓ `syncPush()` — reads `forge_prod_v1` → `forge_lean_v1` → `ledger_v3` (priority chain)
- ✓ `syncPull()` — writes to both `forge_prod_v1` and `ledger_v3`
- ✓ Push to Cloud + Pull from Cloud buttons on Import page
- ✓ Cloudflare Worker endpoints: `/sync/push` (POST) and `/sync/pull` (GET)
- ✓ `SYNC_TOKEN` secret in Cloudflare, never in committed code
- ✓ KV namespace `FORGE_SYNC` bound to Worker

---

## 5. Pulse Feature Matrix

### Data & State
- ✓ `load()` reads `forge_prod_v1` first, falls back to `ledger_v3` / `forge_lean_v1`
- ✓ `acctMeta = {}` declared, populated from `d.acctMeta`
- ✓ `goals`, `accounts`, `txns`, `amzItems` all declared
- ✓ `_piDrillOpen`, `_piBktOpen` state for P&L drilldown
- ✓ All classification constants ported: `WATERFALL`, `BUCKET_META`, `KW_MAP`, `QUICKEN_CAT_MAP`, `COLORS`

### The Gauge (Snapshot)
- ✓ Pull from Cloud button always visible (static HTML, not template-dependent)
- ✓ Pull-to-refresh gesture (touchstart → touchend, 72px threshold)
- ✓ Sister bridges watermark SVG (opacity .05)
- ✓ Forge three-rivers logo mark in eyebrow
- ✓ LukaLab badge right-aligned in eyebrow
- ✓ Net figure hero: +/- prefix, `fmtK()` formatting
- ✓ 4 chips: income, expenses, savings rate, vs prior month
- ✓ Life-stage intelligence banner (`lsBannerHtml`)
- ✓ Goal progress rings (conditional — only shown when goals exist)
- ✓ KPI scroll cards: Spending MTD, Savings Rate, 12-Month Avg, Transactions
- ✓ Top Spending categories (uses `classifyTxn()` + `BUCKET_META` labels)
- ✓ `cats3m()` uses `spendable()` + `classifyTxn()` (no raw categories)
- ✓ Error display panel (debug mode — shows renderSnapshot crashes on-screen)
- ✓ Storage status strip (shows txn counts per key for debugging)

### P&L Tab (3-Level Drilldown)
- ✓ Month selector auto-populated from data
- ✓ Hero summary: Income / Expenses / Net grid
- ✓ Savings rate progress bar
- ✓ `WATERFALL.map()` drives section list
- ✓ Level 1: Section rows (7 sections) with animated chevrons
- ✓ Level 2: Bucket rows grouped by `BUCKET_META` key with icons
- ✓ Level 3: Payee rows with multi-txn expand
- ✓ Level 4: Individual transaction rows with date + category sub-label
- ✓ `→` button on every section and bucket row → filtered transaction view
- ✓ Filtered view has `← Back` button returning to full P&L
- ✓ `piToggleSec()` / `piToggleBkt()` chevron toggle functions
- ✓ `--Split--` transactions show descriptive sub-label (not raw string)
- ✓ Net Surplus / Net Deficit footer row

### Net Worth Tab
- ✓ `renderPulseNW()` — assets vs liabilities from transaction sums
- ✓ `detectAcctType()` used for account classification
- ✓ `isCreditAcct()` null-safe (guards `acctMeta` access)
- ✓ Hero tile: net worth in gold, assets green, liabilities red
- ✓ Assets section with per-account balances
- ✓ Liabilities section with per-account balances

### Analytics Tab
- ✓ **Zero Chart.js usage** in analytics — all pure SVG
- ✓ `svgBar()` for Monthly Cash Flow trend (6 months)
- ✓ `svgHBar()` for Spending by Person and Day of Week
- ✓ `svgLine()` for 12-Month Savings Rate trend
- ✓ SVG donut for Spending by Category (with `data-tip` attributes)
- ✓ `renderPulseCategories()` uses `classifyTxn()` + `BUCKET_META`
- ✓ `bindChartTips()` wires tap tooltips post-render
- ✓ `initPulseTips()` tap-to-reveal tooltip system (mobile-native)
- ✓ `#pulseTip` overlay positioned viewport-aware
- ✓ `#chartTip` for desktop hover

### Ask $id Tab
- ✓ `getWorkerUrl()` — prompts once, stores to `forge_worker_url` in localStorage
- ✓ `getSyncToken()` — prompts once, stores to `forge_sync_token`
- ✓ `callSid()` routes through Cloudflare Worker `/chat` endpoint
- ✓ `buildContext()` passes full financial context per query
- ✓ `sendWelcome()` on first load
- ✓ 5 suggestion pills (none reference Amazon or outdated copy)

### Mobile UX
- ✓ `min-height: 44px` on all tappable elements
- ✓ `touch-action: pan-y` on pages, `none` on tab bar
- ✓ `font-size: 16px !important` on all inputs — prevents iOS Safari auto-zoom
- ✓ `-webkit-tap-highlight-color: rgba(245,168,0,.12)` gold tap flash
- ✓ `env(safe-area-inset-bottom)` bottom padding for home indicator
- ✓ `-webkit-overflow-scrolling: touch` momentum scrolling
- ✓ PWA: `apple-mobile-web-app-capable`, status bar `black-translucent`

### Sync
- ✓ `getWorkerUrl()` — localStorage-backed, no hardcoded URL
- ✓ `getSyncToken()` — localStorage-backed, no hardcoded token
- ✓ `syncPull()` writes `forge_prod_v1` + `ledger_v3` (both keys for compatibility)
- ✓ Pull from Cloud button always visible on The Gauge
- ✓ Pull-to-refresh gesture on all tabs
- ✓ No "Push to Cloud" button in Pulse (desktop-only workflow)

---

## 6. Known Gaps

| Item | Status |
|---|---|
| Forge Word documents (User Manual, Quick Start, Sid Setup) | Not updated past v3.2 |
| forge_module.js for test harness | Not rebuilt since lean build |
| Visual regression testing | Manual verification only |
| Real-time cross-device sync | Last-write-wins; no conflict resolution |
| Smart Scan (WORKER_URL must be set) | Works when configured |

---

## 7. Pre-Launch Checklist

Before every GitHub push:

- [ ] Static HTML div balance: `<div>` opens == closes in non-script HTML
- [ ] CSS brace balance: `{` == `}` in `<style>` blocks
- [ ] No undefined CSS variables (check with `var(--X)` vs `:root {--X:}`)
- [ ] No duplicate function definitions
- [ ] `WORKER_URL` set in index.html
- [ ] `SID_PROXY_URL` is `'WORKER_URL_HERE'` (getWorkerUrl handles it at runtime)
- [ ] No hardcoded `SYNC_TOKEN` in either file
- [ ] Pull from Cloud button visible in Pulse before data loads
- [ ] Hard refresh in Safari after upload (don't reopen from home screen icon)

---

## 8. Cloudflare Worker Configuration

**Worker:** `forge-sid.luka731chris.workers.dev`

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | $id chat + Smart Scan |
| `SYNC_TOKEN` | Cloud sync authentication |

| Binding | Type | Namespace |
|---|---|---|
| `FORGE_SYNC` | KV Namespace | `FORGE_SYNC` |

**Endpoints:**
- `POST /chat` — $id AI chat
- `POST /scan` — Smart Scan document extraction
- `POST /sync/push` — write ledger to KV
- `GET /sync/pull` — read ledger from KV

---

*Generated April 26, 2026 — lean_4.0 / Forge Pulse v2.0*
