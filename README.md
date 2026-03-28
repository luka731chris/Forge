# ⚡ Forge — Family Finance Intelligence Platform

> *Precise. Decisive. Always sees the play first.*

A Pittsburgh-built personal finance platform that reads directly from Quicken exports and transforms raw transaction data into actionable family financial intelligence — with zero cloud accounts, zero subscriptions, and zero data leaving your device.

**Live app:** [luka731chris.github.io/Forge](https://luka731chris.github.io/Forge/)

---

## What Is Forge?

Forge is a complete family finance stack built from two static HTML files and an optional serverless AI layer. It requires no backend, no database, no npm install, no build step, and no account to create. Open the file in a browser and it works.

| File | What it is |
|------|------------|
| `index.html` | Forge Desktop — full analysis suite, import pipeline, and monthly family review |
| `forge-pulse.html` | Forge Pulse — mobile PWA companion with AI chat (Sid) |
| `forge_worker.js` | Cloudflare Worker — secure API key proxy for Sid |
| `wrangler.jsonc` | Cloudflare Worker configuration |

---

## Screenshots

> *Load the demo (▶ Load 4-year demo) to explore all features before importing real data.*

The Gauge (Dashboard) · The Furnace (Intelligence) · The Confluence (Monthly Review) · Forge Pulse (Mobile)

---

## Features

### Forge Desktop

**The Pour — Import Pipeline**
- Drag-and-drop file import with visual status feedback (gold on hover, green on success)
- Supports `.csv`, `.qif`, `.qfx`, `.ofx` from Quicken
- Supports Amazon order history (`Retail.OrderHistory.1.csv`)
- Automatic deduplication — safe to re-import any file
- Per-file progress bar and result panel with plain-English error messages
- First-time full-history import + monthly refresh workflow

**The Gauge — Dashboard**
- KPI cards: total expenses, income, net savings, savings rate
- Monthly cash flow chart (income vs. expenses)
- Spending by category donut chart
- Top merchants table
- 3M / 6M / 1Y / All time range controls

**The Furnace — Intelligence Engine**
- Proactive alerts: category acceleration (3M vs. prior 3M), budget drift, statistical anomalies (>2σ), seasonal spikes
- Trend analysis with velocity chart
- Budget drift: current month projected to end-of-month vs. historical average
- Anomaly detection: statistical outlier transactions with histogram
- Seasonal patterns: multi-year monthly heatmap and average spend by month
- Recommended actions: prioritized list generated from your actual data
- Life-stage financial guidance based on family ages (5 stages from early career to legacy)

**The Confluence — Monthly Family Review**
- Structured 6-step agenda (30–40 minutes): Month in Review, Spending Breakdown, Big Purchases, Goals & Wealth Building, Emerging Threats, Decisions & Next Month
- Narrative story cards with embedded discussion questions
- Goal tracker with progress bars
- Decision log with type tagging (Cut, Invest, Defer, Watch, Win)
- Planned purchases tracker
- Notes fields per step, auto-saved to localStorage
- PDF Blueprint export — printable monthly summary packet
- Confluence entry animation (animated Pittsburgh rivers)

**Additional Views**
- Cash Flow: monthly income vs. expenses with net savings trend
- Categories: full breakdown with year-over-year comparison
- Merchants: top 50 payees ranked by total spend
- Amazon Watchlist: impulse scoring, repeat purchases, category analysis
- Ledger Room: full searchable transaction history (100 per page)

**Settings & Personalization**
- Family profile: names, dates of birth, kids (enables age-aware recommendations)
- Sid communication modes: data-first (default) and story-first (partner)
- Financial targets: savings rate, emergency fund, large-purchase alert threshold, Amazon sensitivity
- Monthly category budgets with drift alerts
- Confluence preferences: meeting day, duration, PDF header, agenda toggles

### Forge Pulse (Mobile PWA)

- Four tabs: The Gauge (snapshot), Furnace (alerts), Watchlist (Amazon), Ask Sid (AI chat)
- Installable as a home screen app on iOS and Android
- Reads the same localStorage data as the desktop app (same browser, same device)
- Sid AI chat with full financial context awareness
- Automatic tone adaptation: data-first for primary user, story-first when partner's name appears
- Confluence mode: warmer, team-oriented tone for meeting discussions

### Sid — AI Financial Intelligence

- Named after Sidney Crosby: precise, decisive, always sees the play first
- Powered by Claude claude-sonnet-4-20250514 via Anthropic API
- Routes through a Cloudflare Worker so the API key never appears in any public file
- Full financial context injection: all transactions, accounts, goals, Amazon data, family profile
- Conversation history: 8 turns (16 messages) of context maintained
- Three communication modes: data-first, story-first, Confluence
- Graceful degradation: all features except Ask Sid work without any setup

---

## Getting Started

### Option 1: Use the live GitHub Pages app

Open [luka731chris.github.io/Forge](https://luka731chris.github.io/Forge/) in any modern browser. No installation required.

### Option 2: Run locally

```bash
git clone https://github.com/luka731chris/Forge.git
cd Forge
# Open index.html in your browser — that's it. No build step.
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### First-time data import

1. Open Quicken → **File → Export → Transactions to QIF**
2. Select **All Accounts**, date range as far back as available, save as **CSV** or **QIF**
3. In Forge, go to **The Pour** (+ button) and drop the file onto the Quicken drop zone
4. Click **Begin Forging**

> ⚠️ Do not use *File → Export → Quicken Transfer Format (.qxf)* — that file is for moving Quicken between computers and cannot be imported.

See [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) for detailed import instructions including monthly workflow and Amazon history setup.

---

## Setting Up Sid (AI Chat)

Sid requires a one-time Cloudflare Worker setup to keep your Anthropic API key secure. All other features work without this.

Quick version:
1. Get an API key at [console.anthropic.com](https://console.anthropic.com) → API Keys → + Create Key. Add $5 in billing credits.
2. Create a Worker at [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Hello World → name it `forge-sid` → Deploy → Edit Code → paste `forge_worker.js` → Deploy
3. In the Worker → Settings → Variables and Secrets → Add → Secret → name `ANTHROPIC_API_KEY` → paste your key → Deploy
4. In `forge-pulse.html`, replace `WORKER_URL_HERE` with your Worker URL (e.g. `https://forge-sid.yourname.workers.dev`)
5. Re-upload `forge-pulse.html` to GitHub

See [SID-SETUP.md](./SID-SETUP.md) for the full step-by-step guide with screenshots.

---

## Monthly Workflow

```
1st of the month
  ↓
Export Quicken (last 30–60 days, All Accounts, CSV)
  ↓
Drop into Forge → Begin Forging
  ↓
Open The Confluence with your partner
  ↓
Run the 6-step agenda (~35 minutes)
  ↓
Export PDF Blueprint
  ↓
Done until next month
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  GitHub Pages (static hosting, free)                │
│                                                     │
│  index.html          forge-pulse.html               │
│  (Forge Desktop)     (Forge Pulse PWA)              │
│       │                     │                       │
│       └──── localStorage ───┘                       │
│              (shared data store)                    │
└─────────────────────┬───────────────────────────────┘
                      │ Ask Sid only
                      ↓
┌─────────────────────────────────────────────────────┐
│  Cloudflare Worker (forge-sid.*.workers.dev)        │
│  forge_worker.js — CORS proxy + key injection       │
└─────────────────────┬───────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────┐
│  Anthropic API (api.anthropic.com/v1/messages)      │
│  Model: claude-sonnet-4-20250514                   │
└─────────────────────────────────────────────────────┘
```

**Data flow:** All transaction data stays in `localStorage` in the user's browser. No data is sent to any server unless the user explicitly asks Sid a question. The Cloudflare Worker receives only the conversation context for that specific Sid query and the user's financial summary — it does not store anything.

---

## File Reference

| File | Size | Description |
|------|------|-------------|
| `index.html` | 262 KB | Forge Desktop: complete single-file app |
| `forge-pulse.html` | 58 KB | Forge Pulse: mobile PWA |
| `forge_worker.js` | 2.2 KB | Cloudflare Worker: Anthropic API proxy |
| `wrangler.jsonc` | — | Worker configuration |
| `README.md` | — | This file |
| `IMPORT-GUIDE.md` | — | Detailed import instructions |
| `SID-SETUP.md` | — | Sid / Cloudflare Worker setup guide |
| `TECHNICAL.md` | — | Architecture, data model, parser docs |
| `CONTRIBUTING.md` | — | Development setup and contribution guide |
| `CHANGELOG.md` | — | Version history |

---

## localStorage Schema

Forge stores all data in browser `localStorage`. There is no server-side persistence.

| Key | Content |
|-----|---------|
| `ledger_v3` | Transactions, accounts, Amazon items, demo mode flag |
| `forge_settings_v1` | Family profile, financial targets, Sid preferences |
| `ledger_fbr_v2` | Confluence meeting state: goals, notes, decisions |

Data persists across browser sessions on the same device and browser. Clearing browser data removes all Forge data. The **Settings → Clear All Data** button removes transaction data only; settings are preserved.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | Vanilla JS — no framework, no build toolchain |
| Charts | Chart.js 4.4.1 (CDN) |
| Fonts | Cormorant Garamond (display), DM Sans (UI), Fira Code (mono) via Google Fonts |
| Hosting | GitHub Pages |
| AI proxy | Cloudflare Workers (free tier) |
| AI model | Claude claude-sonnet-4-20250514 (Anthropic) |
| Storage | Browser localStorage |

**No npm, no webpack, no React, no database.** The entire application is two HTML files that open directly in a browser.

---

## Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome / Edge | ✅ Full support | ✅ Full support |
| Firefox | ✅ Full support | ✅ Full support |
| Safari | ✅ Full support | ✅ Full support (PWA install via Share → Add to Home Screen) |

Requires: ES2020+, localStorage, CSS custom properties, File API, Drag and Drop API.

---

## Privacy

- **No data leaves your device** unless you use Ask Sid
- **No analytics**, no tracking, no cookies
- **No accounts** — there is nothing to sign up for
- **Sid queries** send only the conversation context for that session to the Cloudflare Worker, which forwards it to Anthropic and discards it immediately. The Worker stores nothing.
- **Cloudflare Worker** logs can be disabled in the Cloudflare dashboard under Observability

---

## Project Background

Forge was built for the Luka family in Pittsburgh. The design language references Pittsburgh's steel industry — The Pour, The Furnace, The Confluence (where the Allegheny, Monongahela, and Ohio rivers meet), forge gold (#F5A800), river blue (#60A5FA). Sid is named after Sidney Crosby.

---

## License

Private — all rights reserved. This repository is a personal project. Contact the repository owner before using, forking, or adapting any part of this codebase.

---

## Contact

**Chris Luka** · Director of Product Management · Pittsburgh, PA  
GitHub: [@luka731chris](https://github.com/luka731chris)
