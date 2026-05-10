# $id & Smart Scan Setup Guide — v4.0.0

$id is the AI assistant built into Forge Pulse. Smart Scan is the AI file reader on the desktop upload page. Both route through the same Cloudflare Worker.

---

## What You Need

- A deployed Cloudflare Worker (`forge_worker_v2.js`)
- An Anthropic API key
- The worker URL (something like `https://forge-worker.yourname.workers.dev`)

---

## Deploy the Worker

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Set your Anthropic API key as a secret

```bash
wrangler secret put ANTHROPIC_API_KEY
# Paste your key when prompted
```

### 3. Deploy

```bash
wrangler deploy --config wrangler.jsonc
```

The output gives you your worker URL. Save it.

---

## Connect to Forge Desktop (Smart Scan)

In `index.html`, find the line near **line 6771**:

```js
const WORKER_URL = '';
```

Set it to your worker URL:

```js
const WORKER_URL = 'https://forge-worker.yourname.workers.dev';
```

Smart Scan is now active. On the Upload page, you can drop photos of receipts, PDFs, W-2s, or unknown CSVs — the worker sends them to Claude Vision and returns structured data.

---

## Connect to Forge Pulse ($id Chat)

In `forge-pulse.html`, find the line near **line 1080**:

```js
const SID_PROXY_URL = '';
```

Set it to the same worker URL:

```js
const SID_PROXY_URL = 'https://forge-worker.yourname.workers.dev';
```

$id is now active in the Ask $id tab.

---

## Worker Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | $id chat — sends full financial context + user message to Claude Sonnet |
| `/scan` | POST | Smart Scan — sends file (base64) to Claude Vision for parsing |
| `/sync/push` | POST | Push ledger JSON to Cloudflare KV |
| `/sync/pull` | GET | Pull ledger JSON from Cloudflare KV |

The `/chat` and `/scan` endpoints are backwards-compatible with `forge_worker.js` (v1). Both point to the same deployed worker.

---

## Cloud Sync (Optional)

Sync lets you push data from the desktop and pull it on Pulse without re-importing files.

### Enable KV Storage

In your Cloudflare dashboard, create a KV namespace called `FORGE_STORAGE` and bind it to the worker.

In `wrangler.jsonc`:

```json
"kv_namespaces": [
  { "binding": "FORGE_STORAGE", "id": "your-kv-namespace-id" }
]
```

Redeploy after adding the binding.

### Using Sync

**Desktop:** Import page → **Push to Cloud** button

**Pulse:** Gauge tab → **Pull from Cloud** button, or pull-to-refresh gesture (drag down 72px)

Sync stores the ledger under your sync token key in KV. The token is prompted once and stored in `forge_sync_token` localStorage — never hardcoded.

---

## $id Communication Modes

In Pulse Settings, three modes available:

| Mode | Description |
|------|-------------|
| Data-first | Leads with numbers, tables, specific amounts |
| Story-first | Narrative framing, pattern observations |
| Confluence | Monthly review agenda format |

---

## Troubleshooting

**"$id is unavailable"** — `SID_PROXY_URL` is empty or the worker is not deployed. Check the URL in forge-pulse.html.

**"Smart Scan not working"** — `WORKER_URL` is empty in index.html, or worker returned an error. Check Cloudflare dashboard → Workers → Logs.

**CORS errors** — The worker includes CORS headers for `*`. If you're seeing CORS issues, verify you're using v2 of the worker (`forge_worker_v2.js`), not v1.

**Sync not pulling data** — Verify KV namespace is bound correctly. Pull requires at least one prior push to have stored data.
