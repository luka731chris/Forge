# Forge — Technical Reference

Architecture, data model, parser documentation, and implementation details.

---

## Architecture

Forge is a zero-dependency static web application. The entire UI, parsing engine, intelligence layer, and state management live in two HTML files. There is no build step, no package manager, no transpilation.

```
index.html (262 KB)
├── Embedded CSS (~1,800 lines)
│   ├── Design system (CSS custom properties)
│   ├── Layout (sidebar + main content area)
│   ├── Components (cards, tables, charts, forms, badges)
│   └── Page-specific styles (upload, confluence, settings)
│
└── Embedded JavaScript (~3,500 lines, 122 functions)
    ├── Constants & state (DB_KEY, SETTINGS_KEY, FBR_KEY)
    ├── Persistence (saveData, loadData, saveSettings, loadSettings)
    ├── File handling (handleFiles, renderFileList, processAll)
    ├── Parsers (parseCSV, parseQIF, parseOFX, parseOFXDate, parseAmazon, parseDate, splitCSV)
    ├── Intelligence engine (runIntelligence, detectTrendAlerts, detectBudgetDrift, detectAnomalies, detectSeasonal)
    ├── Renderers (renderDashboard, renderCF, renderCats, renderMch, renderAmazon, renderTxns)
    ├── Family review (buildStep1–6, renderFamily, exportPDF)
    ├── Settings (loadSettings, saveSettings, renderSettingsPage)
    ├── Life-stage system (calcAge, getLifeStage, getParentLifeStage, buildLifeStageRecommendations)
    └── UI utilities (showToast, showPage, switchTab, setRange)

forge-pulse.html (58 KB)
├── Mobile-first CSS
└── JavaScript
    ├── Data reader (reads from localStorage, no import capability)
    ├── Snapshot renderer (renderSnapshot)
    ├── Alert renderer (renderAlerts)
    ├── Amazon renderer (renderAmazon)
    ├── Sid AI layer (callSid, sendChat, buildSidPrompt, buildContext, buildSidSystemPrompt)
    └── PWA service worker registration

forge_worker.js (2.2 KB)
└── Cloudflare Worker: CORS proxy + Anthropic API key injection
```

---

## Data Model

### localStorage Keys

| Key | Schema | Notes |
|-----|--------|-------|
| `ledger_v3` | `{ txns, accounts, amzItems, isDemoMode, savedAt }` | Primary data store |
| `forge_settings_v1` | `{ familyName, user1, user1dob, user2, user2dob, kids[], savingsTarget, emergencyTarget, largePurchase, amzSensitivity, budgets{}, confluenceAnim, confluenceMode, kidsInAlerts, meetingDay, meetingDuration, ... }` | User preferences |
| `ledger_fbr_v2` | `{ goals[], notes{1..6}, stepsDone[], decisions[], plannedPurchases[] }` | Confluence meeting state |

### Transaction Object

```javascript
{
  date:     "2024-03-15",          // ISO 8601 date string (YYYY-MM-DD)
  payee:    "Giant Eagle",          // payee/merchant name
  amount:   -127.43,               // negative = expense, positive = income
  category: "Groceries",           // from Quicken, or "Uncategorized"
  account:  "Chase Sapphire (CC)", // account name from Quicken file
  memo:     "",                    // optional notes/reference
  type:     "debit"                // "debit" | "credit"
}
```

### Account Object

```javascript
{
  name:  "Chase Checking",  // as it appears in Quicken export
  type:  "checking",        // "checking" | "savings" | "credit" | "investment" | "other"
  color: "#F5A800"          // auto-assigned from ACCT_COLORS palette
}
```

### Amazon Item Object

```javascript
{
  date:     "2024-02-10",
  title:    "Atomic Habits",
  category: "Books",
  price:    16.99,           // unit price
  qty:      1,
  total:    16.99,           // price × qty
  orderId:  "D01-XXXXXXXX",
  asin:     "0735211299"
}
```

