/**
 * 187N Mission Control — Config
 * Laadt client-config.json en past theme + modules aan
 */

const MC = {
  config: null,
  bridgeUrl: '',
  online: false,
  _lastHealthCheck: 0,

  async init() {
    // Load config (try localStorage override first)
    try {
      const override = localStorage.getItem('mc_config_override');
      if (override) {
        this.config = JSON.parse(override);
      }
    } catch {}

    if (!this.config) {
      try {
        const res = await fetch(this._resolvePath('client-config.json'));
        this.config = await res.json();
      } catch {
        this.config = this.defaults();
      }
    }

    // Bridge serves the HTML — same origin by default. Allow override via config for split deployments.
    this.bridgeUrl = this.config.bridgeUrl
      || (this.config.bridgePort ? `http://localhost:${this.config.bridgePort}` : window.location.origin);

    // Apply theme overrides
    if (this.config.accent && this.config.accent !== '#00ff88') {
      this.applyAccent(this.config.accent);
    }

    // Set business name
    const nameEl = document.querySelector('.sidebar-business');
    if (nameEl && this.config.businessName) {
      nameEl.textContent = this.config.businessName;
    }

    // Check bridge health
    await this.checkHealth();

    // Start health polling (every 30s)
    setInterval(() => this.checkHealth(), 30000);

    // Listen for online/offline browser events
    window.addEventListener('online', () => this.checkHealth());
    window.addEventListener('offline', () => {
      this.online = false;
      this._updateStatusUI();
    });

    return this.config;
  },

  /** Resolve path relative to index (handles pages/ subdir) */
  _resolvePath(filename) {
    // Count how many '/' segments the current path has after the root
    // and build a relative path with the right number of '../' parts.
    // Simpler: just use absolute path from origin root.
    return '/' + filename;
  },

  defaults() {
    return {
      businessName: '187N Mission Control',
      accent: '#00ff88',
      bridgePort: 3333,
      modules: {
        system: true, agents: true, tasks: true,
        chat: true, cron: true, skills: true,
        knowledge: true, integrations: true
      },
      integrations: {}
    };
  },

  applyAccent(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);

    const root = document.documentElement;
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-rgb', `${r},${g},${b}`);
    root.style.setProperty('--accent-dim', hex + 'cc');
    root.style.setProperty('--accent-ghost', `rgba(${r},${g},${b},0.05)`);
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.15)`);
    root.style.setProperty('--accent-border', `rgba(${r},${g},${b},0.12)`);
    root.style.setProperty('--border', `rgba(${r},${g},${b},0.08)`);
    root.style.setProperty('--border-hover', `rgba(${r},${g},${b},0.2)`);
  },

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(this.bridgeUrl + '/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      this.online = data.status === 'ok';
    } catch {
      this.online = false;
    }

    this._lastHealthCheck = Date.now();
    this._updateStatusUI();

    return this.online;
  },

  _updateStatusUI() {
    const dot = document.querySelector('.status-indicator');
    const txt = document.querySelector('.status-text');
    const banner = document.querySelector('.offline-banner');

    if (dot) {
      dot.classList.toggle('offline', !this.online);
    }
    if (txt) {
      txt.textContent = this.online ? 'Online' : 'Offline';
      txt.classList.toggle('offline', !this.online);
    }
    if (banner) {
      banner.classList.toggle('visible', !this.online);
    }
  }
};

/**
 * Bridge — fetch wrapper met caching
 *
 * Offline fallback order: live bridge → localStorage cache → static snapshot
 * (/data/*.json bundled at build time by scripts/build-snapshot.js)
 */
const STATIC_SNAPSHOT_MAP = {
  '/api/agents': '/data/agents.json',
  '/api/skills/list': '/data/skills.json',
  '/api/cron/list': '/data/cron.json',
  '/api/mcp/installed': '/data/mcp.json',
  '/api/system-stats': '/data/system-stats.json',
  '/api/activity': '/data/activity.json',
};

const Bridge = {
  async fetch(path, opts = {}) {
    const url = MC.bridgeUrl + path;
    const cacheKey = 'mc_' + path.replace(/[^a-z0-9]/gi, '_');
    const isGet = !opts.method || opts.method.toUpperCase() === 'GET';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        ...opts,
        signal: opts.signal || controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      // Cache successful response
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      } catch {}

      return data;
    } catch {
      // 1) Return cached data if available
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached && cached.data) {
          cached.data._cached = true;
          cached.data._cachedAt = cached.ts;
          return cached.data;
        }
      } catch {}

      // 2) Fall back to static snapshot for known GET endpoints
      if (isGet && STATIC_SNAPSHOT_MAP[path]) {
        try {
          const res = await fetch(STATIC_SNAPSHOT_MAP[path]);
          if (res.ok) {
            const data = await res.json();
            data._snapshot = true;
            return data;
          }
        } catch {}
      }

      return null;
    }
  },

  async post(path, body) {
    return this.fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  /**
   * SSE stream with automatic reconnection
   */
  stream(path, onData, onDone, onError) {
    const url = MC.bridgeUrl + path;
    let source = null;
    let reconnectAttempts = 0;
    let closed = false;
    let receivedDone = false; // set when the server signals normal completion

    function dispatch(data) {
      if (data && data.type === 'done') {
        // Normal end of stream — close cleanly so onerror doesn't trigger a re-run.
        receivedDone = true;
        closed = true;
        try { source && source.close(); } catch {}
        try { onData(data); } catch {}
        if (onDone) { try { onDone(); } catch {} }
        return;
      }
      try { onData(data); } catch {}
    }

    function connect() {
      source = new EventSource(url);

      source.onopen = () => {
        reconnectAttempts = 0;
      };

      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          dispatch(data);
        } catch {}
      };

      // Handle named event types (for SSE messages that include `event:` field)
      ['output', 'error', 'session', 'done', 'tool'].forEach(type => {
        source.addEventListener(type, (e) => {
          try {
            const data = JSON.parse(e.data);
            data.type = data.type || type;
            dispatch(data);
          } catch {}
        });
      });

      source.onerror = () => {
        try { source.close(); } catch {}
        // If the stream completed normally OR was closed by caller, do nothing.
        if (closed || receivedDone) return;

        if (reconnectAttempts < 3) {
          reconnectAttempts++;
          setTimeout(connect, 1000 * reconnectAttempts);
        } else {
          if (onError) onError();
        }
      };
    }

    connect();

    // Return a handle with a close method
    return {
      close() {
        closed = true;
        if (source) source.close();
      }
    };
  }
};

/**
 * Toast notification
 */
function showToast(msg, duration = 3000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * Simple markdown renderer for chat messages
 */
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists (lines starting with - or *)
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Ordered lists (lines starting with 1. 2. etc)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Only wrap consecutive <li> that aren't already in <ul>
  html = html.replace(/(?<!<\/ul>)(<li>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('<ul>')) return match;
    return `<ol>${match}</ol>`;
  });

  // Line breaks (but not inside pre blocks)
  const parts = html.split(/(<pre>[\s\S]*?<\/pre>)/);
  html = parts.map((part, i) => {
    if (i % 2 === 1) return part; // pre block, leave alone
    return part.replace(/\n/g, '<br>');
  }).join('');

  return html;
}

/**
 * Loading skeleton helper
 */
function showSkeleton(container, count = 3) {
  container.innerHTML = Array(count).fill('').map(() =>
    `<div class="skeleton-item">
      <div class="skeleton-line" style="width:70%;height:14px;margin-bottom:8px;"></div>
      <div class="skeleton-line" style="width:40%;height:10px;"></div>
    </div>`
  ).join('');
}
