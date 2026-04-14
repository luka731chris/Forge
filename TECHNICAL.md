# Forge Technical Reference

Build: `lean_4.0` · File: `index.html` · 233KB · 4,675 lines

---

## Data Model

### Transaction object

```javascript
{
  date:       '2025-11-15',          // YYYY-MM-DD, always
  payee:      'Giant Eagle',         // display name
  amount:     -127.43,               // negative = expense, positive = income
  category:   'Food & Dining:Groceries',
  account:    'Checking - PNC',
  memo:       '',                    // Quicken memo field
  isTransfer: false,                 // true when category is [AccountName]
  itemDetail: 'GIANT EAGLE #0382',  // merchant CSV item name; null for Quicken txns
}
```

**Dedup key:** `date|payee|amount|account` — exact match = skip on import.

**Transfer detection:** `isTransfer(t)` returns true when `t.category` matches `/^\[.+\]$/` — Quicken's bracket-category format for account transfers. Never rely on the word "Transfer" in the category string; some budgets use it as a real category.

**`spendable(arr)`:** Filters all transfers out. Use for every income/expense calculation. Never sum raw `txns` for financial totals.

---

### Storage keys

| Key | Type | Contents | Cleared by |
|---|---|---|---|
| `forge_prod_v1` | JSON | `{ txns[], accounts[], acctMeta{}, savedAt }` | Clear Data button |
| `forge_demo_v1` | JSON | Same shape, demo data only | Never auto-cleared |
| `forge_lean_v1` | JSON | Legacy — migrated on boot, then removed | Boot migration |
| `forge_networth` | JSON | `{ acctName: { value, date, source } }` | Clear Data button |
| `forge_networth_hist` | JSON | `{ dateKey: { acctName: value } }` | Clear NW History button only |
| `forge_settings_v2` | JSON | See Settings schema below | Never auto-cleared |
| `forge_build` | String | `'lean_4.0'` | Never |

### Settings schema (`forge_settings_v2`)

```javascript
{
  ccSettings:       { 'Credit - Allegiant4': { closeDay:1, dueDay:25 }, ... },
  budgetTargets:    { mortgage:2800, groceries:900, restaurants:600, ... },
  nonRecurringIds:  ['date|payee|amount|account', ...],  // Set serialized as array
  surplusTargets:   { emergency:0, investments:0, college:0, other:0 },
  accountOwners:    { 'Credit - Allegiant4': 'Chris', ... },
}
```

---

## Parser Reference

### `parseCSV(text, fname)`

Auto-detects format from column signatures. Tries merchant formats first; falls through to Quicken generic.

**Merchant detection order:**

1. Apple Card: first 3 lines contain `clearing date` + `merchant` + `amount (usd)` → `parseMerchantCSV()` with `sign:-1` (negate all amounts)
2. Amazon: first 3 lines contain `order id` + `asin` + `total charged` → `parseMerchantCSV()` with `sign:-1`
3. Home Depot: first 3 lines contain `order number` + `items ordered` + `order total` → `parseMerchantCSV()` with `sign:-1`
4. Venmo: first 3 lines contain `funding source` + `destination` + `amount (total)` → `parseMerchantCSV()` with `sign:0` (use amount string sign)
5. Generic Quicken CSV: header scanner loops first 30 lines for a row with both a date-like and amount-like column name

**Column mapping (Quicken generic):** `findCol(headers, ...names)` tries multiple column name variants for each field. Debit/credit split columns are supported alongside single amount columns. BOM stripped, CRLF normalized, `sep=` Excel hint removed, European decimal detected.

### `parseMerchantCSV(text, acctName, opts)`

```javascript
opts = {
  dateCol:     'transaction date',   // header column name for date
  payeeCol:    'merchant',           // header column for payee
  payeeColAlt: null,                 // optional second payee col (Venmo: 'to')
  amtCol:      'amount (usd)',       // header column for amount
  catCol:      'category',           // header column for category (null to skip)
  detailCol:   'description',        // header column for itemDetail
  sign:        -1,                   // -1=always expense, 0=use amount sign
}
```

Titles longer than 60 characters: full title saved to `itemDetail`, payee truncated to 55 chars + `…`.

### `parseNetWorthCSV(text)`

Detects Quicken Net Worth report by scanning the first 4 lines for the string `Net Worth`. Returns `{ acctName: { value, date, source } }`.

Column layout: 3-column (col0=blank, col1=name, col2=balance). Handles Investment Performance variant (uses col4 = ending value, only rows where col1 = 'Total'). Skips: TOTAL rows, NET WORTH summary row, OVERALL TOTAL, section header rows, zero-balance rows.

