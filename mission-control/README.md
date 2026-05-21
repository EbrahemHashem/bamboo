# 187N Mission Control

Multi-tenant operations dashboard voor elk van de 6 client builds.
Eén codebase, één `client-config.json` per klant.

## Install per client

Kopiëren naar een client folder:

```bash
cp -r _modules/dashboards/mission-control clients/<client>/mission-control
cd clients/<client>/mission-control
npm install
```

## Config per client

Edit `clients/<client>/mission-control/client-config.json`:

```json
{
  "businessName": "Paw Parent Command",
  "profile": "ecomm",
  "clientWorkspacePath": "/absolute/path/to/clients/paw-parent",
  "modules": {
    "ops": true,
    "obsidian": false,
    "intake": true,
    "placeholder": false,
    "dev_tools": false
  }
}
```

Zie [CLIENT-PROFILES.md](CLIENT-PROFILES.md) voor voorbeelden per build-type.

## Run

```bash
node bridge-server.js
# open http://localhost:3333
```

`PORT` env var override:
```bash
PORT=3400 node bridge-server.js
```

## Multi-tenant bridge

Wanneer `clientWorkspacePath` gezet is, lezen deze endpoints uit de client's eigen folder (met fallback naar globals):

| Endpoint | Client bron | Fallback |
|---|---|---|
| `/api/skills/list` | `{ws}/skills/` | `~/.claude/commands/` |
| `/api/agents` | `{ws}/agents/` | `~/.claude/agents/` |
| `/api/cron/list` | `{ws}/routines/` + `{ws}/n8n-workflows/` | `claude schedule list` |
| `/api/mcp/installed` | `{ws}/.mcp.json` | `claude mcp list` |
| `/api/intake-docs` | `{ws}/intake-docs/**/*.md` | (leeg) |

## Per client — TODO voor devs

| Client | `clientWorkspacePath` | Bijzonderheden |
|---|---|---|
| paw-parent | `clients/paw-parent` | agents/, routines/ in progress, .mcp.json nog niet bestaat |
| bradley-max | `clients/bradley-max` | n8n-workflows gebruiken (uit Shopify + ShipStation), dashboards/winners voor weekly reports |
| brandon | `clients/brandon` | multi-client setup (brandon/clients/), eigen command-centre bestaat al — keep both |
| forge-waters | `clients/forge-waters` | multi-brand (ns/alv/zr/tsc) — brand-switcher TODO in MC |
| maxim-longhi | `clients/maxim-longhi` | multi-brand (ornexis/tryorganics) — idem |
| bamboo | `clients/bamboo` | systems/ folder structuur, geen command-centre nog |

## Module flags (sidebar filtering)

| Module | Items | Default |
|---|---|---|
| `core` | Dashboard, Agents, Chat, Integrations, Routines, Skills, Settings | Altijd aan |
| `ops` | Activity, Usage, Sessions, Tasks, Calendar | aan |
| `obsidian` | Mind, Brain Dump | aan (alleen als obsidianVaultPath gezet) |
| `intake` | Intake Docs | aan voor clients |
| `placeholder` | Vault, Memory, Workspace Files, Vector DB, Channels | **uit** — placeholder pages |
| `dev_tools` | Security, Hooks, Preferences, System, Doctor | **uit** — developer only |

## Core features

- **Sparklines** in 5 stat cards
- **Sortable tables** met urgency badges (cron: overdue/warn/ok)
- **Integrations**: 16-MCP catalog met keytar credential storage, `claude mcp add` installer, connection tester
- **Mind**: D3 force-directed graph van Obsidian vault wikilinks
- **Brain Dump**: POST naar `{vault}/00 — Inbox/` met frontmatter

## Known issues

- `/api/cron/list` kan 10s hangen op oudere Claude Code versies zonder `claude schedule` support → sparklines renderen eerst zodat dashboard niet bevriest
- Agent lister includes README.md als "agent" — TODO filter
- Brandon heeft eigen command-centre HTML — MC kan co-existence of vervanging, TBD per dev