### Goal Object (Confluence)

```javascript
{
  id:       "goal1234567890",
  name:     "Emergency Fund",
  target:   25000,
  current:  18000,
  unit:     "$",
  color:    "#F5A800",
  horizon:  "Near-term",  // "Near-term" | "Mid-term" | "Long-term"
  note:     "3 months of expenses"
}
```

---

## Parser Reference

### `parseCSV(text, fname)`

Multi-format CSV parser. Handles comma and tab delimiters, quoted fields with embedded commas, and all common Quicken column naming variants.

**Column detection (flexible matching):**

| Field | Accepted Column Names |
|-------|-----------------------|
| Date | `date`, `transaction date`, `trans date`, `posted date`, `post date`, `value date` |
| Payee | `payee`, `description`, `merchant`, `name`, `memo`, `narrative`, `details` |
| Amount | `amount`, `transaction amount`, `value`, `debit/credit`, `net amount`, `withdrawal`, `deposit` |
| Category | `category`, `type`, `transaction type`, `class` |
| Account | `account`, `account name`, `account number` |
| Memo | `memo`, `notes`, `note`, `reference` |

**Amount parsing:** Handles `$1,234.56`, `(1,234.56)` (parenthetical negatives), `-1234.56`, `1,234.56` with automatic sign detection.

**Fallback:** If `Account` column is absent, uses the filename (without extension) as the account name.

### `parseQIF(text, fname)`

Parses the Quicken Interchange Format. Reads the standard QIF record codes:

| Code | Field |
|------|-------|
| `D` | Date |
| `T` | Amount |
| `P` | Payee |
| `L` | Category |
| `M` | Memo |
| `^` | End of record |

Records without a valid date are skipped. Account name falls back to the filename.

### `parseOFX(text, fname)`

Parses OFX/QFX XML format. Extracts `<STMTTRN>` transaction blocks and reads:

- `<DTPOSTED>` or `<DTUSER>` for date (via `parseOFXDate`)
- `<TRNAMT>` for amount
- `<NAME>`, `<n>`, or `<MEMO>` for payee (in order of preference)
- `<ACCTID>` for account ID
- `<CATEGORY>` for category (if present)

`parseOFXDate(s)` strips timezone offsets (e.g. `[-5:EST]`) and returns `YYYY-MM-DD` from the 8-digit prefix.

### `parseDate(s)`

Handles all date formats encountered in financial exports:

| Format | Example |
|--------|---------|
| ISO | `2024-03-15`, `2024/03/15` |
| US short | `3/15/2024`, `03-15-2024`, `3/15/24` |
| Long month | `March 15, 2024`, `Mar 15, 2024` |
| Day-first | `15 Mar 2024`, `15-March-2024` |

Two-digit years: `< 30` → 2000s, `≥ 30` → 1900s.

### `parseAmazon(text)`

Handles both the current Amazon Privacy Central format (2023+) and the legacy Order History Reports format (pre-2023). Detects format by column header names.

**New format columns:** `Order ID`, `Order Date`, `Product Name`, `Quantity`, `Purchase Price Per Unit`, `Grand Total`, `ASIN/ISBN`, `Department`

**Legacy format columns:** `Order Date`, `Order ID`, `Title`, `Category`, `ASIN`, `Quantity`, `Item Total`

Prefers `Grand Total` over `Purchase Price Per Unit × Quantity` for accuracy. Skips rows with zero or missing amounts.

### `splitCSV(line)`

Correct RFC 4180 CSV field splitting. Handles:
- Fields enclosed in double quotes
- Embedded commas within quoted fields
- Embedded double quotes (escaped as `""`)

---

## Intelligence Engine

The Furnace runs five detection algorithms every time intelligence is requested:

### `detectTrendAlerts()`

Compares last 3 months vs. prior 3 months for each spending category. Generates an alert if any category increased more than 25% (warning at 25–50%, danger above 50%).

