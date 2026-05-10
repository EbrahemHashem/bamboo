---
name: bm-ab-test-evaluator
cron: "0 22 * * *"
timezone: Europe/Amsterdam
mcps: [airtable]
owner: bamboo
status: active
origin: bamboo-ab-test-evaluator.json
---

# A/B Test Evaluator

Daily 22:00 — fetches running A/B tests from Airtable, pulls Shopify conversion data per variant, declares winner if >=100 sessions/variant AND >=10% lift. Updates Airtable + alerts Nathan. **No auto-apply** — Nathan approves before going live.

---

## Environment Variables

- `AIRTABLE_PAT`
- `AIRTABLE_BASE_ID`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_STORE_URL`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

Check: `env | grep -E "AIRTABLE|SHOPIFY|TELEGRAM"`. Stop if missing.

---

## 1. Fetch running tests

```bash
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/AB_Tests?filterByFormula=%7BStatus%7D%3D%27Running%27" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/running_tests.json

TEST_COUNT=$(jq '.records | length' /tmp/running_tests.json)
echo "Running tests: $TEST_COUNT"

if [ "$TEST_COUNT" -eq 0 ]; then
  echo "[EMPTY] No running tests"
  exit 0
fi
```

---

## 2. For each test: pull Shopify orders since test start

```bash
WINNERS_DECLARED=0
> /tmp/winners.jsonl

jq -c '.records[]' /tmp/running_tests.json | while read -r test; do
  TEST_ID=$(echo "$test" | jq -r '.id')
  TEST_NAME=$(echo "$test" | jq -r '.fields.test_name')
  START_DATE=$(echo "$test" | jq -r '.fields.start_date')
  VARIANT_A=$(echo "$test" | jq -r '.fields.variant_a_url // ""')
  VARIANT_B=$(echo "$test" | jq -r '.fields.variant_b_url // ""')

  # Pull Shopify orders since start_date
  ORDERS=$(curl -sS "https://$SHOPIFY_STORE_URL/admin/api/2024-01/orders.json?created_at_min=${START_DATE}T00:00:00Z&status=any&limit=250" \
    -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN")

  # Orders with variant_a landing page vs variant_b (via landing_site field or UTM)
  A_ORDERS=$(echo "$ORDERS" | jq --arg v "$VARIANT_A" '[.orders[] | select(.landing_site // "" | contains($v))] | length')
  B_ORDERS=$(echo "$ORDERS" | jq --arg v "$VARIANT_B" '[.orders[] | select(.landing_site // "" | contains($v))] | length')

  # Sessions (approximation: use referring_site hits or set via test config)
  A_SESSIONS=$(echo "$test" | jq -r '.fields.variant_a_sessions // 0')
  B_SESSIONS=$(echo "$test" | jq -r '.fields.variant_b_sessions // 0')

  # Calculate CR
  A_CR=$(echo "scale=4; ($A_ORDERS + 0) / ($A_SESSIONS + 0.001)" | bc 2>/dev/null || echo "0")
  B_CR=$(echo "scale=4; ($B_ORDERS + 0) / ($B_SESSIONS + 0.001)" | bc 2>/dev/null || echo "0")

  LIFT=$(echo "scale=2; ($B_CR - $A_CR) / ($A_CR + 0.001) * 100" | bc 2>/dev/null || echo "0")
  ABS_LIFT=$(echo "$LIFT" | tr -d '-')

  echo "Test: $TEST_NAME | A CR=$A_CR | B CR=$B_CR | lift=$LIFT%"

  # Significance gate
  if [ "$A_SESSIONS" -ge 100 ] && [ "$B_SESSIONS" -ge 100 ] && (( $(echo "$ABS_LIFT >= 10" | bc -l) )); then
    WINNER=$(echo "$LIFT" | awk '{ if ($1 > 0) print "B"; else print "A" }')

    # Update Airtable: Status=Winner Declared
    curl -sS -X PATCH "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/AB_Tests/$TEST_ID" \
      -H "Authorization: Bearer $AIRTABLE_PAT" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg winner "$WINNER" --arg lift "$LIFT" --argjson ao "$A_ORDERS" --argjson bo "$B_ORDERS" '{
        fields: {
          Status: "Winner Declared",
          Winner: $winner,
          Lift_Pct: ($lift | tonumber),
          Variant_A_Orders: $ao,
          Variant_B_Orders: $bo,
          Declared_At: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
        }
      }')"

    echo "{\"test\":\"$TEST_NAME\",\"winner\":\"$WINNER\",\"lift\":$LIFT}" >> /tmp/winners.jsonl
    WINNERS_DECLARED=$((WINNERS_DECLARED + 1))
  fi
done
```

---

## 3. Telegram alert if winners

```bash
if [ -s /tmp/winners.jsonl ]; then
  MSG="🏆 *A/B Test Winners (Bamboo)*%0A"
  while IFS= read -r line; do
    NAME=$(echo "$line" | jq -r '.test')
    WIN=$(echo "$line" | jq -r '.winner')
    LIFT=$(echo "$line" | jq -r '.lift')
    MSG="${MSG}• *${NAME}* → variant ${WIN} wint (${LIFT}%% lift)%0A"
  done < /tmp/winners.jsonl
  MSG="${MSG}%0ANathan: check & apply."

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=$MSG"
fi
```

---

## 4. Log execution

```bash
LOG=$(jq -n --argjson tests "$TEST_COUNT" --argjson winners "$WINNERS_DECLARED" '{
  fields: {
    routine_name: "bm-ab-test-evaluator",
    status: (if $tests == 0 then "empty" else "success" end),
    records_written: $winners,
    summary: ($tests | tostring + " tests evaluated, " + ($winners | tostring) + " winners declared"),
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

- Shopify API fail for one test → log warning, skip that test, continue
- Missing variant URLs → skip test, mark needs_config
- Zero winners declared → log success with 0 records

## Verification

```bash
/bm-ab-test-evaluator
```
Expect: Airtable updates on winning tests, Telegram alert with winners, log entry.
