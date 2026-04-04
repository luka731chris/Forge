/**
 * FORGE WORKER — Cloudflare Worker Proxy
 * Handles two endpoints, both routing to Anthropic:
 *
 *   POST /chat  — $id AI financial advisor (chat completions)
 *   POST /scan  — Smart Scan AI extraction (receipts, PDFs, CSVs, statements)
 *
 * Setup:
 *   1. workers.cloudflare.com → Create Worker → paste this file
 *   2. Settings → Variables → add Secret: ANTHROPIC_API_KEY = sk-ant-...
 *   3. Deploy → copy your Worker URL
 *   4. In forge.html: set  const WORKER_URL = 'https://your-worker.workers.dev';
 *   5. In forge-pulse.html: set callSid URL to the same Worker URL + /chat
 *
 * Cost estimate: ~$0.001–0.005 per Smart Scan (Sonnet 4.5, image/PDF = ~$0.003/page)
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-5-20251022';
const VERSION       = '2023-06-01';

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsOk()     { return new Response(null, { status: 204, headers: CORS }); }
function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
function errResp(msg, status = 500) { return jsonResp({ error: msg }, status); }

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') return corsOk();
    if (request.method !== 'POST')    return errResp('POST only', 405);

    const url  = new URL(request.url);
    const path = url.pathname;

    // ── /scan — Smart Scan AI extraction ─────────────────────────────────────
    if (path === '/scan' || path === '/smart-scan') {
      return handleScan(request, env);
    }

    // ── /chat — $id chat completions ─────────────────────────────────────────
    if (path === '/chat' || path === '/') {
      return handleChat(request, env);
    }

    return errResp('Unknown endpoint. Use /scan or /chat.', 404);
  }
};

// ── SCAN endpoint ─────────────────────────────────────────────────────────────
async function handleScan(request, env) {
  if (!env.ANTHROPIC_API_KEY) return errResp('ANTHROPIC_API_KEY secret not set on Worker.');

  let body;
  try { body = await request.json(); }
  catch(e) { return errResp('Invalid JSON body'); }

  const { content } = body;
  if (!content || !Array.isArray(content) || content.length === 0) {
    return errResp('body.content must be a non-empty array of Anthropic content blocks');
  }

  // System prompt for extraction
  const systemPrompt = `You are a financial data extraction engine with expert knowledge of every format:
CSV/QIF/OFX exports, bank PDF statements, credit card statements, investment account statements,
receipts (restaurant, retail, grocery, gas), W-2s, 1099s, handwritten notes, and screenshots.

Your job is to extract every financial transaction and return structured JSON.
Be aggressive — if you can read a number and a date and a payee, include it.
Use context clues for missing fields (e.g. infer year from statement header, infer
expense vs income from context).

Return ONLY a valid JSON object, no markdown fences, no preamble.`;

  // Call Anthropic
  let anthropicResp;
  try {
    anthropicResp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': VERSION,
        'anthropic-beta':    'pdfs-2024-09-25',   // enables native PDF support
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 4096,
        system:     systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });
  } catch(e) {
    return errResp('Anthropic API network error: ' + e.message);
  }

  if (!anthropicResp.ok) {
    const errText = await anthropicResp.text().catch(() => anthropicResp.status);
    return errResp(`Anthropic API error ${anthropicResp.status}: ${errText}`, anthropicResp.status);
  }

  const data = await anthropicResp.json();
  // Pass the raw Anthropic response back — client parses it
  return jsonResp(data);
}

// ── CHAT endpoint ($id) ───────────────────────────────────────────────────────
async function handleChat(request, env) {
  if (!env.ANTHROPIC_API_KEY) return errResp('ANTHROPIC_API_KEY secret not set on Worker.');

  let body;
  try { body = await request.json(); }
  catch(e) { return errResp('Invalid JSON body'); }

  const { system, messages, max_tokens } = body;
  if (!messages || !Array.isArray(messages)) {
    return errResp('body.messages must be an array');
  }

  let anthropicResp;
  try {
    anthropicResp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': VERSION,
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: max_tokens || 1024,
        system:     system || '',
        messages
      })
    });
  } catch(e) {
    return errResp('Anthropic API network error: ' + e.message);
  }

  if (!anthropicResp.ok) {
    const errText = await anthropicResp.text().catch(() => anthropicResp.status);
    return errResp(`Anthropic API error ${anthropicResp.status}: ${errText}`, anthropicResp.status);
  }

  const data = await anthropicResp.json();
  return jsonResp(data);
}
