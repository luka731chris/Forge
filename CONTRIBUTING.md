# Contributing to Forge — v4.0.0

Forge is a private family finance platform. This document describes the development process for solo maintenance and structured Claude-assisted sessions.

---

## Development Environment

- No build step. No npm. No local server required.
- Edit `index.html` and `forge-pulse.html` directly.
- GitHub repo managed via browser only (no local git clone).
- Hosted on GitHub Pages — changes go live on push.

---

## Session Protocol

### Before Starting a Session

1. Open `Forge-Backlog-v4.0.0.xlsx`
2. Fill out the **Session Brief** tab:
   - Current version, target version, session type
   - Exactly 3–5 acceptance criteria (testable, specific)
   - List of Backlog IDs being addressed
   - Out-of-scope items (prevents scope creep)
3. Upload the backlog file at the start of the Claude session
4. State: *"Starting a structured Forge session. Scope is in the Session Brief tab."*

### During a Session

- Work only within the stated scope
- If a new issue surfaces, log it in the Backlog and defer it
- Every code change must pass the structural checks before proceeding

### After a Session

Run all four structural checks, then:
1. Mark addressed Backlog items as Done (with closed date)
2. Add any new bugs discovered to the Backlog
3. Update CHANGELOG.md
4. Update Version History tab in the backlog spreadsheet
5. Upload both HTML files to GitHub
6. Tag the release with the version number

---

## Structural Checks (required before every upload)

```bash
# 1. JS syntax — both files must exit 0
node --check index.html
node --check forge-pulse.html

# 2. Div balance — open count must equal close count
grep -c '<div\b' index.html    # compare to:
grep -c '</div>' index.html    # (v4.0.0 baseline: 261/261)

grep -c '<div\b' forge-pulse.html   # baseline: 93/93
grep -c '</div>' forge-pulse.html

# 3. CSS brace balance — count { and } inside <style> blocks
# Desktop baseline: 184/184
# Pulse baseline:   178/178

# 4. No duplicate function definitions
grep -c 'function renderThermometer(' index.html   # must be 1
grep -c 'function buildMonthSummary(' index.html   # must be 1
grep -c 'function classifyTxn(' index.html         # must be 1
```

---

## Versioning

| Type | Increment | When |
|------|-----------|------|
| PATCH | x.x.+1 | Bug fix, style tweak, copy change, dead code removal |
| MINOR | x.+1.0 | New feature, new chart, new file format, logic change that affects numbers |
| MAJOR | +1.0.0 | localStorage key structure changes, auth change, core data model change |

Current baseline: **v4.0.0**

---

## Code Principles

**Numbers before polish.** Don't work on fonts, colors, or layout while calculations are wrong.

**No Pattern B.** Pre-committed savings detection uses Pattern A only (checking→savings transfers near payday). Pattern B (savings-account direct deposits) was removed in v4.0.0 because it double-counted every auto-save.

**No SVG gradients in the thermometer.** Gradient IDs collide when multiple thermometer instances exist on the same page. The pressure bar uses CSS div segments.

**renderISTrend always receives a month.** The `passedMonth` argument must always be passed — reading `isMonth?.value` inside the function fails when the selector is empty on first load.

**showPage does not call renderISTrend.** `renderIncomeStatement` already calls it with the correct month. A second call from `showPage` would blank the pressure bar.

**Transfers are excluded from spendable().** `operatingSpendable(txns)` filters out isTransfer(t). This is the source array for all financial calculations. Never add transfers back in.

**Detail-file rows are excluded from balance sheet.** Apple Card CSV, Amazon, Home Depot, Venmo — these don't represent real account ledger entries. `computeBSFromTxns()` and `balanceAsOf()` both check `_BS_DETAIL`.

**Both files stay in sync.** Every fix to a shared function (buildMonthSummary, renderThermometer, classifyTxn, isTransfer, etc.) must be applied to both `index.html` and `forge-pulse.html`.

---

## Test Package

`index-test-v4.0.html` and `forge-pulse-test-v4.0.html` are identical to production but auto-load synthetic demo data on startup and display a gold "TEST BUILD" banner.

Use the test package for:
- Alpha/beta feature testing before touching real data
- Reproducing bugs against known data
- Starting Claude sessions for experimental features

Never use the test package with real financial data. Never copy the test package over the production files.

---

## File Architecture

```
/ (repo root)
├── index.html               — Forge Desktop (single-file app)
├── forge-pulse.html         — Forge Pulse (mobile PWA)
├── forge_worker_v2.js       — Cloudflare Worker (AI proxy + sync)
├── wrangler.jsonc           — Worker deployment config
├── index-test-v4.0.html     — Test package desktop
├── forge-pulse-test-v4.0.html — Test package mobile
├── Forge-Backlog-v4.0.0.xlsx — Bug/feature tracker + session protocol
├── CHANGELOG.md
├── README.md
├── TECHNICAL.md
├── TESTING.md
├── IMPORT-GUIDE.md
├── QUICK-START.md
├── SID-SETUP.md
└── CONTRIBUTING.md
```
