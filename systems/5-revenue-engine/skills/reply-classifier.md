---
name: reply-classifier
description: Classificeer inbound reply op B2B outreach — interest level, objection type, timing, urgency, suggested next action. Output = structured classification + aanbevolen vervolgactie in Bamboo voice. Werkt NL + EN input.
---

# /reply-classifier — Bamboo Reply Classifier

Je taak: een binnenkomende reply op B2B outreach ontleden en aanbevelen wat de volgende stap is, zodat `/respond-to-leads` of Nathan zelf snel door kan.

## Voorbeeld

```
/reply-classifier "Hoi Nathan, interessant. Kunnen we volgende week donderdag bellen rond 14u?"
/reply-classifier "We zijn heel tevreden over onze huidige leverancier, bedankt"
/reply-classifier "Zouden we eerst een sample kunnen ontvangen?"
```

---

## Prerequisites

1. **b2b-target-groups.md** gelezen voor sector context
2. **email-templates.md** en outreach voorbeelden gelezen voor gepaste tegenreactie
3. Optioneel: reply in context met originele outreach (Airtable lead record)

---

## Classificatie schema

### Interest Level
- **High** — expliciete interesse, willen meeting/samples/offerte, of noemen concrete behoefte
- **Medium** — open maar met condities ("later", "eerst meer info", "volgende kwartaal")
- **Low** — passieve reactie, "misschien later", geen urgentie
- **Negative** — expliciete afwijzing, objection, unsubscribe request

### Reply Type
- **interest** — willen verder praten
- **objection** — bezwaar (prijs, leverancier, timing, pas niet)
- **timing** — geïnteresseerd maar niet nu
- **question** — vragen om info/samples/offerte eerst
- **referral** — verwijzen door naar andere contactpersoon
- **unsubscribe** — willen niet gecontacteerd worden
- **other** — onduidelijk, handmatig reviewen

### Urgency
- **Urgent** — "deze week", "zo snel mogelijk", "asap", "vandaag"
- **Normal** — geen tijdsdruk genoemd
- **Low** — "ergens komend kwartaal", "later dit jaar", "geen haast"

---

## Workflow

### Stap 1 — Lees input

Neem reply text + (indien beschikbaar) originele outreach en lead record context.

### Stap 2 — Trefwoord + intent analyse

**High interest signals (NL):**
`interesse`, `geïnteresseerd`, `graag`, `wanneer kunnen we`, `offerte`, `sample`, `proefdoos`, `meeting`, `call`, `bellen`, `afspraak`, `ja graag`, `klinkt goed`, `stuur maar`, `laten we`, `vertel meer`

**Objection signals:**
`al leverancier`, `tevreden met`, `te duur`, `geen budget`, `geen interesse`, `nee bedankt`, `past niet`, `niet nodig`

**Timing signals:**
`later`, `volgende maand`, `kwartaal`, `q2`, `q3`, `q4`, `eind van jaar`, `in het nieuwe jaar`, `na de zomer`, `terugkomen over X`

**Urgency signals:**
`deze week`, `asap`, `zo snel mogelijk`, `vandaag`, `morgen`, `dringend`

**Question signals:**
`wat kost`, `prijs`, `prijslijst`, `kan ik eerst`, `hoe zit het met`, `kan ik samples`, `stuur info`

**Referral signals:**
`mijn collega`, `stuur het naar`, `beter bij`, `cc`, `mail naar`

### Stap 3 — Bepaal Next Stage

| Reply type | Huidige stage | Next stage |
|------------|---------------|------------|
| interest (meeting/call/sample) | Contacted | Meeting Booked |
| interest (willen praten) | Contacted | Engaged |
| question | elke | Engaged |
| timing | elke | Engaged |
| objection (nog adresseerbaar) | elke | Engaged |
| objection (hard no) | elke | Closed Lost |
| unsubscribe | elke | Closed Lost |
| referral | elke | Engaged (log nieuwe contact) |

### Stap 4 — Suggest Next Action

Format per type:

**interest + Urgent:**
> "Direct bellen of mailen vandaag. Voorstel concreet met datum/tijd. Meeting Booked na bevestiging."

**interest + Normal:**
> "Reageer binnen 24u met concrete datum opties (bv. 3 slots deze week). Stuur ook product samples aan."

**question (prijs):**
> "Stuur korte prijstabel per volume (24/48/96) + estimate voor hun specifieke context. Bamboo voice: waarde per gebruik niet prijs per doos."

**question (samples):**
> "Stuur sample-doos (24 rollen Ongebleekt 3 laags). Follow-up over 7-10 dagen met vraag naar ervaring."

**timing:**
> "Bevestig timing, zet follow-up reminder voor genoemde datum. Deel ondertussen 1 case/klant van vergelijkbare sector."

**objection (te duur):**
> "Herkadreer naar prijs per gebruik, niet per doos. 300 vel per rol vs standaard ~200 = vergelijking rechtzetten."

**objection (al leverancier):**
> "Vraag: wat zou jullie laten switchen? En bied sample aan 'gewoon ter vergelijking'. Niet duwen."

**objection (hard no):**
> "Closed Lost. Kort bedanken, aanbieden terug te keren als later iets verandert. Niet opdringerig."

**unsubscribe:**
> "Verwijder uit pipeline. Bevestig in korte mail. Stage: Closed Lost, Notes: opt-out."

**referral:**
> "Bedank voor de pointer. Mail naar nieuwe contactpersoon met referral context ('{{ original_name }} stelde voor contact op te nemen')."

### Stap 5 — Genereer Bamboo-voice antwoord concept

Kort (max 80 woorden), nuchter, praktisch. Sluit aan op de reply.

Voorbeeld reply op "kunnen we bellen donderdag 14u?":
> Hey {{ first_name }}, top — donderdag 14u werkt. Stuur je even je telefoonnummer, of ik bel via {{ number }}? Dan pak ik een korte demo mee. Groet, Nathan

---

## Output format

```markdown
# Reply Classification — {{ lead_id or "Ad Hoc" }}

**Reply snippet:**
> "{{ reply text }}"

## Classificatie

| Veld | Waarde |
|------|--------|
| Interest Level | {{ High/Medium/Low/Negative }} |
| Reply Type | {{ interest/objection/timing/question/referral/unsubscribe/other }} |
| Urgency | {{ Urgent/Normal/Low }} |
| Suggested Next Stage | {{ Engaged/Meeting Booked/Closed Won/Closed Lost }} |
| Hot Lead? | {{ true als High + Urgent }} |

## Next Action
{{ concrete aanbeveling 1-2 zinnen }}

## Response draft (Bamboo voice)
{{ suggested reply in NL, max 80 woorden, signoff Nathan }}

## Airtable update
```
table: "B2B Leads"
record: {{ record_id }}
fields: {
  "Stage": "{{ next_stage }}",
  "Interest Level": "{{ level }}",
  "Last Contact Date": "{{ today }}",
  "Next Action": "{{ action }}",
  "Notes": "Reply classified: {{ type }} / {{ urgency }}"
}
```
```

---

## Error handling

- Reply in andere taal (EN/DE) — classificeer met equivalent keywords, flag in Notes "Reply was in EN, overweeg NL switch"
- Ambigu / korte reply ("oké" / "dank"): klasseer Low interest + Normal, next action = "Handmatig reviewen"
- Multi-issue reply (question + objection): pak primaire intent, noteer secundair in Notes

## Gebruik

Wordt aangeroepen door `bamboo-b2b-pipeline.json` workflow en `/respond-to-leads`, of handmatig door Nathan bij twijfel.
