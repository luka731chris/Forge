# Contributing & Development Guide

How the codebase is organized, how to make changes, and how to test them.

---

## Development Setup

No build tools required. The entire application is vanilla HTML, CSS, and JavaScript.

```bash
git clone https://github.com/luka731chris/Forge.git
cd Forge
open index.html        # macOS
start index.html       # Windows
```

For live reload during development, use any static server:

```bash
# Python (built-in, no install)
python3 -m http.server 8080

# Node (if installed)
npx serve .

# VS Code — install the "Live Server" extension and click "Go Live"
```

Then open `http://localhost:8080` in your browser.

---

## File Structure

```
Forge/
├── index.html           # Forge Desktop — DO NOT RENAME (GitHub Pages root)
├── forge-pulse.html     # Forge Pulse mobile PWA
├── forge_worker.js      # Cloudflare Worker (Sid proxy)
├── wrangler.jsonc       # Cloudflare Worker config
├── README.md
├── CHANGELOG.md
├── IMPORT-GUIDE.md
├── SID-SETUP.md
├── TECHNICAL.md
└── CONTRIBUTING.md      # This file
```

> `index.html` must remain named `index.html` — GitHub Pages serves it as the root URL.

---

## Code Organization (index.html)

The JavaScript is organized in functional sections, each separated by a `// ════` comment header:

```
CONSTANTS & STATE        — DB_KEY, SETTINGS_KEY, FBR_KEY, CAT_COLORS, etc.
DEMO DATA GENERATOR      — generateDemoData(), loadDemo()
PERSISTENCE              — saveData(), loadData(), saveSettings(), loadSettings()
FILE HANDLING            — handleFiles(), renderFileList(), processAll(), showImportResults()
PARSERS                  — parseCSV(), parseQIF(), parseOFX(), parseAmazon(), parseDate(), splitCSV()
HELPERS                  — fmt(), fmtK(), fmtPct(), getRange(), inRange(), getMonthlyData()
INIT APP                 — initApp(), buildSidebar(), populateFilters()
NAVIGATION               — showPage(), switchTab(), setRange()
DASHBOARD                — renderDashboard()
INTELLIGENCE ENGINE      — runIntelligence(), detectTrendAlerts(), detectBudgetDrift(), ...
CASH FLOW                — renderCF()
CATEGORIES               — renderCats()
MERCHANTS                — renderMch()
AMAZON                   — renderAmazon(), renderAmzItems(), renderAmzPage()
TRANSACTIONS             — renderTxns(), renderTxnPage()
DRAG + DROP              — event listeners on dz1, dz2
TOAST                    — showToast()
FAMILY REVIEW            — renderFamily(), buildStep1–6(), exportPDF(), ...
SETTINGS                 — renderSettingsPage(), saveSettings(), loadSettings(), ...
SID / INTELLIGENCE       — buildSidSystemPrompt(), buildContext(), buildSidPrompt() (in forge-pulse.html)
```

---

## Making Changes

### Changing a color

All colors are defined as CSS custom properties in the `:root` block near the top of the `<style>` section. Change the value there and it propagates throughout the UI automatically.

```css
:root {
  --gold: #F5A800;    /* ← change this */
  --positive: #2DD4BF;
  /* ... */
}
```

### Adding a navigation page

1. Add a nav item in the sidebar HTML: `<div class="nav-item" id="nav-mypage" onclick="showPage('mypage')">...</div>`
2. Add a page div in the main content area: `<div id="page-mypage" class="page">...</div>`
3. Add a render call in `showPage()`: `if(name==='mypage') renderMyPage();`
4. Write the `renderMyPage()` function

### Adding an import file format

1. Add the extension to `validExts` in `processAll()`
2. Add parser routing in the `if (ext==='qif')...else if...` chain
3. Write the parser function following the pattern of `parseCSV()` — return an array of transaction objects
4. Add the extension to the `accept` attribute of the `<input type="file" id="fi1">` element
5. Add a test case to the test suite (see Testing below)

### Changing Sid's system prompt

The system prompt is built in `buildSidSystemPrompt()` in `forge-pulse.html`. The prompt has three sections:
- A persona definition (who Sid is, his communication principles)
- A mode section (data-first, story-first, or Confluence — selected dynamically)
- A financial context section (injected from `buildContext()`)

Edit the persona definition or mode sections directly in that function. The financial context is auto-generated from real data and should not be hardcoded.

### Updating the demo data

`generateDemoData()` is in `index.html`. Key parameters:

- `acctDefs` — the 11 account definitions
- `expTemplates` — transaction templates: `[payee, category, account, baseAmt, freqPerMonth, stdDev]`
- `startDate` / `now` — the date range for generated data
- `seasonMult` — seasonal multipliers by month (index 0 = January)
- `yoyDrift` — year-over-year spending drift per year

---

## Testing

The test suite runs outside the browser using Node.js. It extracts the parsers and utility functions from `index.html` at runtime and tests them in isolation.

### Running Tests

```bash
# Run all parser and logic tests (149 tests)
node forge_tests.js

# Run all Sid AI layer tests (96 tests)
node forge_sid_tests.js
```

Both should produce `✅ Passed: N/N — 100%`. If any test fails, do not commit.

### Test Coverage

**forge_tests.js (149 tests, 14 suites):**

