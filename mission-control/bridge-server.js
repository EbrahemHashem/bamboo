/**
 * 187N Mission Control — Bridge Server
 * Connects the dashboard to Claude Code CLI
 *
 * Start: node bridge-server.js
 * Runs on: http://localhost:3333
 *
 * Fork of lio-os/lioos-bridge.js with added API endpoints
 */

const http = require('http');
const https = require('https');
const { spawn, execSync, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const url = require('url');
const os = require('os');

// keytar = OS-native credential storage (Keychain/Credential Manager/libsecret)
let keytar = null;
try { keytar = require('keytar'); } catch (e) { console.warn('[bridge] keytar not available — MCP install disabled'); }
const KEYTAR_SERVICE_PREFIX = '187n-mc';
const MCP_CATALOG_PATH = path.join(__dirname, 'mcp-catalog.json');

const PORT = process.env.PORT || process.env.MC_PORT || 3333;
const CONFIG_PATH = path.join(__dirname, 'client-config.json');
const ACTIVITY_LOG_PATH = path.join(__dirname, 'activity.log');
let activeProcess = null;
let lastSessionId = null;

// Track all spawned child processes for graceful shutdown
const childProcesses = new Set();

// MIME types
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

// ── Security helpers ──

/**
 * Sanitize a string for safe use in shell commands.
 * Only allows alphanumeric, spaces, hyphens, underscores, dots, colons, slashes, and @.
 */
function sanitizeForShell(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9 \-_./:@*]/g, '');
}

/**
 * Validate a cron schedule string (e.g. "0 9 * * *")
 */
function isValidCronSchedule(schedule) {
  if (typeof schedule !== 'string') return false;
  // Basic cron: 5 fields separated by spaces, only digits, *, /, -, and commas
  return /^[\d*,/\- ]{5,50}$/.test(schedule.trim());
}

function isValidCommand(cmd) {
  return typeof cmd === 'string' && cmd.length > 0 && cmd.length < 500;
}

/**
 * Validate that an ID is safe (alphanumeric + hyphens only)
 */
function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

/**
 * Resolve a path and ensure it stays within an allowed base directory.
 * Returns null if traversal detected.
 */
function safePath(base, userPath) {
  const resolved = path.resolve(base, userPath);
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    return null;
  }
  return resolved;
}