**`isNetWorthExport(text)`:** Strict detection — only returns true when `Net Worth` appears in the first 4 lines. Never uses heuristics (prevents transaction CSVs from being misidentified).

### `parseQIF(text, fname)`

Multi-account QIF. `!Account` sections set `currentAcct`. Parses `D`, `T`, `P`, `M`, `L`, `^` fields. Transfer categories in `[bracket]` format set `isTransfer:true`.

### `parseOFX(text, fname)`

OFX/QFX XML-like format. Parses `<STMTTRN>` blocks. CDATA stripped. Amount sign: OFX negative = expense (debits from account), positive = income.

---

## Classification

### `classifyTxn(t)` — bucket assignment

Priority order:

1. `QUICKEN_CAT_MAP` exact match on `t.category.toLowerCase()` — 60+ entries covering all standard Quicken categories
2. `QUICKEN_CAT_MAP` partial match (category contains key)
3. `--split--` special handler: routes by payee keyword — `/house loan|rocket/i` → `mortgage`, `/palisade/i` → `car`
4. `KW_MAP` payee keyword match — `/giant eagle|aldi|whole foods/i` → `groceries`, etc.
5. Income heuristic: positive unknown amount → `other_inc`
6. Default: `other`

### `WATERFALL` — income statement sections

```
income       → paycheck, other_inc
auto_save    → auto_save
fixed        → mortgage, car, education, insurance, childcare
utilities    → electric, gas_util, water, internet, cell
necessities  → groceries, gas_car, transit, healthcare
discretionary→ restaurants, entertainment, household, personal,
               clothing, travel, subscriptions, gifts
other        → other
```

---

## Balance Sheet

### `BS_ACCOUNTS` — 27 entries

| Account (Quicken name) | Class | Sub | Label |
|---|---|---|---|
| Checking - PNC | asset | current | PNC Checking |
| Savings - PNC | asset | current | PNC Savings |
| Savings - Sam/Whit/Will | asset | current | Savings — [name] |
| 529 - Sam/Whit/Will | asset | education | 529 Plan — [name] |
| Investing - NR/Sam NR/Whit NR/Will NR/C&K | asset | investment | Investment — [name] |
| Retirement - Chris HH | asset | retirement | 401(k) — Chris (HH) |
| Retirement - NR IRA/NR Roth | asset | retirement | IRA/Roth IRA — NR |
| House | asset | **property** | Primary Residence |
| House Loan | liability | **mortgage** | Mortgage (Rocket) |
| Palisade Loan | liability | **auto** | Auto Loan (Palisade) |
| Credit - Allegiant4/Amazon17/ChPNC1/Flag17/KiPNC28/Kohls27/Old Navy4/Quick19 | liability | current | [label] CC |

**Critical:** `sub` values must match exactly what `renderBalanceSheet()` searches. Home equity uses `sub==='property'` and `sub==='mortgage'`. The liabSubOrder array uses `['current','mortgage','auto','student','long_term','other']`.

### `computeBSFromTxns()`

Sums all transactions per account. Returns `{ balances: { acctName: number }, lastDate: { acctName: 'YYYY-MM-DD' } }`. This is the fallback value source when no NW snapshot is loaded.

### Value resolution in `renderBalanceSheet()`

```javascript
function getCurrentValue(acct, meta) {
  const nwOv = netWorthOverrides[acct];
  if (nwOv) return { value: meta.class === 'liability' ? Math.abs(nwOv.value) : nwOv.value, source: 'net-worth' };
  const raw = balances[acct] || 0;
  return { value: meta.class === 'liability' ? Math.abs(raw) : raw, source: 'transactions' };
}
```

For liabilities: Quicken stores CC balances as negative net (credits exceed debits). `Math.abs()` is applied so all liability values are shown positive, then subtracted for net worth.

### Balance sheet KPI tiles

Row 1 — Wealth:
- **Net Worth** = totalAssets − totalLiabs. With compare active: shows delta and % change.
- **Total Assets** — all asset account values summed
- **Total Liabilities** — all liability account values summed
- **Home Equity** = `getCurrentValue('House').value − getCurrentValue('House Loan').value`

Row 2 — Liquidity:
- **Current Assets** = sum of `sub:'current'` + `sub:'savings'` asset accounts
- **Current Liabilities** = sum of `sub:'current'` liability accounts (CC balances)
- **Current Ratio** = currentAssets ÷ currentLiabs. Target ≥2×.

