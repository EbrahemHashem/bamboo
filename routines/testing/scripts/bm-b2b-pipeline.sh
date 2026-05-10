#!/usr/bin/env bash
# Auto-extracted from: bm-b2b-pipeline.md
# 5 bash block(s)
set +e

# ==== Block 1/5 ====
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/B2B_Leads?filterByFormula=NOT(OR(%7BStage%7D%3D%27Closed+Won%27%2C%7BStage%7D%3D%27Closed+Lost%27))&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/b2b_leads.json

LEAD_COUNT=$(jq '.records | length' /tmp/b2b_leads.json)
echo "Active B2B leads: $LEAD_COUNT"

if [ "$LEAD_COUNT" -eq 0 ]; then
  echo "[EMPTY] No active leads"
  exit 0
fi

# ==== Block 2/5 ====
HOT_LEADS=0
UPDATED=0
> /tmp/hot_leads.jsonl

jq -c '.records[]' /tmp/b2b_leads.json | while read -r lead; do
  LEAD_ID=$(echo "$lead" | jq -r '.id')
  EMAIL=$(echo "$lead" | jq -r '.fields.contact_email // ""')
  COMPANY=$(echo "$lead" | jq -r '.fields.company_name // "?"')

  [ -z "$EMAIL" ] && continue

  # Search Gmail for unread messages from this email
  QUERY="from:$EMAIL is:unread newer_than:1d"
  ENCODED_QUERY=$(printf '%s' "$QUERY" | jq -sRr @uri)

  MSGS=$(curl -sS "https://gmail.googleapis.com/gmail/v1/users/$GMAIL_USER/messages?q=$ENCODED_QUERY" \
    -H "Authorization: Bearer $GMAIL_ACCESS_TOKEN")

  MSG_COUNT=$(echo "$MSGS" | jq '.messages // [] | length')

  [ "$MSG_COUNT" -eq 0 ] && continue

  # Fetch first message body
  MSG_ID=$(echo "$MSGS" | jq -r '.messages[0].id')
  MSG=$(curl -sS "https://gmail.googleapis.com/gmail/v1/users/$GMAIL_USER/messages/$MSG_ID?format=full" \
    -H "Authorization: Bearer $GMAIL_ACCESS_TOKEN")

  SNIPPET=$(echo "$MSG" | jq -r '.snippet // ""' | tr '[:upper:]' '[:lower:]')

  # Classify interest (Dutch keyword matching)
  INTEREST="Medium"
  NEXT_ACTION="email 24u"
  if echo "$SNIPPET" | grep -qE "interesse|graag|offerte|meeting|bestellen|afspraak|proefzending"; then
    INTEREST="High"
    NEXT_ACTION="bel vandaag"
  elif echo "$SNIPPET" | grep -qE "te duur|geen interesse|niet geinteresseerd|geen behoefte|nee dank"; then
    INTEREST="Low"
    NEXT_ACTION="archiveer"
  elif echo "$SNIPPET" | grep -qE "later|volgend kwartaal|niet nu|over \d+ maand"; then
    INTEREST="Medium"
    NEXT_ACTION="follow-up 2w"
  fi

  # Update lead
  STAGE="Engaged"
  [ "$INTEREST" = "High" ] && STAGE="Qualified"
  [ "$INTEREST" = "Low" ] && STAGE="Closed Lost"

  curl -sS -X PATCH "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/B2B_Leads/$LEAD_ID" \
    -H "Authorization: Bearer $AIRTABLE_PAT" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg stage "$STAGE" --arg interest "$INTEREST" --arg action "$NEXT_ACTION" --arg snippet "$SNIPPET" '{
      fields: {
        Stage: $stage,
        Interest: $interest,
        Next_Action: $action,
        Last_Reply_Snippet: $snippet,
        Last_Reply_At: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
      }
    }')" > /dev/null

  UPDATED=$((UPDATED + 1))

  if [ "$INTEREST" = "High" ]; then
    echo "{\"company\":\"$COMPANY\",\"email\":\"$EMAIL\",\"snippet\":\"${SNIPPET:0:100}\"}" >> /tmp/hot_leads.jsonl
    HOT_LEADS=$((HOT_LEADS + 1))
  fi
done

echo "Updated: $UPDATED, hot leads: $HOT_LEADS"

# ==== Block 3/5 ====
if [ -s /tmp/hot_leads.jsonl ]; then
  MSG="🔥 *Hot B2B leads (Bamboo)*%0A"
  while IFS= read -r line; do
    C=$(echo "$line" | jq -r '.company')
    E=$(echo "$line" | jq -r '.email')
    S=$(echo "$line" | jq -r '.snippet')
    MSG="${MSG}• *${C}* (${E})%0A  _${S}_%0A"
  done < /tmp/hot_leads.jsonl
  MSG="${MSG}%0A→ Nathan: bel vandaag."

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=$MSG"
fi

# ==== Block 4/5 ====
LOG=$(jq -n --argjson leads "$LEAD_COUNT" --argjson updated "$UPDATED" --argjson hot "$HOT_LEADS" '{
  fields: {
    routine_name: "bm-b2b-pipeline",
    status: "success",
    records_written: $updated,
    summary: ($leads | tostring + " leads scanned, " + ($updated | tostring) + " updated, " + ($hot | tostring) + " hot"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"

# ==== Block 5/5 ====
# [SKIPPED slash-command] /bm-b2b-pipeline
