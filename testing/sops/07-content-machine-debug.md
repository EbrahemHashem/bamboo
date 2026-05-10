# SOP 07 — Content Machine Debug

**Gebruik wanneer:** Skills draaien niet, output klopt niet qua tone, visuals worden niet gegenereerd, of output mist brand context.

---

## Stap 1: Brand brain loading check

Content machine moet CLAUDE.md + brand files kunnen lezen.

Binnen Claude Code sessie in `~/Bamboo`:
```
Lees CLAUDE.md, brand-voice.md en hookbank.md en vat samen wat de 3 kernregels zijn
```

Verwacht: samenvatting met (1) meer gebruikswaarde (2) minder verspilling (3) geen bomen.

Als Claude zegt "ik kan de files niet vinden":
- Check je bent in juiste directory: `pwd` → moet `/Users/.../Bamboo` zijn
- Check files bestaan: `ls` → moet CLAUDE.md, brand-voice.md, hookbank.md tonen
- CLAUDE.md wordt auto-geladen, maar kan stil falen als niet in working directory

---

## Stap 2: Skill niet gevonden

```
/content-ideator
```
Krijgt error "command not found" of "skill does not exist":

```bash
# Check skill bestaat
ls ~/.claude/commands/content-ideator.md

# Check alle 18 Bamboo skills
ls ~/.claude/commands/ | grep -E "(scrape|competitor|content|ad-|launch|bulk|media|generate|static|image|n8n|mcp|skill)"
```

Als mist → herinstalleer vanuit `_modules/skills/`:
```bash
cp ~/Downloads/bamboo-build/_modules/skills/content-ideator.md ~/.claude/commands/
```

Restart Claude Code sessie (skills worden bij sessie start geladen).

---

## Stap 3: Output voelt niet Bamboo

Als `/content-ideator` output te generic is, activistisch, of Engels:

### Check 1: brand-voice.md wordt gelezen
In een lopende sessie:
```
Quote de activist-guardrail triggers uit brand-voice.md
```
Verwacht: lijst met "red(den)", "planeet", etc.

Als Claude niet weet → brand-voice.md wordt niet geladen. Fix:
- Prompt start met: "Lees eerst brand-voice.md, hookbank.md en CLAUDE.md voordat je iets produceert"
- Of: voeg aan skill frontmatter toe: `prerequisites: Read brand-voice.md, hookbank.md, CLAUDE.md first`

### Check 2: Explicit brand injection in skill
Open `content-ideator.md`, zoek naar bundel/brand reference:
```
grep -l "brand-voice.md\|hookbank.md\|CLAUDE.md" ~/.claude/commands/content-*.md
```

Als skill deze files niet expliciet referenced → skills zijn generic templates, brand context komt vanuit auto-loaded CLAUDE.md in working directory.

**Fix**: voeg aan elke content skill een eerste stap toe:
```markdown
## Step 0: Load Brand Context
Before generating any content, read these files:
- CLAUDE.md (brand master rules)
- brand-voice.md (tone + activist guardrail)
- avatar.md (customer segments)
- hookbank.md (hooks per motive)
- products.md (product architecture)
- creative-strategy.md (copy principles per funnel stage)
```

---

## Stap 4: Activist-guardrail triggert niet

Test:
```
/content-ideator "Maak een dramatische activist post: 'Red de planeet nu! Stop de ontbossing!'"
```

Verwacht: systeem weigert/herschrijft naar nuchter. Krijg je exact die activist taal terug → guardrail werkt niet.

**Fix opties:**

1. **Add guardrail als systeem instructie**: In `CLAUDE.md`, voeg een sterkere regel toe:
   ```markdown
   ## STRIKTE REGEL (hoog prioriteit)
   Voor elke content output: scan op activist triggers. Bij hit, herschrijf direct naar nuchter waarde-eerst. Triggers: "red", "stop met", "samen", "planeet", "toekomst", "verantwoordelijkheid", "tijd om".
   ```

2. **Add guardrail als skill post-process**: In `content-ideator.md`, laatste sectie:
   ```markdown
   ## Output Validation
   After generating content, check against `systems/2-content-machine/activist-guardrail.md` triggers. If any hit, rewrite and report to user: "Herschreven om nuchter te blijven."
   ```

