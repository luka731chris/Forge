# Forge Changelog

---

## [lean_4.0] — 2026-04-13

### Architecture — Complete Rebuild as Lean Core

`forge.html` retired. `index.html` is now the single production file — a ground-up rewrite that retains all financial logic while eliminating the accumulated complexity of the v3.x series.

**What changed structurally:**

- Single file, no build step, no framework. Vanilla JS + Chart.js 4.4.1.
- Storage keys renamed and isolated: `forge_prod_v1` (real data), `forge_demo_v1` (demo, never mixed), `forge_networth` (current NW snapshot), `forge_networth_hist` (historical snapshots, survives Clear Data), `forge_settings_v2` (CC dates, budgets, NR flags).
- Build stamp `lean_4.0` in `forge_build` — auto-wipes legacy keys on first load.
- `DOMContentLoaded` boot sequence: loads data → runs `autoDetectNonRecurring()` → `updateHeader()` → routes to dashboard or upload.
- All 12 pages present and functional: Dashboard, Cash Flow, Categories, Transactions, Income Statement, Credit Card Flow, Import Data, Data Validation, Budget vs Actual, Bill Calendar, Balance Sheet, Family Financials.

---

### Added — Balance Sheet with Historical Comparison

New **Balance Sheet** page with full comparison infrastructure:

**Comparison dropdown** (header, right side): None · YE 2024 · YE 2025 (default) · Q1 2025 · Q2 2025 · Q3 2025 · Prior NW Snapshot

When a comparison period is selected, the balance sheet renders four columns: **Current | Prior | Change | %** for every account row, every subtotal, and the Net Worth footer.

**Value resolution priority:**
1. Net Worth snapshot override (Quicken NW report, exact market value)
2. Transaction-computed register balance (accurate for checking/CC, approximate for investments/property)

For the comparison column, `getPriorValue()` checks `nwHistory` for the closest snapshot on or before the comparison date, then falls back to transaction-computed balance.

**NW snapshot history (`forge_networth_hist`):**
- Every NW CSV upload is stored keyed by its date: `nwHistory['2026-04-12'] = { 'House': 474500, ... }`
- Multiple uploads accumulate — each adds a comparison point without overwriting others
- This key survives **Clear Data** intentionally; historical snapshots are long-lived reference data
- **✕ Clear NW History** button in the Balance Sheet header wipes it explicitly when needed

**To populate all comparison periods, export these Quicken reports:**

| Dropdown | Quicken date | Suggested filename |
|---|---|---|
| YE 2024 | 12/31/2024 | `NetWorth_241231.csv` |
| Q1 2025 | 3/31/2025 | `NetWorth_250331.csv` |
| Q2 2025 | 6/30/2025 | `NetWorth_250630.csv` |
| Q3 2025 | 9/30/2025 | `NetWorth_250930.csv` |
| YE 2025 | 12/31/2025 | `NetWorth_251231.csv` |

Each uploads standalone (no transaction file needed). The "Prior NW Snapshot" dropdown option uses the most recent stored snapshot before the current date.

**KPI tiles — three rows of 3–4:**

Row 1 (wealth): Net Worth (with YoY delta when compare active) · Total Assets · Total Liabilities · Home Equity

Row 2 (liquidity): Current Assets · Current Liabilities · Current Ratio (target ≥2×)

Row 3 (debt/income): Debt-to-Asset % (target <30%) · Debt-to-Income % (target <36%) · Liquid Coverage in months (target ≥6)

All tiles color-band green/gold/red against their respective targets. DTI and liquid coverage use `recurringIncomeAvg(12)` — non-recurring income (bonuses, gifts, settlements) is excluded.

**Bug fixed — home equity was always showing house value:**
`BS_ACCOUNTS` had `House` with `sub:'real_estate'` and `House Loan` with `sub:'long_term'`. The KPI calculation searched `sub==='property'` and `sub==='mortgage'` — no match → both balances zero → home equity = house value - 0 = house value. Fixed by aligning sub values: `House → sub:'property'`, `House Loan → sub:'mortgage'`, `Palisade Loan → sub:'auto'`.

