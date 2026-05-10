# Forge Testing Plan — v4.0.0

---

## Automated Test Suites

| Suite | File | Tests | Coverage |
|-------|------|-------|----------|
| Core parsers, formatters, dedup | `forge_tests.js` | 149 | v3.x era — needs v4.0 update |
| Apple Card, analytics, purchaser, CSV edge cases | `forge_tests_v2.js` | 325 | v3.x era — needs v4.0 update |
| $id AI layer | `forge_sid_tests.js` | 98 | AI chat context |
| **Total** | | **572** | 100% pass required before commit |

> ⚠️ Test suites predate the v4.0 IS rebuild, Pattern A auto-save fix, and classifyTxn prefix-match rewrite. A v4.0 suite update is backlog item #9.

---

## Pre-Commit Structural Checks

Run these before any GitHub upload:

```bash
# 1. JS syntax
node --check index.html         # must exit 0
node --check forge-pulse.html   # must exit 0

# 2. Div balance
grep -c '<div\b' index.html     # must equal
grep -c '</div>' index.html

# 3. CSS brace balance (target: 184/184 at v4.0.0)
# Count { and } inside <style> blocks

# 4. No duplicate function definitions
grep -c 'function renderThermometer(' index.html   # must be 1
grep -c 'function buildMonthSummary(' index.html   # must be 1
```

---

## Manual Acceptance Checklist — v4.0.0

### Import & Data

- [ ] Drag Quicken CSV onto upload zone → transactions load, month selector populates
- [ ] Drag Apple Card CSV → payment rows absent from transaction list; individual charges appear
- [ ] Drag Amazon orders CSV → items appear in Detail Lens with purchaser attribution
- [ ] Settings → File Status shows green dot for each imported file type
- [ ] Settings → All Uploaded Files shows every file with filename, date, count
- [ ] Clear All Data → page reloads clean; import zone shows "no data"

### Income Statement (critical path)

- [ ] Navigate to Income Statement → pressure bar renders (not blank)
- [ ] Select a closed month → income section collapses; shows total income only
- [ ] Click income section header → expands to show individual deposit rows
- [ ] Pre-committed savings shows exactly ONE entry per biweekly transfer (not doubled)
- [ ] Auto-save amount matches what Quicken shows as the savings transfer for that month
- [ ] Closed month: accrual projections absent; in-flight month shows "proj" badge on bars
- [ ] IS total income = sum of checking account paycheck deposits only (no HSA, no investment dividends)
- [ ] Reconciliation section collapsed by default; click to expand
- [ ] Reconciliation shows checking + savings + credit cards only (no 401k, no HSA)
- [ ] Reconciliation net position: verify against Quicken Net Worth report filtered to operating accounts
- [ ] IS comments: click ✏️ on a section, type a note, reload page → note persists for that month
- [ ] Change view type (Stacked Bar / Small Multiples / Slope / Proportion) → chart updates
- [ ] Change month → pressure bar updates for new month

### Categories & Classification

- [ ] "Bills & Utilities:Gas & Heat" → classified as gas_util, not electric
- [ ] "Financial:Life Insurance" → classified as insurance, not catch-all financial
- [ ] "Auto & Transport:Service & Parts" → classified as car, not gas_car
- [ ] Apple Card charges appear in correct Forge buckets after import

### Balance Sheet

- [ ] Total Assets and Total Liabilities populated correctly
- [ ] Net Worth shows negative with minus sign if applicable
- [ ] Liability account change: decrease shows green, increase shows red
- [ ] Apple Card CSV phantom account does not appear as a liability row

### Forge Pulse

- [ ] Lock screen has no username/password prompt from iOS
- [ ] 6-digit PIN entry: dots fill, auto-submits at 6 digits
- [ ] Haptic feedback: vibrate on each digit tap
- [ ] Wrong PIN: dots flash red, stutter haptic, input clears
- [ ] Snapshot tab loads with spending summary
- [ ] Alerts tab loads without errors
- [ ] Ask $id: send a message, receive response

### Dashboard & Charts

- [ ] Dashboard pressure bar renders with correct month's data
- [ ] Cash Flow chart: 3M / 6M / 1Y / All range tabs work
- [ ] Negative net values show with minus sign in red on KPI cards
- [ ] Category donut renders (not blank canvas)
- [ ] Balance sheet below-zero Y-axis shows correctly on net worth charts

### Settings & UI

- [ ] Scenario Planner page scrolls correctly past the input step
- [ ] All 15 desktop pages open without blank screens
- [ ] Forge Pulse all 6 tabs open without blank screens
- [ ] LukaLab branding shows "AI Creative" (not "AI Creative Lab")

---

## Real-Data Regression Test (per release)

Before any Minor or Major version release:

1. Import current Quicken export (all accounts, 3 months minimum)
2. Open Income Statement for the most recent closed month
3. Verify Pre-Committed Savings matches the actual transfer amount in Quicken
4. Verify IS total income matches sum of checking deposits in Quicken
5. Expand reconciliation → verify net position matches Quicken Net Worth filtered to operating accounts
6. Open Balance Sheet → verify net worth matches Quicken Portfolio view
7. Open Categories → spot-check 5 transactions against expected Forge bucket

---

## Test Package (alpha/beta testing)

Files: `index-test-v4.0.html` and `forge-pulse-test-v4.0.html`

These files are identical to v4.0.0 production but load synthetic Pittsburgh family data on startup. Use these for:
- Testing new features before they touch real financial data
- Reproducing reported bugs against known data
- Onboarding new sessions with consistent starting state

> Never use the test package for real data. Never upload real financial data to the test files.
