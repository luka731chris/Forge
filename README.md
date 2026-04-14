# Forge

**Private family finance platform for the Luka family.**
Reads Quicken exports, parses merchant CSVs, and puts two Pittsburgh characters to work on the data.

**Live:** [luka731chris.github.io/Forge](https://luka731chris.github.io/Forge)
**Stack:** Vanilla JS · Chart.js 4.4.1 · Google Fonts · GitHub Pages · No npm · No build step

---

## Pages

| Page | Nav label | What it does |
|---|---|---|
| Dashboard | Dashboard | KPI tiles (NW, income, expenses, savings rate), monthly cash flow chart, category donut, top merchants, range controls 3M / 6M / 1Y / All |
| Cash Flow | Cash Flow | Income vs expense by month, account filter, year filter, net savings line |
| Categories | Categories | Spending by category with period comparison |
| Transactions | Transactions | Full register: search, account filter, category filter, show/hide transfers, paginated |
| Income Statement | Income Statement | Monthly P&L waterfall (Income → Savings → Fixed → Utilities → Necessities → Discretionary → Other) with 3-level drill: section → bucket → payee → individual transaction with item detail |
| Credit Card Flow | Credit Card Flow | Per-card cycle velocity, projected statement balance, payment timing |
| Import Data | Import Data | Unified drop zone, auto-detects all file types, Smart Scan AI fallback |
| Data Validation | Data Validation | Dedup check, near-duplicate check, category coverage, transfer detection, account list |
| Budget vs Actual | Budget vs Actual | Monthly budget tracker, pace indicator, seasonal budget suggestion, non-recurring income flagging |
| Bill Calendar | Bill Calendar | CC billing cycle dashboard, upcoming 30-day recurring predictions, all recurring transactions |
| Balance Sheet | Balance Sheet | Assets / liabilities / net worth with historical comparison dropdown, 10 KPI tiles across 3 rows, NW snapshot history |
| Family Financials | Family Financials | Investor-grade income statement, cash flow statement, key ratios, 12-month projection |

---

## File Map

| File | Role |
|---|---|
| `index.html` | Forge Desktop — single-file app, 233KB, build `lean_4.0` |
| `forge-pulse.html` | Forge Pulse — mobile PWA with Ask $id AI chat |
| `forge_worker.js` | Cloudflare Worker v1 — $id chat proxy |
| `forge_worker_v2.js` | Cloudflare Worker v2 — chat + Smart Scan `/scan` endpoint |
| `wrangler.jsonc` | Worker deployment config |
| `README.md` | This file |
| `CHANGELOG.md` | Full version history |
| `TECHNICAL.md` | Data model, parsers, storage, design system |
| `IMPORT-GUIDE.md` | Quicken export steps, NW report schedule, merchant CSV guide |

---

## Import Formats

The drop zone on **Import Data** accepts all of these without any configuration:

| Format | Detection | Notes |
|---|---|---|
| Quicken CSV (All Transactions) | `date` + `amount` columns in first 30 lines | 4-line preamble skipped automatically |
| Quicken QIF | `!Type:` header | Multi-account supported |
| Quicken OFX / QFX | `<OFX>` tag | |
| Apple Card CSV | `clearing date` + `merchant` + `amount (usd)` | Payee = Merchant; itemDetail = Description |
| Amazon Order History | `order id` + `asin` + `total charged` | Full title stored as itemDetail |
| Home Depot Orders | `order number` + `items ordered` + `order total` | |
| Venmo Statement | `funding source` + `destination` + `amount (total)` | Directional payee by amount sign |
| Quicken Net Worth report | Title row: `Net Worth` | Stored as snapshot by date |
| Photo / PDF (Smart Scan) | Any image or PDF | Requires WORKER_URL set |

Drop multiple files at once. Each is detected independently and appended to the ledger with dedup.

---

## Storage

| Key | Contents | Survives Clear Data? |
|---|---|---|
| `forge_prod_v1` | Real transaction ledger: `txns[]`, `accounts[]`, `acctMeta{}` | No |
| `forge_demo_v1` | Demo data — never mixed with prod | Yes (separate key) |
| `forge_lean_v1` | Legacy key — migrated on first load, then removed | — |
| `forge_networth` | Current NW snapshot: `{ acctName: { value, date, source } }` | No |
| `forge_networth_hist` | Historical NW snapshots: `{ dateKey: { acctName: value } }` | **Yes** |
| `forge_settings_v2` | CC dates, budget targets, NR flags, account owners | Yes |
| `forge_build` | Build version stamp (`lean_4.0`) | Yes |

`forge_networth_hist` intentionally survives Clear Data — historical balance sheet snapshots are long-lived reference data. Use **✕ Clear NW History** in the Balance Sheet header to wipe them explicitly.

---

## Design System

| Token | Value | Usage |
|---|---|---|
| `--void` | #080808 | Deepest background |
| `--base` | #0E0E0E | Primary background |
| `--lift` | #151515 | Raised surfaces |
| `--float` | #1C1C1C | Cards |
| `--gold` | #F5A800 | Brand primary ($kenes #30) |
| `--positive` | #2DD4BF | Positive values |
| `--negative` | #F87171 | Negative values |
| `--river` | #60A5FA | Item detail, purchaser badges |
| `--ink` | #F2EFE9 | Primary text |
| `--font-d` | Cormorant Garamond | Display headings |
| `--font-ui` | DM Sans | UI text |
| `--font-m` | Fira Code | Dates, numbers, monospace |

Pittsburgh Black & Gold. $kenes is #30 (baseball). $id is #87 (hockey).

Visibility is controlled exclusively via JS inline styles (`element.style.display`, `opacity`, `visibility`). CSS class `.page.active` is a fallback only. No CSS animation can prevent content from being visible.

---

## Characters

**$kenes (#30)** — The analytical voice. Powers Analytics Studio and the data validation engine. Named after the Pittsburgh Pirates.

**$id (#87)** — The financial advisor. Powers Forge Pulse's Ask $id chat tab. Responds in three modes: data-first, story-first, or Confluence (meeting agenda format). Named after the Penguins. Requires `SID_PROXY_URL` set in `forge-pulse.html` and a Cloudflare Worker deployed.

---

## Setup

### Basic (no AI features)

1. Fork or clone this repository
2. Enable GitHub Pages (Settings → Pages → branch: main, folder: `/`)
3. Open `index.html` in a browser, or navigate to your Pages URL
4. Drop your Quicken CSV export onto the Import page

### With Smart Scan and $id (Cloudflare Worker required)

See `SID-SETUP.md` for full Cloudflare + Anthropic API key setup.

Two URL constants to set:

| Constant | File | Line | Purpose |
|---|---|---|---|
| `WORKER_URL` | `index.html` | ~line 6771 | Smart Scan |
| `SID_PROXY_URL` | `forge-pulse.html` | ~line 1080 | $id chat |

Both can point to the same deployed `forge_worker_v2.js`.

---

## Family

Chris · Kira · Sam · Whitney · Will — Pittsburgh, PA.