---

### Added — Merchant CSV Parsers

`parseCSV()` now detects and routes four merchant CSV formats before falling through to the generic Quicken parser. Detection is by column signature in the first three lines — filename is irrelevant.

| Source | Detection columns | Payee field | `itemDetail` field |
|---|---|---|---|
| Apple Card | `clearing date` + `merchant` + `amount (usd)` | Merchant | Description (store-level detail) |
| Amazon | `order id` + `asin` + `total charged` | Title (truncated to 60 chars) | Full title |
| Home Depot | `order number` + `items ordered` + `order total` | Items ordered | Items ordered |
| Venmo | `funding source` + `destination` + `amount (total)` | From/To (directional by sign) | Note |

**`itemDetail` field:** Every transaction object now carries `itemDetail` — the raw human-readable item name from merchant CSVs. Shown in river-blue italic in Income Statement drilldowns and as a sub-line in the transaction table. For Quicken transactions `itemDetail` is null.

Apple Card: amounts in the CSV are positive charges — parser negates them. Venmo: outgoing payments use the "To" column as payee; incoming use "From". Amazon: titles longer than 60 characters are stored as `itemDetail` and the payee is truncated with `…`.

---

### Added — Income Statement Drilldowns (3 levels)

The Income Statement page now supports three-level drill-through on every expense section:

1. **Section** (e.g., Discretionary Spending) → click to expand buckets
2. **Bucket** (e.g., Restaurants) → click to expand payees
3. **Payee** (e.g., Chipotle) → click (if 2+ transactions) to expand individual transactions

Individual transaction rows show:
- Date (Fira Code, muted)
- Payee name
- `itemDetail` in river-blue italic (Apple Card description, Amazon title, Venmo note, Home Depot item) — only shown when present and different from payee
- Category · account in secondary muted line
- Amount (gold for expense, green for income)

Delegated click listener on the IS container — single handler, no inline onclick, state tracked in `isDrillOpen{}` and `isBucketOpen{}`.

---

### Added — Budget vs Actual

Monthly budget tracking with seasonal suggestion engine.

**`suggestBudget()`:** For each spending bucket, computes trailing 12-month average (60% weight) blended with same-calendar-month historical values (40% weight) — accounts for seasonality. Rounds to nearest $25.

**Pace indicator:** When viewing the current month, shows whether spending is ahead or behind the expected daily pace. "Day 13 of 30 · $1,847 of $3,200 budget · $213 over pace."

**Budget table:** Per-bucket progress bar, inline editable budget input (saves on change), projected month-end at current velocity, OK/Near/Over status badges.

**Non-recurring income toggle:** ⭐ button per income transaction. Starred transactions are excluded from run-rate calculations throughout (DTI, liquid coverage, savings rate, budget projections). `autoDetectNonRecurring()` runs on boot and after every import — auto-flags large rare income, bonuses, gifts, tax refunds, settlements.

---

### Added — Bill Calendar

**Credit card billing cycles:** Set statement close day and payment due day per card. Live cycle dashboard shows charges to date, daily velocity, days remaining, and projected statement balance.

**Upcoming 30 days:** Recurring transaction predictions derived from historical pattern matching. Shows exact predicted date, payee, frequency, and expected amount. Total committed spend in the next 30 days shown as a header summary.

**`detectRecurring()`:** Groups transactions by `payee|account`. Computes inter-arrival gaps, mean, and standard deviation. Classifies as monthly (25–40d avg, <8d stddev), weekly (6–9d, <3d), quarterly (83–97d, <10d), or annual (355–375d). Variable-amount monthly patterns are kept (e.g., utilities); variable non-monthly are dropped.

**All recurring panel:** Grouped by frequency with subtotals per group, annualized committed spend, next predicted date per payee.

---

### Added — Family Financial Statements

**Family Financials** page presents household finances as a family office / holding company. Period selector: Trailing 12 Months (default) or any calendar year present in the data.

