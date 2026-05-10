# Conversion Guardrails — Regels voor alle page copy varianten

Elke copy-variant die Systeem 4 genereert (via `/page-optimizer`, `/bundle-creator`, `/checkout-optimizer`, `/pricing-strategist`) moet door deze checks voor hij in Airtable `Page Variants` belandt. Skills die deze guardrails niet toepassen, falen.

---

## Regel 1 — Taal

- **Altijd Nederlands**. Geen Engelse woorden tenzij Nathan expliciet vraagt (zeldzame productterm mag, marketingtaal nooit).
- **Altijd "je/jij"** — nooit "u".
- **Amsterdamse/NL nuchterheid** — geen corporate gelul, geen hype.
- Geen uitroeptekens in serieuze claims. Max 1 uitroepteken per hele pagina, en alleen als het natuurlijk voelt.

---

## Regel 2 — Geen activist-taal

**Trigger woorden** (als deze voorkomen → herschrijven):
- `redd`, `redden`, `red de...`
- `planeet`
- `onze kinderen`
- `toekomst van...`
- `verantwoordelijkheid`
- `maak statement`, `neem stelling`, `tijd om`
- `schreeuwen om`
- `samen kunnen we`, `samen redden`
- `stop met...` (als moreel appeal)

**Regel**: als 1 van deze woorden in een variant staat → schrijf de zin opnieuw, waarde-eerst, nuchter, zonder moreel appeal. Sla de afgewezen versie NIET op in Airtable als voorstel.

**Activist Check field** in `Page Variants` tabel: `Clean` of `Rewrite Needed`. Nooit `Clean` als trigger woord voorkomt.

---

## Regel 3 — 2-van-3 regel (hard)

Elke copy-variant raakt minimaal 2 van de 3 kernwaarden:
1. **Meer gebruikswaarde** — meer vellen, langer doen, minder vaak kopen, 48 rollen ≈ 100 normale rollen
2. **Minder verspilling** — minder vervangmomenten, voorraadrust, minder afval
3. **Geen bomen** — boomvrij bamboe, FSC, plasticvrij verpakt, biologisch afbreekbaar

**Check**: na genereren → tel welke van de 3 geraakt worden. Als <2 → herschrijven tot het er 2 haalt. Pas dan opslaan.

`Two Of Three Check` field in Airtable: `OK` of `Fail`. Fail wordt nooit als voorstel bewaard, alleen gelogd als debug.

---

## Regel 4 — Value-first copy

- **Nooit prijs per doos als primary frame.**
- **Altijd waarde per gebruik**: "48 rollen ≈ 100 normale rollen", "96 rollen ≈ 200 normale rollen", "300 vel per rol", "een doos die weken langer meegaat"
- Prijs mag genoemd worden, maar komt NA de waarde-frame, nooit ervoor
- Voorbeeld:
  - **Fout**: "€34,95 voor 48 rollen"
  - **Goed**: "48 rollen — gelijk aan ongeveer 100 normale rollen. Weken minder bestelmomenten."

---

## Regel 5 — Hero product positionering

**Ongebleekt 3 laags 48 rollen** is het hero product. Overal waar het product kan — landing page hero, homepage featured, collection page bovenin, upsell in cart — krijgt hij het sterkste slot. Andere producten mogen genoemd worden, maar niet vóór de hero.

Uitzonderingen:
- Dedicated productpagina van een ander product (daar wint dat product natuurlijk)
- B2B 96 rollen landing (daar wint 96)
- Proefdoos campagne (daar wint 24)

---

## Regel 6 — Trust elementen volgorde

Op elke productpagina en landing page moeten trust elementen in deze volgorde staan, van boven naar onder:

1. **Gebruikswaarde** — "48 rollen ≈ 100 normale rollen", specs, "langer doen"
2. **Comfort** — 3 laags zacht, 2 laags slim, ongebleekt natuurlijk
3. **Duurzaamheid** — boomvrij bamboe, FSC, plasticvrij, biologisch afbreekbaar
4. **Gezondheid** (ondersteunend) — hypoallergeen, geurvrij, geschikt voor gevoelige huid

Nooit duurzaamheid eerst. Converteert zwak bij cold traffic.

---

## Regel 7 — CTA stijl

- **Direct, kort, zonder hype**
- Goede voorbeelden: `Bestel nu`, `Kies jouw pakket`, `Start met proberen`, `Naar bestellen`, `Zet in mijn mandje`
- Foute voorbeelden: `Red mee!`, `Doe het NU`, `Laatste kans!!`, `Word een bewuste koper`, `Join the movement`

Bij bundels mag de CTA productspecifiek zijn: `Kies mijn proefdoos`, `Bestel mijn voorraad voor 3 maanden`, etc. Altijd nuchter.

---

## Regel 8 — Mobiel eerst

- Copy moet **mobiel leesbaar** zijn: korte zinnen, max 2 regels per claim, geen lange alinea's boven de fold
- Bullets gebruiken waar het natuurlijk voelt — niet forceren
- Hero headline max 8 woorden op mobile
- Subline max 15 woorden

---

## Regel 9 — Geen overpromise op 2 laags

De Ongebleekt 2 laags lijn is de **slimme basiskeuze**, niet de luxe optie. Nooit "premium" of "luxe" claimen voor 2 laags. Wel: "slim", "basis", "nuchter", "rationeel", "efficiënt".

De Blanc 3 laags is **brugproduct**, niet "minder puur". Nooit vergelijken met ongebleekt als "minder goed" — het is een andere keuze voor een andere doelgroep.

---

## Regel 10 — Referentie Systeem 2 visuals

Page copy verwijst waar zinvol naar assets die Systeem 2 produceert (hero images, bundel mockups, testimonial statics). Niet verplicht — maar als een variant duidelijk vraagt om visual support, noteer dat in `Notes` field zodat Nathan weet dat er visual work nodig is.

---

## Check-flow voor elke generate skill

Elke skill die copy produceert, moet dit flow volgen:

```
1. Genereer variant (Bamboo voice, waarde-eerst, 2-van-3 in gedachten)
2. Activist-check → loop trigger woorden door. Match? → herschrijf.
3. 2-van-3 check → tel geraakte waarden. <2? → herschrijf.
4. Value-first check → staat waarde boven prijs? Nee → herordenen.
5. Hero check → als het product in context hoort, krijgt hero de sterkste slot? Nee → herordenen.
6. Trust volgorde check → gebruikswaarde → comfort → duurzaamheid. Fout? → herordenen.
7. CTA check → direct, kort, geen hype. Fout? → herschrijf CTA.
8. Pas dan → opslaan in Airtable met Two Of Three Check=OK, Activist Check=Clean
```

Als een variant na 3 herschrijfpogingen nog steeds faalt → sla hem niet op, log naar Telegram als "variant kon niet gegenereerd worden, Nathan moet dit handmatig doen".
