# Forge · Family Finance Platform

**Version:** v4.0.0 · May 2026  
**Live:** https://luka731chris.github.io/Forge  
**Repo:** https://github.com/luka731chris/Forge

Private family finance platform for the Luka family. Reads Quicken exports, unmasks lump-sum charges into line-item detail, attributes purchases to individual family members, and runs two AI-powered Pittsburgh characters on the data.

---

## Files

| File | Role |
|------|------|
| `index.html` | Forge Desktop — single-file app, 563KB |
| `forge-pulse.html` | Forge Pulse — mobile PWA, 288KB |
| `forge_worker_v2.js` | Cloudflare Worker — $id chat proxy + Smart Scan /scan endpoint |
| `wrangler.jsonc` | Worker deployment config |

**Test package** (alpha/beta experimentation only):

| File | Role |
|------|------|
| `index-test-v4.0.html` | Desktop with synthetic test data pre-loaded |
| `forge-pulse-test-v4.0.html` | Pulse with synthetic test data pre-loaded |

---

## Stack

- Vanilla JS, no build step, no npm, no framework
- Chart.js 4.4.1 (dashboard donuts only; all IS/analytics charts are pure SVG)
- Google Fonts: Cormorant Garamond (display) · DM Sans (UI) · Fira Code (mono)
- GitHub Pages hosting
- Cloudflare Workers for AI chat proxy and Smart Scan
- Claude Sonnet via Anthropic API

---

## Desktop Pages (15)

| Page | Description |
|------|-------------|
| Upload | File drop zone, Smart Scan, demo data loader |
| Dashboard | KPI tiles, pressure bar, category donut, top merchants |
| Cash Flow | Monthly bar + line chart, waterfall, 3M/6M/1Y/All range tabs |
| Categories | Spending by category with drill-down |
| Transactions | Full register with search, filter, sort |
| Credit Flow | Credit card charge and payment tracking |
| Balance Sheet | Net worth, assets, liabilities, ratios |
| Financials | Multi-period income/expense summary |
| Budget | Category budget targets vs actuals |
| Validate | Data quality checks and anomaly flags |
| **Income Statement** | Accrual P&L stepdown, IS analytics, comments, reconciliation |
| Reconcile | Account-level P&L tie-out |
| Crosswalk | Quicken → Forge category mapping |
| Planner | Scenario planning tool |
| Settings | Family profile, account-to-owner mapping, file status |

---

## Forge Pulse Tabs (6)

| Tab | Description |
|-----|-------------|
| Snapshot | KPI hero, spending chips, alert summary |
| Alerts | Per-person impulse warnings, trend alerts |
| Amazon | Detail Lens — order-level spending |
| Analytics | SVG charts: cash flow, savings rate, by-category donut |
| Settings | Sync, file registry, family config |
| Ask $id | AI chat with full financial context |

---

## Supported File Types

| Type | Detection | What It Does |
|------|-----------|--------------|
| Quicken CSV | Date + amount column pair in first 30 rows | Main transaction register |
| Quicken QIF | `.qif` extension | Legacy Quicken format |
| Quicken QFX/OFX | `.qfx` / `.ofx` extension | Web Connect bank export |
| Quicken Net Worth | "Net Worth" + account columns | Balance sheet snapshots |
| Amazon Orders | `order id` + `asin` columns | Line-item order detail |
| Apple Card CSV | `clearing date` + `merchant` columns | CC statement detail |
| Home Depot | `order number` + `items ordered` | Project-level detail |
| Venmo | `funding source` + `destination` | P2P transaction detail |

---

## localStorage Keys

| Key | Content |
|-----|---------|
| `ledger_v3` | `{ txns[], accounts[], amzItems[], isDemoMode, savedAt }` |
| `forge_settings_v2` | Family profile, targets, account owners, category budgets |
| `forge_file_registry` | Per-type last import + `_files[]` full history |
| `forge_is_comments` | IS section notes per month: `{ YYYY-MM: { section: text } }` |
| `forge_sync_token` | Cloudflare sync token (never hardcoded) |
| `forge_hierarchy_overrides` | User category reassignments |

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--void` | `#080808` | Deepest background |
| `--base` | `#0E0E0E` | Primary background |
| `--gold` | `#F5A800` | Brand primary |
| `--pos` | `#2DD4BF` | Positive values |
| `--neg` | `#F87171` | Negative values |
| `--river` | `#60A5FA` | Purchaser badges |
| `--ink` | `#F2EFE9` | Primary text |
| `--fm` | Fira Code | Dates, numbers, mono |

---

## Quick Start

1. Export Quicken data: **File → Export → Transactions to CSV** — all accounts, all dates
2. Go to https://luka731chris.github.io/Forge
3. Drag the CSV onto The Pour (upload zone)
4. Optionally drag Apple Card CSV, Amazon order history CSV
5. Navigate to Income Statement, set month, review

See `IMPORT-GUIDE.md` for full export steps and column mapping.

---

## Architecture Notes

- All edits to `index.html`: verify JS syntax with `node --check` after every change
- CSS changes: verify brace balance (was 184/184 at v4.0.0)
- Visibility controlled via JS inline styles only — `element.style.display` etc.
- No `Chart.defaults.*` at top level — all inside `applyChartDefaults()` called from DOMContentLoaded
- IS analytics charts use pure CSS/SVG — no Chart.js
- Dashboard/categories donuts use Chart.js 4.4.1 with `Chart.getChart()` guard before creation
- `renderThermometer()` uses CSS div segments — no SVG gradients (IDs collide across instances)
