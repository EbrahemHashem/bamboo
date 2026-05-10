# Bamboo Disposables BV — Cloud Routines

All Bamboo automations run as **Claude Cloud Routines** via native `CronCreate`. No n8n, no VPS, no Docker.

## Why cloud routines

- Runs on Anthropic's infra — zero server maintenance
- MCPs (apify, airtable, meta-ads, shopify, klaviyo, google-drive) already in `settings.json`
- Credentials from `.env` (central, not spread over n8n)
- Code-first (skill `.md` files, version-controlled)
- Easier to debug, testable per-routine

## Architecture

```
routines/
├── _template-routine.md              ← skeleton for new routines
├── bm-routine-logger.md              ← central log + Telegram notify
├── bm-routine-registry.md            ← deploy-all script (CronCreate per routine)
├── README.md                         ← this file
│
├── bm-competitor-daily-scrape.md     ← daily 07:00 — Apify → Airtable
├── bm-weekly-digest.md               ← Monday 09:00 — weekly competitor digest email
├── bm-ab-test-evaluator.md           ← daily 22:00 — Shopify A/B test winner detection
├── bm-conversion-monitor.md          ← every 6h — Shopify conversion anomalies
├── bm-b2b-pipeline.md                ← 09:00 + 15:00 — Gmail reply classification
├── bm-reorder-trigger.md             ← daily 10:00 — Klaviyo reorder event trigger
├── bm-retention-flow-monitor.md      ← daily 08:00 — Klaviyo flow health check
├── bm-anomaly-detector.md            ← every 4h — cross-engine anomaly detection
├── bm-daily-intelligence.md          ← daily 07:30 — morning brief (all engines)
├── bm-weekly-strategy-report.md      ← Monday 10:00 — strategy report (Claude Sonnet)
│
└── bm-ad-performance-loop.md         ← DRAFT — every 4h, auto pause/scale Meta ads
```

## Routine Status Overview

| Routine | Cron | Status | Risk |
|---------|------|--------|------|
| bm-competitor-daily-scrape | `0 7 * * *` | active | safe |
| bm-weekly-digest | `0 9 * * 1` | active | safe |
| bm-ab-test-evaluator | `0 22 * * *` | active | medium (auto-declares winners) |
| bm-conversion-monitor | `0 */6 * * *` | active | medium (reads live, flags only) |
| bm-b2b-pipeline | `0 9,15 * * *` | active | safe |
| bm-reorder-trigger | `0 10 * * *` | active | safe (triggers Klaviyo flow) |
| bm-retention-flow-monitor | `0 8 * * *` | active | safe |
| bm-anomaly-detector | `0 */4 * * *` | active | safe |
| bm-daily-intelligence | `30 7 * * *` | active | safe |
| bm-weekly-strategy-report | `0 10 * * 1` | active | safe |
| bm-ad-performance-loop | `0 */4 * * *` | **draft** | ⚠️ HIGH — pauses/scales live ads |

## Setup (first deploy)

### 1. Telegram setup

Create Bamboo bot `@BambooDispoBot` via @BotFather, then:

```bash
# Create Telegram group (e.g., "Bamboo Ops")
# Add @BambooDispoBot as member
# Send 1 message in the group
# Get chat_id:
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq '.result[-1].message.chat.id'
# → put in .env as BM_OPS_CHAT_ID (group IDs start with minus)
```

### 2. Create Airtable `BM_Executions` table

Schema in `bm-routine-logger.md` → section "Airtable schema".

```
mcp__airtable__create_table(
  base_id="{BM_AIRTABLE_BASE_ID}",
  name="BM_Executions",
  fields=[...]
)
```

### 3. Fill `.env` credentials

Bamboo needs (from `docs/MCP-Missing-Items-Report.pdf`):
- `AIRTABLE_PAT` + `BM_AIRTABLE_BASE_ID`
- `APIFY_TOKEN`
- `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID`
- `GEMINI_API_KEY` (nano-banana image gen)
- `GOOGLE_APPLICATION_CREDENTIALS` (Drive, Gmail)
- `SHOPIFY_ACCESS_TOKEN` + `SHOPIFY_STORE_URL`
- `KLAVIYO_API_KEY`
- `TELEGRAM_BOT_TOKEN` + `BM_OPS_CHAT_ID`
- `ANTHROPIC_API_KEY` (for weekly-digest + weekly-strategy-report)
- `SMTP_HOST` + `SMTP_USER` + `SMTP_PASSWORD` (email delivery to Nathan)

### 4. Deploy

```
/bm-routine-registry --dry-run
/bm-routine-registry
/cron-list | grep bm-
```

## Monitoring

| Where | What |
|-------|------|
| Airtable `BM_Executions` | Every run logs here |
| Telegram ops chat | Daily digests + all errors |
| `CronList` | Active triggers + next-run times |

## Day-to-day

**Run manually:**
```
/bm-<routine-name>
```

**Pause:** set `status: disabled` in frontmatter, re-run registry.

**Activate draft** (after Leon/Nathan approval): `draft` → `active`, re-run registry.

## Bamboo brand voice rules

All output (Telegram, email, Airtable summaries) must follow Bamboo tone:
- **Taal:** Nederlands, "je/jij", direct
- **Focus:** waarde per gebruik, gemak, voorraadrust
- **Nooit:** activist/moralist language ("red de planeet", "eco-guilt")
- **Hero product:** Ongebleekt 3 laags 48 rollen — highlight in recommendations
- **B2B targets:** kleine kantoren, boutique hotels, scholen, praktijken, salons (96-rol volume)

See `clients/bamboo/brand-voice.md` for full tone guide.

## Safety rules (from CLAUDE.md)

### Never test without Leon's approval
- `bm-ad-performance-loop` — pauses/scales live Meta campaigns

### Safe to test
- All read-only routines
- Routines that only write to Airtable or Telegram
- `bm-reorder-trigger` — triggers Klaviyo event (not actual email send)

## Migration from n8n

Original JSONs stay in `clients/bamboo/systems/` as reference. When all routines are verified live, those can be archived.
