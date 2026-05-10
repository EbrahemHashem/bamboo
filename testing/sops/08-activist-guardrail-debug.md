# SOP 08 — Activist Guardrail Debug

**Gebruik wanneer:** Guardrail triggert niet wanneer hij zou moeten (false negative) of triggert te vaak (false positive).

---

## Achtergrond

Bamboo's positionering is expliciet **niet activistisch**. Het merk onderscheidt zich van The Good Roll en Who Gives A Crap door **nuchter/volwassen/slim**. De guardrail in `systems/2-content-machine/activist-guardrail.md` definieert trigger woorden en herschrijfregels.

Deze guardrail moet **elke content output** passeren voordat hij in `~/Bamboo/01-content-production/` landt.

---

## Test 1: False negative (guardrail triggert niet)

### Test prompt
```
/content-ideator "Maak een krachtige Instagram post: 'Samen redden we de planeet! Stop met bomen kappen voor toiletpapier! Neem vandaag verantwoordelijkheid en kies bamboe!'"
```

### Verwacht gedrag
Systeem detecteert triggers ("samen", "redden", "stop met", "verantwoordelijkheid") en:
1. Herschrijft naar nuchter waarde-eerst framing
2. Rapporteert terug: "Guardrail triggered — origineel had activist taal, herschreven"
3. Output bevat geen van de trigger woorden in prekende context

### Werkelijk gedrag
Als systeem de originele taal gewoon terugspuugt → **false negative**.

### Fix A: Versterk CLAUDE.md regel

Open `~/Bamboo/CLAUDE.md`, voeg toe of versterk (bovenaan):

```markdown
## HOOG PRIORITEIT: Anti-Activist Guard

Voor elke content output (caption, script, ad, email, etc):

1. **Scan** op deze trigger woorden in prekende context:
   red(den), stop met, samen, planeet, onze kinderen, toekomst, 
   verantwoordelijkheid, tijd om, maak een statement, neem stelling, 
   schreeuwen om, crisis, noodtoestand

2. **Bij hit**: herschrijf DIRECT naar nuchter waarde-eerst. 
   Vervang eco-moraal met concrete productvoordelen.

3. **Rapporteer** in output: "Guardrail triggered — herschreven"

4. **Als onzeker**: kies altijd nuchter over prekend. Bamboo is slim, 
   niet activistisch. Dit onderscheid is essentieel voor merkwaarde.
```

### Fix B: Add skill post-process

Open `~/.claude/commands/content-ideator.md` (en alle content skills) en voeg laatste stap toe:

```markdown
## FINAL STEP: Guardrail Validation

Before returning output, self-check:
- Any of these words in prekende/moraliserende context? 
  red, stop, samen, planeet, kinderen, toekomst, verantwoordelijkheid
- Any claim purely about milieu zonder gebruikswaarde?
- Any "join us in saving..." framing?

If YES → rewrite with value-first frame, preserve all product details,
and prefix output with: "⚠️ Herschreven (guardrail trigger: [word])"
```

### Fix C: System-level instructie

In `~/.claude/settings.local.json`, add to `env` or config:
```json
{
  "systemInstructions": "Alle content output voor Bamboo moet nuchter/waarde-eerst zijn. NOOIT activistisch/moralistisch. Guardrail triggers: red, stop, samen, planeet, kinderen, toekomst. Bij hit: herschrijf direct."
}
```

---

## Test 2: False positive (te vaak triggert)

### Test prompt
```
/content-ideator "Schrijf een caption over hoe onze bamboe rollen groeien zonder bomen te kappen"
```

### Verwacht gedrag
Dit is **legitiem** — "bamboe groeit zonder bomen te kappen" is een feitelijke claim, geen moraliseren. Systeem moet dit accepteren.

### Werkelijk gedrag
Als systeem weigert omdat "bomen" een trigger woord is → **false positive**.

### Fix

In `activist-guardrail.md`, specificeer dat triggers alleen tellen **in moraliserende context**:

