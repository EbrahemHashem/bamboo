# SOP 03 — Airtable Debug

**Gebruik wanneer:** Airtable errors (401/403/404), tabel schema mismatch, data niet geschreven, formulas falen.

---

## Stap 1: Verifieer base + tables bestaan

```bash
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  "https://api.airtable.com/v0/meta/bases/$AIRTABLE_BASE_ID/tables" | python3 -m json.tool
```

Verwacht: JSON met 3+ tables (Competitors, Ad Research, Weekly Digest — plus Systeem 3's Campaigns, Ad Variants, Performance Rules, Decisions Log).

**Fouten:**
- `404 NOT_FOUND` → Base ID fout (check url: `https://airtable.com/{appXXXXX}/...`)
- `403 insufficient_permissions` → PAT mist `schema.bases:read` scope
- `401 invalid_token` → token fout of verlopen

---

## Stap 2: Check PAT scopes

Ga naar https://airtable.com/create/tokens en check dat je token deze scopes heeft:
- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write` (voor install script)
- Access tot de juiste workspace/base

**Regenerate token als scopes missen.** Oude token werkt dan niet meer — update in `.env` en `settings.local.json`.

---

## Stap 3: Tabel schema mismatch

Als `/scrape-ads` faalt met "field not found" errors:

```bash
# Haal huidig schema op
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  "https://api.airtable.com/v0/meta/bases/$AIRTABLE_BASE_ID/tables" \
  | python3 -m json.tool > /tmp/airtable-schema.json

# Vergelijk met expected schema
cat ~/Bamboo/systems/1-competitor-scraping/airtable-schema.md
```

**Missende velden?** Voeg toe via Airtable UI:
1. Open tabel
2. Right-click column header → Add field right
3. Gebruik exacte naam uit schema doc (case-sensitive!)
4. Type moet matchen (singleLineText, number, date, etc.)

**Belangrijke velden checken:**
- `Ad Research` heeft `Ad Archive ID` als primary field (singleLineText)
- `Ad Research` heeft `Competitor` als multipleRecordLinks → `Competitors` table
- `Performance Rules` heeft `Active` checkbox (voor n8n filter)

---

## Stap 4: Writes falen

### Symptoom: `422 Unprocessable Entity`

Meestal: veldwaarde type komt niet overeen met field type.

```bash
# Test minimal write
curl -X POST -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"records":[{"fields":{"Name":"test"}}]}' \
  "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Competitors"
```

Als error noemt specifiek veld → check type in schema.

### Symptoom: `INVALID_MULTIPLE_CHOICE_OPTIONS`

Select fields moeten exact matchen. Bijvoorbeeld `Winner Status` singleSelect met opties `[New, Rising, Winner, Refresh, Dying]` — je mag niet schrijven "winner" (lowercase) of "active".

**Fix**: in Airtable UI, right-click field → Customize field type → voeg options toe.

---

## Stap 5: Formulas falen

Veelvoorkomende formule errors:

### `Days Live` formule
```
DATETIME_DIFF(TODAY(), {Start Date}, 'days')
```
Als error → `Start Date` field is geen date type of mist quotes rond 'days'.

### `Is Winner` formule
```
IF(AND({Days Live} > 14, {Impressions Range} = "1M-5M"), TRUE(), FALSE())
```
`Impressions Range` kan ook andere strings zijn — check current data.

### `Is Refresh` auto-detectie
Niet via formule, maar via script/scrape logica. Als mist → handmatig vullen in Ad Research table of skill updaten.

---

## Stap 6: Rate limits

Airtable limit: **5 requests/second per base**.

Als `/scrape-ads` of `/competitor-analyst` timeout heeft:
- Check error: `429 Too Many Requests`
- Fix in skill: batch inserts (10 records per call) + sleep 250ms tussen calls

Skills die dit al doen: `scrape-ads.md`, `competitor-research.md`. Als ze toch limit raken → check of er parallel meerdere runs tegelijk zijn.

---

## Stap 7: Linked records problemen

`Ad Research.Competitor` is een `multipleRecordLinks` naar `Competitors` table. Als writes falen:

1. **Competitor row moet bestaan** voordat Ad Research row geschreven wordt
2. **Link gebruikt record ID** (recXXXX), niet de naam
3. Skill moet eerst Competitors table lookup doen, dan het recXXXX gebruiken

Test:
```bash
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Competitors?filterByFormula=%7BName%7D%3D%22The%20Good%20Roll%22"
```
Verwacht: 1 row met `id: recXXX`. Die recXXX gebruiken in Ad Research writes.

---

## Stap 8: Install script Airtable auto-setup

Als install script probeert base automatisch op te zetten (toekomstige versie) en faalt:

1. Sla over — Nathan/developer doet handmatig via Airtable UI
2. Schemas staan gedocumenteerd in:
   - `~/Bamboo/systems/1-competitor-scraping/airtable-schema.md`
   - `~/Bamboo/systems/3-ad-management/airtable-schema-ads.md`
3. Duurt ~15 min om handmatig op te zetten

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| `invalid_token` | PAT fout/verlopen | Regenerate op airtable.com/create/tokens |
| `NOT_FOUND` | Base ID fout | Check URL `airtable.com/appXXXX` |
| `INVALID_FIELD_NAME` | Skill verwacht andere veldnaam | Check schema doc, hernoem in Airtable |
| `INVALID_MULTIPLE_CHOICE_OPTIONS` | Select value niet bestaat | Voeg option toe in UI |
| Rate limit 429 | Te veel parallelle requests | Serieel uitvoeren, 250ms sleep |
| Linked field leeg | Competitor row mist | Competitors table eerst vullen |
| Formula error #ERROR! | Field type mismatch | Check dat referenced field correct type is |
