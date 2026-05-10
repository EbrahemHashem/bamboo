# SOP 06 — n8n Workflow Debug

**Gebruik wanneer:** n8n workflows importeren niet, executes falen, of cron triggers niet.

---

## Stap 1: n8n draait + versie check

### Lokaal (Docker):
```bash
docker ps | grep n8n
# Verwacht: container "n8n" running op 5678

# Als niet draait:
docker start n8n
# Of nieuwe container:
docker run -d --name n8n --restart always -p 5678:5678 \
  -v $HOME/n8n-data:/home/node/.n8n n8nio/n8n

# Check version (moet >= 1.0 voor moderne API)
curl http://localhost:5678/healthz
```

### n8n.cloud:
Check dashboard → Settings → About → version moet >= 1.20 zijn.

---

## Stap 2: Workflow import

Open n8n UI: http://localhost:5678 (of cloud URL).

**Import methode 1: UI**
1. Workflows → New → Import from file
2. Upload `bamboo-competitor-daily-scrape.json`
3. Workflow opent — check dat alle nodes groen zijn (geen rode error icons)

**Veelvoorkomende import errors:**

- `Unknown node type: n8n-nodes-base.xxx`
  - n8n versie te oud, update container: `docker pull n8nio/n8n && docker restart n8n`
- `Missing credentials`
  - Node vraagt om auth config — klik op node, verbind credentials
- `Invalid JSON`
  - JSON file corrupt — valideer met `python3 -m json.tool bamboo-competitor-daily-scrape.json`

---

## Stap 3: Credentials opzetten

Per workflow moeten deze credentials bestaan in n8n:

### Airtable credential
1. Settings → Credentials → Add → Airtable API
2. API Key = `$AIRTABLE_API_KEY` (PAT)
3. Save, noem "Bamboo Airtable"

### HTTP Request (voor Apify, Meta, Anthropic)
- Geen expliciete credential nodig, API keys gaan via URL params of headers in de node config

### Telegram Bot credential
1. Settings → Credentials → Add → Telegram API
2. Access Token = `$TELEGRAM_BOT_TOKEN`
3. Save, noem "Bamboo Telegram"

### SMTP email credential (voor weekly digest)
1. Settings → Credentials → Add → SMTP
2. Host, Port, User, Password (gebruik Gmail app password of sendgrid)

**Link credentials aan nodes**: open workflow, klik op elke node dat credentials nodig heeft, select de juiste.

---

## Stap 4: Env variables in n8n

Lokaal (Docker): pass via `-e` flags of docker-compose:
```bash
docker stop n8n && docker rm n8n
docker run -d --name n8n --restart always -p 5678:5678 \
  -v $HOME/n8n-data:/home/node/.n8n \
  -e AIRTABLE_API_KEY="$AIRTABLE_API_KEY" \
  -e AIRTABLE_BASE_ID="$AIRTABLE_BASE_ID" \
  -e APIFY_API_TOKEN="$APIFY_API_TOKEN" \
  -e META_AD_ACCOUNT_ID="$META_AD_ACCOUNT_ID" \
  -e META_ACCESS_TOKEN="$META_ACCESS_TOKEN" \
  -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  -e TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e NATHAN_EMAIL="$NATHAN_EMAIL" \
  n8nio/n8n
```

n8n.cloud: Settings → Environment Variables → add each.

Test in workflow: voeg een temp "Set" node toe die `{{ $env.AIRTABLE_API_KEY }}` print — moet waarde tonen (niet leeg string).

---

## Stap 5: Manual execute

In workflow editor → klik "Execute Workflow" (rechtsboven).

Debug per node:
- Groene node = succes
- Rode node = error → klik om details te zien
- Oranje = warning / skipped

**Alle 3 Bamboo workflows hebben deze eerste nodes** die eerst moeten werken:
1. `bamboo-competitor-daily-scrape` → start met Cron → Airtable list → HTTP Apify
2. `bamboo-weekly-digest` → start met Cron → Airtable filter → Anthropic API
3. `bamboo-ad-performance-loop` → start met Cron → Airtable rules + HTTP Meta insights

---

## Stap 6: HTTP Request nodes debuggen

De meeste complexe nodes zijn HTTP Requests naar Apify, Meta, Anthropic.

**Voor Apify:**
```json
{
  "method": "POST",
  "url": "https://api.apify.com/v2/acts/apify~meta-ad-library-scraper/runs",
  "qs": { "token": "={{ $env.APIFY_API_TOKEN }}" },
  "body": {
    "pageIds": "={{ $json['Facebook Page ID'] }}",
    "countryCode": "NL",
    "adActiveStatus": "ACTIVE",
    "maxItems": 50
  }
}
```
Check: `$json['Facebook Page ID']` werkt alleen als vorige node die key terug gaf. Add "Set" node ervoor om te inspecteren.

**Voor Anthropic:**
```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "headers": {
    "x-api-key": "={{ $env.ANTHROPIC_API_KEY }}",
    "anthropic-version": "2023-06-01"
  }
}
```
Check model: moet `claude-opus-4-6` zijn (of `claude-sonnet-4-6` als opus quota beperkt).

**Voor Meta Graph API:**
- URL moet `https://graph.facebook.com/v19.0/...`
- `access_token` als query param OR header

---

## Stap 7: Function nodes (JavaScript)

`Dedupliceer + Classificeer` en `Evalueer per Ad` zijn function nodes met custom JS.

Debug:
1. Open node
2. Add `console.log(items)` om input te zien
3. Execute workflow
4. Check "Executions" tab voor console output

**Veelvoorkomende fouten:**
- `items[0].json.rules is undefined` → vorige node output format anders dan verwacht
- `Cannot read property 'value' of undefined` → Meta API response field mist (add `?.` optional chaining)
- `items.map is not a function` → items is object ipv array

---

## Stap 8: Cron trigger werkt niet

Workflow is **inactive** totdat je de toggle rechtsboven op "Active" zet.

```
[Inactive]  [ ⏻ Active ]
```

Check:
- Toggle is groen/on
- Cron expression klopt: `0 7 * * *` (07:00 elke dag), `0 9 * * 1` (maandag 09:00)
- Timezone = Europe/Amsterdam (in node config)
- n8n container draait 24/7 (anders cron skipt)

Test: wijzig cron tijdelijk naar `*/5 * * * *` (elke 5 min) → wacht 5 min → check Executions tab.

---

## Stap 9: Execution history

n8n → Executions tab (links onder) → zie alle recent runs per workflow.

Status:
- ✅ Success
- ❌ Error → klik voor stack trace
- ⏸ Waiting (cron)

Als alle recent runs fail op zelfde node → fix die node config.

---

## Stap 10: Logs bekijken

Lokaal Docker:
```bash
docker logs -f n8n 2>&1 | grep -i error
```

n8n.cloud: Logs tab in execution detail.

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| Unknown node type | n8n version oud | `docker pull n8nio/n8n && docker restart n8n` |
| Credentials empty | Niet verbonden aan node | Klik node → select credential |
| Env var undefined | Niet gepassed bij container start | Restart met `-e` flags |
| Cron doesn't fire | Workflow inactive | Zet toggle aan |
| Airtable 401 | Credential fout | Update PAT in credential |
| Function error | JS syntax of missing field | `console.log` input om te zien |
| HTTP timeout | API slow | Increase timeout in node settings |
| Webhook 404 | Workflow niet active of url verkeerd | Activeer workflow, check URL in webhook node |
| Docker n8n crashes | Out of memory | Increase Docker RAM in settings |
