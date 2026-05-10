---
name: {routine-slug}
cron: "0 7 * * *"
timezone: Europe/Amsterdam
mcps: [airtable, apify]
owner: bamboo
status: active
origin: {n8n-workflow-filename}.json
---

# {Routine Name}

One-line description. Bamboo brand voice: Dutch, nuchter, waarde-focused.

## Trigger

- **Cron:** `0 7 * * *`
- **Timezone:** Europe/Amsterdam
- **Manual run:** `/bm-{routine-slug}`

## Inputs

- (none — cron-driven)

## Outputs

- Airtable: table `{Table Name}` in base `{BM_AIRTABLE_BASE_ID}`
- Telegram: 1 summary via `bm-routine-logger`
- BM_Executions: 1 log row

## Steps

1. Pull data
2. Process with Claude (if needed)
3. Write to Airtable
4. Log + notify

## Error handling

- Each step try/catch → on error: `bm-routine-logger` with `status=error`
- Critical errors → Telegram immediate alert to Nathan/ops chat
- Non-critical → log-only, continue

## Credentials required

- `{CREDENTIAL_NAME}` in `.env`

## Verification

What does manual test show? Which Airtable records appear? Which Telegram message?

---

**Development notes:**
- Origin: `{n8n-workflow-filename}.json` in `clients/bamboo/systems/.../`
- Bamboo brand voice rules enforced (no activist/moralist language)
