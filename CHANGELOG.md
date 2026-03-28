# Changelog

---

## [3.1] — 2026-03-28

### Changed — Unified Import Zone

- **Single drop zone** replaces the previous two-zone layout (Quicken left, Amazon right). All file types — Quicken CSV/QIF/QFX, Amazon order history, Apple Card statement, any itemized CSV — now go into one zone and Forge auto-detects each file's format from its column headers.
- **`sniffFile(text, fname)`** added: content-based format detector that inspects the first CSV line for signal columns (`asin`, `product name`, `order id`, `clearing date`, `amount (usd)`, Quicken-signature columns) and returns `'amazon' | 'applecard' | 'detail' | 'quicken'`.
- **`fileTypeLabel(type)`** added: maps detected type to display label and badge CSS class for the file queue.
- **`processAll()`** updated: uses `sniffFile()` instead of trusting `source` field; `source='auto'` is now the default for all dropped files.
- **`handleFiles()`** updated: sets `source='auto'` for all files; uses only `dz1` for the drop-success flash.
- **Drag listeners** updated: only `dz1` monitored; `dz2` and `fi2` removed.
- **`clearUploadPage()`** updated: only resets `fi1` and `dz1`.
- **File queue cards** now show detected type badge (💳 Quicken · 📦 Amazon · 🍎 Apple Card · 🔍 Detail) based on filename heuristics with content sniff in processAll.
- **Type reference grid** added below the drop zone showing what each file type does in three compact cards.
- **Purchaser tip banner** added below the drop zone explaining filename tagging convention.
- Removed: two-zone HTML, `dz2`, `fi2`, `id="fi2"`, the entire Amazon-specific instruction card with 6-step walkthrough moved to IMPORT-GUIDE.md.

---

## [3.0] — 2026-03-28

### Added — Purchaser Attribution System

The most significant addition since launch. Forge can now identify *who* in a family made a purchase and surface individual spending patterns, alerts, and predictions.

**Purchaser tagging via filename**
- Drop a detail file named with a family member's first name (e.g. `amazon_chris.csv`, `applecard_kira.csv`) and Forge attributes every item in that file to that person
- Purchaser name matched case-insensitively against Settings → The Family member list
- Purchaser is part of the deduplication key so the same item can exist for different people without collision

**Account Owners — Settings**
- New Settings section: maps each Quicken account to a family member
- Once mapped, Forge attributes all transactions in that account to that person at render time
- Retroactive — changing ownership updates all historical analytics without re-importing

**Per-person Detail Analytics — By Purchaser tab**
- New tab in Detail Lens with individual spending cards per attributed person
- Each card: total spend, monthly average, impulse rate, average order, top categories
- Projected end-of-month spend vs. historical average
- Per-person acceleration warning (category-level, flagged if >40% up vs. prior quarter)

**Per-person Bullpen Alerts**
- Quicken account trends now break down by person when accountOwners is configured
- Detail file trends now surface per-person acceleration with the individual named
- New alert type `purchaser` with `👤` icon for visual distinction

**Per-person Recommended Actions**
- "Chris is on pace for record detail spend this month — 43% above average with 8 days left"
- "Kira's impulse rate is 51% — worth discussing at Confluence"
- Predictive: detail imports as % of monthly spending flagged when >15%

**Per-person $id context**
- `buildContext()` now includes purchaser breakdown from detail files and Quicken account owners
- $id can answer "How much is Kira spending on Beauty?" or "Whose Amazon spending is accelerating?"
- Pulse `buildAlerts()` generates per-person impulse alerts and end-of-month projections

### Added — Detail Lens (formerly Amazon Watchlist)

**Multi-format detail file support**
- `parseDetailFile()` — auto-router that detects format and routes to the right parser
- `parseAppleCard()` — Apple Card monthly statement CSV (exported from Wallet app); detects by `clearing date`/`amount (usd)` columns or `apple`/`applecard` in filename
- `parseGenericDetail()` — catches any CSV with date + description + amount; sets `source` from filename; handles PayPal, Venmo, Costco, store loyalty exports
- `parseAmazon()` — unchanged but now wrapped by `parseDetailFile` which stamps `source` and `purchaser`

