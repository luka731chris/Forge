# Changelog

All notable changes to Forge are documented here.

Format: `[version] — YYYY-MM-DD`

---

## [2.0] — 2026-03-28

### Added
- **Drop zone visual feedback** — zones turn gold on hover, scale on dragover, flash green with animated ✓ on successful drop
- **Depth-counter drag-and-drop** — eliminates false `dragleave` events when dragging over child elements inside the zone (classic child-element bug)
- **File input z-index fix** — file `<input>` now has `z-index: 10` and child elements have `pointer-events: none`, making the entire zone area clickable to open the system file picker
- **Onclick fallback** — explicit `onclick` handler on each zone as belt-and-suspenders guarantee for click-to-browse
- **Rich file cards** — queued files now show icon, filename, size, source badge (Quicken / Amazon), and ✕ remove button
- **Clear upload page** button — resets the entire upload page to blank slate (clears queue, result panel, file input state)
- **Clear all** button — removes all queued files at once
- **Per-file progress bar** — shows which file is being processed and progress percentage
- **Already-queued toast** — shows a warning instead of silently ignoring duplicate file drops
- **Import button state** — button shows "Processing…" and disables during import, re-enables after
- **Comprehensive upload instructions** — The Pour now has three distinct sections: First-time full history export, Monthly refresh, and Amazon history — each with step-by-step numbered instructions
- **`.qxf` specific error message** — when a Quicken Transfer Format file is dropped, Forge explains exactly what it is and what to do instead
- **British spelling corrections** — `recognised` → `recognized`, `analyse` → `analyze` throughout all files

### Fixed
- **`showToast` ID mismatch** — function was looking for `id="forge-toast"` but HTML element has `id="toast"`. Every toast call silently failed. This was the root cause of all import feedback being invisible.
- **CSS cascade order** — `.furnace-zone:hover` was defined after `.furnace-zone.dragover`, causing hover styles to override dragover styles during drag operations
- **`.qxf` removed from valid extensions** — `.qxf` (Quicken Transfer Format, encrypted binary) is fundamentally different from `.qfx` (Quicken Financial Exchange, OFX text format). Removed from `validExts` and parser routing; now shows a specific, accurate error message

### Changed
- Upload page hero section now shows **↺ Clear upload page** button alongside the demo button
- Import actions section now shows progress bar above the Begin Forging button

---

## [1.9] — 2026-03-25

### Added
- **Comprehensive plain-English error messages** — all import errors now explain what went wrong, why, and give an exact next step. No technical jargon (no `<STMTTRN>`, no `D/T/P/^` record structure references).
- **Format-aware error messages** — QFX/QXF errors, QIF errors, and CSV errors each get specific actionable advice
- **Null guards on `parseQIF` and `parseOFX`** — functions return `[]` immediately if called with null/empty text rather than crashing
- **Sid setup guide** — full 5-step plain-English setup guide as Sid's voice in `getSidSetupMessage()`
- **Sid error routing** — all API errors (401, 429, timeout, network failure) produce plain-English messages with specific resolution steps
- **`parseCSV` column detection** — extended to match `narrative`, `details`, `net amount` column names

### Fixed
- **`processAll` async bug** — `readFile()` returns a Promise; processAll was missing `async` keyword, causing files to import as `[object Promise]`
- **`scoreImpulse` crash** — `item.title.toLowerCase()` crashed when `item` was null or `title` was undefined. Added defensive null checks.
- **`getParentLifeStage` boundaries** — age 32 was returning wrong life stage. Fixed boundaries: `<37=early_career`, `<47=peak_earning`, `<58=pre_retirement`, `<67=late_career`
- **`parseOFX` payee fallback** — added `g('n')` between `NAME` and `MEMO` as intermediate fallback
- **`parseCSV` amount parsing** — parenthetical amounts like `(1,234.56)` now correctly parse as negative

---

## [1.8] — 2026-03-20

