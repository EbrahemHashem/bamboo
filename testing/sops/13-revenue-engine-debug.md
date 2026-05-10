# SOP 13 — Revenue Engine Debug

## Wanneer gebruiken
Systeem 5 (Revenue Engine) — retentie, B2B, reorder automation — werkt niet zoals verwacht.

## Debug per component

### /customer-segmenter geeft geen segmenten
1. Shopify MCP connected? → SOP 10
2. Store heeft genoeg klanten? Min 10 voor zinvolle segmentatie
3. Customer Segments tabel bestaat in Airtable met juiste velden?

### /email-flow-builder output wordt niet naar Klaviyo gestuurd
- Skill is bewust "draft mode": genereert flow spec, Nathan reviewt en activeert handmatig in Klaviyo
- Als auto-push gewenst: Klaviyo MCP write scopes check → SOP 11

### Reorder-engine berekent verkeerde timing
- Check `.env` waarden: `BAMBOO_REORDER_24_DAYS=60`, `BAMBOO_REORDER_48_DAYS=120`, `BAMBOO_REORDER_96_DAYS=240`
- Last Order Date in Shopify correct gesynct?
- Product preference in Customer Segments gevuld?

### B2B pipeline (n8n) detecteert geen replies
- Gmail/IMAP credential in n8n correct? Check labels waar replies binnenkomen
- B2B Leads tabel heeft correct stages? (New/Contacted/Engaged/etc.)
- Reply-classifier skill draait? Check output naar Notes veld

### /b2b-outreach output is te prekerig
- `b2b-target-groups.md` heeft duidelijke tone guidance per sector
- CLAUDE.md geladen? Activist-guardrail actief?
- Voor B2B: extra nuchter, zakelijk, lead met waarde per gebruik (niet duurzaamheid)

### Retention flow monitor (n8n) geeft geen alerts
- Klaviyo flows moeten al active zijn — monitor checkt declining performance
- Threshold check: `open rate <20%` is hard-coded; pas aan als needed
- Email Performance tabel wordt gevuld? Test handmatig

## Smoke test

```
/customer-segmenter
/reorder-engine
/b2b-prospector "yoga studios Amsterdam"
/b2b-outreach "Yoga Lab Amsterdam — 15 medewerkers, focus wellness"
```

Output moet Dutch + nuchter + waarde-eerst zijn. Voor B2B: zakelijke toon, geen hype.