function jsonRes(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Parse body ──
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// ── Load .env from client workspace (KEY=VALUE, # comments) ──
function loadClientEnv() {
  const ws = resolveClientWorkspace();
  if (!ws) return {};
  const envPath = path.join(ws, '.env');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq < 1) continue;
    const k = s.slice(0, eq).trim();
    let v = s.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

// ── Airtable HTTPS request ──
function airtableRequest({ method, path: apiPath, body }) {
  const env = loadClientEnv();
  const pat = env.AIRTABLE_API_KEY || env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
  const baseId = env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
  if (!pat) return Promise.reject(new Error('AIRTABLE_API_KEY missing in client .env'));
  if (!baseId && !apiPath.startsWith('/meta/whoami')) return Promise.reject(new Error('AIRTABLE_BASE_ID missing in client .env'));
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const fullPath = apiPath.startsWith('/meta/whoami') ? '/v0/meta/whoami' : `/v0/${apiPath.startsWith('meta/') ? '' : `${baseId}/`}${apiPath.replace(/^\//, '')}`;
    const req = https.request({
      hostname: 'api.airtable.com',
      port: 443,
      path: fullPath,
      method,
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (r) => {
      let buf = '';
      r.on('data', (c) => buf += c);
      r.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(buf); } catch { parsed = { raw: buf }; }
        if (r.statusCode >= 200 && r.statusCode < 300) resolve(parsed);
        else reject(Object.assign(new Error(parsed.error?.message || `Airtable HTTP ${r.statusCode}`), { status: r.statusCode, body: parsed }));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── n8n HTTPS/HTTP request ──
function n8nRequest({ method, path: apiPath, body }) {
  const env = loadClientEnv();
  const apiKey = env.N8N_API_KEY || process.env.N8N_API_KEY;
  const host = env.N8N_HOST || process.env.N8N_HOST || 'http://localhost:5678';
  if (!apiKey) return Promise.reject(new Error('N8N_API_KEY missing — set it in client .env or shell env (n8n UI → Settings → API → Create API Key)'));
  return new Promise((resolve, reject) => {
    const u = new url.URL(apiPath.startsWith('/') ? `${host}${apiPath}` : `${host}/${apiPath}`);
    const lib = u.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (r) => {
      let buf = '';
      r.on('data', (c) => buf += c);
      r.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(buf); } catch { parsed = { raw: buf }; }
        if (r.statusCode >= 200 && r.statusCode < 300) resolve(parsed);
        else reject(Object.assign(new Error(parsed.message || `n8n HTTP ${r.statusCode}`), { status: r.statusCode, body: parsed }));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Log activity ──
function logActivity(action, details) {
  try {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      action,
      ...details,
    }) + '\n';
    fs.appendFileSync(ACTIVITY_LOG_PATH, entry);
  } catch { /* ignore logging errors */ }
}

// ── Server ──
const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    // ════════════════════════════════
    // HEALTH
    // ════════════════════════════════
    if (pathname === '/health') {
      return jsonRes(res, 200, {
        status: 'ok',
        version: '1.1.0',
        pid: process.pid,
        activeAgent: !!activeProcess,
        uptime: formatUptime(process.uptime()),
      });
    }

    // ════════════════════════════════
    // AIRTABLE — proxy to Airtable REST API using client .env PAT
    // ════════════════════════════════
    if (pathname === '/api/airtable/health') {
      const env = loadClientEnv();
      return jsonRes(res, 200, {
        airtable_key: env.AIRTABLE_API_KEY ? 'set' : 'missing',
        airtable_base: env.AIRTABLE_BASE_ID || null,
        client_workspace: resolveClientWorkspace() || null,
      });
    }

    if (pathname === '/api/airtable/tables' && req.method === 'GET') {
      try {
        const env = loadClientEnv();
        const r = await airtableRequest({ method: 'GET', path: `meta/bases/${env.AIRTABLE_BASE_ID}/tables` });
        return jsonRes(res, 200, { tables: (r.tables || []).map(t => ({ id: t.id, name: t.name, fieldCount: (t.fields || []).length, fields: t.fields })) });
      } catch (e) {
        return jsonRes(res, e.status || 500, { error: e.message, body: e.body });
      }
    }

    if (pathname === '/api/airtable/records' && req.method === 'GET') {
      try {
        const table = parsed.query.table;
        if (!table) return jsonRes(res, 400, { error: 'table query param required' });
        const r = await airtableRequest({ method: 'GET', path: encodeURIComponent(table) + '?pageSize=20' });
        return jsonRes(res, 200, { records: r.records || [] });
      } catch (e) {
        return jsonRes(res, e.status || 500, { error: e.message, body: e.body });
      }
    }

    if (pathname === '/api/airtable/create' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.table || !body.fields) return jsonRes(res, 400, { error: 'body must be {table, fields}' });
        const r = await airtableRequest({ method: 'POST', path: encodeURIComponent(body.table), body: { fields: body.fields } });
        logActivity('airtable_create', { table: body.table, recordId: r.id });
        return jsonRes(res, 200, { id: r.id, fields: r.fields });
      } catch (e) {
        return jsonRes(res, e.status || 500, { error: e.message, body: e.body });
      }
    }

    if (pathname === '/api/airtable/update' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.table || !body.id || !body.fields) return jsonRes(res, 400, { error: 'body must be {table, id, fields}' });
        const r = await airtableRequest({ method: 'PATCH', path: `${encodeURIComponent(body.table)}/${body.id}`, body: { fields: body.fields } });
        logActivity('airtable_update', { table: body.table, recordId: body.id });
        return jsonRes(res, 200, { id: r.id, fields: r.fields });
      } catch (e) {
        return jsonRes(res, e.status || 500, { error: e.message, body: e.body });
      }
    }

    // ════════════════════════════════
    // n8n — proxy to local/remote n8n REST API
    // ════════════════════════════════
    if (pathname === '/api/n8n/health') {
      const env = loadClientEnv();
      return jsonRes(res, 200, {
        n8n_host: env.N8N_HOST || process.env.N8N_HOST || 'http://localhost:5678',
        n8n_api_key: (env.N8N_API_KEY || process.env.N8N_API_KEY) ? 'set' : 'missing',
      });
    }

    if (pathname === '/api/n8n/workflows' && req.method === 'GET') {
      try {
        const r = await n8nRequest({ method: 'GET', path: '/api/v1/workflows' });
        return jsonRes(res, 200, { workflows: (r.data || []).map(w => ({ id: w.id, name: w.name, active: w.active, updatedAt: w.updatedAt })) });
      } catch (e) {
        return jsonRes(res, e.status || 500, { error: e.message, body: e.body });
      }
    }

    if (pathname === '/api/n8n/trigger' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.id) return jsonRes(res, 400, { error: 'body must be {id, payload?} where id is the workflow id' });
        const r = await n8nRequest({ method: 'POST', path: `/api/v1/workflows/${body.id}/run`, body: body.payload || {} });
        logActivity('n8n_trigger', { workflowId: body.id });
        return jsonRes(res, 200, r);
      } catch (e) {
        return jsonRes(res, e.status || 500, { error: e.message, body: e.body });
      }
    }

    // ════════════════════════════════
    // SYSTEM STATS
    // ════════════════════════════════
    if (pathname === '/api/system-stats') {
      try {
        const stats = getSystemStats();
        return jsonRes(res, 200, stats);
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // AGENTS — client workspace OR config.agents OR fallback to /.claude/agents
    // ════════════════════════════════
    if (pathname === '/api/agents') {
      try {
        const config = loadConfig();
        const clientWs = resolveClientWorkspace();
        const agents = [];

        // 1. Client workspace: agents/ subfolders (one per agent)
        const agentsDir = clientWs ? path.join(clientWs, 'agents') : path.join(os.homedir(), '.claude', 'agents');
        if (fs.existsSync(agentsDir)) {
          try {
            const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
            for (const e of entries) {
              if (e.name.startsWith('.')) continue;
              let role = '';
              if (e.isDirectory()) {
                // Try to read README.md or CLAUDE.md from agent folder
                for (const f of ['README.md', 'CLAUDE.md', 'agent.md']) {
                  const p = path.join(agentsDir, e.name, f);
                  if (fs.existsSync(p)) {
                    try {
                      const c = fs.readFileSync(p, 'utf8');
                      role = (c.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---')) || '').trim().slice(0, 120);
                    } catch {}
                    break;
                  }
                }
                agents.push({ name: e.name, role, status: 'idle', category: 'client' });
              } else if (e.isFile() && e.name.endsWith('.md')) {
                const name = e.name.replace(/\.md$/, '');
                try {
                  const c = fs.readFileSync(path.join(agentsDir, e.name), 'utf8');
                  role = (c.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---')) || '').trim().slice(0, 120);
                } catch {}
                agents.push({ name, role, status: 'idle', category: 'agent' });
              }
            }
          } catch {}
        }

        // 2. Config.agents (manually configured list)
        if (agents.length === 0 && Array.isArray(config.agents)) {
          return jsonRes(res, 200, { agents: config.agents });
        }

        return jsonRes(res, 200, { agents });
      } catch {
        return jsonRes(res, 200, { agents: [] });
      }
    }

    // ════════════════════════════════
    // INTAKE DOCS — list markdown files in client intake-docs/
    // ════════════════════════════════
    if (pathname === '/api/intake-docs') {
      try {
        const clientWs = resolveClientWorkspace();
        if (!clientWs) return jsonRes(res, 200, { docs: [], configured: false });
        const intakeDir = path.join(clientWs, 'intake-docs');
        if (!fs.existsSync(intakeDir)) return jsonRes(res, 200, { docs: [], configured: true });

        const docs = [];
        (function walk(dir, rel) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            if (e.name.startsWith('.')) continue;
            const abs = path.join(dir, e.name);
            const r = rel ? path.join(rel, e.name) : e.name;
            if (e.isDirectory()) walk(abs, r);
            else if (e.isFile() && e.name.endsWith('.md')) {
              try {
                const st = fs.statSync(abs);
                docs.push({ name: e.name, path: r, size: st.size, mtime: st.mtimeMs });
              } catch {}
            }
          }
        })(intakeDir, '');
        docs.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
        return jsonRes(res, 200, { docs, configured: true });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    if (pathname === '/api/intake-docs/read') {
      try {
        const clientWs = resolveClientWorkspace();
        if (!clientWs) return jsonRes(res, 400, { error: 'No client workspace configured' });
        const rel = parsed.query.path || '';
        if (!rel || typeof rel !== 'string' || rel.includes('..')) return jsonRes(res, 400, { error: 'invalid path' });
        const abs = path.resolve(path.join(clientWs, 'intake-docs'), rel);
        const base = path.resolve(path.join(clientWs, 'intake-docs'));
        if (!abs.startsWith(base + path.sep)) return jsonRes(res, 400, { error: 'path traversal' });
        if (!abs.endsWith('.md')) return jsonRes(res, 400, { error: 'only .md' });
        if (!fs.existsSync(abs)) return jsonRes(res, 404, { error: 'not found' });
        const content = fs.readFileSync(abs, 'utf8');
        return jsonRes(res, 200, { path: rel, content });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // SKILLS LIST
    // ════════════════════════════════
    if (pathname === '/api/skills/list') {
      try {
        const skills = listSkills();
        return jsonRes(res, 200, { skills });
      } catch (e) {
        return jsonRes(res, 200, { skills: [] });
      }
    }

    // ════════════════════════════════
    // CRON LIST
    // ════════════════════════════════
    if (pathname === '/api/cron/list') {
      try {
        const jobs = [];

        // 1. Claude Code scheduled tasks (global)
        try {
          const output = execSync('claude schedule list 2>/dev/null || echo "[]"', {
            encoding: 'utf8',
            timeout: 2000,
          }).trim();
          const parsed = JSON.parse(output.startsWith('[') ? output : '[]');
          parsed.forEach(j => jobs.push({ ...j, source: 'claude' }));
        } catch {}

        // 2. Client workspace routines/ folder (e.g. forge-waters, paw-parent)
        const clientWs = resolveClientWorkspace();
        if (clientWs) {
          const routinesDir = path.join(clientWs, 'routines');
          if (fs.existsSync(routinesDir)) {
            try {
              const entries = fs.readdirSync(routinesDir, { withFileTypes: true });
              for (const e of entries) {
                if (!e.isFile() || !e.name.endsWith('.json')) continue;
                try {
                  const rel = path.join('routines', e.name);
                  const content = JSON.parse(fs.readFileSync(path.join(routinesDir, e.name), 'utf8'));
                  jobs.push({
                    id: 'routine:' + e.name.replace(/\.json$/, ''),
                    name: content.name || e.name.replace(/\.json$/, ''),
                    schedule: content.schedule || content.cron || '—',
                    command: content.command || content.skill || '',
                    status: content.enabled === false ? 'idle' : 'ok',
                    source: 'routine',
                    file: rel,
                  });
                } catch {}
              }
            } catch {}
          }

          // 3. Client n8n workflows (metadata only — actual run state is in n8n instance)
          const n8nDir = path.join(clientWs, 'n8n-workflows');
          if (fs.existsSync(n8nDir)) {
            try {
              const entries = fs.readdirSync(n8nDir, { withFileTypes: true });
              for (const e of entries) {
                if (!e.isFile() || !e.name.endsWith('.json')) continue;
                try {
                  const content = JSON.parse(fs.readFileSync(path.join(n8nDir, e.name), 'utf8'));
                  // Extract cron from trigger nodes if present
                  const schedule = (content.nodes || []).find(n =>
                    n.type === 'n8n-nodes-base.cron' || n.type === 'n8n-nodes-base.scheduleTrigger'
                  );
                  jobs.push({
                    id: 'n8n:' + e.name.replace(/\.json$/, ''),
                    name: content.name || e.name.replace(/\.json$/, ''),
                    schedule: (schedule && schedule.parameters && (schedule.parameters.cronExpression || JSON.stringify(schedule.parameters).slice(0, 40))) || 'webhook/manual',
                    status: content.active ? 'ok' : 'idle',
                    source: 'n8n',
                  });
                } catch {}
              }
            } catch {}
          }
        }

        return jsonRes(res, 200, { jobs });
      } catch {
        return jsonRes(res, 200, { jobs: [] });
      }
    }

    // ════════════════════════════════
    // ROUTINE RUN — stream Python script output via SSE
    // ════════════════════════════════
    if (pathname === '/api/routine/run') {
      const routineName = parsed.query.name;
      if (!routineName || !isValidId(routineName.replace(/[^a-zA-Z0-9_\-]/g, '_'))) {
        return jsonRes(res, 400, { error: 'name query param required' });
      }

      // Find the routine JSON
      const clientWs = resolveClientWorkspace();
      const routinesDir = clientWs ? path.join(clientWs, 'routines') : null;
      if (!routinesDir || !fs.existsSync(routinesDir)) {
        return jsonRes(res, 404, { error: 'routines directory not found' });
      }

      // Match by name field or filename
      let routineFile = null;
      let routineData = null;
      for (const f of fs.readdirSync(routinesDir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(routinesDir, f), 'utf8'));
          if (f.replace('.json', '') === routineName || data.name === routineName) {
            routineFile = f;
            routineData = data;
            break;
          }
        } catch {}
      }

      if (!routineData) {
        return jsonRes(res, 404, { error: `Routine "${routineName}" not found` });
      }

      const command = routineData.command;
      if (!command) {
        return jsonRes(res, 400, { error: 'Routine has no command defined' });
      }

      // SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const safeWrite = (data) => { try { res.write(data); } catch {} };

      safeWrite(`data: ${JSON.stringify({ type: 'start', routine: routineData.name })}\n\n`);
      logActivity('routine_run', { routine: routineName, command: command.slice(0, 200) });

      // Load client .env into subprocess environment
      const clientEnv = loadClientEnv();
      const childEnv = { ...process.env, ...clientEnv, FORCE_COLOR: '0', PYTHONUNBUFFERED: '1' };

      // Parse command into executable + args (handle quoted paths)
      const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const exe = parts[0];
      const args = parts.slice(1).map(p => p.replace(/^["']|["']$/g, ''));

      const proc = spawn(exe, args, {
        cwd: clientWs,
        env: childEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', (chunk) => {
        chunk.toString().split('\n').forEach(line => {
          if (line.trim()) safeWrite(`data: ${JSON.stringify({ type: 'output', text: line + '\n' })}\n\n`);
        });
      });

      proc.stderr.on('data', (chunk) => {
        chunk.toString().split('\n').forEach(line => {
          if (line.trim()) safeWrite(`data: ${JSON.stringify({ type: 'error', text: line + '\n' })}\n\n`);
        });
      });

      proc.on('close', (code) => {
        safeWrite(`data: ${JSON.stringify({ type: 'done', exitCode: code })}\n\n`);
        try { res.end(); } catch {}
      });

      proc.on('error', (err) => {
        safeWrite(`data: ${JSON.stringify({ type: 'error', text: `Failed to start: ${err.message}\n` })}\n\n`);
        safeWrite(`data: ${JSON.stringify({ type: 'done', exitCode: 1 })}\n\n`);
        try { res.end(); } catch {}
      });

      req.on('close', () => { try { proc.kill(); } catch {} });
      return;
    }

    // ════════════════════════════════
    // CRON CREATE — with input sanitization
    // ════════════════════════════════
    if (pathname === '/api/cron/create' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.command || !body.schedule) {
        return jsonRes(res, 400, { error: 'command and schedule required' });
      }

      // Validate schedule format
      if (!isValidCronSchedule(body.schedule)) {
        return jsonRes(res, 400, { error: 'Invalid cron schedule format' });
      }

      // Sanitize command — prevent injection
      const safeCommand = sanitizeForShell(body.command);
      const safeSchedule = sanitizeForShell(body.schedule);

      if (!safeCommand || !safeSchedule) {
        return jsonRes(res, 400, { error: 'Invalid characters in command or schedule' });
      }

      try {
        // Use array form via spawnSync to avoid shell injection
        const result = require('child_process').spawnSync('claude', [
          'schedule', 'create',
          '--schedule', safeSchedule,
          '--prompt', safeCommand,
        ], { encoding: 'utf8', timeout: 15000 });

        if (result.status !== 0) {
          return jsonRes(res, 500, { error: result.stderr || 'Failed to create schedule' });
        }

        logActivity('cron_create', { command: safeCommand, schedule: safeSchedule });
        return jsonRes(res, 200, { ok: true });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // CRON DELETE — with ID validation
    // ════════════════════════════════
    if (pathname === '/api/cron/delete' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.id) return jsonRes(res, 400, { error: 'id required' });

      // Validate ID format to prevent injection
      if (!isValidId(body.id)) {
        return jsonRes(res, 400, { error: 'Invalid ID format' });
      }

      try {
        const result = require('child_process').spawnSync('claude', [
          'schedule', 'delete', body.id,
        ], { encoding: 'utf8', timeout: 10000 });

        if (result.status !== 0) {
          return jsonRes(res, 500, { error: result.stderr || 'Failed to delete schedule' });
        }

        logActivity('cron_delete', { id: body.id });
        return jsonRes(res, 200, { ok: true });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // FILES READ — with path traversal protection
    // ════════════════════════════════
    if (pathname === '/api/files/read') {
      const filePath = parsed.query.path;
      if (!filePath) return jsonRes(res, 400, { error: 'path required' });

      // Whitelist: only allow specific files
      const allowed = [
        'CLAUDE.md', 'tasks/todo.md', 'memory/MEMORY.md',
      ];

      const isAllowed = allowed.some(a => filePath.endsWith(a));
      if (!isAllowed) return jsonRes(res, 403, { error: 'File not whitelisted' });

      // Block path traversal patterns
      if (filePath.includes('..') || filePath.includes('\0')) {
        return jsonRes(res, 403, { error: 'Path traversal not allowed' });
      }

      try {
        const home = os.homedir();
        const cwd = process.cwd();
        const clientWs = resolveClientWorkspace();
        // Search order: client workspace → CWD → home
        const candidates = [
          clientWs ? path.join(clientWs, filePath) : null,
          path.resolve(filePath),
          path.join(home, filePath),
        ].filter(Boolean);

        let fullPath = candidates.find(p => fs.existsSync(p));
        if (!fullPath) return jsonRes(res, 404, { error: 'File not found' });

        // Verify resolved path is within home, CWD, or client workspace
        const okRoots = [home, cwd, clientWs].filter(Boolean);
        if (!okRoots.some(r => fullPath.startsWith(r))) {
          return jsonRes(res, 403, { error: 'Access denied' });
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        return jsonRes(res, 200, { content, path: filePath });
      } catch (e) {
        return jsonRes(res, 404, { error: 'File not found' });
      }
    }

    // ════════════════════════════════
    // FILES LIST — list files in whitelisted directories
    // ════════════════════════════════
    if (pathname === '/api/files/list') {
      const dir = parsed.query.dir || '.';

      // Whitelist allowed directories (relative to workspace)
      const workspace = path.resolve(__dirname, '..');
      const allowedDirs = ['.', 'tasks', 'brands', 'skills', 'tools', 'infra', 'research'];

      // Normalize and check
      const normalizedDir = path.normalize(dir).replace(/^\.\//, '');
      if (!allowedDirs.some(d => normalizedDir === d || normalizedDir.startsWith(d + path.sep))) {
        return jsonRes(res, 403, { error: 'Directory not whitelisted' });
      }

      // Block traversal
      if (dir.includes('..') || dir.includes('\0')) {
        return jsonRes(res, 403, { error: 'Path traversal not allowed' });
      }

      const fullDir = safePath(workspace, dir);
      if (!fullDir) {
        return jsonRes(res, 403, { error: 'Path traversal detected' });
      }

      try {
        const entries = fs.readdirSync(fullDir, { withFileTypes: true });
        const files = entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          size: e.isFile() ? (function() { try { return fs.statSync(path.join(fullDir, e.name)).size; } catch { return 0; } })() : null,
        }));
        return jsonRes(res, 200, { dir, files });
      } catch (e) {
        return jsonRes(res, 404, { error: 'Directory not found' });
      }
    }

    // ════════════════════════════════
    // ACTIVITY — recent agent activity log
    // ════════════════════════════════
    if (pathname === '/api/activity') {
      const limit = Math.min(parseInt(parsed.query.limit) || 50, 200);
      try {
        if (!fs.existsSync(ACTIVITY_LOG_PATH)) {
          return jsonRes(res, 200, { activity: [] });
        }
        const raw = fs.readFileSync(ACTIVITY_LOG_PATH, 'utf8');
        const lines = raw.trim().split('\n').filter(Boolean);
        const activity = [];
        // Take the last N entries
        const start = Math.max(0, lines.length - limit);
        for (let i = start; i < lines.length; i++) {
          try {
            activity.push(JSON.parse(lines[i]));
          } catch { /* skip malformed lines */ }
        }
        return jsonRes(res, 200, { activity: activity.reverse() });
      } catch (e) {
        return jsonRes(res, 200, { activity: [] });
      }
    }

    // ════════════════════════════════
    // USAGE — token usage stats
    // ════════════════════════════════
    if (pathname === '/api/usage') {
      try {
        // Try to read Claude usage from ~/.claude/usage.json or similar
        const usagePaths = [
          path.join(os.homedir(), '.claude', 'usage.json'),
          path.join(os.homedir(), '.claude', 'stats.json'),
        ];

        let usage = null;
        for (const p of usagePaths) {
          try {
            if (fs.existsSync(p)) {
              usage = JSON.parse(fs.readFileSync(p, 'utf8'));
              break;
            }
          } catch { /* try next */ }
        }

        // Fallback: try getting usage from claude CLI
        if (!usage) {
          try {
            const output = execSync('claude usage 2>/dev/null || echo "{}"', {
              encoding: 'utf8',
              timeout: 2000,
            }).trim();
            usage = JSON.parse(output.startsWith('{') ? output : '{}');
          } catch {
            usage = {};
          }
        }

        return jsonRes(res, 200, { usage: usage || {} });
      } catch (e) {
        return jsonRes(res, 200, { usage: {} });
      }
    }

    // ════════════════════════════════
    // INTEGRATIONS STATUS
    // ════════════════════════════════
    if (pathname === '/api/integrations/status') {
      try {
        const config = loadConfig();
        return jsonRes(res, 200, { integrations: config.integrations || {} });
      } catch {
        return jsonRes(res, 200, { integrations: {} });
      }
    }

    // ════════════════════════════════
    // FINANCE — read CSVs from {clientWorkspace}/finance/
    // ════════════════════════════════
    if (pathname === '/api/finance/status') {
      try {
        const clientWs = resolveClientWorkspace();
        if (!clientWs) return jsonRes(res, 200, { configured: false, datasets: {} });
        const financeDir = path.join(clientWs, 'finance');
        if (!fs.existsSync(financeDir)) return jsonRes(res, 200, { configured: true, financeDir, datasets: {}, mappingPresent: false });
        const datasets = {};
        // Check for single finance.xlsx workbook
        const workbookPath = path.join(financeDir, 'finance.xlsx');
        const workbookExists = fs.existsSync(workbookPath);
        let workbookSheets = [];
        if (workbookExists) {
          try { const XLSX = getXlsx(); if (XLSX) workbookSheets = XLSX.readFile(workbookPath).SheetNames; } catch {}
        }
        for (const name of ['pnl', 'revenue', 'costcenter', 'pipeline', 'cashflow']) {
          const csvPath = path.join(financeDir, name + '.csv');
          const xlsxPath = path.join(financeDir, name + '.xlsx');
          if (fs.existsSync(csvPath)) {
            const st = fs.statSync(csvPath);
            let rows = 0;
            try { rows = fs.readFileSync(csvPath, 'utf8').split('\n').filter(l => l.trim()).length - 1; } catch {}
            datasets[name] = { present: true, source: 'csv', rows, size: st.size, mtime: st.mtimeMs };
          } else if (fs.existsSync(xlsxPath)) {
            const st = fs.statSync(xlsxPath);
            datasets[name] = { present: true, source: 'xlsx', size: st.size, mtime: st.mtimeMs };
          } else if (workbookExists && workbookSheets.some(s => s.toLowerCase() === name.toLowerCase() || s.toLowerCase().replace(/[\s&-]/g, '') === name.toLowerCase().replace(/[\s&-]/g, ''))) {
            datasets[name] = { present: true, source: 'workbook', sheet: workbookSheets.find(s => s.toLowerCase() === name.toLowerCase()) };
          } else {
            datasets[name] = { present: false };
          }
        }
        const mappingPresent = fs.existsSync(path.join(financeDir, 'mapping.json'));
        return jsonRes(res, 200, { configured: true, financeDir, datasets, mappingPresent, workbookSheets });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // Mapping GET/POST
    if (pathname === '/api/finance/mapping' && req.method === 'GET') {
      try {
        const clientWs = resolveClientWorkspace();
        if (!clientWs) return jsonRes(res, 200, { mapping: {} });
        const all = loadMapping(clientWs);
        const type = parsed.query.type;
        return jsonRes(res, 200, { mapping: type ? (all[type] || {}) : all });
      } catch (e) { return jsonRes(res, 500, { error: e.message }); }
    }

    if (pathname === '/api/finance/mapping' && req.method === 'POST') {
      try {
        const clientWs = resolveClientWorkspace();
        if (!clientWs) return jsonRes(res, 400, { error: 'No client workspace configured' });
        const body = await parseBody(req);
        const { type, mapping } = body || {};
        if (!type || !mapping || typeof mapping !== 'object') return jsonRes(res, 400, { error: 'type + mapping object required' });
        const financeDir = path.join(clientWs, 'finance');
        if (!fs.existsSync(financeDir)) fs.mkdirSync(financeDir, { recursive: true });
        const mapPath = path.join(financeDir, 'mapping.json');
        let all = {};
        if (fs.existsSync(mapPath)) { try { all = JSON.parse(fs.readFileSync(mapPath, 'utf8')); } catch {} }
        all[type] = mapping;
        fs.writeFileSync(mapPath, JSON.stringify(all, null, 2));
        return jsonRes(res, 200, { ok: true });
      } catch (e) { return jsonRes(res, 500, { error: e.message }); }
    }

    // Upload endpoint: accept .csv / .xlsx / mapping.json
    if (pathname === '/api/finance/upload' && req.method === 'POST') {
      try {
        const clientWs = resolveClientWorkspace();
        if (!clientWs) return jsonRes(res, 400, { error: 'No client workspace configured' });
        const financeDir = path.join(clientWs, 'finance');
        if (!fs.existsSync(financeDir)) fs.mkdirSync(financeDir, { recursive: true });

        const body = await parseBody(req);
        const { filename, contentBase64 } = body || {};
        if (!filename || !contentBase64) return jsonRes(res, 400, { error: 'filename + contentBase64 required' });
        const safe = String(filename).replace(/[^\w\-. ]/g, '_').slice(0, 100);
        if (!/\.(csv|xlsx|xls|json)$/i.test(safe)) return jsonRes(res, 400, { error: 'only .csv/.xlsx/.xls/.json allowed' });
        const target = path.join(financeDir, safe);
        const buf = Buffer.from(contentBase64, 'base64');
        if (buf.length > 20 * 1024 * 1024) return jsonRes(res, 400, { error: 'file too large (>20MB)' });
        fs.writeFileSync(target, buf);

        // Return sheet list if xlsx for mapping UI
        let sheets = null;
        if (/\.xlsx?$/i.test(safe)) {
          try { const XLSX = getXlsx(); if (XLSX) sheets = XLSX.readFile(target).SheetNames; } catch {}
        }
        return jsonRes(res, 200, { ok: true, saved: safe, size: buf.length, sheets });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    const financeMatch = pathname.match(/^\/api\/finance\/(pnl|revenue|costcenter|pipeline|cashflow)$/);
    if (financeMatch) {
      try {
        const type = financeMatch[1];
        const result = loadFinance(type, parsed.query || {});
        return jsonRes(res, 200, result);
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // MCP CATALOG
    // ════════════════════════════════
    if (pathname === '/api/mcp/catalog') {
      try {
        const catalog = JSON.parse(fs.readFileSync(MCP_CATALOG_PATH, 'utf8'));
        return jsonRes(res, 200, catalog);
      } catch (e) {
        return jsonRes(res, 500, { error: 'Catalog not found: ' + e.message });
      }
    }

    // ════════════════════════════════
    // MCP INSTALLED — parse claude config
    // ════════════════════════════════
    if (pathname === '/api/mcp/installed') {
      try {
        const installed = await listInstalledMcps();
        return jsonRes(res, 200, { installed });
      } catch (e) {
        return jsonRes(res, 200, { installed: [], error: e.message });
      }
    }

    // ════════════════════════════════
    // MCP INSTALL
    // ════════════════════════════════
    if (pathname === '/api/mcp/install' && req.method === 'POST') {
      if (!keytar) return jsonRes(res, 500, { error: 'keytar not available, run: npm install keytar' });
      const body = await parseBody(req);
      const { id, credentials } = body || {};
      if (!id || typeof id !== 'string') return jsonRes(res, 400, { error: 'id required' });
      try {
        const result = await installMcp(id, credentials || {});
        return jsonRes(res, 200, result);
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // MCP UNINSTALL
    // ════════════════════════════════
    if (pathname === '/api/mcp/uninstall' && req.method === 'POST') {
      const body = await parseBody(req);
      const { id } = body || {};
      if (!id || typeof id !== 'string') return jsonRes(res, 400, { error: 'id required' });
      try {
        const result = await uninstallMcp(id);
        return jsonRes(res, 200, result);
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // OBSIDIAN — tree / note / brain-dump
    // ════════════════════════════════
    if (pathname === '/api/obsidian/tree') {
      try {
        const root = resolveVaultPath();
        if (!fs.existsSync(root)) return jsonRes(res, 200, { vault: null, tree: [], error: 'Vault path not found: ' + root });
        const cfg = loadConfig();
        const tree = walkVaultTree(root, '', 0, 3);
        return jsonRes(res, 200, {
          vault: root,
          vaultName: cfg.obsidianVaultName || path.basename(root),
          inbox: cfg.obsidianInboxFolder || '00 — Inbox',
          tree,
        });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    if (pathname === '/api/obsidian/note') {
      try {
        const rel = parsed.query.path || '';
        if (!rel || typeof rel !== 'string') return jsonRes(res, 400, { error: 'path required' });
        const abs = safeVaultJoin(rel);
        if (!abs.endsWith('.md')) return jsonRes(res, 400, { error: 'Only .md files supported' });
        if (!fs.existsSync(abs)) return jsonRes(res, 404, { error: 'Not found' });
        const st = fs.statSync(abs);
        if (st.size > 2 * 1024 * 1024) return jsonRes(res, 413, { error: 'File too large (>2MB)' });
        const content = fs.readFileSync(abs, 'utf8');
        const cfg = loadConfig();
        return jsonRes(res, 200, {
          path: rel,
          content,
          mtime: st.mtimeMs,
          size: st.size,
          vaultName: cfg.obsidianVaultName || path.basename(resolveVaultPath()),
        });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    if (pathname === '/api/obsidian/graph') {
      try {
        const graph = buildVaultGraph();
        return jsonRes(res, 200, graph);
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    if (pathname === '/api/obsidian/brain-dump' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const { content, title, tags } = body || {};
        if (!content || typeof content !== 'string' || content.length < 2) {
          return jsonRes(res, 400, { error: 'content required (min 2 chars)' });
        }
        if (content.length > 200000) return jsonRes(res, 400, { error: 'content too long (max 200KB)' });
        const cfg = loadConfig();
        const inboxFolder = cfg.obsidianInboxFolder || '00 — Inbox';
        const inboxAbs = safeVaultJoin(inboxFolder);
        if (!fs.existsSync(inboxAbs)) fs.mkdirSync(inboxAbs, { recursive: true });
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        const slug = slugify(title || content.split('\n')[0]);
        const filename = `${ts}-${slug}.md`;
        const filepath = path.join(inboxAbs, filename);
        const tagList = Array.isArray(tags) ? tags.filter(t => typeof t === 'string' && /^[\w\-/]+$/.test(t)).slice(0, 10) : [];
        const frontmatter = [
          '---',
          `created: ${now.toISOString()}`,
          `source: 187n-mission-control`,
          tagList.length ? `tags: [${tagList.join(', ')}]` : null,
          title ? `title: "${title.replace(/"/g, '\\"').slice(0, 200)}"` : null,
          '---',
          '',
        ].filter(Boolean).join('\n');
        fs.writeFileSync(filepath, frontmatter + '\n' + content + '\n', 'utf8');
        const relPath = path.join(inboxFolder, filename);
        return jsonRes(res, 200, { ok: true, path: relPath, filename });
      } catch (e) {
        return jsonRes(res, 500, { error: e.message });
      }
    }

    // ════════════════════════════════
    // MCP TEST CONNECTION
    // ════════════════════════════════
    if (pathname === '/api/mcp/test' && req.method === 'POST') {
      const body = await parseBody(req);
      const { id } = body || {};
      if (!id || typeof id !== 'string') return jsonRes(res, 400, { error: 'id required' });
      try {
        const result = await testMcp(id);
        return jsonRes(res, 200, result);
      } catch (e) {
        return jsonRes(res, 500, { ok: false, error: e.message });
      }
    }

    // ════════════════════════════════
    // CONFIG GET/SET
    // ════════════════════════════════
    if (pathname === '/api/config') {
      if (req.method === 'POST') {
        const body = await parseBody(req);
        try {
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2));
          return jsonRes(res, 200, { ok: true });
        } catch (e) {
          return jsonRes(res, 500, { error: e.message });
        }
      }
      return jsonRes(res, 200, loadConfig());
    }

    // ════════════════════════════════
    // STOP AGENT
    // ════════════════════════════════
    if (pathname === '/stop' && req.method === 'POST') {
      if (activeProcess) {
        killProcess(activeProcess);
        activeProcess = null;
      }
      return jsonRes(res, 200, { ok: true });
    }

    // ════════════════════════════════
    // SSE STREAM — Run claude command
    // ════════════════════════════════
    if (pathname === '/run-stream') {
      const cmd = parsed.query.cmd;
      if (!isValidCommand(cmd)) {
        return jsonRes(res, 400, { error: 'Invalid command' });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      if (activeProcess) {
        killProcess(activeProcess);
        activeProcess = null;
      }

      console.log(`[MC] Stream: ${cmd}`);
      logActivity('run_stream', { command: cmd.slice(0, 200) });

      const cleanEnv = { ...process.env, FORCE_COLOR: '0' };
      delete cleanEnv.CLAUDECODE;
      delete cleanEnv.CLAUDE_CODE;

      const proc = spawn('claude', [
        '-p', '--verbose',
        '--output-format', 'stream-json',
        '--permission-mode', 'bypassPermissions',
        cmd
      ], {
        cwd: os.homedir(),
        env: cleanEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      activeProcess = proc;
      childProcesses.add(proc);

      let buffer = '';
      let responseEnded = false;
      let sawDelta = false; // becomes true when content_block_delta arrives; reset after each assistant event

      function safeWrite(data) {
        if (responseEnded) return;
        try {
          res.write(data);
        } catch {
          responseEnded = true;
          killProcess(proc);
        }
      }

      proc.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach(line => {
          const trimmed = line.replace(/\r/g, '').trim();
          if (!trimmed) return;
          try {
            const event = JSON.parse(trimmed);

            // Track whether content_block_delta streamed text for this message
            // so we don't re-emit it from the assistant event (which would duplicate).
            if (event.type === 'content_block_delta' && event.delta?.text) {
              safeWrite(`data: ${JSON.stringify({ type: 'output', text: event.delta.text })}\n\n`);
              sawDelta = true;
            }
            else if (event.type === 'assistant' && event.message?.content) {
              event.message.content.forEach(block => {
                if (block.type === 'text' && block.text && !sawDelta) {
                  // Only emit final text if no delta was streamed (e.g. non-streaming mode).
                  safeWrite(`data: ${JSON.stringify({ type: 'output', text: block.text + '\n' })}\n\n`);
                } else if (block.type === 'tool_use') {
                  const name = block.name || 'unknown';
                  let info = `\n> ${name}`;
                  if (block.input?.command) info += `: ${block.input.command}`;
                  else if (block.input?.file_path) info += `: ${block.input.file_path}`;
                  else if (block.input?.skill) info += `: ${block.input.skill}`;
                  safeWrite(`data: ${JSON.stringify({ type: 'output', text: info + '\n' })}\n\n`);
                }
              });
              // Reset for the next assistant turn
              sawDelta = false;
            }
            else if (event.type === 'result' && event.session_id) {
              lastSessionId = event.session_id;
              safeWrite(`data: ${JSON.stringify({ type: 'session', sessionId: event.session_id })}\n\n`);
            }

            if (event.session_id && !lastSessionId) {
              lastSessionId = event.session_id;
            }
          } catch {
            if (trimmed && !trimmed.startsWith('\u001b')) {
              safeWrite(`data: ${JSON.stringify({ type: 'output', text: trimmed })}\n\n`);
            }
          }
        });
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text && !text.includes('Warning')) {
          safeWrite(`data: ${JSON.stringify({ type: 'error', text })}\n\n`);
        }
      });

      proc.on('error', (err) => {
        console.error(`[MC] Process error: ${err.message}`);
        safeWrite(`data: ${JSON.stringify({ type: 'error', text: `Process error: ${err.message}` })}\n\n`);
        safeWrite(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        if (!responseEnded) {
          responseEnded = true;
          res.end();
        }
        childProcesses.delete(proc);
        if (activeProcess === proc) activeProcess = null;
      });

      proc.on('close', () => {
        childProcesses.delete(proc);
        if (!responseEnded) {
          safeWrite(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          responseEnded = true;
          res.end();
        }
        if (activeProcess === proc) activeProcess = null;
      });

      req.on('close', () => {
        responseEnded = true;
        killProcess(proc);
        childProcesses.delete(proc);
        if (activeProcess === proc) activeProcess = null;
      });

      return;
    }

    // ════════════════════════════════
    // REPLY STREAM — Resume session
    // ════════════════════════════════
    if (pathname === '/reply-stream') {
      const msg = parsed.query.msg;
      const session = parsed.query.session || lastSessionId;

      if (!msg) return jsonRes(res, 400, { error: 'msg required' });
      if (!session) return jsonRes(res, 400, { error: 'No session to resume' });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const cleanEnv = { ...process.env, FORCE_COLOR: '0' };
      delete cleanEnv.CLAUDECODE;
      delete cleanEnv.CLAUDE_CODE;

      const proc = spawn('claude', [
        '-p', '--verbose',
        '--output-format', 'stream-json',
        '--permission-mode', 'bypassPermissions',
        '--resume', session,
        msg
      ], {
        cwd: os.homedir(),
        env: cleanEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      activeProcess = proc;
      childProcesses.add(proc);

      let buffer = '';
      let responseEnded = false;

      function safeWrite(data) {
        if (responseEnded) return;
        try {
          res.write(data);
        } catch {
          responseEnded = true;
          killProcess(proc);
        }
      }

      proc.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(line => {
          const trimmed = line.replace(/\r/g, '').trim();
          if (!trimmed) return;
          try {
            const event = JSON.parse(trimmed);
            if (event.type === 'content_block_delta' && event.delta?.text) {
              safeWrite(`data: ${JSON.stringify({ type: 'output', text: event.delta.text })}\n\n`);
            }
          } catch { /* skip unparseable lines */ }
        });
      });

      proc.on('error', (err) => {
        console.error(`[MC] Reply process error: ${err.message}`);
        safeWrite(`data: ${JSON.stringify({ type: 'error', text: `Process error: ${err.message}` })}\n\n`);
        if (!responseEnded) {
          responseEnded = true;
          safeWrite(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
        }
        childProcesses.delete(proc);
        if (activeProcess === proc) activeProcess = null;
      });

      proc.on('close', () => {
        childProcesses.delete(proc);
        if (!responseEnded) {
          safeWrite(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          responseEnded = true;
          res.end();
        }
        if (activeProcess === proc) activeProcess = null;
      });

      req.on('close', () => {
        responseEnded = true;
        killProcess(proc);
        childProcesses.delete(proc);
        if (activeProcess === proc) activeProcess = null;
      });

      return;
    }

    // ════════════════════════════════
    // STATIC FILES — with path traversal protection
    // ════════════════════════════════
    let filePath = pathname === '/' ? '/index.html' : pathname;

    // Block null bytes and .. traversal
    if (filePath.includes('\0') || filePath.includes('..')) {
      return jsonRes(res, 403, { error: 'Forbidden' });
    }

    const fullPath = path.join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(__dirname + path.sep) && fullPath !== __dirname) {
      return jsonRes(res, 403, { error: 'Forbidden' });
    }

    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        return jsonRes(res, 403, { error: 'Forbidden' });
      }
      const content = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }

  } catch (e) {
    // Global catch — never crash the server
    console.error(`[MC] Unhandled error: ${e.message}`);
    try {
      if (!res.headersSent) {
        jsonRes(res, 500, { error: 'Internal server error' });
      }
    } catch { /* response already gone */ }
  }
});

// ── Helpers ──

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { businessName: '187N', modules: {}, integrations: {} };
  }
}

/**
 * Kill a child process safely — SIGTERM, then SIGKILL after 3s
 */
function killProcess(proc) {
  if (!proc || proc.killed) return;
  try {
    proc.kill('SIGTERM');
  } catch { /* already dead */ }
  // Force kill after 3 seconds if still alive
  const forceKillTimer = setTimeout(() => {
    try {
      if (!proc.killed) proc.kill('SIGKILL');
    } catch { /* already dead */ }
  }, 3000);
  forceKillTimer.unref(); // Don't keep the event loop alive for this
}

/**
 * Get accurate memory stats. On macOS, os.freemem() returns a misleadingly
 * low number because it doesn't count cached/purgeable memory as free.
 * Use vm_stat to get the real picture.
 */
function getMemoryStats() {
  const totalMem = os.totalmem();

  if (os.platform() === 'darwin') {
    try {
      const vmstat = execSync('vm_stat', { encoding: 'utf8', timeout: 3000 });
      // Parse page size (default 16384 on Apple Silicon, 4096 on Intel)
      const pageSizeMatch = vmstat.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 16384;

      // Parse page counts
      const free = parseInt((vmstat.match(/Pages free:\s+(\d+)/) || [])[1] || '0');
      const inactive = parseInt((vmstat.match(/Pages inactive:\s+(\d+)/) || [])[1] || '0');
      const purgeable = parseInt((vmstat.match(/Pages purgeable:\s+(\d+)/) || [])[1] || '0');
      const speculative = parseInt((vmstat.match(/Pages speculative:\s+(\d+)/) || [])[1] || '0');

      // Available = free + inactive + purgeable + speculative
      const availableBytes = (free + inactive + purgeable + speculative) * pageSize;
      const usedMem = totalMem - availableBytes;
      const memPct = Math.max(0, Math.min(100, Math.round((usedMem / totalMem) * 100)));

      return { usedMem: Math.max(0, usedMem), totalMem, memPct };
    } catch {
      // Fallback to os.freemem if vm_stat fails
    }
  }

  // Linux / fallback
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = Math.round((usedMem / totalMem) * 100);
  return { usedMem, totalMem, memPct };
}

function getSystemStats() {
  const cpus = os.cpus();
  const { usedMem, totalMem, memPct } = getMemoryStats();

  // CPU usage
  let cpuPct = 0;
  try {
    const load = os.loadavg()[0]; // 1min avg
    cpuPct = Math.min(100, Math.round((load / cpus.length) * 100));
  } catch {}

  // Disk
  let diskPct = 0, diskUsed = '—', diskFree = '—', diskTotal = '—';
  try {
    const df = execSync('df -h / | tail -1', { encoding: 'utf8', timeout: 3000 }).trim().split(/\s+/);
    diskTotal = df[1];
    diskUsed = df[2];
    diskFree = df[3];
    diskPct = parseInt(df[4]) || 0;
  } catch {}

  // Uptime
  const uptimeSecs = os.uptime();
  const uptime = formatUptime(uptimeSecs);

  // Hostname
  let hostname = os.hostname();

  // OS Version
  let osVersion = '';
  try {
    osVersion = execSync('sw_vers -productVersion 2>/dev/null || uname -r', { encoding: 'utf8', timeout: 3000 }).trim();
  } catch {
    osVersion = os.release();
  }

  // Processes
  let processes = 0;
  try {
    processes = parseInt(execSync('ps aux | wc -l', { encoding: 'utf8', timeout: 3000 }).trim()) || 0;
  } catch {}

  return {
    cpu: cpuPct,
    memory: memPct,
    disk: diskPct,
    hostname,
    platform: `${os.platform()} ${os.arch()}`,
    osVersion: `macOS ${osVersion}`,
    uptime,
    processes,
    memUsed: formatBytes(usedMem),
    memTotal: formatBytes(totalMem),
    diskUsed,
    diskFree,
    diskTotal,
  };
}

function listSkills() {
  // If a client workspace is configured, ONLY show that client's skills.
  // Otherwise fall back to the global Claude Code skills (LIO OS style).
  const clientWs = resolveClientWorkspace();
  const skillDirs = clientWs
    ? [path.join(clientWs, 'skills')]
    : [
        path.join(os.homedir(), '.claude', 'commands'),
        path.join(os.homedir(), '.claude', 'skills'),
      ];

  const skills = [];
  const seen = new Set();

  skillDirs.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir, { recursive: true });
      files.forEach(f => {
        try {
          if (typeof f !== 'string') return;
          if (!f.endsWith('.md')) return;

          const fullFilePath = path.join(dir, f);

          // Skip symlinks that point to non-existent targets
          try {
            const stat = fs.lstatSync(fullFilePath);
            if (stat.isSymbolicLink()) {
              // Verify symlink target exists
              fs.statSync(fullFilePath); // throws if broken
            }
          } catch {
            return; // skip broken symlinks or inaccessible files
          }

          const name = f.replace(/\.md$/, '').replace(/\//g, ':');
          if (seen.has(name)) return;
          seen.add(name);

          // Try to read first line for description
          let description = '';
          try {
            const content = fs.readFileSync(fullFilePath, 'utf8');
            const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
            description = firstLine ? firstLine.trim().slice(0, 100) : '';
          } catch {
            // Permission denied or other read error — still list the skill
          }

          skills.push({ name, description, category: name.includes(':') ? name.split(':')[0] : 'general' });
        } catch {
          // Skip individual file errors — don't break the entire listing
        }
      });
    } catch {
      // Skip entire directory if inaccessible
    }
  });

  return skills;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes) {
  if (bytes < 0) bytes = 0;
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

// ── Graceful shutdown ──

function gracefulShutdown(signal) {
  console.log(`\n[MC] ${signal} received — shutting down gracefully...`);

  // Kill all child processes
  for (const proc of childProcesses) {
    killProcess(proc);
  }
  childProcesses.clear();
  activeProcess = null;

  // Close the HTTP server (stop accepting new connections)
  server.close(() => {
    console.log('[MC] Server closed.');
    process.exit(0);
  });

  // Force exit after 5 seconds if server.close hangs
  const forceExit = setTimeout(() => {
    console.error('[MC] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
  forceExit.unref();
}

// ════════════════════════════════════════════════════════════
// Obsidian vault integration — file-system based
// ════════════════════════════════════════════════════════════

function resolveVaultPath() {
  const cfg = loadConfig();
  let v = cfg.obsidianVaultPath || '~/obsidian';
  if (v.startsWith('~')) v = path.join(os.homedir(), v.slice(1));
  return path.resolve(v);
}

/**
 * Return absolute path to client workspace if configured in client-config.json,
 * otherwise null. Used to scope Skills/Agents/Routines/MCPs/IntakeDocs to a
 * specific client-build folder (e.g. ~/projects/dev-workspace/clients/paw-parent).
 */
function resolveClientWorkspace() {
  const cfg = loadConfig();
  let p = cfg.clientWorkspacePath;
  if (!p || typeof p !== 'string') return null;
  if (p.startsWith('~')) p = path.join(os.homedir(), p.slice(1));
  const abs = path.resolve(p);
  return fs.existsSync(abs) ? abs : null;
}

// ════════════════════════════════════════════════════════════
// Finance CSV/XLSX loader + per-dashboard aggregations
// ════════════════════════════════════════════════════════════

// Lazy-load xlsx so bridge keeps working zonder de dep
let xlsxLib = null;
function getXlsx() {
  if (xlsxLib) return xlsxLib;
  try { xlsxLib = require('xlsx'); } catch { xlsxLib = false; }
  return xlsxLib;
}

// CSV parser met support voor quoted cells (eenvoudige RFC4180 subset)
function parseCsv(text) {
  const rows = [];
  let cur = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (cell !== '' || cur.length > 0) { cur.push(cell); rows.push(cur); cur = []; cell = ''; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else cell += c;
    }
  }
  if (cell !== '' || cur.length > 0) { cur.push(cell); rows.push(cur); }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map(h => String(h).trim());
  const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== '')).map(r => {
    const row = {};
    headers.forEach((h, idx) => {
      const raw = String(r[idx] || '').trim();
      const n = Number(raw.replace(/[,$€\s]/g, ''));
      row[h] = raw !== '' && !isNaN(n) && /^-?[\d.,$€\s]+%?$/.test(raw) ? n : raw;
    });
    return row;
  });
  return { headers, rows: dataRows };
}

// Load xlsx sheet → { headers, rows } (same shape as parseCsv result)
function loadXlsxSheet(filePath, sheetNameOrIndex) {
  const XLSX = getXlsx();
  if (!XLSX) throw new Error('xlsx package not available. Run npm install in mission-control/');
  const wb = XLSX.readFile(filePath, { cellDates: false });
  let sheetName;
  if (typeof sheetNameOrIndex === 'number') {
    sheetName = wb.SheetNames[sheetNameOrIndex];
  } else {
    sheetName = wb.SheetNames.find(n => n.toLowerCase() === String(sheetNameOrIndex).toLowerCase());
  }
  if (!sheetName) return { headers: [], rows: [], sheets: wb.SheetNames };
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: '' });
  const headers = json.length ? Object.keys(json[0]) : [];
  return { headers, rows: json, sheets: wb.SheetNames, sheetUsed: sheetName };
}

// Apply optional column mapping (mapping.json) — rename keys op elke row
// mapping.json format:
// {
//   "pnl": { "Omzet": "revenue", "Brutowinst": "gross_profit", ... },
//   "cashflow": { "Kassaldo": "cash_balance" }
// }
function loadMapping(workspace) {
  const p = path.join(workspace, 'finance', 'mapping.json');
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function applyMapping(rows, mapping) {
  if (!mapping || !Object.keys(mapping).length) return rows;
  return rows.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      const target = mapping[k] || mapping[k.toLowerCase()] || mapping[k.trim()] || k;
      out[target] = v;
    }
    return out;
  });
}

// Pick the right data source voor een dashboard type uit de finance folder:
// 1. type.csv → parse
// 2. type.xlsx → load sheet named type (or first sheet)
// 3. finance.xlsx (single workbook with multiple sheets) → pick sheet by type name
// Returns { headers, rows, source: 'csv'|'xlsx'|'workbook' } or null
function loadFinanceSource(workspace, type) {
  const dir = path.join(workspace, 'finance');
  if (!fs.existsSync(dir)) return null;
  const csv = path.join(dir, type + '.csv');
  if (fs.existsSync(csv)) {
    const text = fs.readFileSync(csv, 'utf8');
    if (text.length > 10 * 1024 * 1024) throw new Error('CSV too large (>10MB)');
    return { ...parseCsv(text), source: 'csv', file: type + '.csv' };
  }
  const xlsx = path.join(dir, type + '.xlsx');
  if (fs.existsSync(xlsx)) {
    const r = loadXlsxSheet(xlsx, 0);
    return { ...r, source: 'xlsx', file: type + '.xlsx' };
  }
  // Single workbook containing all sheets
  const workbook = path.join(dir, 'finance.xlsx');
  if (fs.existsSync(workbook)) {
    // Try sheet names: type, Type, TYPE, human-friendly
    const XLSX = getXlsx();
    if (!XLSX) return null;
    const wb = XLSX.readFile(workbook);
    const candidates = [type, type.toUpperCase(), type.charAt(0).toUpperCase() + type.slice(1), type.replace('center', ' center'), 'P&L', 'PnL'];
    let sheetName = wb.SheetNames.find(n => candidates.some(c => n.toLowerCase() === c.toLowerCase()));
    if (!sheetName) return null;
    const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { raw: true, defval: '' });
    const headers = json.length ? Object.keys(json[0]) : [];
    return { headers, rows: json, source: 'workbook', file: 'finance.xlsx', sheetUsed: sheetName };
  }
  return null;
}

function applyFilters(rows, query, fields) {
  return rows.filter(r => {
    for (const f of fields) {
      if (query[f] && String(r[f]) !== String(query[f])) return false;
    }
    return true;
  });
}

function sum(arr, key) { return arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0); }
function uniq(arr, key) { return Array.from(new Set(arr.map(r => r[key]).filter(Boolean))).sort(); }
function round(n, d = 2) { const f = Math.pow(10, d); return Math.round(n * f) / f; }

function loadFinance(type, query) {
  const clientWs = resolveClientWorkspace();
  if (!clientWs) return { configured: false, data: [], kpis: {}, warnings: [] };

  const src = loadFinanceSource(clientWs, type);
  if (!src) return { configured: true, present: false, data: [], kpis: {}, warnings: [] };

  // Optional column mapping per dashboard type
  const allMappings = loadMapping(clientWs);
  const mapping = allMappings[type] || {};
  const mappedRows = applyMapping(src.rows, mapping);
  // Re-cast numerics (xlsx keeps numbers native; csv parseCsv already cast)
  const rows = mappedRows.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'number' || v === null) { out[k] = v; continue; }
      const s = String(v).trim();
      const n = Number(s.replace(/[,$€\s]/g, ''));
      out[k] = s !== '' && !isNaN(n) && /^-?[\d.,$€\s]+%?$/.test(s) ? n : s;
    }
    return out;
  });

  let result;
  if (type === 'pnl') result = aggregatePnl(rows, query);
  else if (type === 'revenue') result = aggregateRevenue(rows, query);
  else if (type === 'costcenter') result = aggregateCostCenter(rows, query);
  else if (type === 'pipeline') result = aggregatePipeline(rows, query);
  else if (type === 'cashflow') result = aggregateCashflow(rows, query);
  else throw new Error('Unknown finance type: ' + type);

  return {
    configured: true,
    present: true,
    headers: rows.length ? Object.keys(rows[0]) : [],
    source: src.source,
    file: src.file,
    sheetUsed: src.sheetUsed,
    mappingApplied: Object.keys(mapping).length > 0,
    ...result,
    schema_version: 1,
  };
}

// ── P&L ──
function aggregatePnl(allRows, q) {
  const filtered = applyFilters(allRows, q, ['date', 'region', 'product']);
  const revenue = sum(filtered, 'revenue');
  const cogs = sum(filtered, 'cogs');
  const grossProfit = sum(filtered, 'gross_profit');
  const opex = sum(filtered, 'total_opex');
  const ebitda = sum(filtered, 'ebitda');
  const opexByCat = {
    marketing: sum(filtered, 'marketing'),
    payroll: sum(filtered, 'payroll'),
    technology: sum(filtered, 'technology'),
    logistics: sum(filtered, 'logistics'),
    admin: sum(filtered, 'admin'),
  };
  // Trend per month
  const byMonth = {};
  for (const r of filtered) {
    const m = r.date;
    if (!byMonth[m]) byMonth[m] = { date: m, revenue: 0, gross_profit: 0, ebitda: 0 };
    byMonth[m].revenue += Number(r.revenue) || 0;
    byMonth[m].gross_profit += Number(r.gross_profit) || 0;
    byMonth[m].ebitda += Number(r.ebitda) || 0;
  }
  const trend = Object.values(byMonth).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  // Product profitability
  const byProduct = {};
  for (const r of filtered) {
    const p = r.product;
    if (!byProduct[p]) byProduct[p] = { product: p, revenue: 0, gross_profit: 0, ebitda: 0 };
    byProduct[p].revenue += Number(r.revenue) || 0;
    byProduct[p].gross_profit += Number(r.gross_profit) || 0;
    byProduct[p].ebitda += Number(r.ebitda) || 0;
  }
  const products = Object.values(byProduct).map(p => ({
    ...p,
    gross_margin: p.revenue ? round((p.gross_profit / p.revenue) * 100) : 0,
  }));
  // Warnings: revenue - cogs == gross_profit
  const warnings = [];
  const gpCheck = revenue - cogs;
  if (Math.abs(gpCheck - grossProfit) > Math.max(1, revenue * 0.005)) {
    warnings.push(`Gross profit mismatch: ${round(gpCheck)} vs ${round(grossProfit)}`);
  }
  const opexSumCat = Object.values(opexByCat).reduce((a, b) => a + b, 0);
  if (Math.abs(opexSumCat - opex) > Math.max(1, opex * 0.005)) {
    warnings.push(`OPEX categories off: ${round(opexSumCat)} vs total_opex ${round(opex)}`);
  }
  return {
    kpis: {
      revenue: round(revenue),
      cogs: round(cogs),
      gross_profit: round(grossProfit),
      gross_margin: revenue ? round((grossProfit / revenue) * 100) : 0,
      total_opex: round(opex),
      ebitda: round(ebitda),
      ebitda_margin: revenue ? round((ebitda / revenue) * 100) : 0,
    },
    opexByCat,
    trend,
    products,
    filters: {
      months: uniq(allRows, 'date'),
      regions: uniq(allRows, 'region'),
      products: uniq(allRows, 'product'),
    },
    warnings,
  };
}

// ── Revenue YoY decomposition ──
function aggregateRevenue(allRows, q) {
  const filtered = applyFilters(allRows, q, ['month', 'region', 'product', 'channel']);
  const rev24 = sum(filtered, 'revenue_2024');
  const rev25 = sum(filtered, 'revenue_2025');
  const units24 = sum(filtered, 'units_2024');
  const units25 = sum(filtered, 'units_2025');
  // Decomposition: volume = Σ (units25 - units24) * aov24; price = Σ units25 * (aov25 - aov24)
  let volumeEffect = 0, priceEffect = 0;
  for (const r of filtered) {
    const u24 = Number(r.units_2024) || 0;
    const u25 = Number(r.units_2025) || 0;
    const a24 = Number(r.aov_2024) || 0;
    const a25 = Number(r.aov_2025) || 0;
    volumeEffect += (u25 - u24) * a24;
    priceEffect += u25 * (a25 - a24);
  }
  const totalChange = rev25 - rev24;
  const residual = totalChange - volumeEffect - priceEffect;
  // Trend per month
  const byMonth = {};
  for (const r of filtered) {
    const m = r.month;
    if (!byMonth[m]) byMonth[m] = { month: m, revenue_2024: 0, revenue_2025: 0 };
    byMonth[m].revenue_2024 += Number(r.revenue_2024) || 0;
    byMonth[m].revenue_2025 += Number(r.revenue_2025) || 0;
  }
  const trend = Object.values(byMonth).sort((a, b) => String(a.month).localeCompare(String(b.month)));
  // By product/region/channel
  const byProduct = groupSum(filtered, 'product', ['revenue_2024', 'revenue_2025', 'units_2024', 'units_2025']);
  const byRegion = groupSum(filtered, 'region', ['revenue_2024', 'revenue_2025']);
  const byChannel = groupSum(filtered, 'channel', ['revenue_2024', 'revenue_2025']);

  const warnings = [];
  // revenue == units * aov per row
  let rowMismatches = 0;
  for (const r of filtered) {
    const expected25 = (Number(r.units_2025) || 0) * (Number(r.aov_2025) || 0);
    if (Math.abs(expected25 - (Number(r.revenue_2025) || 0)) > 1) rowMismatches++;
  }
  if (rowMismatches > 0) warnings.push(`${rowMismatches} rows: revenue_2025 ≠ units × aov`);

  return {
    kpis: {
      revenue_2024: round(rev24),
      revenue_2025: round(rev25),
      yoy_change: round(totalChange),
      yoy_pct: rev24 ? round((totalChange / rev24) * 100) : 0,
      units_2024: units24,
      units_2025: units25,
      avg_aov_2025: units25 ? round(rev25 / units25) : 0,
    },
    decomposition: {
      volume_effect: round(volumeEffect),
      price_effect: round(priceEffect),
      residual: round(residual),
      total: round(totalChange),
    },
    trend,
    byProduct,
    byRegion,
    byChannel,
    filters: {
      months: uniq(allRows, 'month'),
      regions: uniq(allRows, 'region'),
      products: uniq(allRows, 'product'),
      channels: uniq(allRows, 'channel'),
    },
    warnings,
  };
}

// ── Cost Center ──
function aggregateCostCenter(allRows, q) {
  const filtered = applyFilters(allRows, q, ['month', 'department', 'category']);
  const cost24 = sum(filtered, 'cost_2024');
  const cost25 = sum(filtered, 'cost_2025');
  const budget25 = sum(filtered, 'budget_2025');
  const variance = cost25 - cost24;
  const budgetVariance = cost25 - budget25;

  const byDept = groupSum(filtered, 'department', ['cost_2024', 'cost_2025', 'budget_2025']);
  byDept.forEach(d => { d.variance = round(d.cost_2025 - d.cost_2024); d.budget_variance = round(d.cost_2025 - d.budget_2025); });

  const byCategory = groupSum(filtered, 'category', ['cost_2024', 'cost_2025', 'budget_2025']);
  byCategory.forEach(c => { c.variance = round(c.cost_2025 - c.cost_2024); });

  // Drill-down rows with key fields
  const drill = filtered.map(r => ({
    month: r.month, department: r.department, category: r.category,
    gl_account: r.gl_account, gl_description: r.gl_description,
    cost_2024: r.cost_2024, cost_2025: r.cost_2025, budget_2025: r.budget_2025,
    variance: round((Number(r.cost_2025) || 0) - (Number(r.cost_2024) || 0)),
  }));

  return {
    kpis: {
      cost_2024: round(cost24),
      cost_2025: round(cost25),
      variance: round(variance),
      variance_pct: cost24 ? round((variance / cost24) * 100) : 0,
      budget_2025: round(budget25),
      budget_variance: round(budgetVariance),
    },
    byDept,
    byCategory,
    drill,
    filters: {
      months: uniq(allRows, 'month'),
      departments: uniq(allRows, 'department'),
      categories: uniq(allRows, 'category'),
    },
    warnings: [],
  };
}

// ── Sales Pipeline ──
function aggregatePipeline(allRows, q) {
  const filtered = applyFilters(allRows, q, ['month', 'region', 'rep']);
  const probs = {
    mql: Number(q.p_mql) || 0.05,
    sql: Number(q.p_sql) || 0.20,
    opportunity: Number(q.p_opp) || 0.50,
    negotiation: Number(q.p_neg) || 0.70,
    closed_won: 1.0,
  };
  const stageOrder = ['mql', 'sql', 'opportunity', 'negotiation', 'closed_won'];

  const byStage = {};
  stageOrder.forEach(s => { byStage[s] = { stage: s, deal_count: 0, total_value: 0, probability: probs[s] }; });
  for (const r of filtered) {
    const s = r.stage;
    if (!byStage[s]) continue;
    byStage[s].deal_count += Number(r.deal_count) || 0;
    byStage[s].total_value += Number(r.total_value) || 0;
  }
  const stages = stageOrder.map(s => ({
    ...byStage[s],
    weighted_value: round(byStage[s].total_value * byStage[s].probability),
  }));

  const totalPipeline = sum(filtered, 'total_value');
  const forecastedRevenue = stages.reduce((acc, s) => acc + s.weighted_value, 0);

  // Conversion rates (from counts per stage)
  const conv = {};
  for (let i = 0; i < stageOrder.length - 1; i++) {
    const from = byStage[stageOrder[i]].deal_count;
    const to = byStage[stageOrder[i + 1]].deal_count;
    conv[`${stageOrder[i]}_to_${stageOrder[i + 1]}`] = from ? round((to / from) * 100) : 0;
  }
  const winRate = byStage.opportunity.deal_count
    ? round((byStage.closed_won.deal_count / byStage.opportunity.deal_count) * 100) : 0;

  // Per rep
  const byRep = {};
  for (const r of filtered) {
    const rep = r.rep;
    if (!byRep[rep]) byRep[rep] = { rep, total_value: 0, deal_count: 0, stages: {} };
    byRep[rep].total_value += Number(r.total_value) || 0;
    byRep[rep].deal_count += Number(r.deal_count) || 0;
    byRep[rep].stages[r.stage] = (byRep[rep].stages[r.stage] || 0) + (Number(r.total_value) || 0);
  }
  const reps = Object.values(byRep).map(r => ({
    ...r,
    win_rate: r.stages.opportunity && r.stages.closed_won !== undefined
      ? round(((r.stages.closed_won || 0) / r.stages.opportunity) * 100)
      : 0,
  })).sort((a, b) => b.total_value - a.total_value);

  return {
    kpis: {
      total_pipeline: round(totalPipeline),
      forecasted_revenue: round(forecastedRevenue),
      active_deals: sum(filtered, 'deal_count'),
      win_rate_pct: winRate,
    },
    stages,
    conversion: conv,
    reps,
    probabilities: probs,
    filters: {
      months: uniq(allRows, 'month'),
      regions: uniq(allRows, 'region'),
      reps: uniq(allRows, 'rep'),
    },
    warnings: [],
  };
}

// ── Cashflow ──
function aggregateCashflow(allRows, q) {
  const filtered = applyFilters(allRows, q, ['month']);
  const opCf = sum(filtered, 'operating_cf');
  const invCf = sum(filtered, 'investing_cf');
  const finCf = sum(filtered, 'financing_cf');
  const freeCf = sum(filtered, 'free_cf');
  const endCash = filtered.length
    ? Number(filtered[filtered.length - 1].cash_balance) || 0
    : 0;
  const avgMonthlyFcf = filtered.length ? freeCf / filtered.length : 0;

  // AR aging (latest month)
  const latest = filtered.length ? filtered[filtered.length - 1] : {};
  const ar030 = Number(latest.ar_0_30) || 0;
  const ar3060 = Number(latest.ar_30_60) || 0;
  const ar6090 = Number(latest.ar_60_90) || 0;
  const ar90 = Number(latest.ar_90_plus) || 0;
  const arTotal = ar030 + ar3060 + ar6090 + ar90;
  const apTotal = Number(latest.ap_total) || 0;
  const inventory = Number(latest.inventory) || 0;
  const workingCapital = arTotal - apTotal;

  // 6-month forecast (extrapolate linear trend)
  const avgOp = filtered.length ? opCf / filtered.length : 0;
  const forecast = [];
  let cash = endCash;
  const growth = Number(q.revenue_growth) || 0; // multiplier (0 = none)
  const delayPct = Number(q.payment_delay) || 0; // 0-1
  const costIncrease = Number(q.cost_increase) || 0;
  for (let i = 1; i <= 6; i++) {
    const projected = avgOp * (1 + growth - costIncrease) - (arTotal * delayPct / 6);
    cash += projected;
    forecast.push({ month: 'M+' + i, projected_op_cf: round(projected), projected_cash: round(cash) });
  }

  // Runway
  let runway = 'healthy';
  let runwayMonths = null;
  if (avgMonthlyFcf < 0) {
    runwayMonths = Math.max(0, Math.floor(endCash / Math.abs(avgMonthlyFcf)));
    runway = runwayMonths <= 6 ? 'critical' : 'warning';
  }

  // Warnings
  const warnings = [];
  if (Math.abs((ar030 + ar3060 + ar6090 + ar90) - arTotal) / (arTotal || 1) > 0.005) {
    warnings.push('AR aging buckets off from total AR by >0.5%');
  }

  return {
    kpis: {
      cash_balance: round(endCash),
      operating_cf: round(opCf),
      investing_cf: round(invCf),
      financing_cf: round(finCf),
      free_cf: round(freeCf),
      avg_monthly_fcf: round(avgMonthlyFcf),
      runway,
      runway_months: runwayMonths,
    },
    aging: {
      ar_0_30: ar030, ar_30_60: ar3060, ar_60_90: ar6090, ar_90_plus: ar90,
      total: arTotal,
      pct_overdue_90: arTotal ? round((ar90 / arTotal) * 100) : 0,
    },
    working_capital: {
      ar_total: arTotal,
      ap_total: apTotal,
      inventory,
      net: round(workingCapital),
    },
    trend: filtered.map(r => ({
      month: r.month,
      cash_balance: Number(r.cash_balance) || 0,
      operating_cf: Number(r.operating_cf) || 0,
      free_cf: Number(r.free_cf) || 0,
    })),
    forecast,
    filters: {
      months: uniq(allRows, 'month'),
    },
    warnings,
  };
}

function groupSum(rows, key, fields) {
  const m = {};
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    if (!m[k]) { m[k] = { [key]: k }; fields.forEach(f => m[k][f] = 0); }
    fields.forEach(f => { m[k][f] += Number(r[f]) || 0; });
  }
  return Object.values(m).sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

function safeVaultJoin(rel) {
  const root = resolveVaultPath();
  const full = path.resolve(root, rel || '');
  if (!full.startsWith(root + path.sep) && full !== root) {
    throw new Error('Path traversal denied');
  }
  return full;
}

function walkVaultTree(absDir, relDir, depth, maxDepth) {
  if (depth > maxDepth) return [];
  let entries;
  try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
  catch { return []; }
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // skip .obsidian, .trash
    const abs = path.join(absDir, e.name);
    const rel = relDir ? path.join(relDir, e.name) : e.name;
    if (e.isDirectory()) {
      out.push({
        type: 'folder',
        name: e.name,
        path: rel,
        children: walkVaultTree(abs, rel, depth + 1, maxDepth),
      });
    } else if (e.isFile() && e.name.endsWith('.md')) {
      let mtime = 0, size = 0;
      try { const st = fs.statSync(abs); mtime = st.mtimeMs; size = st.size; } catch {}
      out.push({ type: 'file', name: e.name, path: rel, mtime, size });
    }
  }
  // folders first, then files — each group alpha
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'note';
}

/**
 * Walk vault, parse all .md files, extract wikilinks, build graph.
 * Returns { nodes: [{id, label, folder, connections}], edges: [{source, target}] }
 */
function buildVaultGraph() {
  const root = resolveVaultPath();
  if (!fs.existsSync(root)) return { nodes: [], edges: [] };

  const files = [];
  (function collect(absDir, relDir, depth) {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const abs = path.join(absDir, e.name);
      const rel = relDir ? path.join(relDir, e.name) : e.name;
      if (e.isDirectory()) collect(abs, rel, depth + 1);
      else if (e.isFile() && e.name.endsWith('.md')) files.push({ abs, rel });
    }
  })(root, '', 0);

  // Build id map by basename (Obsidian wikilinks resolve to note title, not path)
  const byBasename = new Map();
  const nodes = files.map((f, idx) => {
    const basename = path.basename(f.rel, '.md');
    const folder = path.dirname(f.rel) === '.' ? '/' : path.dirname(f.rel);
    byBasename.set(basename.toLowerCase(), idx);
    return { id: idx, label: basename, path: f.rel, folder, connections: 0 };
  });

  // Parse wikilinks per file
  const edgeSet = new Set();
  const edges = [];
  const wikilinkRe = /\[\[([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  for (let i = 0; i < files.length; i++) {
    let content;
    try {
      const st = fs.statSync(files[i].abs);
      if (st.size > 1024 * 1024) continue; // skip files > 1MB
      content = fs.readFileSync(files[i].abs, 'utf8');
    } catch { continue; }
    wikilinkRe.lastIndex = 0;
    let m;
    const linked = new Set();
    while ((m = wikilinkRe.exec(content)) !== null) {
      const target = m[1].trim();
      const targetBase = path.basename(target, '.md');
      const targetIdx = byBasename.get(targetBase.toLowerCase());
      if (targetIdx !== undefined && targetIdx !== i && !linked.has(targetIdx)) {
        linked.add(targetIdx);
        const edgeKey = i < targetIdx ? `${i}-${targetIdx}` : `${targetIdx}-${i}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ source: i, target: targetIdx });
          nodes[i].connections++;
          nodes[targetIdx].connections++;
        }
      }
    }
  }

  return { nodes, edges };
}

// ════════════════════════════════════════════════════════════
// MCP Installer — uses keytar for cross-platform credential storage
// and `claude mcp add/remove` for actual install
// ════════════════════════════════════════════════════════════

function loadMcpCatalog() {
  return JSON.parse(fs.readFileSync(MCP_CATALOG_PATH, 'utf8'));
}

function getMcpFromCatalog(id) {
  const catalog = loadMcpCatalog();
  return (catalog.mcps || []).find(m => m.id === id);
}

/**
 * Run a command with arguments, no shell, capture output.
 * Safer than execSync because args don't pass through shell.
 */
function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = execFile(cmd, args, { timeout: 60000, ...opts }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function listInstalledMcps() {
  // 1. If client workspace has .mcp.json, list from there (client-scoped)
  const clientWs = resolveClientWorkspace();
  if (clientWs) {
    const mcpFile = path.join(clientWs, '.mcp.json');
    if (fs.existsSync(mcpFile)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
        const servers = cfg.mcpServers || {};
        return Object.keys(servers).map(name => {
          const s = servers[name];
          const cmd = `${s.command || ''} ${(s.args || []).join(' ')}`.trim();
          return { name, command: cmd, connected: true, status: 'Configured (client)', source: 'client' };
        });
      } catch {
        // fall through to global
      }
    }
  }

  // 2. Fallback: global `claude mcp list`
  try {
    const { stdout } = await runCommand('claude', ['mcp', 'list']);
    // Parse lines like "name: command - ✓ Connected" or "name: command - ✗ Failed"
    const lines = stdout.split('\n').filter(l => l.includes(':') && (l.includes('✓') || l.includes('✗') || l.includes('-')));
    return lines.map(line => {
      const m = line.match(/^([\w\-@]+):\s+(.+?)\s+-\s+(.+)$/);
      if (!m) return null;
      const [, name, command, status] = m;
      return {
        name: name.trim(),
        command: command.trim(),
        connected: status.includes('✓') || /Connected/i.test(status),
        status: status.trim(),
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * Install MCP via `claude mcp add --scope user <name> --env K=V -- <cmd> [args...]`
 * Saves credentials to OS keychain via keytar.
 */
async function installMcp(id, credentials) {
  const mcp = getMcpFromCatalog(id);
  if (!mcp) throw new Error(`MCP not found in catalog: ${id}`);

  // Validate all required fields present
  for (const f of mcp.fields || []) {
    if (!credentials[f.key] || typeof credentials[f.key] !== 'string') {
      throw new Error(`Missing required field: ${f.key}`);
    }
  }

  // 1. Save credentials to keychain (one entry per field, per MCP)
  for (const f of mcp.fields || []) {
    await keytar.setPassword(`${KEYTAR_SERVICE_PREFIX}-${id}`, f.key, credentials[f.key]);
  }

  // 2. Build claude mcp add args
  // claude mcp add --scope user <name> [--env K=V ...] -- <cmd> [args ...]
  const cliArgs = ['mcp', 'add', '--scope', 'user'];

  // Env vars from credentials
  for (const f of mcp.fields || []) {
    if (f.key.startsWith('GDRIVE_') || f.key.endsWith('_PATH') || f.key.endsWith('_CREDENTIALS')) continue; // skip path-only OAuth keys for now
    cliArgs.push('--env', `${f.key}=${credentials[f.key]}`);
  }

  cliArgs.push(id);
  cliArgs.push('--');
  cliArgs.push(mcp.command);

  // Args, with optional argsFromFields appended
  const finalArgs = [...(mcp.args || [])];
  if (mcp.argsFromFields) {
    for (const fk of mcp.argsFromFields) finalArgs.push(credentials[fk]);
  }
  cliArgs.push(...finalArgs);

  try {
    // Remove first if exists, ignore errors
    try { await runCommand('claude', ['mcp', 'remove', id, '-s', 'user']); } catch {}
    const { stdout, stderr } = await runCommand('claude', cliArgs);
    return { ok: true, message: `Installed ${id}`, stdout: stdout.slice(-500), stderr: stderr.slice(-500) };
  } catch (e) {
    // Cleanup keychain on install failure
    for (const f of mcp.fields || []) {
      try { await keytar.deletePassword(`${KEYTAR_SERVICE_PREFIX}-${id}`, f.key); } catch {}
    }
    throw new Error(`Install failed: ${e.message} ${e.stderr || ''}`.slice(0, 500));
  }
}

async function uninstallMcp(id) {
  const mcp = getMcpFromCatalog(id);
  // Try to remove from claude
  try { await runCommand('claude', ['mcp', 'remove', id, '-s', 'user']); } catch (e) { /* ignore */ }
  // Cleanup keychain
  if (mcp && keytar) {
    for (const f of mcp.fields || []) {
      try { await keytar.deletePassword(`${KEYTAR_SERVICE_PREFIX}-${id}`, f.key); } catch {}
    }
  }
  return { ok: true, message: `Uninstalled ${id}` };
}

/**
 * Test MCP credentials by hitting the configured testEndpoint with the saved key.
 */
async function testMcp(id) {
  const mcp = getMcpFromCatalog(id);
  if (!mcp) return { ok: false, error: 'MCP not in catalog' };
  if (!mcp.test) return { ok: false, error: 'No test endpoint defined for this MCP' };
  if (!keytar) return { ok: false, error: 'keytar not available' };

  // Load all credentials from keychain
  const creds = {};
  for (const f of mcp.fields || []) {
    creds[f.key] = await keytar.getPassword(`${KEYTAR_SERVICE_PREFIX}-${id}`, f.key);
    if (!creds[f.key]) return { ok: false, error: `No saved credential: ${f.key}` };
  }

  const t = mcp.test;
  let testUrl = t.url;
  if (t.urlTemplate) {
    testUrl = t.urlTemplate.replace(/\{(\w+)\}/g, (_, k) => creds[k] || '');
  }

  // Add query param auth if needed
  if (t.queryParam && t.authKey) {
    const sep = testUrl.includes('?') ? '&' : '?';
    testUrl = `${testUrl}${sep}${t.queryParam}=${encodeURIComponent(creds[t.authKey])}`;
  }

  const headers = { ...(t.extraHeaders || {}) };
  if (t.authHeader && t.authKey) {
    headers[t.authHeader] = (t.authPrefix || '') + creds[t.authKey];
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    try {
      const u = new URL(testUrl);
      const opts = {
        method: t.method || 'GET',
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        headers,
        timeout: 10000,
      };
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (resp) => {
        let body = '';
        resp.on('data', (chunk) => { body += chunk; if (body.length > 2000) body = body.slice(0, 2000); });
        resp.on('end', () => {
          const latency = Date.now() - startTime;
          const ok = resp.statusCode >= 200 && resp.statusCode < 300;
          resolve({
            ok,
            status: resp.statusCode,
            latency,
            error: ok ? null : `HTTP ${resp.statusCode}: ${body.slice(0, 200)}`,
          });
        });
      });
      req.on('error', (err) => {
        resolve({ ok: false, error: err.message, latency: Date.now() - startTime });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout (10s)', latency: 10000 });
      });
      if (t.body) req.write(t.body);
      req.end();
    } catch (e) {
      resolve({ ok: false, error: 'Bad URL: ' + e.message });
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Prevent unhandled errors from crashing the server
process.on('uncaughtException', (err) => {
  console.error(`[MC] Uncaught exception: ${err.message}`);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[MC] Unhandled rejection: ${reason}`);
});

// ── Start ──
server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════╗`);
  console.log(`  ║  187N MISSION CONTROL — BRIDGE   ║`);
  console.log(`  ║  http://localhost:${PORT}           ║`);
  console.log(`  ╚══════════════════════════════════╝\n`);
});