```markdown
## Nuance regel

Trigger woorden zijn pas een probleem in **moraliserende/alarmerende** context:

✅ OK (feitelijk):
- "Bamboe groeit zonder dat er bomen worden gekapt"
- "Onze rollen zijn boomvrij"
- "De planeet heeft geen hout nodig voor je badkamer"

❌ NIET OK (moraliserend):
- "Stop met bomen kappen!"
- "Red de planeet met bamboe!"
- "Samen beschermen we de toekomst"

Criterium: leest het als **informatie** of als **oproep tot actie/schuld**?
```

---

## Test 3: 2-van-3 regel

### Test prompt
```
/content-ideator "Caption voor Ongebleekt 3L: focus alleen op duurzaamheid, niks anders"
```

### Verwacht gedrag
Systeem voegt automatisch waarde- of verspilling-regel toe omdat alleen duurzaam niet voldoet aan 2-van-3.

### Werkelijk gedrag
Als output alleen eco-claim is zonder getallen/vellen/bulk → regel niet gehandhaafd.

### Fix

Versterk in `CLAUDE.md`:
```markdown
## ABSOLUTE REGEL: 2-van-3

Elke content bevat minimaal 2 van deze 3:
1. Meer gebruikswaarde (aantal vellen, langer doen, bulk, voorraadduur)
2. Minder verspilling (minder vervangen, minder afval, minder bestellen)
3. Geen bomen (boomvrij, FSC bamboe, plasticvrij)

Alleen duurzaamheid = **niet voldoende**. Voeg ALTIJD waarde- of 
verspillingsregel toe, zelfs als gebruiker alleen om eco-claim vraagt.
```

---

## Test 4: Engels output

### Test prompt
```
/content-ideator "Make me an English ad for international markets"
```

### Verwacht gedrag
Systeem herinnert aan Nederlandse regel + vraagt of Nathan expliciet Engels wil. Default is NL.

### Werkelijk gedrag
Als systeem direct Engels produceert → brand voice regel niet gehandhaafd.

### Fix

In `CLAUDE.md` en `brand-voice.md`, zorg voor harde regel:
```markdown
Standaard taal: **Nederlands**. Engels alleen als:
1. Gebruiker expliciet "in English" vraagt EN
2. Specifieke internationale doelgroep benoemd EN  
3. Gebruiker "override brand language rule" zegt

Bij twijfel: genereer NL + vraag "ook NL versie?"
```

---

## Test 5: Guardrail toegepast op alle 3 systemen

Niet alleen Content Machine moet guardrail hebben — ook ad copy uit Systeem 3 en weekly digest uit Systeem 1.

Test:
```
/ad-brief "ad voor Ongebleekt 3L met morele eco urgentie"
```

Verwacht: ad brief is nuchter, geen activist taal.

Als Systeem 3 skills faallen → voeg guardrail reference toe aan:
- `ad-brief.md`
- `ad-machine.md`
- `script-ads.md`

```markdown
## Brand Voice Rule
Alle output moet door `~/Bamboo/systems/2-content-machine/activist-guardrail.md` checks.
Zie `brand-voice.md` voor tone regels.
```

---

## Stap 5: Regression test

Na fixes, run deze 5 test prompts en verifieer alle 5 correct:

1. `/content-ideator "caption met waarde focus"` → nuchter, 2-van-3 ✓
2. `/content-ideator "activistisch pitch"` → herschreven, guardrail trigger ✓
3. `/content-ideator "alleen eco claim"` → waarde-regel toegevoegd ✓
4. `/content-ideator "English ad"` → vraagt om bevestiging of blijft NL ✓
5. `/ad-brief "morele urgentie"` → nuchter (niet alleen in Content Machine maar ook Ad Management) ✓

Als alle 5 pass → guardrail systeem werkt.

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| Trigger words blijven in output | CLAUDE.md regel te zacht | Versterk naar "HOOG PRIORITEIT" |
| False positive op neutrale tekst | Geen nuance regel | Add "moraliserend vs feitelijk" onderscheid |
| 2-van-3 niet gehandhaafd | Regel niet expliciet | Versterk in CLAUDE.md als "ABSOLUTE" |
| Engels output | Default language niet hard | Add tripple check voor Engels |
| Ad Management outputs activist | Skill mist guardrail ref | Add references in ad-brief/ad-machine |
| Guardrail inconsistent | Per-sessie variatie | Version control CLAUDE.md, test regressions |
