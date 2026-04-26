# Forge Changelog

## lean_4.0 / Pulse v2.0 — April 26, 2026

### Cloud Sync Layer (new)
- Cloudflare KV-backed sync via existing Worker
- `POST /sync/push` and `GET /sync/pull` endpoints added to `forge_worker_v2.js`
- `getSyncToken()` — prompts once on first use, stores to `forge_sync_token` in localStorage — no hardcoded token in committed files
- `getWorkerUrl()` in Pulse — same pattern for Worker URL — no hardcoded URL in committed files
- `syncPush()` reads `forge_prod_v1` → `forge_lean_v1` → `ledger_v3` (priority chain for lean build compat)
- `syncPull()` writes to both `forge_prod_v1` and `ledger_v3` for cross-build compatibility
- Push button on Import page (desktop only)
- Pull from Cloud button always visible on Pulse Gauge (above snap-out, visible before data loads)
- Pull-to-refresh gesture on all Pulse tabs (72px threshold, gold indicator)
- No Push button in Pulse — workflow is desktop-import → push → mobile-pull only

### Desktop — Classification Fixes
- `renderCategories()` now uses `classifyTxn()` + `BUCKET_META` labels — `--Split--` no longer appears as a top expense category
- Dashboard donut now uses `classifyTxn()` — same fix
- `renderFinancials()` catTotals now uses `classifyTxn()` — same fix
- `isTransfer()` expanded: catches `Apple Card`, `Apple Card Payment`, `Credit Card Payment` categories without bracket notation; also catches payee-based CC payment patterns
- `classifyTxn()` Split block expanded from 6 to 30+ payee patterns: Pennymac, Mr. Cooper, Honda Financial, GM Financial, Liberty Mutual, State Farm, Allstate, Comcast, Spectrum, ADP, Paychex, Gusto, etc.

### Desktop — Transactions Page Sort
- `txnSort` state — clickable `↑/↓` column headers on Date, Payee, Category, Account, Amount
- `txnDrillCat` sticky drill filter from Income Statement
- `txnDrillBanner` visible filter indicator with ✕ Clear button
- `drillToCategory()` + `clearDrill()` full drill cycle
- IS section rows: `→ txns` drill link on every section
- IS bucket rows: `→` drill link on every bucket

### Desktop — Income Statement
- `isSort` state with Sort dropdown (Date / Amount / Payee A-Z) and direction toggle
- 320px cap with scroll on payee transaction lists with more than 8 items
- `--Split--` display fully unmasked: Mortgage, Auto Loan, Insurance, Internet/Phone, Utility, Retirement, Payroll with descriptive sub-labels

### Pulse — Full Rebuild from April 21 Session
- **P&L Tab** (was simplified SECTIONS array): now uses `WATERFALL.map()` — same 7-section structure as desktop IS
  - 3-level chevron drilldown: Section → Bucket → Payee → Individual Transactions
  - `piToggleSec()` / `piToggleBkt()` toggle functions
  - `→` button on every section and bucket → filtered transaction view with `← Back`
- **Net Worth Tab**: `renderPulseNW()` with `acctMeta` null-safety
- **Analytics Tab**: Zero Chart.js — all pure SVG
  - `svgBar()` for Monthly Cash Flow (6 months, Income vs Expenses)
  - `svgHBar()` for Spending by Person and Day of Week heatmap
  - `svgLine()` for 12-Month Savings Rate trend
  - SVG donut for Spending by Category with `data-tip` tap tooltips
  - `bindChartTips()` post-render event wiring
  - `initPulseTips()` tap-to-reveal tooltip overlay (mobile-native)
- **Gauge Tab** branding restored: sister bridges SVG watermark, Forge three-rivers logo, LukaLab badge, goal rings, life-stage banner
- `cats3m()` uses `spendable()` + `classifyTxn()` — no raw categories in snapshot
- `renderPulseCategories()` uses `classifyTxn()` + `BUCKET_META`
- Empty state: updated to reference Pull from Cloud / pull-to-refresh (no Amazon import instructions)
- All ported from desktop: `WATERFALL`, `BUCKET_META`, `KW_MAP`, `QUICKEN_CAT_MAP`, `COLORS`, `classifyTxn()`, `isTransfer()`, `spendable()`, `svgBar()`, `svgLine()`, `svgHBar()`, `bindChartTips()`, `showChartTip()`

### Pulse — Bug Fixes (this session)
- `QUICKEN_CAT_MAP` was missing — `classifyTxn()` crashed on every call → Gauge black screen
- `acctMeta` was not declared → `isCreditAcct()` crashed → Net Worth black screen
- `--card`, `--border`, `--mono`, `--muted`, `--bg`, `--serif` CSS variables undefined → transparent/invisible UI
- Multiple duplicate function definitions (renderPulseAnalytics, renderPulseNW, destroyPulseAna, renderPulseTrend, etc.) removed
- Duplicate `renderPulsePL` — old version with `buckets.income.total` was running instead of new WATERFALL version
- Chart.js CDN missing — analytics tab crashed on `new Chart()` calls
- `forge_prod_v1` storage key mismatch — `syncPush()` was reading empty legacy keys, pushing null
- `SID_PROXY_URL` replaced with `getWorkerUrl()` — no URL configuration needed on file upload
- `document.body.style.display = 'block'` removed — was overriding `display:flex` and breaking scroll layout

### Mobile UX
- `min-height: 44px` on all tappable elements
- `touch-action: pan-y` on pages, `none` on tab bar
- `font-size: 16px !important` on inputs/selects — prevents iOS Safari auto-zoom
- `-webkit-tap-highlight-color` gold flash on tap
- `env(safe-area-inset-bottom)` bottom padding for iPhone home indicator

### Infrastructure
- `forge_worker_v2.js`: `/sync/push` + `/sync/pull` endpoints added; `FORGE_SYNC` KV binding; `SYNC_TOKEN` secret
- Storage key priority: `forge_prod_v1` (lean build) → `forge_lean_v1` → `ledger_v3` (legacy)
- All configuration (Worker URL, Sync Token) stored in browser localStorage — zero secrets in committed code

---

## v3.12 — April 3, 2026
Dead code audit: 11 dead JS functions removed, 22 unused CSS classes, 12 unused CSS vars, duplicate keyframe removed.

## v3.11 — April 3, 2026
Analytics/Cash Flow blank fix: Chart.getChart() guard before every canvas creation.

## v3.10 — April 2, 2026
Black screen root cause: one missing `</div>` nested page-dashboard inside page-upload.

## v3.9 — April 2, 2026
Smart Scan added. forge_worker_v2.js adds `/scan` endpoint. Quicken preamble detection fixed.

## v3.8 — April 2, 2026
Quicken CSV header detection rewrite: scanner loops first 30 lines for date+amount column pair.

## v3.5–3.7 — April 2, 2026
Multiple black screen fixes: orphan CSS fragments, Chart.defaults at top level, syntax errors.

## v3.4 — March 29, 2026
parseCSV() comprehensive rewrite: blank columns, BOM, sep=, semicolon/pipe, European decimal.

## v3.2–3.3 — March 28, 2026
Analytics Studio (8 charts, 8 dims, 6 metrics). Unified import zone. 5 parser bug fixes.

## v3.0–3.1 — March 27–28, 2026
Purchaser attribution system. Detail Lens multi-format. By Purchaser tab. Apple Card parser.
