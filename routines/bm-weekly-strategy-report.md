---
name: bm-weekly-strategy-report
cron: "0 10 * * 1"
timezone: Europe/Amsterdam
mcps: [airtable]
owner: bamboo
status: active
origin: bamboo-weekly-strategy-report.json
---

# Weekly Strategy Report (Claude Sonnet)

Monday 10:00 — synthesizes last 14 days of Daily KPIs + Anomalies + Ad Variants + B2B Leads, calls Claude Sonnet to generate strategic analysis in Bamboo brand voice (nuchter, geen activisme), emails full report to Nathan.

---

## Environment Variables

- `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`
- `ANTHROPIC_API_KEY`
- `BAMBOO_NATHAN_EMAIL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`

---

## 1. Fetch 14d Daily KPIs + 7d Anomalies + Ad Variants + B2B

```bash
CUTOFF_14=$(date -d "14 days ago" +%Y-%m-%d 2>/dev/null || date -v-14d +%Y-%m-%d)
CUTOFF_7=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Daily_KPIs?filterByFormula=IS_AFTER(%7BDate%7D%2C%27$CUTOFF_14%27)&pageSize=20" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/kpis_14d.json

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Anomaly_Log?filterByFormula=IS_AFTER(%7Bdetected_at%7D%2C%27$CUTOFF_7%27)&pageSize=50" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/anomalies_7d.json

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Ad_Variants?filterByFormula=IS_AFTER(%7Bdate%7D%2C%27$CUTOFF_7%27)&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/ads_7d.json

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/B2B_Leads?filterByFormula=NOT(OR(%7BStage%7D%3D%27Closed+Won%27%2C%7BStage%7D%3D%27Closed+Lost%27))&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/b2b_active.json
```

---

## 2. Aggregate week-over-week

```bash
# Last 7d totals
LAST7_REV=$(jq '[.records[] | select(.fields.Date // "" | . >= "'$CUTOFF_7'") | .fields.Total_Revenue // 0] | add // 0' /tmp/kpis_14d.json)
LAST7_SPEND=$(jq '[.records[] | select(.fields.Date // "" | . >= "'$CUTOFF_7'") | .fields.Ad_Spend // 0] | add // 0' /tmp/kpis_14d.json)
LAST7_ROAS=$(echo "scale=2; $LAST7_REV / ($LAST7_SPEND + 0.001)" | bc)

# Prior 7d
PRIOR_START=$(date -d "14 days ago" +%Y-%m-%d 2>/dev/null || date -v-14d +%Y-%m-%d)
PRIOR_REV=$(jq '[.records[] | select(.fields.Date // "" | . >= "'$PRIOR_START'" and . < "'$CUTOFF_7'") | .fields.Total_Revenue // 0] | add // 0' /tmp/kpis_14d.json)
PRIOR_SPEND=$(jq '[.records[] | select(.fields.Date // "" | . >= "'$PRIOR_START'" and . < "'$CUTOFF_7'") | .fields.Ad_Spend // 0] | add // 0' /tmp/kpis_14d.json)
PRIOR_ROAS=$(echo "scale=2; $PRIOR_REV / ($PRIOR_SPEND + 0.001)" | bc)

# WoW
WOW_REV=$(echo "scale=2; ($LAST7_REV - $PRIOR_REV) / ($PRIOR_REV + 0.001) * 100" | bc)

# Anomaly counts
CRIT=$(jq '[.records[] | select(.fields.severity == "Critical")] | length' /tmp/anomalies_7d.json)
WARN=$(jq '[.records[] | select(.fields.severity == "Warning")] | length' /tmp/anomalies_7d.json)

# Top 5 ads by revenue
jq '[.records[] | {campaign: .fields.campaign_name, revenue: (.fields.revenue // 0), spend: (.fields.spend // 0)}] | group_by(.campaign) | map({campaign: .[0].campaign, revenue: ([.[].revenue] | add), spend: ([.[].spend] | add)}) | sort_by(-.revenue) | .[0:5]' /tmp/ads_7d.json > /tmp/top_ads.json

# Bottom 5 (underperformers: high spend, low revenue)
jq '[.records[] | {campaign: .fields.campaign_name, revenue: (.fields.revenue // 0), spend: (.fields.spend // 0)}] | group_by(.campaign) | map({campaign: .[0].campaign, revenue: ([.[].revenue] | add), spend: ([.[].spend] | add)}) | map(select(.spend > 20)) | sort_by(.revenue) | .[0:5]' /tmp/ads_7d.json > /tmp/bottom_ads.json

B2B_COUNT=$(jq '.records | length' /tmp/b2b_active.json)
B2B_VALUE=$(jq '[.records[].fields.estimated_value // 0] | add // 0' /tmp/b2b_active.json)
```

---

## 3. Build data packet + prompt

