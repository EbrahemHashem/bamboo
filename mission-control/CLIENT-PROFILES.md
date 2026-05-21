# 187N Mission Control — Client Profiles

Voor elke klant-build een eigen `client-config.json` op die client's machine.
De 3 kernvelden zijn `clientWorkspacePath`, `profile` en `modules.{...}`.

---

## Profile: Agency (Leon's eigen MC)

```json
{
  "businessName": "187N Mission Control",
  "profile": "agency",
  "clientWorkspacePath": null,
  "obsidianVaultPath": "~/obsidian",
  "modules": {
    "ops": true,
    "obsidian": true,
    "intake": false,
    "placeholder": false,
    "dev_tools": false
  }
}
```

**Sidebar toont:** Dashboard, Activity, Usage, Agents, Chat, Sessions, Tasks, Calendar, Integrations, Routines, Skills, Mind, Brain Dump, Settings.

---

## Profile: E-commerce client (Paw Parent, Bamboo, Bradley Max, Maxim Longhi)

```json
{
  "businessName": "Paw Parent Command",
  "profile": "ecomm",
  "clientWorkspacePath": "~/projects/dev-workspace/clients/paw-parent",
  "modules": {
    "ops": true,
    "obsidian": false,
    "intake": true,
    "placeholder": false,
    "dev_tools": false
  }
}
```

**Data komt uit:** client's `skills/`, `agents/`, `routines/`, `n8n-workflows/`, `.mcp.json`, `intake-docs/`.

**Sidebar toont:** Dashboard, Activity, Usage, Agents, Chat, Sessions, Tasks, Calendar, Integrations, Routines, Skills, Intake Docs, Settings.

---

## Profile: Content client (Forge Waters)

```json
{
  "businessName": "Forge Waters Command",
  "profile": "content",
  "clientWorkspacePath": "~/projects/dev-workspace/clients/forge-waters",
  "modules": {
    "ops": false,
    "obsidian": false,
    "intake": false,
    "placeholder": false,
    "dev_tools": false
  }
}
```

**Sidebar toont (lean):** Dashboard, Agents, Chat, Integrations, Routines, Skills, Settings.

---

## Modules reference

| Module | Items |
|---|---|
| `core` | Dashboard, Agents, Chat, Integrations, Routines, Skills, Settings (altijd aan) |
| `ops` | Activity, Usage, Sessions, Tasks, Calendar |
| `obsidian` | Mind, Brain Dump (alleen als obsidianVaultPath gezet) |
| `intake` | Intake Docs (alleen als clientWorkspacePath heeft intake-docs/) |
| `finance` | Finance tab: P&L · Revenue · Cost Center · Pipeline · Cashflow (alleen als clientWorkspacePath heeft finance/ met CSVs) |
| `placeholder` | Vault, Memory, Workspace Files, Vector DB, Channels |
| `dev_tools` | Security, Hooks, Preferences, System, Doctor |

---

## Multi-tenant endpoints

Wanneer `clientWorkspacePath` gezet is, lezen deze endpoints uit de client workspace:

| Endpoint | Client bron | Fallback |
|---|---|---|
| `/api/skills/list` | `{ws}/skills/*.md` | `~/.claude/commands/`, `~/.claude/skills/` |
| `/api/agents` | `{ws}/agents/*` | `~/.claude/agents/` |
| `/api/cron/list` | `{ws}/routines/*.json` + `{ws}/n8n-workflows/*.json` | `claude schedule list` |
| `/api/mcp/installed` | `{ws}/.mcp.json` | `claude mcp list` |
| `/api/intake-docs` | `{ws}/intake-docs/**/*.md` | (leeg als niet configured) |
| `/api/finance/status` | scan `{ws}/finance/*.csv` | (empty) |
| `/api/finance/{type}` | `{ws}/finance/{type}.csv` | (empty). `type`: pnl\|revenue\|costcenter\|pipeline\|cashflow |

## Finance module — CSV schemas

Plaats deze 5 CSVs in `{clientWorkspacePath}/finance/` om de Finance tab te activeren:

| CSV | Headers (in volgorde) |
|---|---|
| `pnl.csv` | `date,product,region,revenue,cogs,gross_profit,gross_margin,marketing,payroll,technology,logistics,admin,total_opex,ebitda,ebitda_margin` |
| `revenue.csv` | `month,region,product,channel,units_2024,aov_2024,revenue_2024,units_2025,aov_2025,revenue_2025` |
| `costcenter.csv` | `month,department,category,gl_account,gl_description,cost_2024,cost_2025,budget_2025` |
| `pipeline.csv` | `month,region,rep,stage,deal_count,avg_deal_size,total_value` (stages: `mql,sql,opportunity,negotiation,closed_won`) |
| `cashflow.csv` | `month,operating_cf,investing_cf,financing_cf,free_cf,cash_balance,ar_0_30,ar_30_60,ar_60_90,ar_90_plus,ap_total,inventory` |

Alle bedragen numeriek (geen thousand separators). Bridge valideert de sums en toont reconciliation warnings bovenaan elk dashboard.