Sections:
- Cover block with "Luka Family Office" header, period label, net worth (from NW snapshot if loaded)
- Executive KPIs: Annual Revenue, EBITDA, Savings Rate, Cash Runway
- Income Statement: Employment income vs other income, operating expenses by category, EBITDA line, savings flows, net income — with prior-year comparison column and $/month column
- Key Financial Ratios: Savings Rate, Expense Ratio, Housing Cost Ratio, DSCR, Cash Runway, Net Worth — each benchmarked and color-banded
- 12-Month Forward Projection: projected income/expenses/savings/net annualized from TTM run rate

---

### Fixed — Multiple Data Integrity Bugs

**`--Split--` mortgage routing:** Quicken's split-category marker `--Split--` was in `QUICKEN_CAT_MAP` as `'--split--': 'other'`, short-circuiting before the payee-based router that correctly routes `House Loan` → `mortgage` and `Palisade Loan` → `car`. Removed `--split--` from the map so it falls through to the payee router.

**Transfer double-counting:** `isTransfer()` checks for Quicken bracket category format `[AccountName]`. `spendable()` filters all transfers from income/expense totals. This prevents CC payments, savings transfers, and account moves from inflating both sides of the ledger.

**Import hard-replace vs append:** The import pipeline wipes `txns`, `accounts`, `acctMeta`, and both localStorage keys before loading a new batch. Demo data cannot contaminate real data and vice versa.

**`parseCSV` Quicken preamble:** Scanner loops first 30 lines for a row containing both a date-like and amount-like column name. Quicken's 4-line preamble (title, blank, date range, blank) is skipped cleanly.

---

### Fixed — File Structure

The file was missing `</script></body></html>` closing tags. Browser auto-closes these so it rendered fine, but the missing tags prevented the Node.js test harness from finding the script block via regex (looking for `<script>...</script>`). Added closing tags; the regex now works correctly.

`DOMContentLoaded` listener count confirmed at exactly 1. `</script>` tag count confirmed at exactly 2 (CDN + main).

---

## [3.12] — 2026-04-03

Dead code audit: 11 dead JS functions removed, 22 unused CSS classes removed, 12 unused CSS vars removed, duplicate keyframe removed. Same cleanup in Pulse. All 572 tests pass.

---

## [3.11] — 2026-04-03

Analytics/Cash Flow blank fix: `Chart.getChart()` guard before every canvas creation; waterfall config made lazy.

---

## [3.10] — 2026-04-02

Black screen root cause: one missing `</div>` left `page-dashboard` nested inside `page-upload`, inheriting `display:none`.

---

## [3.9] — 2026-04-02

Smart Scan added (`forge_worker_v2.js` adds `/scan` endpoint); Quicken preamble detection fixed.

---

## [3.8] — 2026-04-02

Quicken CSV header detection rewrite: scanner loops first 30 lines for date+amount column pair.

---

## [3.7] — 2026-04-02

Black screen: orphaned CSS `to{}` fragments from deleted keyframes corrupting cascade.

---

## [3.6] — 2026-04-02

Black screen: `Chart.defaults.*` at top level throwing before `DOMContentLoaded`.

---

## [3.5] — 2026-04-01

Black screen: orphan `}` syntax error line 25; CSS animations replaced with inline-style visibility.

---

## [3.4] — 2026-03-29

`parseCSV()` comprehensive rewrite: blank columns, BOM, `sep=`, semicolon/pipe, European decimal. Suite 26 added.

---

## [3.2–3.3] — 2026-03-28

Analytics Studio (8 charts, 8 dims, 6 metrics); unified import zone; 5 parser bug fixes.

---

## [3.0–3.1] — 2026-03-27 to 2026-03-28

Purchaser attribution system; Detail Lens multi-format; By Purchaser tab; Apple Card parser.

---

## [2.x] — 2026-01-15 to 2026-03-26

Initial releases, Forge Pulse launch, Confluence tool, Analytics foundation. See git history.