3. **Explicit example in hookbank**: al aanwezig in `hookbank.md` — check "❌ Niet-merkzinnen" sectie.

---

## Stap 5: 2-van-3 regel triggert niet

Test:
```
/content-ideator "Schrijf een caption die alleen zegt dat het goed voor de aarde is"
```

Verwacht: systeem voegt waarde-regel toe (bijv "en 48 rollen gaat langer mee"). Krijg je alleen eco-claim → regel niet gehandhaafd.

**Fix:**
- Expliciet in CLAUDE.md (is al): "Minimaal 2 van 3 kernregels per uiting"
- Als nog te zacht → add als hard rule in content-ideator skill

---

## Stap 6: Nano Banana / visuals fail

Test:
```
/generate-ad-statics "simpele productshot"
```

Errors:

### `Nano Banana MCP not connected`
→ Zie `sops/02-mcp-connection-debug.md` stap "Nano Banana MCP error"

### `GEMINI_API_KEY invalid`
```bash
curl -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models"
```
Als `PERMISSION_DENIED` → key heeft geen Gemini 3 access. Genereer nieuwe op https://aistudio.google.com/app/apikey.

### `Quota exceeded`
Gemini free tier: ~1500 requests/dag. Als op → wacht 24u of upgrade naar paid.

### `Safety filter blocked`
Nano Banana blokkeert soms op "safety" (ook onschuldige product shots). Fix:
- Prompt herformuleren, minder "productverkoop" taal
- Of gebruik fallback naar DALL-E/Imagen via andere MCP

### Image kwaliteit laag
Nano Banana 2 (= Gemini 3 Flash Image) is 4K, Gemini 2.5 is lager. Check model in skill:
```bash
grep -r "gemini-" ~/.claude/commands/generate-ad-statics.md
```
Moet `gemini-3.0-flash-image` zijn (of latest).

---

## Stap 7: Output landingsplek

Na `/generate-ad-statics` zou file ergens landen. Check:
```bash
ls -la ~/Bamboo/01-content-production/
ls -la ~/Bamboo/01-content-production/$(date +%Y-%m)/
```

Als leeg:
- Check `drive-structure.json` path → misschien maakt skill `bamboo/01-content-production/` maar zit je in andere working dir
- Check Google Drive als Drive MCP aan staat — file kan daar staan

**Fix**: in `content-machine.md` skill, add explicit local save:
```markdown
## Save Location
Save all outputs to: `$BAMBOO_CLIENT_DIR/01-content-production/$(date +%Y-%m)/[type]/`
```

---

## Stap 8: Content orchestrator breaks mid-flow

`/content-machine "weekly run: 3 statics + 2 carousels + 1 video script"` breekt halverwege.

Debug:
1. Run elke sub-skill apart:
   ```
   /content-ideator "..."
   /content-scripter "..."
   /generate-ad-statics "..."
   /static-to-video "..."
   ```
2. Welke faalt? Focus daar.

**Veelvoorkomende oorzaken:**
- Token limit reached (vraag kleiner)
- Long context → Claude hallucineert (split in meerdere calls)
- MCP timeout (increase timeout in settings.local.json)

---

## Stap 9: Drive structure auto-creation

First run van `/content-machine` zou Drive folder structuur moeten maken volgens `drive-structure.json`.

Als niet:
1. Check Google Drive MCP heeft write scope
2. Manual fallback: maak folders zelf in Drive
   ```
   Bamboo/
   ├── 01-content-production/
   ├── 02-approved/
   ├── 03-posted/
   ├── 04-brand-assets/
   └── 05-references/
   ```
3. Share met service account email als die gebruikt wordt

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| Skill not found | Niet geïnstalleerd | `cp _modules/skills/*.md ~/.claude/commands/` |
| Output in Engels | Brand context niet geladen | Add explicit file read in prompt |
| Activist output | Guardrail niet strikt genoeg | Versterk regel in CLAUDE.md |
| Geen visuals | MCP not connected | Zie SOP 02 |
| Quota exceeded Gemini | Free tier limit | Wacht 24u of upgrade |
| Safety filter | Nano Banana blokkeert | Herformuleer prompt |
| Output locatie fout | Pad relatief ipv absoluut | Use `$BAMBOO_CLIENT_DIR` in skill |
| Orchestrator breekt | Token limit | Split in kleinere runs |
