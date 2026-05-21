#!/usr/bin/env node
/**
 * Snapshots the bamboo workspace into mission-control/data/*.json
 * so the static Vercel deploy can show real data when the bridge is offline.
 *
 * Run: node scripts/build-snapshot.js
 */

const fs = require('fs');
const path = require('path');

const MC_DIR = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(MC_DIR, '..');
const DATA_DIR = path.join(MC_DIR, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

function write(name, obj) {
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(obj, null, 2));
  console.log(`  wrote data/${name}`);
}

function safeReadDir(p) {
  try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; }
}

function readFrontmatter(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return {};
    const fm = {};
    m[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      val = val.replace(/^["']|["']$/g, '');
      fm[key] = val;
    });
    return fm;
  } catch { return {}; }
}

function nextRunFromCron(cron) {
  if (!cron || typeof cron !== 'string') return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hr] = parts;
  if (min === '*' || hr === '*' || min.includes('/') || hr.includes('/')) return cron;
  const h = parseInt(hr, 10), m = parseInt(min, 10);
  if (isNaN(h) || isNaN(m)) return cron;
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

// ── Agents = the 6 systems folders ───────────────────────────────
function buildAgents() {
  const systemsDir = path.join(WORKSPACE, 'systems');
  const dirs = safeReadDir(systemsDir).filter(d => d.isDirectory());
  const agents = dirs.map(d => {
    const sysPath = path.join(systemsDir, d.name);
    const skillCount = safeReadDir(path.join(sysPath, 'skills')).filter(f => f.name.endsWith('.md')).length;
    const docCount = safeReadDir(sysPath).filter(f => f.name.endsWith('.md')).length;
    const readable = d.name.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return {
      id: d.name,
      name: readable,
      role: `System ${d.name.split('-')[0]} — ${readable}`,
      status: 'active',
      usage: Math.min(95, 30 + skillCount * 8 + docCount * 4),
      skills: skillCount,
      docs: docCount,
    };
  });
  write('agents.json', { agents, _generatedAt: new Date().toISOString() });
  return agents.length;
}

// ── Skills = .md files in systems/*/skills + top-level install/ ──
function buildSkills() {
  const skills = [];
  const systemsDir = path.join(WORKSPACE, 'systems');
  safeReadDir(systemsDir).filter(d => d.isDirectory()).forEach(sysDir => {
    const skillsPath = path.join(systemsDir, sysDir.name, 'skills');
    safeReadDir(skillsPath).filter(f => f.name.endsWith('.md')).forEach(f => {
      const fm = readFrontmatter(path.join(skillsPath, f.name));
      skills.push({
        name: fm.name || f.name.replace(/\.md$/, ''),
        system: sysDir.name,
        description: fm.description || '',
        category: fm.category || sysDir.name,
      });
    });
  });
  write('skills.json', { skills, _generatedAt: new Date().toISOString() });
  return skills.length;
}

// ── Cron / Routines = routines/*.md with frontmatter cron ────────
function buildCron() {
  const routinesDir = path.join(WORKSPACE, 'routines');
  const files = safeReadDir(routinesDir).filter(f => f.isFile() && f.name.endsWith('.md') && !f.name.startsWith('_') && f.name !== 'README.md');
  const jobs = files.map(f => {
    const fm = readFrontmatter(path.join(routinesDir, f.name));
    return {
      name: fm.name || f.name.replace(/\.md$/, ''),
      schedule: fm.cron || '',
      timezone: fm.timezone || '',
      nextRun: nextRunFromCron(fm.cron),
      status: fm.status === 'active' ? 'ok' : (fm.status || 'scheduled'),
      category: fm.category || '',
      mcps: fm.mcps || '',
    };
  }).filter(j => j.schedule);
  write('cron.json', { jobs, _generatedAt: new Date().toISOString() });
  return jobs.length;
}

// ── MCP servers ──────────────────────────────────────────────────
function buildMcp() {
  const mcpDir = path.join(WORKSPACE, 'mcp-servers');
  const servers = safeReadDir(mcpDir)
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => ({ name: d.name, installed: true }));
  write('mcp.json', { servers, _generatedAt: new Date().toISOString() });
  return servers.length;
}

// ── System stats ─────────────────────────────────────────────────
function buildSystemStats(counts) {
  write('system-stats.json', {
    uptime: 'snapshot',
    snapshotAt: new Date().toISOString(),
    counts,
  });
}

// ── Recent activity (derived) ────────────────────────────────────
function buildActivity(counts) {
  const events = [
    { type: 'snapshot', text: `<strong>Snapshot</strong> generated from bamboo workspace`, time: 'just now' },
    { type: 'info', text: `<strong>${counts.agents}</strong> systems detected in systems/`, time: 'just now' },
    { type: 'info', text: `<strong>${counts.cron}</strong> routines configured`, time: 'just now' },
    { type: 'info', text: `<strong>${counts.skills}</strong> skills discovered`, time: 'just now' },
    { type: 'info', text: `<strong>${counts.mcp}</strong> MCP servers in mcp-servers/`, time: 'just now' },
  ];
  write('activity.json', { events, _generatedAt: new Date().toISOString() });
}

// ── Run ───────────────────────────────────────────────────────────
console.log(`Building snapshot from: ${WORKSPACE}`);
const counts = {
  agents: buildAgents(),
  skills: buildSkills(),
  cron: buildCron(),
  mcp: buildMcp(),
};
buildSystemStats(counts);
buildActivity(counts);
console.log(`\nSnapshot complete:`, counts);