Row 3 — Debt/Income:
- **Debt-to-Asset** = totalLiabs ÷ totalAssets × 100. Target <30%.
- **Debt-to-Income** = totalDebt ÷ (recurringIncomeAvg(12) × 12) × 100. Target <36%. Uses recurring income only (excludes NR-flagged transactions).
- **Liquid Coverage** = currentAssets ÷ recurringIncomeAvg(1). Target ≥6 months.

---

## Recurring Detection

`detectRecurring()` groups `spendable(txns)` expenses by `payee|account`. For each group with ≥2 transactions:

1. Sort by date, compute inter-arrival gaps in days
2. Compute mean gap and standard deviation
3. Classify: monthly (avg 25–40d, stddev <8), weekly (6–9d, <3), quarterly (83–97d, <10), annual (355–375d, any stddev)
4. Reject: variable-amount non-monthly patterns (any amount >25% from mean for weekly/quarterly/annual)
5. Project next occurrence from last date + mean gap

Returns array sorted by `nextDate` ascending.

---

## Non-Recurring Income

`autoDetectNonRecurring()` runs on boot and after every import. Flags income transactions as non-recurring when:
- Amount > 60% of median monthly income AND payee appears ≤2 times total, OR
- Payee/category matches `/bonus|gift|award|settlement|refund|inheritance|tax ref/i`

Flagged keys stored as `nonRecurringIds` (Set) in `forge_settings_v2`. `recurringIncomeAvg(months)` excludes flagged transactions when computing any income-based ratio.

---

## Functions — Complete List

**Parsers:** `parseMerchantCSV`, `parseCSV`, `parseQIF`, `parseOFX`, `parseNetWorthCSV`, `parseDate`, `parseAmt`, `csvRow`, `findCol`, `isNetWorthExport`

**Classification:** `classifyTxn`, `detectAcctType`, `isCreditAcct`, `isTransfer`, `spendable`, `incomeOnly`, `expensesOnly`

**Storage:** `saveData`, `loadData`, `saveSettings`, `loadSettings`, `saveNetWorthOverrides`, `loadNetWorthOverrides`, `clearAll`, `clearNetWorthOverrides`, `toggleDemo`, `loadDemo`

**Formatting:** `fmt`, `fmtK`, `txnKey`

**Charts/SVG:** `svgBar`, `svgLine`, `svgHBar`, `makeDonut`, `monthlyData`, `drillFromChart`, `applyChartDrill`, `showChartTip`, `positionChartTip`, `hideChartTip`, `bindChartTips`

**Navigation:** `showPage`, `setRange`, `setCatRange`, `updateHeader`, `showAudit`, `toast`

**Render — pages:** `renderDashboard`, `renderCashFlow`, `renderCategories`, `renderTxns`, `renderUploadStatus`, `renderValidation`, `renderFileList`, `renderIncomeStatement`, `renderCreditFlow`, `computeBSFromTxns`, `renderBalanceSheet`, `renderFinancials`, `renderBudget`, `renderBillCalendar`

**Render — helpers:** `toggleSection`, `toggleBucket`, `filterTxnsByAcct`

**Financial logic:** `getCCProjections`, `rangeStart`, `inRange`, `detectRecurring`, `autoDetectNonRecurring`, `recurringIncomeAvg`, `suggestBudget`, `balanceAsOfDate`

**Settings:** `updateCCSetting`, `toggleNonRecurring`

**Import pipeline:** `handleFiles`, `readFile`

Total: 75 functions.

---

## Code Conventions

- **Visibility:** JS inline styles only (`element.style.display`). CSS class `.page.active` is a fallback. No CSS animation controls visibility.
- **Chart creation:** Always `Chart.getChart(canvasEl)` guard — destroy existing before creating new. No `Chart.defaults.*` at top level; all inside `applyChartDefaults()` called from DOMContentLoaded.
- **No dead code:** Confirm with full-file string search before declaring any function unreachable.
- **Syntax check:** `node --check` after every edit. CSS brace balance verified.
- **No `--split--` in QUICKEN_CAT_MAP:** Removing it lets the payee router handle mortgage/car correctly.

---

## Known Gaps

- No automated visual regression testing. Manual verification checklist in TESTING.md.
- `forge_module.js` must be manually rebuilt after any `index.html` function changes.
- Word docs (User Manual, Quick Start, Sid Setup) reflect approximately v3.2 — not updated for lean_4.0.
- Forge Pulse (`forge-pulse.html`) retains v3.12 architecture; not rebuilt as lean core.
