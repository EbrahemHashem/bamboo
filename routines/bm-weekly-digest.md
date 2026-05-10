---
name: bm-weekly-digest
cron: "0 9 * * 1"
timezone: Europe/Amsterdam
mcps: [airtable]
owner: bamboo
status: active
origin: bamboo-weekly-digest.json
---

# Weekly Competitor Digest

Monday 09:00 — aggregates last 7 days of competitor ads from `Ad Research`, generates a competitive intelligence digest in Bamboo brand voice, and emails it to Nathan.

**Execute steps in order. Use Bash + curl.**

---

## Environment Variables

- `AIRTABLE_PAT`
- `AIRTABLE_BASE_ID`
- `ANTHROPIC_API_KEY` — Claude digest writer
- `BAMBOO_NATHAN_EMAIL` — recipient (defaults to nathan@bamboodisposables.nl)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` — email delivery
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

Check `env | grep -E "AIRTABLE|ANTHROPIC|SMTP|TELEGRAM"`. Stop if missing.

---

## 1. Query Ad Research for last 7 days

```bash
WEEK_AGO=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Ad_Research?filterByFormula=IS_AFTER(%7Bscrape_date%7D%2C%27$WEEK_AGO%27)&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/week_ads.json

COUNT=$(jq '.records | length' /tmp/week_ads.json)
echo "Ads in last 7 days: $COUNT"

if [ "$COUNT" -eq 0 ]; then
  echo "[EMPTY] No ads this week — skip digest"
  exit 0
fi
```

---

## 2. Aggregate by competitor + angle

```bash
jq '.records | group_by(.fields.competitor_name) | map({
  competitor: .[0].fields.competitor_name,
  ad_count: length,
  angles: ([.[].fields.angle // "unknown"] | group_by(.) | map({angle: .[0], count: length}))
})' /tmp/week_ads.json > /tmp/digest_data.json

cat /tmp/digest_data.json | head -40
```

---

## 3. Generate digest with Claude (Bamboo voice)

```bash
DIGEST_INPUT=$(cat /tmp/digest_data.json)
TOTAL_ADS=$(jq 'length' /tmp/digest_data.json)

PROMPT="Je bent strategisch adviseur voor Bamboo Disposables (toiletpapier uit bamboe). Schrijf een wekelijkse competitive intelligence brief voor Nathan, max 400 woorden, in nuchtere bedrijfstaal (geen activist taal, geen 'red de planeet').

Focus op: wat doet de concurrentie qua angles, hoe kan Bamboo daar op inhaken, welke hero-kansen (Ongebleekt 3 laags 48 rollen).

Data (JSON): $DIGEST_INPUT

Schrijf in Markdown met kopjes: 'Week in cijfers', 'Wat doet de concurrentie', 'Kansen voor Bamboo', 'Action items voor deze week'."

curl -sS -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$(jq -n --arg prompt "$PROMPT" '{
    model: "claude-opus-4-6",
    max_tokens: 1500,
    messages: [{role: "user", content: $prompt}]
  }')" > /tmp/digest_response.json

DIGEST_MD=$(jq -r '.content[0].text // "FAILED"' /tmp/digest_response.json)
echo "$DIGEST_MD" > /tmp/digest.md
```

---

## 4. Send email to Nathan

```bash
RECIPIENT="${BAMBOO_NATHAN_EMAIL:-nathan@bamboodisposables.nl}"
DATE=$(date +%Y-%m-%d)
SUBJECT="Bamboo Weekly Digest — $DATE"

# Convert markdown to simple HTML
HTML_BODY=$(echo "$DIGEST_MD" | sed 's/^### \(.*\)/<h3>\1<\/h3>/; s/^## \(.*\)/<h2>\1<\/h2>/; s/^# \(.*\)/<h1>\1<\/h1>/; s/^- \(.*\)/<li>\1<\/li>/')

curl -sS --url "smtps://$SMTP_HOST:465" \
  --user "$SMTP_USER:$SMTP_PASSWORD" \
  --mail-from "$SMTP_USER" \
  --mail-rcpt "$RECIPIENT" \
  -T - <<MAIL
From: Bamboo Ops <$SMTP_USER>
To: $RECIPIENT
Subject: $SUBJECT
Content-Type: text/html; charset=utf-8

<html><body>
<h1>Bamboo Weekly Digest — $DATE</h1>
$HTML_BODY
<hr><p><small>Gegenereerd door bm-weekly-digest · $TOTAL_ADS concurrentie-ads geanalyseerd</small></p>
</body></html>
MAIL
```

---

## 5. Archive to Airtable `Weekly_Digests`

```bash
DIGEST_RECORD=$(jq -n \
  --arg date "$DATE" \
  --arg digest "$DIGEST_MD" \
  --argjson ads_analyzed "$TOTAL_ADS" \
  --arg recipient "$RECIPIENT" \
  '{fields: {
    week_start: $date,
    digest_md: $digest,
    ads_analyzed: $ads_analyzed,
    recipient: $recipient,
    status: "sent"
  }}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Weekly_Digests" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$DIGEST_RECORD]}"
```

---

## 6. Telegram short ping + logger

```bash
curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=Markdown" \
  --data-urlencode "text=📊 *Weekly Digest verzonden*%0A$TOTAL_ADS concurrentie-ads geanalyseerd%0AVerstuurd naar $RECIPIENT"

LOG=$(jq -n --argjson ads "$TOTAL_ADS" '{fields: {
  routine_name: "bm-weekly-digest",
  status: "success",
  records_written: 1,
  summary: ($ads | tostring + " ads analyzed, digest emailed to Nathan")
}}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"
```

---

## Error handling

- Claude API fail → fall back to simple non-AI summary (counts per competitor)
- Email fail → log warning, digest still in Airtable
- Zero ads this week → exit 0 with status=empty

## Verification

```bash
/bm-weekly-digest
```
Expect: email to Nathan, Telegram ping, record in `Weekly_Digests`.
