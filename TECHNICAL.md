# Forge Technical Architecture — v4.0.0

---

## Data Model

### Transaction Object
```js
{
  date:     'YYYY-MM-DD',
  payee:    'Merchant Name',
  amount:   -42.50,          // negative = expense, positive = income
  category: 'Food & Dining:Restaurants',
  account:  'Chase Sapphire',
  memo:     '',
  type:     'Payment',
  _source:  'quicken_csv',   // stamped at import: quicken_csv|quicken_qif|quicken_qfx|apple_card|amazon_orders|home_depot|venmo
}
```

### amzItem Object
```js
{
  date:      'YYYY-MM-DD',
  title:     'Product Name',
  category:  'Electronics',
  price:     29.99,
  qty:       1,
  total:     29.99,
  orderId:   '123-456-7890',
  asin:      'B00XXXXX',
  source:    'amazon',
  purchaser: 'Chris',        // from filename inference at import
}
```

### Dedup Keys
- Transactions: `date|payee|amount|account`
- Detail items: `date|title|orderId|purchaser`

---

## Account Type Detection

`detectAcctType(accountName)` returns one of:

| Type | Regex Pattern | IS Scope |
|------|---------------|----------|
| `credit` | credit\|visa\|mastercard\|amex\|american express\|discover\|card\|cc\|sapphire\|freedom\|venture\|cash back\|rewards\|platinum | ✓ Operating |
| `savings` | savings\|save\|marcus\|ally\|high.yield\|money.market | ✓ Operating |
| `investment` | 401k\|403b\|ira\|roth\|brokerage\|fidelity\|vanguard\|schwab\|investment\|retirement\|hsa | ✗ Excluded |
| `checking` | (default — any account not matched above) | ✓ Operating |

The Income Statement, buildMonthSummary, and the Reconciliation section all filter to `OPER_TYPES = new Set(['checking','savings','credit'])`.

---

## Category Classification Pipeline

`classifyTxn(t)` runs these steps in order:

1. **Direct Quicken map** — exact lowercase match in `QUICKEN_CAT_MAP`
2. **Prefix match** — longest key where `cat === key OR cat.startsWith(key + ':')` — finds most-specific entry without dangerous substring fallback
3. **Keyword map (KW_MAP)** — payee-based fallback matching known merchant names
4. **Account-type inference** — savings account positive → `other_inc`; CC account negative → `other`
5. **Default** → `other`

### Forge Buckets (23)

**Fixed:** mortgage · car · insurance · education · childcare · electric · gas_util · water · internet · cell · subscriptions

**Variable:** groceries · restaurants · gas_car · transit · healthcare · entertainment · household · personal · clothing · travel · gifts · other

**Income:** paycheck · other_inc · auto_save

---

## Transfer Detection

`isTransfer(t)` returns true if any of:

1. Category matches bracket format `[AccountName]`
2. Category path contains `credit card payment` or `transfer$`
3. Payee matches `apple.?card` or `web recur applecard` when Apple Card detail loaded for that month
4. `^web recur ` prefix (Quicken online autopay pattern)
5. Payee matches known CC payment names on negative amounts
6. Category matches `venmo|zelle|paypal transfer|apple cash`

---

## Pre-Committed Savings Detection

Pattern A (the only pattern — Pattern B was removed in v4.0.0):

```
monthXfers
  .filter(t => t.amount < 0)                              // debit from source
  .filter(t => detectAcctType(t.account) === 'checking')  // source must be checking
  .filter(t => detectAcctType(dest) === 'savings')         // destination must be savings
  .filter(t => nearPaycheck(t.date))                       // within 4 days of a checking payday
```

Pattern B (savings-account credit side of same transfer) was removed — it caused double-counting. Quicken records both sides; the credit side is already excluded by `isTransfer()` when bracket-category detection works. When it doesn't, Pattern B would fire on the same dollar. Net effect before fix: every biweekly auto-save appeared twice.

---

## Accrual Engine

`buildAccrualEngine(selMonth, sp)`:

- Returns `null` for any month before the current calendar month (no accruals on historical data)
- For in-flight month: builds 90-day prior window → `removeOutliers()` drops months > mean + 2σ → per-bucket daily run rate = prior-window average ÷ days-in-period → projection = daily rate × days remaining
- `normalizeIncome()` — returns `{ normalPaycheck, earlyMonth, isThreePayMonth, bonusExclusion, normalizedIncome }`:
  - `earlyMonth`: no paychecks exported yet → use 6-month median
  - `isThreePayMonth`: 3 paychecks in month → normalize to 2-check equivalent
  - `bonusExclusion`: paycheck > 1.5× median → exclude excess above median
