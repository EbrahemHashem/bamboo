// Shared helpers voor Finance pages

const FINANCE_TABS = [
  { id: 'index',       label: 'Overview',    href: './index.html' },
  { id: 'pnl',         label: 'P&L',         href: './pnl.html' },
  { id: 'revenue',     label: 'Revenue',     href: './revenue.html' },
  { id: 'costcenter',  label: 'Cost Center', href: './costcenter.html' },
  { id: 'pipeline',    label: 'Pipeline',    href: './pipeline.html' },
  { id: 'cashflow',    label: 'Cashflow',    href: './cashflow.html' },
];

function renderFinanceTabs(activeId) {
  const tabBar = document.getElementById('financeTabs');
  if (!tabBar) return;
  tabBar.innerHTML = FINANCE_TABS.map(t =>
    `<a href="${t.href}" class="finance-tab ${t.id === activeId ? 'active' : ''}">${t.label}</a>`
  ).join('');
}

function fmtMoney(n, compact = false) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (compact) {
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return n.toFixed(0);
  }
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtCount(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

function kpiCard(label, value, sub, accent) {
  return `<div class="kpi-card">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value${accent ? ' accent' : ''}">${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
  </div>`;
}

function renderWarnings(warnings) {
  const el = document.getElementById('finWarnings');
  if (!el) return;
  if (!warnings || !warnings.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="fin-warning">Reconciliation warnings:<ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
}

function renderEmpty(dashboardName, csvName) {
  return `<div class="fin-empty">
    <div class="ic">&#128200;</div>
    <div class="title">Geen ${dashboardName} data</div>
    <div class="desc">Plaats een CSV op <code>${csvName}</code> in <code>{clientWorkspacePath}/finance/</code>.
    <br><br>Zet <code>clientWorkspacePath</code> in <code>client-config.json</code> naar de map van je client build.</div>
  </div>`;
}

// Chart.js theme defaults — neon green on dark
function themeChart() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = 'rgba(232,240,236,0.7)';
  Chart.defaults.borderColor = 'rgba(0,255,136,0.08)';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.padding = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10,20,15,0.95)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(0,255,136,0.25)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#00ff88';
  Chart.defaults.plugins.tooltip.bodyColor = '#e8f0ec';
  Chart.defaults.plugins.tooltip.padding = 10;
}

const FIN_COLORS = {
  green: '#00ff88',
  greenSoft: 'rgba(0,255,136,0.6)',
  greenGhost: 'rgba(0,255,136,0.18)',
  greenDim: 'rgba(0,255,136,0.08)',
  red: '#ff8080',
  redGhost: 'rgba(255,128,128,0.2)',
  yellow: '#ffc800',
  yellowGhost: 'rgba(255,200,0,0.2)',
  blue: '#7bb7ff',
  blueGhost: 'rgba(123,183,255,0.2)',
  text: '#e8f0ec',
};

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '' && v !== 'all') q.set(k, v);
  });
  const s = q.toString();
  return s ? '?' + s : '';
}

async function loadFinance(type, params) {
  return await Bridge.fetch('/api/finance/' + type + buildQuery(params));
}

async function loadFinanceStatus() {
  return await Bridge.fetch('/api/finance/status');
}
