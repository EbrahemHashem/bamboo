---
name: bm-routine-logger
type: utility
mcps: [airtable]
owner: bamboo
---

# BM Routine Logger

Central log + notify utility for all Bamboo routines. Every routine calls this at the end to log consistently to Airtable + conditionally ping Telegram.

## Input

```json
{
  "routine_name": "competitor-daily-scrape",
  "status": "success|error|empty|partial",
  "records_written": 42,
  "errors": 0,
  "duration_seconds": 87,
  "summary": "Scraped 42 ads from 4 competitors. 3 new angles detected.",
  "error_message": null,
  "trigger": "cron|manual|retry"
}
```

## Steps

### 1. Write to Airtable `BM_Executions`

```
mcp__airtable__create_record(
  base_id="{BM_AIRTABLE_BASE_ID}",
  table_id="BM_Executions",
  fields={
    "Routine": routine_name,
    "Status": status,
    "Records Written": records_written,
    "Errors": errors,
    "Duration (s)": duration_seconds,
    "Summary": summary[:500],
    "Error": error_message[:2000] if error_message else None,
    "Trigger": trigger,
    "Timestamp": <now ISO>
  }
)
```

### 2. Decide: ping Telegram?

**Always ping:**
- `status == "error"` → error alert to Nathan
- `routine_name` in `["competitor-daily-scrape", "weekly-digest", "daily-intelligence", "weekly-strategy-report", "reorder-trigger"]` (Nathan's daily digest routines)

**Silent log (no Telegram):**
- `status == "success"` for polling routines (conversion-monitor every 6h, anomaly-detector every 4h) unless anomalies detected
- `status == "empty"` — unless 3+ consecutive empty runs

### 3. Send Telegram message

```
POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
{
  "chat_id": "{BM_OPS_CHAT_ID}",
  "parse_mode": "Markdown",
  "text": "..."
}
```

**Message format (success):**
```
✅ *{routine_name}*
{summary}
📊 {records_written} records · ⏱ {duration_seconds}s
```

**Message format (error):**
```
🚨 *{routine_name}* — ERROR
{error_message (truncated to 500 chars)}
⏱ {duration_seconds}s · trigger: {trigger}
```

**Message format (empty):**
```
⚠️ *{routine_name}* — geen data
{summary}
```

## Credentials

- `TELEGRAM_BOT_TOKEN` — in `.env` (Bamboo bot — `@BambooDispoBot` to be created)
- `BM_OPS_CHAT_ID` — in `.env` — Telegram group. **TO BE FILLED** by Nathan
- `AIRTABLE_PAT` — in `.env`
- `BM_AIRTABLE_BASE_ID` — in `.env`

## Airtable schema — `BM_Executions` table

| Field | Type | Options |
|-------|------|---------|
| Routine | Single line text | — |
| Status | Single select | success, error, empty, partial |
| Records Written | Number (integer) | — |
| Errors | Number (integer) | — |
| Duration (s) | Number (decimal) | — |
| Summary | Long text | — |
| Error | Long text | — |
| Trigger | Single select | cron, manual, retry |
| Timestamp | Date (with time) | — |

## Verification

```bash
# Test success path
/bm-routine-logger routine_name=test status=success records_written=1 summary="test"

# Test error path
/bm-routine-logger routine_name=test status=error error_message="test fail"
```
