/**
 * 187N Mission Control — Navigation
 */

// Modules — elk nav-item krijgt een 'module' tag.
// Config flag modules[<name>]=false verbergt de hele module.
// Items zonder 'module' of met module='core' zijn altijd zichtbaar.
const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard',     icon: '&#9638;',  href: './index.html', module: 'core' },
      { id: 'activity',  label: 'Activity',      icon: '&#8599;',  href: './pages/activity.html', module: 'ops' },
      { id: 'usage',     label: 'Usage',          icon: '&#9612;',  href: './pages/usage.html', module: 'ops' },
    ]
  },
  {
    group: 'Agents',
    items: [
      { id: 'agents',   label: 'Agents',    icon: '&#9830;',  href: './pages/agents.html', arrow: true, module: 'core' },
      { id: 'chat',     label: 'Chat',       icon: '&#9900;',  href: './pages/chat.html', module: 'core' },
      { id: 'sessions', label: 'Sessions',   icon: '&#9645;',  href: './pages/sessions.html', module: 'ops' },
    ]
  },
  {
    group: 'Work',
    items: [
      { id: 'tasks',        label: 'Tasks',         icon: '&#9776;',  href: './pages/tasks.html', module: 'ops' },
      { id: 'calendar',     label: 'Calendar',       icon: '&#9744;',  href: './pages/calendar.html', module: 'ops' },
      { id: 'data',         label: 'Live Data',      icon: '&#9707;',  href: './pages/data.html', arrow: true, module: 'core' },
      { id: 'finreports',   label: 'Finance',        icon: '&#128181;', href: './pages/finance.html', arrow: true, module: 'core' },
      { id: 'integrations', label: 'Integrations',   icon: '&#9881;',  href: './pages/integrations.html', module: 'core' },
      { id: 'routines',     label: 'Routines',       icon: '&#8634;',  href: './pages/cron.html', arrow: true, module: 'core' },
      { id: 'skills',       label: 'Skills',         icon: '&#128279;', href: './pages/skills.html', arrow: true, module: 'core' },
    ]
  },
  {
    group: 'Finance',
    items: [
      { id: 'finance',      label: 'Finance',        icon: '&#128200;', href: './pages/finance/index.html', arrow: true, module: 'finance' },
    ]
  },
  {
    group: 'Knowledge',
    items: [
      { id: 'mind',       label: 'Mind',             icon: '&#129504;', href: './pages/mind.html', module: 'obsidian' },
      { id: 'braindump',  label: 'Brain Dump',       icon: '&#10024;',  href: './pages/braindump.html', module: 'obsidian' },
      { id: 'vault',      label: 'Vault',            icon: '&#128451;', href: './pages/vault.html', module: 'placeholder' },
      { id: 'memory',     label: 'Memory',           icon: '&#9881;',   href: './pages/memory.html', module: 'placeholder' },
      { id: 'workspace',  label: 'Workspace Files',  icon: '&#128193;', href: './pages/workspace.html', module: 'placeholder' },
      { id: 'vectordb',   label: 'Vector DB',        icon: '&#9673;',   href: './pages/vectordb.html', module: 'placeholder' },
      { id: 'channels',   label: 'Channels',         icon: '&#128246;', href: './pages/channels.html', module: 'placeholder' },
      { id: 'security',   label: 'Security',         icon: '&#128737;', href: './pages/security.html', module: 'dev_tools' },
      { id: 'hooks',      label: 'Hooks',            icon: '&#128268;', href: './pages/hooks.html', module: 'dev_tools' },
      { id: 'preferences',label: 'Preferences',      icon: '&#9878;',   href: './pages/preferences.html', module: 'dev_tools' },
    ]
  },
  {
    group: 'System',
    items: [
      { id: 'system',   label: 'System',    icon: '&#9684;',  href: './pages/system.html', module: 'dev_tools' },
      { id: 'doctor',   label: 'Doctor',     icon: '&#128167;', href: './pages/doctor.html', module: 'dev_tools' },
      { id: 'settings', label: 'Settings',   icon: '&#9881;',   href: './pages/settings.html', module: 'core' },
    ]
  }
];

function renderNav(activeId) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Determine base path (pages are one level deeper)
  // Compute depth based on current path — works for index, pages/*, pages/finance/* etc.
  const segments = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  const hasFilename = segments.length > 0 && segments[segments.length - 1].includes('.');
  const depth = hasFilename ? segments.length - 1 : segments.length;
  const prefix = depth > 0 ? Array(depth).fill('..').join('/') : '.';

  let html = '';

  // Logo
  html += `
    <div class="sidebar-logo">
      <img src="/logo-187n.svg" alt="187N" class="logo-img" />
      <div class="logo-text">187N</div>
      <div class="logo-sub">Mission Control</div>
    </div>
  `;

  // Status
  html += `
    <div class="sidebar-status">
      <div class="status-indicator"></div>
      <span class="status-text">Connecting...</span>
    </div>
  `;

  // Nav groups — filter by module flag
  // Default module states: core always on; anything else on unless explicitly set to false
  const modules = (MC.config && MC.config.modules) || {};
  const isModuleEnabled = (mod) => {
    if (!mod || mod === 'core') return true;
    return modules[mod] !== false;
  };

  NAV_ITEMS.forEach(group => {
    const visibleItems = group.items.filter(item => isModuleEnabled(item.module));

    if (visibleItems.length === 0) return;

    html += `<div class="nav-group">`;
    html += `<div class="nav-group-label">${group.group}</div>`;

    visibleItems.forEach(item => {
      const href = prefix + '/' + item.href.replace('./', '');
      const isActive = item.id === activeId;
      const badgeHtml = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
      const arrowHtml = item.arrow ? `<span class="nav-arrow">&#8250;</span>` : '';
      html += `
        <a href="${href}" class="nav-item ${isActive ? 'active' : ''}" data-page="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          ${item.label}
          ${badgeHtml}
          ${arrowHtml}
        </a>
      `;
    });

    html += `</div>`;
  });

  // Bottom
  html += `
    <div class="sidebar-bottom">
      <div class="sidebar-business">${MC.config?.businessName || '187N'}</div>
      <div class="sidebar-version">v1.0.0</div>
    </div>
  `;

  sidebar.innerHTML = html;
}

// Mobile toggle
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('visible');
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }
  }
}