```bash
DATA_PACKET=$(jq -n \
  --argjson last7_rev "$LAST7_REV" --argjson last7_spend "$LAST7_SPEND" \
  --argjson prior_rev "$PRIOR_REV" --argjson prior_spend "$PRIOR_SPEND" \
  --arg last7_roas "$LAST7_ROAS" --arg prior_roas "$PRIOR_ROAS" \
  --arg wow_rev "$WOW_REV" --argjson crit "$CRIT" --argjson warn "$WARN" \
  --slurpfile top /tmp/top_ads.json --slurpfile bottom /tmp/bottom_ads.json \
  --argjson b2b_count "$B2B_COUNT" --argjson b2b_value "$B2B_VALUE" '{
    revenue_last_7d: $last7_rev,
    revenue_prior_7d: $prior_rev,
    revenue_wow_pct: ($wow_rev | tonumber),
    ad_spend_last_7d: $last7_spend,
    roas_last_7d: ($last7_roas | tonumber),
    roas_prior_7d: ($prior_roas | tonumber),
    anomalies_critical: $crit,
    anomalies_warning: $warn,
    top_5_ads: $top[0],
    bottom_5_ads: $bottom[0],
    b2b_active_leads: $b2b_count,
    b2b_pipeline_value: $b2b_value
  }')

PROMPT="Je bent strategisch CFO/COO-adviseur voor Bamboo Disposables (toiletpapier uit bamboe). Schrijf het wekelijkse strategie-rapport voor Nathan.

REGELS voor Bamboo brand voice:
- Nederlands, 'je/jij'
- Nuchter, geen activist taal (geen 'red de planeet', geen eco-guilt)
- Leidend motief: waarde per gebruik, minder verspilling, boomvrij
- Hero product: Ongebleekt 3 laags 48 rollen
- B2B targets: kleine kantoren, scholen, boutique hotels, praktijken, salons (96-rol volume)

DATA van afgelopen 7 dagen (vs prior 7d):
$DATA_PACKET

Geef terug als JSON met velden:
{
  \"summary\": \"3-4 zinnen over de week — wat viel op, wat betekent het\",
  \"top_wins\": [\"win 1\", \"win 2\", \"win 3\"],
  \"top_concerns\": [\"concern 1\", \"concern 2\"],
  \"recommendations\": [\"rec 1\", \"rec 2\", \"rec 3\"],
  \"action_items\": [\"specifieke actie deze week 1\", \"...2\", \"...3\"]
}

Antwoord ALLEEN met geldige JSON, geen extra tekst."

# Escape the prompt for JSON
JSON_PROMPT=$(echo "$PROMPT" | jq -Rs .)

curl -sS -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{
    \"model\": \"claude-sonnet-4-5\",
    \"max_tokens\": 2000,
    \"messages\": [{\"role\": \"user\", \"content\": $JSON_PROMPT}]
  }" > /tmp/strategy_response.json

CLAUDE_TEXT=$(jq -r '.content[0].text // "{}"' /tmp/strategy_response.json)
# Strip any potential code-fence lines (Claude prompt says JSON-only, but be safe)
# Use python -c to avoid triple-backtick literal in bash
CLAUDE_JSON=$(python -c "import sys,re; t=sys.stdin.read(); print(re.sub(r'^(\`\`\`\w*|\`\`\`)$', '', t, flags=re.MULTILINE))" <<< "$CLAUDE_TEXT")
echo "$CLAUDE_JSON" > /tmp/strategy.json
```

---

## 4. Archive + email to Nathan

```bash
DATE=$(date +%Y-%m-%d)
WEEK=$(date +%V)

RECORD=$(jq -n \
  --arg week "$WEEK" --arg date "$DATE" \
  --slurpfile strategy /tmp/strategy.json \
  --argjson rev "$LAST7_REV" --argjson spend "$LAST7_SPEND" --arg wow "$WOW_REV" '{
    fields: {
      Week: $week,
      Date: $date,
      Summary: ($strategy[0].summary // ""),
      Top_Wins: (($strategy[0].top_wins // []) | join("\n")),
      Top_Concerns: (($strategy[0].top_concerns // []) | join("\n")),
      Recommendations: (($strategy[0].recommendations // []) | join("\n")),
      Action_Items: (($strategy[0].action_items // []) | join("\n")),
      Revenue_Week: $rev,
      Ad_Spend_Week: $spend,
      Revenue_WoW_Pct: ($wow | tonumber)
    }
  }')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Strategy_Reports" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$RECORD]}"

# Email
RECIPIENT="${BAMBOO_NATHAN_EMAIL:-nathan@bamboodisposables.nl}"
MARKDOWN=$(jq -r '"# Bamboo Strategy Report — week " + "'$WEEK'" + "\n\n## Summary\n" + .summary + "\n\n## Top Wins\n" + (.top_wins | map("- " + .) | join("\n")) + "\n\n## Top Concerns\n" + (.top_concerns | map("- " + .) | join("\n")) + "\n\n## Recommendations\n" + (.recommendations | map("- " + .) | join("\n")) + "\n\n## Action Items\n" + (.action_items | map("- " + .) | join("\n"))' /tmp/strategy.json)

HTML=$(echo "$MARKDOWN" | sed 's/^## \(.*\)/<h2>\1<\/h2>/; s/^# \(.*\)/<h1>\1<\/h1>/; s/^- \(.*\)/<li>\1<\/li>/')

curl -sS --url "smtps://$SMTP_HOST:465" \
  --user "$SMTP_USER:$SMTP_PASSWORD" \
  --mail-from "$SMTP_USER" \
  --mail-rcpt "$RECIPIENT" \
  -T - <<MAIL
From: Bamboo Ops <$SMTP_USER>
To: $RECIPIENT
Subject: Bamboo Strategy Report — Week $WEEK

<html><body>
$HTML
<hr><p><small>Omzet week: €$LAST7_REV · WoW ${WOW_REV}%% · Ads €$LAST7_SPEND · ROAS ${LAST7_ROAS}x</small></p>
</body></html>
MAIL
```

---

## 5. Log

```bash
LOG=$(jq -n --arg week "$WEEK" --argjson rev "$LAST7_REV" '{
  fields: {
    routine_name: "bm-weekly-strategy-report",
    status: "success",
    records_written: 1,
    summary: ("Week " + $week + " — €" + ($rev | tostring) + " revenue — report emailed to Nathan"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"
```

---

## Error handling

- Claude API fail → fall back to data-only email (no strategic analysis)
- Claude returns non-JSON → log warning, send raw text in email
- Email fail → report still in Airtable, log warning

## Verification

```bash
/bm-weekly-strategy-report
```
Expect: row in `Strategy_Reports`, email to Nathan with markdown-rendered report.