### `detectBudgetDrift()`

Projects current month-to-date spending to end-of-month using `projectedAmount = MTDAmount × (daysInMonth / dayOfMonth)`. Compares against 12-month rolling average for each category. Alerts when projected overspend exceeds 30%.

### `detectAnomalies()`

Computes mean and standard deviation of all expense amounts in the selected time range. Flags transactions more than 2σ above the mean. Generates a summary alert when any such transactions exist. The full list is shown in the Anomalies tab with σ scores.

### `detectSeasonal()`

Groups spending by year and month across all available data. Calculates average spend per month across all years. Identifies the highest and lowest spending months. Generates an alert for months that are historically 20%+ above baseline.

### `buildLifeStageRecommendations()`

Assigns life-stage labels based on the primary user's age (from date of birth in Settings):

| Age Range | Life Stage |
|-----------|-----------|
| < 37 | Early Career |
| 37–46 | Peak Earning |
| 47–57 | Pre-Retirement |
| 58–66 | Late Career |
| 67+ | Legacy |

Each life stage has a set of prioritized financial recommendations (5–8 per stage) that appear in the Recommended Actions tab.

---

## Sid AI Layer

### Context Building (`buildContext`)

Before every Sid query, Forge builds a financial context string injected as system context. This includes:

- Current month: income, expenses, net, savings rate, vs. prior month
- Trailing 12 months: total income, total expenses, annual savings rate
- Top 5 spending categories (last 3 months)
- Account list and balances
- Goals with current and target amounts
- Recent Furnace alerts (up to 3)
- Amazon summary if available

### Prompt Building (`buildSidPrompt`)

The system prompt adapts based on:

1. **Who is asking:** If the message contains the partner's name, Sid switches to story-first mode (warmer, narrative-forward)
2. **Context signals:** If "meeting" or "confluence" appears, Sid activates Confluence mode (speaks to both people as a team)
3. **Default:** Data-first mode — numbers up front, analysis behind them

### Worker Communication

Forge Pulse sends a POST request to the Cloudflare Worker with:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 500,
  "system": "<system prompt with financial context>",
  "messages": [<last 8 turns of conversation>]
}
```

The Worker caps `max_tokens` at 1,000 regardless of what the client sends. The model string is locked server-side.

### Error Handling

| HTTP Status / Error | User-facing message |
|--------------------|---------------------|
| Request timeout (>30s) | "Sid took too long to respond..." |
| 401 | "Sid cannot connect — the API key is not working..." |
| 429 | "Sid is getting too many requests right now. Wait about 30 seconds..." |
| Network failure | "Sid cannot reach the server..." |
| Any other error | "Something went wrong — Sid could not respond..." |

---

## Deduplication

Forge deduplicates on import using a composite key:

```javascript
`${transaction.date}|${transaction.payee}|${transaction.amount}|${transaction.account}`
```

This means:
- The same transaction imported twice will not create a duplicate
- A transaction that differs in any of these four fields is treated as new
- Changing a category in Quicken and re-importing will NOT update the existing transaction (category is not in the dedup key) — it will be treated as a new transaction

---

## Drag-and-Drop Implementation

The drop zones use a `dragenter`/`dragleave` depth counter to prevent false `dragleave` events when the cursor moves over child elements:

```javascript
let depth = 0;

