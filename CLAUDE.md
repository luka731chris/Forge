# Forge — Project Context for Claude Code

## What this is
Forge is a personal family finance platform built and maintained by Chris,
for the Luka family. Reads Quicken exports, unmasks lump-sum card charges
into item-level detail, and tracks cash flow / net worth / budget pressure.

**Current version: v4.0.0 (May 2026).** The main app files are `index.html`
(Forge Desktop) and `forge-pulse.html` (Forge Pulse mobile PWA). An earlier
Claude session inspected a file called `forge.html` (an older intermediate
build); treat any notes from that session referencing `lean_4.0`, `forge_prod_v1`,
or `forge_demo_v1` as stale — those storage keys no longer exist.

## Stack & deployment
- **Forge Desktop:** `index.html` — single-file vanilla JS, ~563KB, no framework,
  no build step, no npm.
- **Forge Pulse:** `forge-pulse.html` — mobile PWA, ~288KB. Has its own copy of
  all shared functions (buildMonthSummary, classifyTxn, isTransfer, etc.). Every
  fix to a shared function must be applied to both files.
- **Worker:** `forge_worker_v2.js` deployed to Cloudflare Workers. Handles AI chat
  proxy, Smart Scan, and cloud sync. `wrangler.jsonc` is the deployment config.
- **Hosting:** GitHub Pages (static) + Cloudflare Workers (API). Changes to main
  branch go live immediately — treat it as prod.
- Charts: hand-rolled SVG renderers for all IS/analytics charts; Chart.js 4.4.1
  (cdnjs) for the dashboard category donut only.
- No build step — edit HTML files directly. Do not introduce a bundler.

## Worker endpoints (`forge_worker_v2.js`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | $id chat proxy → Claude Sonnet (Pulse: Ask $id tab) |
| POST | `/scan` | Smart Scan → Claude Vision + CSV parse (Desktop: Upload page) |
| POST | `/sync/push` | Push full ledger JSON to Cloudflare KV |
| GET | `/sync/pull` | Pull ledger JSON from Cloudflare KV |

Both `SID_PROXY_URL` (in `forge-pulse.html`) and `WORKER_URL` (in `index.html`)
point to the same deployed worker. Both constants ship **empty** in source — must
be set per deployment. Never hardcode or commit a real worker URL.

## AI features
- **$id** — AI chat assistant in the "Ask $id" tab of Forge Pulse. Routes through
  `/chat` endpoint. Sends full financial context + user message to Claude Sonnet.
  Three communication modes: Data-first, Story-first, Confluence.
- **Smart Scan** — AI file reader on the Desktop Upload page. Accepts photos,
  PDFs, W-2s, unknown CSVs. Routes through `/scan` endpoint (Claude Vision).

## File structure
```
/
├── index.html                   — Forge Desktop (single-file app, ~563KB)
├── forge-pulse.html             — Forge Pulse (mobile PWA, ~288KB)
├── forge_worker_v2.js           — Cloudflare Worker (AI proxy + sync)
├── wrangler.jsonc               — Worker deployment config
├── index-test-v4.0.html         — Test desktop (synthetic data pre-loaded)
├── forge-pulse-test-v4.0.html   — Test mobile (synthetic data pre-loaded)
├── Forge-Backlog-v4.0.0.xlsx    — Bug/feature tracker + session protocol
├── CLAUDE.md
├── CHANGELOG.md
├── README.md
├── TECHNICAL.md
├── TESTING.md
├── IMPORT-GUIDE.md
├── QUICK-START.md
├── SID-SETUP.md
└── CONTRIBUTING.md
```

## localStorage keys (v4.0.0)
| Key | Content |
|-----|---------|
| `ledger_v3` | `{ txns[], accounts[], amzItems[], isDemoMode, savedAt }` |
| `forge_settings_v2` | Family profile, targets, account owners, category budgets |
| `forge_file_registry` | Per-type last import + `_files[]` full upload history |
| `forge_is_comments` | IS section notes per month: `{ YYYY-MM: { section: text } }` |
| `forge_sync_token` | Cloudflare sync token (never hardcoded) |
| `forge_hierarchy_overrides` | User category reassignments |

