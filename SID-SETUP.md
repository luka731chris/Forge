# $id Setup Guide

How to activate the Ask $id AI chat feature in Forge Pulse.

> **All other Forge features work without this setup.** The Gauge, Furnace, Detail Lens, and the full desktop experience require no API key, no Cloudflare account, and no setup at all. This guide only applies to the **Ask $id** chat tab in Forge Pulse.

---

## Overview

$id is powered by Claude (Anthropic's AI) and needs an API key to function. Because Forge Pulse is a static HTML file hosted on GitHub Pages, it cannot safely store an API key in public code. The solution is a free Cloudflare Worker that acts as a secure relay:

```
Forge Pulse → Cloudflare Worker → Anthropic API
              (your API key lives here,
               encrypted, server-side)
```

Your API key never appears in any file in your GitHub repository.

**Time required:** ~10 minutes  
**Cost:** Free (Cloudflare free tier + ~$5 Anthropic credits for months of use)

---

## Prerequisites

- A Cloudflare account (free at [dash.cloudflare.com](https://dash.cloudflare.com))
- An Anthropic account (free at [console.anthropic.com](https://console.anthropic.com))
- Access to your GitHub repository

---

## Step 1 — Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in (or create a free account)
2. In the left navigation, click **API Keys**
3. Click **+ Create Key**
4. Give it a name — e.g. `Forge $id`
5. Click **Add**
6. **Copy the key immediately** — it starts with `sk-ant-api03-...`

> ⚠️ This is the only time Anthropic shows you the full key. If you close the page without copying it, you will need to delete it and create a new one.

### Add Billing Credits

The API will not respond without credits — having a key is not enough.

1. Still on [console.anthropic.com](https://console.anthropic.com), click **Billing** in the left navigation
2. Click **Add credits**
3. Add **$5** — this is the minimum and will last for months of typical $id usage
4. Complete payment

---

## Step 2 — Create the Cloudflare Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (or create a free account — no credit card required)
2. In the left sidebar, click **Workers & Pages**
3. Click **Create** (blue button, top right)
4. Click **Get started** under the **Hello World** template
5. Name the Worker: **`forge-sid`**
6. Click **Deploy**
7. Click **Continue to project**

You are now on the Worker detail page. Your Worker URL is shown on the right side: `forge-sid.YOURSUBDOMAIN.workers.dev` — **copy this URL**, you will need it in Step 4.

---

## Step 3 — Add the Worker Code

1. On the Worker detail page, click **Edit Code** (top right of the page)
2. A code editor opens showing the default "Hello World" code
3. Press **Ctrl+A** (Windows/Linux) or **⌘+A** (Mac) to select all the existing code
4. Press **Delete** or **Backspace** to clear it
5. Copy the entire contents of `forge_worker.js` from your GitHub repository and paste it into the editor
6. Click **Deploy**
7. Click the back arrow (or the `← forge-sid` breadcrumb at the top) to return to the Worker detail page

> If you do not see an **Edit Code** button, make sure you clicked **Continue to project** after the initial deploy. The button appears on the Worker detail page, not on the initial success screen.

---

## Step 4 — Add Your API Key as a Secret

1. On the Worker detail page, click the **Settings** tab
2. Scroll down to **Variables and Secrets**
3. Click **Add**
4. Set **Type** to **Secret** (not Plain text — Secret encrypts the value)
5. Set **Variable name** to exactly: `ANTHROPIC_API_KEY`
6. Paste your API key (the `sk-ant-api03-...` key from Step 1) in the **Value** field
7. Click **Deploy**

The key is now stored encrypted inside Cloudflare. It will not appear in any dashboard view after this point — that is intentional.

---

## Step 5 — Connect Forge Pulse

1. Open `forge-pulse.html` in a text editor on your computer
2. Press **Ctrl+F** (Windows) or **⌘+F** (Mac) to open Find
3. Search for: `WORKER_URL_HERE`
4. You will find this line near the top of the `<script>` section:
   ```javascript
   const SID_PROXY_URL = 'WORKER_URL_HERE';
   ```
5. Replace `WORKER_URL_HERE` with your Worker URL from Step 2:
   ```javascript
   const SID_PROXY_URL = 'https://forge-sid.YOURSUBDOMAIN.workers.dev';
   ```
6. Save the file
7. Upload the updated `forge-pulse.html` to your GitHub repository, replacing the existing file

---

## Testing $id

1. Open Forge Pulse on your phone or in a browser
2. Tap the **Ask $id** tab (bottom right)
3. If you have imported data, $id will greet you with a monthly snapshot
4. Try asking: *"What is my savings rate this month?"*

---

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| $id's setup instructions appear | `SID_PROXY_URL` was not updated | Repeat Step 5 — make sure you saved the file and re-uploaded it to GitHub |
| "API key issue..." | The `ANTHROPIC_API_KEY` secret is wrong or missing | Go to Cloudflare → forge-sid Worker → Settings → Variables and Secrets → verify or re-add the key |
| "Can't reach the server..." | The Worker URL in `SID_PROXY_URL` is wrong | Check the URL starts with `https://` and ends with `.workers.dev` |
| "That took too long..." | Anthropic's servers were slow | Wait a few seconds and try again. Shorter questions respond faster. |
| "Rate limit hit..." | Too many requests in a short window | Wait 30 seconds and try again |
| "Something went wrong..." | Unexpected error | Check the Cloudflare Worker logs: dash.cloudflare.com → forge-sid → Logs tab |

---

## Architecture Details

The Worker (`forge_worker.js`) does the following on every $id request:

1. Receives a POST request from Forge Pulse containing the conversation messages and financial context
2. Validates the request (rejects non-POST, invalid JSON)
3. Enforces safe defaults: model locked to `claude-sonnet-4-20250514`, `max_tokens` capped at 1,000
4. Injects the `ANTHROPIC_API_KEY` secret from the Cloudflare environment
5. Forwards the request to `https://api.anthropic.com/v1/messages`
6. Returns the response to Forge Pulse with CORS headers

The Worker does not log, store, or forward any financial data beyond what is needed to process a single request.

---

## Rotating Your API Key

If you need to change the API key (because you revoked it or created a new one):

1. Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → create a new key → copy it immediately
2. Go to Cloudflare → forge-sid Worker → Settings → Variables and Secrets
3. Click the existing `ANTHROPIC_API_KEY` entry → **Edit** → paste the new key → **Deploy**

No changes to `forge-pulse.html` are needed when rotating the key.

---

## Cost Reference

| Service | Free tier | Typical monthly cost |
|---------|-----------|---------------------|
| Cloudflare Workers | 100,000 requests/day | $0 |
| GitHub Pages | Unlimited (public repos) | $0 |
| Anthropic API | $5 prepaid credits | ~$0.50–$2.00/month for typical household use |

Claude claude-sonnet-4-20250514 pricing (as of early 2026): $3/million input tokens, $15/million output tokens. A typical $id conversation uses ~2,000–4,000 tokens total. At that rate, $5 in credits covers hundreds of conversations.

---

## Smart Scan — AI-Powered File Extraction

Smart Scan uses Claude to extract transactions from any file type: photos, PDFs, bank statements, W-2s, 1099s, handwritten notes, receipts, and investment statements. The same Cloudflare Worker handles both Sid chat and Smart Scan.

### What Smart Scan can read

| File type | Examples |
|-----------|---------|
| 📷 Photos | Receipt photos, handwritten expense lists, whiteboard summaries |
| 📄 PDFs | Bank statements, investment statements, tax documents |
| 🧾 Tax documents | W-2, 1099-INT, 1099-DIV, 1099-B, 1099-MISC |
| 🏦 Bank statements | Any bank's monthly statement PDF or screenshot |
| 📈 Investment statements | Brokerage, 401k, IRA quarterly statements |
| 📝 Any CSV | Including formats parseCSV can't handle automatically |

### Enabling Smart Scan

1. **Deploy the updated worker** (`forge_worker_v2.js`) — this adds the `/scan` route. If you already have the original worker deployed, simply replace its code with `forge_worker_v2.js` and redeploy.

2. **Set `WORKER_URL` in forge.html** — find line `const WORKER_URL = '';` near the top of the script and paste your worker URL:
   ```javascript
   const WORKER_URL = 'https://forge-sid.YOUR-SUBDOMAIN.workers.dev';
   ```

3. **That's it.** Once set, the Smart Scan zone on the upload page shows "✦ AI worker connected" and activates automatically.

### How it works in the import pipeline

Smart Scan is integrated at three points in `processAll()`:

1. **Images and PDFs dropped in the main zone** → routed to Smart Scan immediately (no structured parser attempted)
2. **Unknown file extensions** (`.xlsx`, `.xls`, etc.) → Smart Scan attempted if worker is configured
3. **CSV/QIF/OFX that parse to zero rows** → Smart Scan attempted as automatic fallback

The Smart Scan zone (below the main drop zone on the upload page) is a dedicated drop area for photos and documents that bypass the structured parser entirely.

### Worker route reference

| Route | Purpose | Max tokens |
|-------|---------|------------|
| `POST /chat` | Sid AI financial assistant chat | 1,500 |
| `POST /scan` | Smart Scan transaction extraction | 4,096 |

### Accuracy notes

- **High confidence**: typed bank statements, typed CSVs, clear receipt photos
- **Medium confidence**: slightly blurry photos, non-standard statement layouts
- **Low confidence**: handwritten notes (legibility-dependent), very compressed images

Always review imported transactions after a Smart Scan import. The confidence level is shown in the result card.

### Cost estimate

Smart Scan uses claude-sonnet-4 with up to 4,096 output tokens. Estimated cost per scan:
- Single receipt photo: ~$0.002
- Full bank statement PDF (10 pages): ~$0.01–0.03
- W-2 or 1099: ~$0.003

These are billed to your Anthropic account via the worker's API key.