el.addEventListener('dragenter', e => { e.preventDefault(); depth++; el.classList.add('dragover'); });
el.addEventListener('dragleave', e => { e.preventDefault(); depth = Math.max(0, depth-1); if (depth === 0) el.classList.remove('dragover'); });
el.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
el.addEventListener('drop',      e => { e.preventDefault(); depth = 0; el.classList.remove('dragover'); /* process */ });
```

The file `<input>` inside each zone has `position: absolute; inset: 0; z-index: 10; opacity: 0` to make the entire zone area clickable (opens the system file picker). Child elements have `pointer-events: none` to ensure clicks reach the input.

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--void` | `#080808` | Deepest background |
| `--base` | `#0E0E0E` | Primary background |
| `--lift` | `#151515` | Raised surfaces |
| `--float` | `#1C1C1C` | Cards, panels |
| `--gold` | `#F5A800` | Brand primary, CTAs |
| `--gold-lt` | `#FFB612` | Accent highlights |
| `--positive` | `#2DD4BF` | Positive values (teal) |
| `--negative` | `#F87171` | Negative values (soft red) |
| `--river` | `#60A5FA` | Secondary accent (Allegheny blue) |
| `--ink` | `#F2EFE9` | Primary text (warm white) |
| `--ink2` | `#D0CBC4` | Secondary text |
| `--ink3` | `#9E9890` | Tertiary / muted |
| `--ink4` | `#6E6A65` | Disabled / dim |

### Typography

| Token | Stack | Purpose |
|-------|-------|---------|
| `--font-d` | Cormorant Garamond → Playfair Display → Georgia → serif | Display headings, financial figures |
| `--font-ui` | DM Sans → Inter → system-ui → sans-serif | UI text, labels, body |
| `--font-m` | Fira Code → JetBrains Mono → monospace | Dates, numbers, technical content |

### Geometry

| Token | Value |
|-------|-------|
| `--r-sm` | 4px |
| `--r` | 8px |
| `--r-lg` | 14px |
| `--r-xl` | 20px |

### Motion

| Token | Value |
|-------|-------|
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out) |
| `--ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` (standard ease-out) |
| `--dur-fast` | 140ms |
| `--dur-mid` | 260ms |
| `--dur-slow` | 420ms |

---

## External Dependencies

| Dependency | Version | Source | Usage |
|-----------|---------|--------|-------|
| Chart.js | 4.4.1 | cdnjs CDN | All 16 charts |
| Cormorant Garamond | — | Google Fonts | Display typography |
| DM Sans | — | Google Fonts | UI typography |
| Fira Code | — | Google Fonts | Monospace typography |

**No npm packages. No build toolchain. No framework.** The app is fully functional with CDN resources cached by the browser. It does not work offline (fonts and Chart.js require internet), but the core functionality works on a slow connection.

---

## Wrangler Configuration

`wrangler.jsonc` configures the Cloudflare Worker deployment:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "forge-sid",
  "main": "forge_worker.js",
  "compatibility_date": "2025-09-27",
  "compatibility_flags": [
    "nodejs_compat"
  ]
}
```

The `assets` block must be absent — its presence causes Cloudflare to treat the Worker as a static site host rather than a serverless function, which prevents Variables and Secrets from being accessible and disables the Worker's `fetch` handler.

---

## PDF Export Implementation

The Confluence PDF export (`exportPDF()`) opens a new browser window with a complete self-contained HTML document styled for printing, then triggers `window.print()`. The output is an A4-formatted monthly Blueprint including:

- KPI summary (income, expenses, net, savings rate)
- Top category breakdown (last 3 months)
- Recent large purchases
- Intelligence alerts
- Goals progress bars
- Notes from all 6 agenda steps
- Decisions made during the meeting
- Planned purchases

Print settings: A4 page, zero margins (set via `@page { margin: 0; }`), with internal 18mm print margins. Color printing is enabled via `-webkit-print-color-adjust: exact`.

---

## Demo Data

`generateDemoData()` produces 4 years of synthetic household data (January 2022 – March 2026) including:

- 11 accounts (checking, savings, credit cards, investment, business)
- 45 transaction templates with realistic frequency distributions
- Seasonal multipliers (December spike, summer dining increase)
- Year-over-year spending drift (~3–5% annually)
- Random one-off transactions (~3% daily probability)
- Amazon order history across 10 categories

The demo data is replaced entirely when real data is imported (`isDemoMode` flag is cleared and `saveData()` is called).
