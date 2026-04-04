/**
 * FORGE SMART SCAN — Cloudflare Worker Proxy v2
 * 
 * Handles two routes:
 *   POST /chat        → Sid AI chat (original)
 *   POST /scan        → Smart Scan: extract transactions from any file/image/document
 *
 * Setup:
 *   1. workers.cloudflare.com → Create Worker → paste this file
 *   2. Settings → Variables → Secret: ANTHROPIC_API_KEY = sk-ant-...
 *   3. Deploy → copy worker URL into forge.html WORKER_URL constant
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

// ── SMART SCAN SYSTEM PROMPT ────────────────────────────────────────────────
const SCAN_SYSTEM = `You are a financial data extraction engine for Forge, a personal finance app.
Your job is to extract every financial transaction from whatever the user provides.
The user may send:
  - A CSV file with unusual structure or preamble rows
  - A bank statement (text or image)
  - A receipt photo
  - A photo of handwritten notes listing expenses
  - An investment statement
  - A W-2 or 1099 tax document
  - A PDF or screenshot of any financial document

OUTPUT RULES — follow exactly, no exceptions:
1. Return ONLY a valid JSON object, no markdown, no explanation, no preamble.
2. Schema:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "payee": "Merchant or payer name",
      "amount": -89.99,
      "category": "best guess category",
      "account": "account name if identifiable, else 'Imported'",
      "memo": "any useful note"
    }
  ],
  "source_type": "one of: csv|bank_statement|receipt|handwritten|investment|tax_document|unknown",
  "account_name": "account or institution name if found, else null",
  "date_range": "e.g. Jan 2024 – Mar 2024, or null",
  "confidence": "high|medium|low",
  "notes": "brief note if something was ambiguous or partially unreadable"
}
3. Amount sign convention: expenses are NEGATIVE, income/deposits are POSITIVE.
4. Dates: always ISO format YYYY-MM-DD. If only month/year visible, use the 1st.
5. Categories: use plain English. Examples: Groceries, Dining, Gas, Utilities,
   Healthcare, Shopping, Entertainment, Transfer, Income, Investment, Tax.
6. If a document is a W-2 or 1099, create one transaction per income/payment box
   that has a non-zero value. Use the tax year as the date (YYYY-12-31).
7. If a receipt, create exactly one transaction. Date = receipt date.
8. If handwritten notes, extract every legible amount as a transaction.
9. Skipping rows: skip header rows, running balance rows, page total rows.
   Include EVERY actual transaction row.
10. If you cannot extract any transactions (completely unreadable or irrelevant),
    return {"transactions":[],"source_type":"unknown","confidence":"low","notes":"explanation"}.`;

export default {
  async fetch(request, env) {

    // ── CORS preflight ──────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── /chat  ─ original Sid chat route ────────────────────────────────────
    if (path === '/chat' || path === '/') {
      let body;
      try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

      const safeBody = {
        model:      MODEL,
        max_tokens: Math.min(body.max_tokens || 500, 1500),
        system:     body.system   || 'You are Sid, a helpful financial assistant.',
        messages:   body.messages || [],
      };

      const resp = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(safeBody),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // ── /scan  ─ Smart Scan route ────────────────────────────────────────────
    if (path === '/scan') {
      let body;
      try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

      // body.content is an array of Anthropic content blocks
      // Can be: [{type:'text', text:'...'}, {type:'image', source:{type:'base64',...}}, ...]
      const content = body.content || [];
      if (!content.length) return new Response('No content', { status: 400 });

      const anthropicBody = {
        model:      MODEL,
        max_tokens: 4096,
        system:     SCAN_SYSTEM,
        messages:   [{ role: 'user', content }],
      };

      const resp = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_KEY || env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'pdfs-2024-09-25' },
        body: JSON.stringify(anthropicBody),
      });

      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
