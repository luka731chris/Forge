# Forge — Project Context for Claude Code

## What this is
Forge is a personal family finance platform built and maintained by Chris,
for the Luka family. Reads Quicken exports, unmasks lump-sum card charges
into item-level detail, and tracks cash flow / net worth / budget pressure.

**Confirmed directly from `forge.html` source (uploaded and inspected):**
- Build/data version: **`lean_4.0`** — i.e. **v4.0 "lean"**. This is the
  literal `BUILD` constant used for localStorage cache-busting and the
  `version` field in JSON export. This is the version to treat as canonical.
- Separately, a CSS comment block labels the *visual design system* as
  **"FORGE DESIGN SYSTEM v6.0 — Pittsburgh Black & Gold"**. This is a
  different version track from the app build (v4.0 lean) — don't conflate
  the two. If asked "what version is Forge," the answer is v4.0 (lean); the
  design system version is a separate, more cosmetic counter.
- Page title: "Forge · Family Finance". Branding footer: "LUKALAB · AI
  Creative · Est. 2026".

⚠️ **This contradicts earlier documentation** (a previous session's audit
pinned the codebase at v3.12 with a 397KB forge.html, dual Cloudflare Workers
for an "$id" AI chat assistant + "Smart Scan" import feature, and a
forge-pulse.html companion). The v4.0 "lean" rebuild looks like a deliberate,
substantial rewrite — see "What changed in the lean rebuild" below. Treat any
notes referencing v3.x, $id, $kenes, Smart Scan, or forge_worker_v2.js as
**stale until reconfirmed against the actual repo**.

## Stack & deployment
- **Frontend:** Single-file vanilla JavaScript (`forge.html`), no framework,
  no build step, no npm. Charts: a mix of hand-rolled SVG renderers (bar,
  line, waterfall, horizontal bar) plus Chart.js 4.4.1 (loaded from
  cdnjs.cloudflare.com) for the category donut.
- **Backend/API:** Cloudflare Worker, used only for **cross-device sync**
  (`WORKER_URL + '/sync/push'` and `/sync/pull'`, auth via `X-Sync-Token`
  header). The `WORKER_URL` constant ships **empty** in source — must be set
  per deployment.
- **Hosting:** GitHub Pages (static frontend) + Cloudflare Workers (sync API).
- No build step — edit `forge.html` directly and reload to preview. Don't
  introduce a bundler/transpiler unless explicitly asked.

## What changed in the lean rebuild (v4.0)
Based on what's actually in the uploaded source vs. what older docs describe:
- **Added: client-side encryption.** A `FORGE_AUTH` module wraps all
  localStorage reads/writes in AES-GCM encryption (PBKDF2, 310k iterations),
  gated by a PIN/passphrase lock screen on load, with optional WebAuthn
  (Face ID / Touch ID) unlock. This is a significant new feature not present
  in earlier documentation.
- **Not found in this file:** the previously-documented "$id" / "$kenes" AI
  chat assistant, the "Smart Scan" AI-powered import feature, or any
  Anthropic API key handling. Either these were removed in the lean rebuild,
  or they live exclusively in `forge-pulse.html` (not part of this upload —
  unconfirmed either way).
- **Sync is simpler:** just push/pull of the full ledger JSON via one
  Cloudflare Worker, token-authed. No `/scan` endpoint, no dual worker files.
- Storage keys actually used in source (don't assume the names from older
  docs are still accurate):
  - `forge_prod_v1` — real imported data
  - `forge_demo_v1` — demo dataset (never touches prod)
  - `forge_lean_v1` — legacy key, auto-migrated to `forge_prod_v1` on load
  - `forge_settings_v2` — settings (note: **v2**, not v1)
  - `forge_networth` / `forge_networth_hist` — net worth snapshots (history
    survives "Clear Data")
  - `forge_file_registry` — import history per source file
  - `forge_hierarchy_overrides` — custom keyword overrides for categorization
  - `forge_is_comments` — per-month notes on the Income Statement
  - Auth-related: `forge_auth_salt`, `forge_auth_check`, `forge_auth_webauthn`

## Data model conventions
Real family names are used as identifiers throughout the data model and UI —
**do not refactor these into generic labels** unless explicitly asked:
- Default family profile in source: `Chris` 🧢, `Kira` 💛 (parents),
  `Sam` ⚾, `Whitney` 🎨, `Will` 🎮 (kids). Household label: "The Luka Family".

## Core features (confirmed from source)
- Monthly cash flow, budget-vs-actual, accrual-based Income Statement with
  an in-flight-month projection engine (per-bucket accrual logic: fixed
  bills, utilities, discretionary daily-rate projection, with outlier
  removal and per-employer paycheck normalization for 3-pay months/bonuses).
- Net Worth / Balance Sheet with period-over-period comparison.
- **Crosswalk / Category Mapper** — finds uncategorized transactions and
  recommends Forge buckets + the matching Quicken category to fix at the
  source, with bulk-accept and CSV export.
- **Detail Lens** — unmasks lump-sum Quicken charges (Amazon, Apple Card,
  Home Depot, Venmo) into item-level detail when a matching detail CSV has
  been imported for that merchant/month.
- **Scenario Planner** — guided questionnaire that turns a goal (trip, home
  project, etc.) into a monthly savings plan with concrete spending cuts.
- **Master Reconciliation** engine + **CFP Balance Sheet Proof** — ties the
  Income Statement, account registers, and net liquid position together so
  every number can be traced back to Quicken.
- iOS "Glass Mode" visual toggle (liquid-glass aesthetic, persisted in
  localStorage, independent of the base Pittsburgh Black & Gold theme).
- Built-in synthetic demo dataset ("The Henderson Family," North Hills, PA)
  for testing without real financial data.

## Working agreements
- Cloudflare Worker secrets/env vars live in the Cloudflare dashboard, not in
  this repo — never hardcode or print them. `WORKER_URL` itself is also
  meant to be filled in per deployment, not committed with a real value.
- Match existing vanilla-JS patterns already in the codebase (e.g. the
  hand-rolled SVG chart functions, the `card()`/`sr()`/`seg()` settings-UI
  helpers) rather than introducing new libraries or frameworks.
- Don't touch the `FORGE_AUTH` encryption flow casually — it gates all of
  localStorage. Any change there needs to preserve the unlock/migration path
  for existing encrypted user data.
- Keep changes deploy-safe: GitHub Pages serves whatever is committed, so
  treat the main branch as effectively "live."

## Still to fill in
- Whether `forge-pulse.html` (mobile companion) still exists in the repo, and
  whether it's where the AI chat ($id) / Smart Scan features moved to, or if
  those were dropped entirely.
- Actual repo file/folder structure beyond `forge.html` itself.
- Test setup, if any survived the lean rebuild (older docs mentioned a
  572-test Node harness — unconfirmed against this version).
- Naming/commit conventions, linting rules.
- The Cloudflare Worker's exact `/sync/push` and `/sync/pull` implementation.

A good first prompt once Claude Code is pointed at the actual repo: *"Diff
the current repo against this CLAUDE.md and update anything that's still
wrong, especially the Forge Pulse relationship and whether the AI chat /
Smart Scan features exist anywhere."*
