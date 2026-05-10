# Forge Changelog

---

## v4.0.0 — May 2026 · Major Release

Stable baseline for Forge Desktop and Forge Pulse. All prior alpha/lean builds consolidated.
Data model is stable. Deploy, test with real data, build forward from here.

### Income Statement — Complete Rebuild
- Stepdown layout: Income → Pre-Committed Savings → Deployable → Fixed → After Fixed → Variable → Net → Savings Draw → Reconciliation
- Two-column format: content left, margin rail with category summaries and comment fields right
- Collapsible income section: closed months collapse; in-flight stays expanded
- Income adjustment callout: gold banner explains normalization (early month, 3-pay, bonus exclusion)
- Pre-committed savings: checking→savings transfers near payday only (Pattern A, source=checking required)
- Accrual engine: in-flight months show actual + projected; closed months actuals only
- IS comments: per-section note fields stored in `forge_is_comments` localStorage key
- Recommendations: KPI card grid — OVER BUDGET · SAVINGS DRAW · SURPLUS · TOP VARIABLE · PACE ALERT
- Analytics chart selector: Pressure Bar (default) · Stacked Bar · Small Multiples · Slope · Proportion
- Reconciliation: collapsed, operating accounts only (checking/savings/credit), IS Assembly stepdown

### Pre-Committed Savings Fix
- Root cause: both sides of checking→savings transfer were captured (Pattern A debit + Pattern B credit = 2×)
- Fix: Pattern A only. Source account must be checking. Pattern B removed from IS and buildMonthSummary
- nearPaycheck() uses checking paychecks only as payday anchor

### Category Classification Rebuilt
- classifyTxn() uses longest-prefix match instead of substring includes()
- QUICKEN_CAT_MAP rewritten with 80+ specific subcategory entries
- Dangerous broad fallbacks removed: 'bills & utilities'→electric, 'financial'→insurance, 'auto & transport'→gas_car
- New: gas_util, water, internet, dedicated insurance subcategories

### Import Pipeline Fixed
- _source stamping: all detail file types now stamped (Amazon, Home Depot, Venmo were broken)
- firstLine undefined reference removed from processFiles
- parseMerchantCSV typeSkip check moved to top of row loop
- recordFileImport stores reg._files[] full upload history
- isTransfer: handles CC payment subcategory paths, apple.?card, web recur applecard

### Balance Sheet Fixed
- computeBSFromTxns() excludes detail-file source transactions
- buildBSAccountMap skips Apple Card CSV phantom accounts
- Liability change colors inverted (decrease = good)
- Pulse balanceAsOf() has same _BS_DETAIL exclusion

### Pressure Bar — CSS Rebuild
- Replaced SVG linearGradient/pattern approach (gradient ID collisions caused black bars)
- Pure CSS div segments: fixed (red), variable (gold), buffer (teal stripes), overage (red hatching)
- 3D highlight overlay, income line as 2px div with glow

### Forge Pulse v2.0
- PIN pad auth: zero inputs on lock screen, iOS credential manager cannot fire
- Haptic feedback: navigator.vibrate() at digit, backspace, complete, error
- operatingSpendable() and spendable() alias added (were undefined, causing silent failures)
- buildMonthSummary synced: OPER_TYPES_BMS, Pattern A checking-only, nearPaycheckBMS
- renderThermometer synced: CSS div bar, _uid prefix per container
- classifyTxn, isTransfer, derivedThru all synced with desktop
- _files[] history in file registry

### CSS / Formatting
- 285 CSS variable instances normalized: --font-m→--fm, --positive→--pos, --negative→--neg
- .kpi.negative CSS class added
- fmt() and fmtK() preserve negative sign with typographic minus (−)

### Other
- Cash flow 3M/6M/1Y/All range tabs added
- Scenario Planner overflow-y:auto fixed
- Settings file inventory: YYYY-MM-DD dates, full upload history, net worth row fix
- LukaLab branding: strokes #7A7672, subtitle #8A8480, slogan "AI Creative"
- Canvas accessibility: role="img" and aria-label on dashDonut and catDonut

---

## v3.12 — April 3, 2026
Dead code audit: 11 dead JS functions, 22 unused CSS classes, 12 unused CSS vars removed.

## v3.9–3.11 — April 2–3, 2026
Smart Scan, analytics blank fix, black screen div nesting fix.

## v3.4–3.8 — March 29 – April 2, 2026
parseCSV() rewrite, Quicken CSV header detection rewrite, black screen fixes.

## v3.0–3.3 — March 27–28, 2026
Purchaser attribution, Detail Lens, Analytics Studio, Apple Card parser.