- `accrueAmount(bucketKey)` — returns projected amount for that bucket for remaining days

---

## Pressure Bar Rendering

`renderThermometer(containerId, selMonth)`:

- Calls `buildMonthSummary(selMonth, sp)` — returns `null` for missing months
- Bar is pure CSS `<div>` segments inside `position:relative; height:48px` container:
  - Fixed: `linear-gradient(to bottom, #FF9494, #C94444)`
  - Variable: `linear-gradient(to bottom, #FFCA40, #C07A00)`
  - Buffer (surplus): `repeating-linear-gradient(-45deg, rgba(52,217,195,.55) 0px, ... 14px)`
  - Overage (deficit): `repeating-linear-gradient(45deg, rgba(255,59,59,.7) 0px, ... 12px)`
  - Highlight: `pointer-events:none` overlay with top-lit gradient
  - Income line: 2px white div with box-shadow glow
- Five KPI tiles below bar: TAKE-HOME · AUTO-SAVE · FIXED · VARIABLE · BUFFER/OVER

---

## IS Analytics Charts

`renderISTrend(passedMonth)` dispatches on `isTrendType`:

| Type | Description | Range tabs |
|------|-------------|-----------|
| `pressure` | Delegates to `renderThermometer('isTrendWrap', selMo)` | Hidden |
| `stack` | SVG stacked bar (fixed + variable per month) with deployable line | Shown |
| `trellis` | 4-column small multiples — one sparkline per budget bucket | Shown |
| `slope` | Slope chart: selected month vs 6-month average, sorted by delta% | Hidden |
| `waffle` | Proportional bar for selected month only | Hidden |

The `passedMonth` argument is always passed from `renderIncomeStatement(selMonth)` to prevent empty-string fallback bugs. `setISTrendType` and `setISTrendRange` both read `document.getElementById('isMonth')?.value` at call time.

---

## File Registry

`forge_file_registry` localStorage key:

```js
{
  quicken_csv: { type, filename, thruDate, count, importedAt },
  amazon_orders: { ... },
  apple_card: { ... },
  _files: [                    // full chronological upload history
    { type, filename, thruDate, count, importedAt },
    ...
  ]
}
```

`recordFileImport(type, filename, thruDate, count)` updates both the per-type primary entry and the `_files[]` array (deduplicates by filename).

---

## Pulse Auth — PIN Pad

Lock screen has zero `<input>` elements. iOS Passwords credential manager scans for adjacent text fields — no inputs, no trigger.

```
forgePinDigit(d)      — appends digit to _pinCurrent, auto-submits at _PIN_LEN (6)
forgePinBack()        — removes last digit
forgePinConfirm()     — async: setup1 → save _pinFirst; setup2 → compare → FORGE_AUTH.setup(); unlock → FORGE_AUTH.unlock(pin)
forgeInitAuth()       — async: routes to setup1 or unlock flow; attempts Face ID if registered
forgePostUnlock()     — decrypts data keys, patches localStorage, calls forgeAppInit()
```

Haptic pattern via `navigator.vibrate()`:
- Digit tap: 8ms
- Backspace: 5ms
- All 6 entered: `[15, 20, 60]` (success double-tap)
- Wrong PIN: `[30, 40, 30]` (error stutter)

---

## Worker Endpoints (forge_worker_v2.js)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | $id chat proxy → Claude Sonnet |
| POST | `/scan` | Smart Scan → Claude vision + CSV parse |
| POST | `/sync/push` | Push ledger to Cloudflare KV |
| GET | `/sync/pull` | Pull ledger from Cloudflare KV |

Both `SID_PROXY_URL` (Pulse) and `WORKER_URL` (desktop) point to the same deployed worker. v2 is backwards-compatible with v1 `/chat`.

---

## Known Structural Constraints

- No `Chart.defaults.*` at top level — must be inside `applyChartDefaults()` called from DOMContentLoaded
- `renderThermometer` must use CSS divs, not SVG gradients — ID collisions break rendering when multiple instances exist on one page
- `renderISTrend(passedMonth)` must always receive the month explicitly — reading `isMonth?.value` inside the function fails if the selector is empty on first load
- `showPage('income')` must NOT call `renderISTrend()` separately — `renderIncomeStatement` already calls it. Duplicate call blanks the pressure bar
- All visibility via `element.style.display` — CSS `.page.active` class is fallback only
