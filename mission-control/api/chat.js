/**
 * Vercel serverless function — proxies Anthropic's Messages API with SSE
 * streaming so the dashboard chat works without the local bridge.
 *
 * Accepts:
 *   GET  /api/chat?msg=...&session=... (used by EventSource flow)
 *   POST /api/chat  with JSON {messages: [...], system: "..."}
 *
 * Required Vercel env var:
 *   ANTHROPIC_API_KEY
 *
 * Optional:
 *   ANTHROPIC_MODEL    Override model (default: claude-sonnet-4-6)
 *   ANTHROPIC_SYSTEM   System prompt
 */

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_SYSTEM = `You are the AI assistant for Bamboo Disposables BV — a Dutch sustainable bamboo toilet paper brand. Nathan runs the business.

Tone: pragmatic, direct, Dutch-friendly. Speak in "je/jij" if asked to write Dutch. Never moralistic or activist — Bamboo positions as the smart, mature choice, not the eco-guilt one. Lead with value (more sheets, longer use), then comfort, then sustainability.

You have context on the 6 systems: Competitor Scraping, Content Machine, Ad Management, Conversion Engine, Revenue Engine, Intelligence Engine. The hero product is Ongebleekt 3 laags 48 rollen.`;

module.exports = async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return sendError(res, 500, 'Missing ANTHROPIC_API_KEY env var on Vercel');
  }

  // Parse input from GET (EventSource) or POST (fetch)
  let userMsg = '';
  let history = [];
  let system = process.env.ANTHROPIC_SYSTEM || DEFAULT_SYSTEM;

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const json = JSON.parse(body || '{}');
      if (json.messages && Array.isArray(json.messages)) {
        history = json.messages;
      } else if (json.msg) {
        userMsg = String(json.msg);
      }
      if (json.system) system = json.system;
    } catch (e) {
      return sendError(res, 400, `Bad JSON: ${e.message}`);
    }
  } else {
    const url = new URL(req.url, 'http://x');
    userMsg = url.searchParams.get('msg') || url.searchParams.get('cmd') || '';
    const histParam = url.searchParams.get('history');
    if (histParam) {
      try { history = JSON.parse(histParam); } catch {}
    }
  }

  if (!history.length && userMsg) {
    history = [{ role: 'user', content: userMsg }];
  }
  if (!history.length) {
    return sendError(res, 400, 'No message provided');
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        stream: true,
        messages: history,
      }),
    });
  } catch (err) {
    writeEvent(res, 'error', { type: 'error', text: `Network error: ${err.message}` });
    writeEvent(res, 'done', { type: 'done', exitCode: 1 });
    return res.end();
  }

  if (!upstream.ok) {
    const body = await upstream.text();
    writeEvent(res, 'error', { type: 'error', text: `Anthropic ${upstream.status}: ${body.slice(0, 300)}` });
    writeEvent(res, 'done', { type: 'done', exitCode: 1 });
    return res.end();
  }

  // Stream the Anthropic SSE response → transform to our event format
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseSseBlock(block);
        if (!parsed) continue;

        if (parsed.event === 'content_block_delta' && parsed.data && parsed.data.delta && parsed.data.delta.text) {
          writeEvent(res, 'output', { type: 'output', text: parsed.data.delta.text });
        } else if (parsed.event === 'message_stop') {
          writeEvent(res, 'done', { type: 'done', exitCode: 0 });
        } else if (parsed.event === 'error') {
          writeEvent(res, 'error', { type: 'error', text: JSON.stringify(parsed.data).slice(0, 300) });
        }
      }
    }
  } catch (err) {
    writeEvent(res, 'error', { type: 'error', text: `Stream error: ${err.message}` });
  }

  writeEvent(res, 'done', { type: 'done', exitCode: 0 });
  res.end();
};

function parseSseBlock(block) {
  const lines = block.split('\n');
  let event = 'message';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return null;
  try { return { event, data: JSON.parse(data) }; }
  catch { return { event, data }; }
}

function writeEvent(res, type, data) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendError(res, status, msg) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: msg }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