Auth-related keys: `forge_auth_salt`, `forge_auth_check`, `forge_auth_webauthn`.
Note: keys `forge_prod_v1`, `forge_demo_v1`, `forge_lean_v1` are from an older
build and no longer exist in v4.0.0.

## Data model conventions
Real family names are used as identifiers throughout — **do not refactor these
into generic labels** unless explicitly asked:
- Default family profile: `Chris` 🧢, `Kira` 💛 (parents), `Sam` ⚾,
  `Whitney` 🎨, `Will` 🎮 (kids). Household label: "The Luka Family".
- Demo dataset uses synthetic data ("The Henderson Family, North Hills, PA").

## Test suite
Three test files exist (predate v4.0 — need update per backlog item #9):
| File | Tests | Coverage |
|------|-------|----------|
| `forge_tests.js` | 149 | Core parsers, formatters, dedup |
| `forge_tests_v2.js` | 325 | Apple Card, analytics, purchaser, CSV edge cases |
| `forge_sid_tests.js` | 98 | $id AI chat layer |
| **Total** | **572** | 100% pass required before commit |

Run with Node. All 572 must pass before any commit. The suites predate the
v4.0 IS rebuild, Pattern A auto-save fix, and classifyTxn prefix-match rewrite.

## Structural checks (required before every upload)
```bash
node --check index.html          # must exit 0
node --check forge-pulse.html    # must exit 0

grep -c '<div\b' index.html      # must equal:
grep -c '</div>' index.html      # baseline 261/261

grep -c '<div\b' forge-pulse.html   # baseline 93/93
grep -c '</div>' forge-pulse.html
```
CSS brace balance: 184/184 (Desktop), 178/178 (Pulse).
No duplicate function definitions — `renderThermometer`, `buildMonthSummary`,
`classifyTxn` must each appear exactly once per file.

## Versioning
| Type | Increment | When |
|------|-----------|------|
| PATCH | x.x.+1 | Bug fix, style tweak, copy change, dead code removal |
| MINOR | x.+1.0 | New feature, new chart, new file format, logic change affecting numbers |
| MAJOR | +1.0.0 | localStorage key structure changes, auth change, core data model change |

## Working agreements
- Match existing vanilla-JS patterns (hand-rolled SVG chart functions, the
  `card()`/`sr()`/`seg()` settings-UI helpers) — do not introduce new libraries.
- Both `index.html` and `forge-pulse.html` share many functions. Every fix to a
  shared function (buildMonthSummary, renderThermometer, classifyTxn, isTransfer,
  derivedThru) must be applied to both files.
- Do not touch the `FORGE_AUTH` encryption flow casually — it gates all of
  localStorage. Any change must preserve the unlock/migration path for existing
  encrypted user data.
- Cloudflare Worker secrets live in the Cloudflare dashboard only — never commit
  API keys, worker URLs, or sync tokens.
- Use the test package (`index-test-v4.0.html`) for experimental features before
  touching production files. Never copy the test package over production.
- After each session: update CHANGELOG.md, mark Backlog items done, run all
  structural checks, then upload both HTML files to GitHub.

## Critical invariants (do not violate)
- **No Pattern B.** Pre-committed savings uses Pattern A only (checking→savings
  near payday). Pattern B caused double-counting and was removed in v4.0.0.
- **No SVG gradients in the thermometer.** Gradient IDs collide when multiple
  instances exist. The pressure bar uses CSS div segments only.
- **`renderISTrend` always receives a month explicitly.** Reading `isMonth?.value`
  inside the function fails on first load.
- **`showPage` does not call `renderISTrend`.** `renderIncomeStatement` already
  calls it. A duplicate call blanks the pressure bar.
- **Transfers excluded from `spendable()`.** `operatingSpendable(txns)` filters
  `isTransfer(t)`. Never add transfers back.
- **Detail-file rows excluded from balance sheet.** Apple Card CSV, Amazon, Home
  Depot, Venmo rows do not represent real account ledger entries.