| Suite | Coverage |
|-------|---------|
| parseDate | 18 date format variants including edge cases |
| splitCSV | 6 cases including quoted fields and embedded commas |
| parseCSV happy path | 13 cases: standard Quicken formats, tab-delimited, multi-account |
| parseCSV train wrecks | 14 cases: empty files, missing columns, malformed amounts, binary content |
| parseQIF | 11 cases: standard records, multi-account, missing fields, empty input |
| parseAmazon | 12 cases: new format, legacy format, edge cases |
| parseOFX | 9 cases: standard OFX, QFX, malformed, empty |
| Age & Life Stage | 16 cases: boundary ages, life stage transitions |
| scoreImpulse | 6 cases: category scoring, price thresholds, null safety |
| guessType | 7 account type detection cases |
| Formatters | 9 cases: fmt, fmtK, fmtPct |
| Settings & Family Config | 10 cases: DEFAULT_SETTINGS structure |
| Deduplication | 4 cases: duplicate prevention logic |
| Real-world edge cases | 14 cases: actual Quicken export formats, real-world messy data |

**forge_sid_tests.js (96 tests, 14 suites):**

| Suite | Coverage |
|-------|---------|
| getSidSetupMessage | Content and structure validation |
| callSid proxy guard | WORKER_URL_HERE detection |
| callSid HTTP error handling | 401, 429, 500 responses |
| callSid timeout & network | Timeout and network failure |
| sendChat error routing | All 5 error paths |
| buildSidPrompt mode detection | data-first, story-first, Confluence detection |
| buildContext empty state | Empty transaction arrays |
| buildContext with transaction data | KPI calculations, category breakdown |
| buildContext financial accuracy | Savings rate, net calculations |
| getKidsContext | Age display, countdown logic |
| Conversation history management | 16-message cap, history trimming |
| callSid API request body contract | Model, max_tokens, system prompt structure |
| buildSidSystemPrompt | Persona, mode, context sections |
| Edge cases & regression | Null safety, boundary conditions |

### Adding a Test

Tests are written using a simple assertion framework in the test files. Add a new test case inside the relevant suite:

```javascript
t.test('my new case', () => {
  const result = parseCSV('Date,Payee,Amount\n2024-01-01,Test,-50.00', 'test.csv');
  t.equal(result.length, 1, 'should parse one transaction');
  t.equal(result[0].payee, 'Test', 'payee should be Test');
  t.equal(result[0].amount, -50.00, 'amount should be -50');
});
```

---

## Deployment

### GitHub Pages (automatic)

Any push to the `main` branch automatically deploys via GitHub Pages. The live URL is `luka731chris.github.io/Forge`. Deployment takes 30–90 seconds.

Files GitHub Pages serves:
- `index.html` → the root URL
- `forge-pulse.html` → `/forge-pulse.html`

### Cloudflare Worker (manual)

When `forge_worker.js` changes, the Worker is not automatically redeployed (unless CI is configured). To redeploy manually:

**Option A — GitHub push (if GitHub is connected to Cloudflare):**
Push `forge_worker.js` to `main`. Cloudflare detects the change and redeploys automatically (may take 30–60 seconds).

**Option B — Cloudflare dashboard:**
Go to dash.cloudflare.com → Workers & Pages → forge-sid → Edit Code → paste updated code → Deploy.

**Option C — Wrangler CLI:**
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

---

## Environment Variables

The only environment variable used in production is `ANTHROPIC_API_KEY`, stored as a Cloudflare Worker Secret. It is never committed to the repository.

To check whether the secret is set: Cloudflare Dashboard → forge-sid → Settings → Variables and Secrets. A secret appears as `ANTHROPIC_API_KEY: ***` if set.

---

## Common Mistakes

### "The Worker shows 'Variables cannot be added to a Worker that only has static assets'"

The `wrangler.jsonc` file has an `"assets"` block. Remove it. The `"assets"` key tells Cloudflare to treat the Worker as a static file host (like GitHub Pages), which disables `fetch` handlers and environment variable access. The correct `wrangler.jsonc` contains only `name`, `main`, `compatibility_date`, and `compatibility_flags`.

### "The drop zone works with click-to-browse but drag-and-drop doesn't change color"

The `dragover` event is being fired but the CSS class is being added and immediately removed. This is the child-element `dragleave` bug — dragging over any text or icon inside the zone fires `dragleave` on the parent. The fix is a depth counter on `dragenter`/`dragleave`. See `TECHNICAL.md → Drag-and-Drop Implementation`.

### "Forge shows no data after clearing browser storage"

`localStorage` is the only data store. Clearing it removes all transaction data. Re-import from Quicken using the full-history export workflow.

### "showToast does nothing"

The `showToast` function looks for `id="toast"`. If the HTML element has a different ID (e.g. `id="forge-toast"`), the function returns immediately after finding `null`. Search for `getElementById` in `showToast` and verify it matches the actual element ID in the HTML.

---

## Branching Convention

| Branch | Purpose |
|--------|---------|
| `main` | Production — what GitHub Pages deploys |
| `feature/description` | New feature development |
| `fix/description` | Bug fixes |
| `cloudflare/description` | Worker-only changes |

Merge to `main` only when tests pass and the change has been manually verified in a browser.
