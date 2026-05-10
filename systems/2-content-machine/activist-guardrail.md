# Activist Guardrail — Content Check

Voor elke stuk content die dit systeem genereert, draait een laatste check om te voorkomen dat Bamboo klinkt als de stereotype activist eco-merken (The Good Roll, Who Gives A Crap). Bamboo's merkwaarde zit juist in **slim/volwassen/nuchter**.

---

## 3-staps check

### Check 1: Activist trigger woorden
Scan de tekst op deze triggers (case-insensitive):

**Hoog risico (automatisch herschrijven):**
- "red(den)"
- "stop met"
- "samen"
- "planeet"
- "onze kinderen"
- "toekomst van" (in eco-context)
- "verantwoordelijkheid"
- "tijd om"
- "maak een statement"
- "neem stelling"
- "schreeuwen om"
- "crisis" / "noodtoestand"

**Medium risico (flag + review):**
- "bomen" (alleen oké in "geen bomen" / "boomvrij")
- "planeet"
- "klimaat" (oké alleen feitelijk)
- "ontbossing"
- Uitroeptekens in serieuze claims (meer dan 1 per alinea)

**Actie bij hit:**
- Hoog risico → automatisch herschrijven richting waarde-eerst
- Medium risico → behouden alleen als feitelijk, niet moraliserend

### Check 2: 2-van-3 kernregel
Bevat de tekst minimaal **2 van de 3**:
1. Meer gebruikswaarde (vellen, langer doen, minder vaak kopen, voorraadduur)
2. Minder verspilling (minder bestellen, minder afval, minder vervangen)
3. Geen bomen (boomvrij, bamboe, FSC, plasticvrij)

Zo niet → voeg ontbrekende regel toe, liefst de ontbrekende waarde-laag.

### Check 3: Tone consistency
- Nederlands? (Engels alleen als Nathan expliciet vraagt)
- "je/jij" en niet "u"?
- Geen corporate stijf taalgebruik?
- Geen fake motivational quotes?

---

## Herschrijf-regels

### Regel 1: Moreel → Rationeel
❌ "Red de planeet met bamboe toiletpapier"
✅ "48 rollen = ~100 normale rollen. Slimmer ingekocht, zonder bomen."

### Regel 2: Alarmerend → Nuchter
❌ "Stop de ontbossing! Kies bamboe!"
✅ "Waarom hout als bamboe het net zo goed doet? Meer vellen per rol, boomvrij."

### Regel 3: Abstract → Concreet
❌ "Duurzaam en bewust"
✅ "3 laags comfort, 250 vel per rol, volledig boomvrij"

### Regel 4: Schuld → Slim
❌ "Je gebruikt elke dag toiletpapier waar bomen voor worden gekapt"
✅ "Eindelijk toiletpapier dat langer meegaat dan je gewend bent. En zonder bomen."

---

## Voorbeeld output flows

### Input: "Maak een IG caption voor onze 3 laags ongebleekt 48 rollen"

**❌ Verkeerde output (activist):**
> Red de planeet 🌍 met onze 100% bamboe toiletpapier! Stop met bomen kappen voor iets wat je één keer gebruikt. Samen maken we het verschil! 💚 #ecofriendly #sustainable

**Check:** "Red de planeet" → hoog risico. "Stop met" → hoog risico. "Samen maken we het verschil" → moraliseren. Engels hashtags. → **HERSCHRIJVEN**

**✅ Juiste output:**
> Waarom zou je nog kleine rollen kopen die snel op zijn? 48 rollen Bamboo gaan gemiddeld net zo lang mee als 100 normale rollen. 3 laags zacht, 250 vel per rol, volledig boomvrij bamboe. Slim ingekocht, eerlijke rol.
>
> Kijk 'm hier 👉 link in bio

**Check:** ✅ Nederlands ✅ "je" niet "u" ✅ waarde-regel (2 van 3) ✅ geen activist taal ✅ nuchter

---

## Implementatie

Dit check-systeem zit ingebouwd in:
- `/content-machine` — draait automatisch voor elke output
- `/content-scripter` — controleert scripts voor publicatie
- `/script-ads` — controleert ad copy
- Elke output in Drive heeft een "activist-check: passed" tag

**Als check fails en systeem kan niet herschrijven** → flag naar Nathan met originele + foutmelding, niet stilletjes publiceren.
