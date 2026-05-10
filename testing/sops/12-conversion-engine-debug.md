# SOP 12 — Conversion Engine Debug

## Wanneer gebruiken
Systeem 4 (Conversion Engine) draait maar output klopt niet, of automations triggeren fout.

## Debug per skill

### /conversion-analyst faalt of lege output
1. Shopify MCP connected? → SOP 10
2. Airtable Ad Variants tabel bevat data? (uit Systeem 3)
3. Periode klopt? Default laatste 7 dagen — bij nieuwe store mogelijk te weinig data
4. Flag-logica: check `.env` `BAMBOO_CR_FLAG_THRESHOLD` en `BAMBOO_CLICKS_NO_CONVERSION_THRESHOLD`

### /page-optimizer output is activist/preachy
- CLAUDE.md correct geladen? Check `~/Bamboo/CLAUDE.md` bestaat
- `conversion-guardrails.md` bevat trigger words die geblokkeerd moeten worden
- Opnieuw runnen met expliciete instructie: "nuchter, niet activistisch, 2-van-3 check"

### /ab-test-manager schrijft niet naar Airtable
- AB Tests tabel bestaat met juiste velden? Check `airtable-schema-conversion.md`
- Airtable API key heeft write access? PAT scope `data.records:write`

### Conversion monitor (n8n) triggert niet
- Cron syntax correct? `0 */6 * * *` (elke 6 uur)
- n8n instance actief? (Docker draait of n8n.cloud)
- Shopify credential in n8n ingevuld?
- Airtable credential in n8n ingevuld?

### AB test evaluator declareert geen winner
- Min sessions per variant bereikt? Check `.env` `BAMBOO_AB_MIN_SESSIONS` (default 100)
- Min lift bereikt? Check `BAMBOO_AB_MIN_LIFT` (default 10%)
- Status van test = `Running` in Airtable?

## Smoke test

```
/conversion-analyst "laatste 30 dagen"
/page-optimizer "test variant voor Ongebleekt 3L 48"
/store-page-audit "https://bamboodisposables.nl/products/ongebleekt-3-laags"
```

Alle drie moeten Dutch output geven, hero product correct genoemd krijgen, en 2-van-3 regel hanteren.