### Added
- **Forge Pulse (Mobile PWA)** — `forge-pulse.html` with four tabs: The Gauge, Furnace, Watchlist, Ask Sid
- **Sid AI chat** — Claude-powered financial intelligence via Cloudflare Worker proxy
- **`forge_worker.js`** — Cloudflare Worker for secure API key proxying
- **`buildSidPrompt` / `buildContext`** — automatic financial context injection for every Sid query
- **Three Sid communication modes** — data-first (default), story-first (partner's name detected), Confluence mode (meeting context detected)
- **Life-stage intelligence** — 5 life stages with prioritized financial recommendations based on family ages
- **Impulse scoring** — Amazon items scored 0–100 for impulse-buy likelihood based on category, price, and quantity
- **PWA manifest** — Forge Pulse installable as home screen app on iOS and Android

---

## [1.7] — 2026-03-15

### Added
- **The Confluence** — structured 6-step monthly family financial review meeting
- **Goal tracker** — with progress bars, shown in both desktop and Pulse
- **Decision log** — typed decisions (Cut, Invest, Defer, Watch, Win) with date stamps
- **Planned purchases tracker** — upcoming expense planning
- **PDF Blueprint export** — printable monthly summary packet via `window.print()`
- **Confluence entry animation** — animated Pittsburgh rivers intro
- **Per-step notes** — auto-saved text areas for each agenda step
- **Meeting progress bar** — tracks steps marked done

### Changed
- Navigation expanded with Monthly Review (The Confluence) as a top-level page

---

## [1.6] — 2026-03-10

### Added
- **Amazon Watchlist** — full order history analysis with 4 tabs (Overview, By Category, All Items, vs. Total Spend)
- **`parseAmazon`** — supports both 2023+ Privacy Central format and legacy Order History Reports format
- **Impulse flag system** — High/Medium/Low impulse badges on Amazon items
- **Repeat purchase detection** — surfaces items ordered 3+ times

---

## [1.5] — 2026-03-05

### Added
- **The Furnace (Intelligence Engine)** — 5 detection algorithms: trend alerts, budget drift, anomaly detection, seasonal patterns, recommended actions
- **`detectTrendAlerts`** — 3M vs. prior 3M comparison by category
- **`detectBudgetDrift`** — end-of-month projection vs. historical average
- **`detectAnomalies`** — statistical outlier detection (>2σ)
- **`detectSeasonal`** — multi-year monthly heatmap and pattern analysis
- **`buildLifeStageRecommendations`** — age-based financial guidance
- **Anomaly histogram** — transaction size distribution chart
- **Budget drift table** — projected EOMonth vs. average with color-coded status

---

## [1.4] — 2026-02-28

### Added
- **4-year demo data generator** — `generateDemoData()` produces realistic synthetic household data
- **Demo mode banner** — clearly indicates when viewing demo vs. real data
- **`parseQIF` support** — full QIF record parsing
- **`parseOFX` support** — OFX/QFX format parsing with `<STMTTRN>` block extraction
- **`guessType`** — automatic account type inference from account name keywords

---

## [1.3] — 2026-02-20

### Added
- **Categories page** — full breakdown with YoY comparison, donut and bar charts
- **Merchants page** — top 50 payees ranked by spend
- **Cash Flow page** — monthly income vs. expenses, net savings trend
- **Ledger Room** — full transaction history, paginated (100/page), with search and filters
- **Account sidebar** — color-coded account chips with balance totals
- **`filterToAccount`** — click any account to jump to filtered Ledger Room view

---

## [1.2] — 2026-02-15

### Added
- **Settings page** — family profile, financial targets, category budgets, Confluence preferences
- **`DEFAULT_SETTINGS`** — full settings schema with sensible defaults
- **Age badges** — real-time age display as date-of-birth is typed
- **Kids list** — dynamic add/remove with name and DOB per child
- **Category budget table** — editable monthly targets with 3-month average reference
- **Sid live preview** — settings page shows how Sid will speak based on current configuration

---

## [1.1] — 2026-02-10

### Added
- **The Gauge (Dashboard)** — KPI cards, cash flow chart, category donut, top merchants, top categories
- **`parseDate`** — comprehensive date parser handling 8 common formats
- **`splitCSV`** — correct RFC 4180 CSV field splitter (handles quoted fields with embedded commas)
- **`parseCSV`** — flexible column detection with 30+ accepted column name variants
- **Deduplication** — composite key `date|payee|amount|account` prevents duplicate imports
- **Chart.js integration** — 16 chart instances across the application
- **Dark theme design system** — full CSS custom property token set

---

## [1.0] — 2026-02-05

### Initial Release
- **The Pour** — drag-and-drop file import with CSV support
- **Basic dashboard** — transaction count, total spend, account list
- **localStorage persistence** — `ledger_v3` data schema
- **Pittsburgh design language** — void/steel dark theme, Forge gold (#F5A800), Cormorant Garamond display font
- **GitHub Pages deployment** — static hosting at luka731chris.github.io/Forge