**Source tracking**
- Every detail item has a `source` field: `"Amazon"`, `"Apple Card"`, or filename-derived
- Source badge shown on every item row (purple badge for non-Amazon sources)
- Source filter dropdown in All Items tab
- Source breakdown in $id context string

**UI updates**
- Page renamed: **Amazon Watchlist → Detail Lens** (nav, page header, Pulse tab)
- Page logo: 📦 → 🔍
- No-data state explains filename tagging convention
- Drop zone label updated to list Amazon, Apple Card, and generic CSVs
- Pour ③ section: instructions expanded to cover all supported formats and purchaser tagging
- Person and Source filter dropdowns added to All Items tab

**Person filter in All Items**
- Filter dropdown populated from all distinct `purchaser` values in `amzItems`
- Works in combination with Category, Source, and Flag filters

### Fixed

- Demo date now uses real current date (`new Date()`) instead of hardcoded `2026-03-26` — demo data always runs through today
- Upload page div structure fully balanced (0 difference between open and close divs)
- File card badge updated: `📦 Amazon` → `🔍 Detail`
- `showImportResults()` toast now says "detail items" instead of "Amazon items"
- `amzItems` dedup key updated to include `purchaser` field

### Changed

- `DEFAULT_SETTINGS` gains `accountOwners: {}` and `detailSensitivity: 3`
- `amzItem` schema gains `source` and `purchaser` fields (backward compatible — both default to null/empty)
- Settings sidebar renders Account Owners section dynamically after accounts are imported
- Pulse `DEFAULT_FAMILY` gains `accountOwners: {}`

---

## [2.1] — 2026-03-28

### Changed
- Quicken export instructions rewritten across all surfaces. Previous instructions described `File → Export → Transactions to QIF` which does not reliably export all accounts in all Quicken versions. New instructions split by platform:
  - **Mac:** All Transactions sidebar → File → Export → Register Transactions to CSV File
  - **Windows:** Reports → Banking → Transaction → Export icon → CSV

---

## [2.0] — 2026-03-28

### Added
- Drop zone visual feedback: gold on hover, scale on dragover, green ✓ flash on successful drop
- Depth-counter drag-and-drop fix: eliminates false `dragleave` from child elements
- File input z-index fix: entire zone area clickable to open file picker
- Rich file cards with purchaser/source badges, ✕ remove, Clear All
- Clear Upload Page button
- Per-file progress bar during import
- Already-queued toast warning
- Try/catch on cfChart initialization
- Pittsburgh-themed loading toast: "⚾ $kenes takes the mound — Pittsburgh demo loaded"
- Demo data uses real current date

### Fixed
- `showToast()` ID mismatch: was looking for `id="forge-toast"`, element has `id="toast"` — all toasts were silently failing
- CSS cascade order: `.furnace-zone:hover` defined after `.dragover` was overriding dragover styles during drag operations
- `.qxf` removed from valid file extensions with specific error message
- British spellings: `recognised` → `recognized`, `analyse` → `analyze`
- `furnace-zone-inner` div properly closed in both DZ1 and DZ2 (malformed HTML fixed)

---

## [1.9] — 2026-03-25

### Added
- Comprehensive plain-English import error messages
- Sid/`$id` setup guide rendered in chat when Worker not configured
- `parseCSV` extended: `narrative`, `details`, `net amount` column names
- Null guards on `parseQIF`, `parseOFX`

### Fixed
- `processAll` async bug: `readFile()` returns a Promise; function was missing `async`
- `scoreImpulse` null crash on empty item
- `getParentLifeStage` boundaries corrected

---

## [1.0 – 1.8] — 2026-02-05 to 2026-03-20

Initial release through Forge Pulse launch. See git history for details.
