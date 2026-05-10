---
name: respond-to-leads
description: Volledige B2B lead response pipeline voor Bamboo — lees nieuwe replies in Airtable B2B Leads, classificeer met /reply-classifier logica, genereer persoonlijke Bamboo-voice response drafts, update pipeline stage. Batch of per lead.
---

# /respond-to-leads — Bamboo B2B Lead Response Pipeline

Je taak: de B2B pipeline levend houden door elke reply snel en consistent op te volgen. Geen lead verwaarlozen, geen mass-mail toon.

---

## Prerequisites

1. **Airtable MCP** — B2B Leads tabel (Table 13)
2. **Gmail MCP** (optioneel) — voor ophalen replies en versturen drafts
3. **reply-classifier.md** gelezen — classificatie schema
4. **b2b-outreach.md** + **b2b-target-groups.md** — voice en sector context
5. **brand-voice.md** — nuchter, niet activistisch

---

## Workflow

### Stap 1 — Pull actieve leads met recente activity

```
mcp__airtable__list_records
  base_id: {{ AIRTABLE_BASE_ID }}
  table: "B2B Leads"
  filterByFormula: "AND(NOT({Stage}='Closed Won'), NOT({Stage}='Closed Lost'), OR(IS_AFTER({Last Contact Date}, DATEADD(TODAY(), -7, 'days')), {Stage}='New'))"
  maxRecords: 50
```

Sorteer: `Stage=New` eerst, dan `Interest Level=High`, dan oudste `Last Contact Date`.

### Stap 2 — Toon lijst aan Nathan

```
B2B LEADS TE BEWERKEN ({{ count }})
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hot (High + Urgent):
  1. {{ company }} — {{ sector }} — {{ stage }} — €{{ est_value }}/mnd

Nieuwe (Stage=New):
  2. {{ company }} — {{ sector }} — {{ source }}
  ...

Follow-up needed (Contacted, geen reply 5+ dagen):
  3. {{ company }} — last contact {{ days }}d geleden
  ...

Engaged (pipeline actief):
  4. {{ company }} — {{ next_action }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Vraag: **"Welke lead pakken we? Of typ 'all' voor batch mode, 'hot' voor alleen hot leads."**

### Stap 3 — Per lead: check reply

Als Gmail MCP beschikbaar:
```
mcp__claude_ai_Gmail__gmail_search_messages
  query: "from:{{ contact_email }} newer_than:14d"
```

Als reply gevonden → lees body, ga naar Stap 4.
Als geen reply en stage = Contacted > 5 dagen oud → Stap 5 (follow-up draft).
Als stage = New → Stap 6 (initial outreach).

### Stap 4 — Classificeer reply (gebruik reply-classifier logica)

Bepaal:
- Interest Level (High/Medium/Low/Negative)
- Reply Type (interest/objection/timing/question/referral/unsubscribe/other)
- Urgency (Urgent/Normal/Low)
- Next Stage
- Suggested Next Action

Volledige logica in `reply-classifier.md`.

### Stap 5 — Genereer response draft

Per classification type, pas Bamboo voice toe:

**Interest — meeting/sample request:**
```
Hey {{ first_name }},

Top — {{ hun concrete request reflecteren }}.

{{ concreet antwoord met datum/tijd of sample info }}.

{{ 1 extra value add: bv. case van andere {{ sector }} klant }}.

Groet,
Nathan — Bamboo Disposables
```

**Question — prijs:**
```
Hey {{ first_name }},

Korte heads-up over prijs:

- 24 rollen: {{ prijs }} — per rol kom je op ~{{ per_roll_24 }}
- 48 rollen: {{ prijs }} — per rol ~{{ per_roll_48 }}
- 96 rollen: {{ prijs }} — per rol ~{{ per_roll_96 }}

Voor jullie context ({{ sector }} met {{ size }}) is {{ recommended }} de logische stap — ongeveer €{{ monthly }}/maand.

Wil je een specifieke offerte met levering erbij? Dan maak ik die.

Groet,
Nathan
```

**Objection — al leverancier:**
```
Hey {{ first_name }},

Begrijpelijk. Dan is mijn vraag niet "stap over", maar: wat zou jullie ooit wel laten overwegen? Prijs, gemak, specifiek product?

Ik stuur geen sales-pitches door — alleen als er iets concreets is wat past. En als antwoord is "nooit", hoor ik dat ook graag, dan haal ik je van mijn lijst.

Groet,
Nathan
```

**Timing — later:**
```
Hey {{ first_name }},

Helder. Ik zet een reminder voor {{ genoemde datum }} en kom dan terug. Als er tussendoor iets verandert — laat het weten.

Groet,
Nathan
```

**Unsubscribe:**
```
Hey {{ first_name }},

Duidelijk, geen probleem. Ik haal je eruit. Als er ooit iets verandert, weet je ons te vinden.

Groet,
Nathan
```

### Stap 6 — Initial outreach (Stage=New)

Delegate naar `/b2b-outreach` logica. Output = subject + body in Bamboo voice.

### Stap 7 — Toon draft aan Nathan

```
TO: {{ contact_name }} ({{ contact_email }})
COMPANY: {{ company_name }} — {{ sector }}
STAGE: {{ current }} → {{ new_stage }}
CLASSIFICATION: {{ interest_level }} / {{ reply_type }} / {{ urgency }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: {{ subject }}

{{ body }}

Groet,
Nathan — Bamboo Disposables
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Vraag: **"Versturen? (ja / edit / skip)"**

### Stap 8 — Verstuur + update Airtable

Als Gmail MCP + Nathan zegt "ja":
```
mcp__claude_ai_Gmail__gmail_create_draft
  to: {{ contact_email }}
  subject: {{ subject }}
  body: {{ body_with_signoff }}
```

(Nathan kan draft vervolgens reviewen + versturen in Gmail — veiliger dan auto-send bij cold outreach.)

Dan altijd:
```
mcp__airtable__update_records
  table: "B2B Leads"
  records: [{
    id: {{ record_id }},
    fields: {
      "Stage": {{ new_stage }},
      "Interest Level": {{ level }},
      "Last Contact Date": today,
      "Next Action": {{ action }},
      "Outreach Messages": {{ prev + 1 }},
      "Notes": appendf("Reply {{ date }}: {{ classification }}. Response sent.")
    }
  }]
```

### Stap 9 — Follow-up queue

Na alle leads, toon:

```
FOLLOW-UP NODIG KOMENDE 7 DAGEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contacted (geen reply 5-7d):
  1. {{ company }} — sent {{ date }} — suggested follow-up: soft bump

Engaged (wacht op Nathan actie):
  2. {{ company }} — {{ next_action }}

Meeting Booked (volgende touch):
  3. {{ company }} — meeting {{ date }} — dag ervoor bevestiging sturen
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Vraag: **"Wil je nu follow-ups draften?"**

---

## Response best practices (Bamboo specifiek)

1. **Snel reageren** — binnen 24u voor warm leads, binnen 4u voor hot leads
2. **Persoonlijk** — gebruik first name, refereer aan hun reply concreet
3. **Nuchter** — geen "Geweldig!" of "Super!" — wel "Top", "Duidelijk", "Klinkt goed"
4. **Concreet** — cijfers, datums, volumes. Geen vage beloftes.
5. **Waarde per gebruik** — niet prijs per doos. Altijd per rol / per gebruik.
6. **2-van-3 kernregels** — gebruikswaarde / minder verspilling / geen bomen, minimaal 2 raken
7. **Eén CTA** — niet 3 vragen tegelijk
8. **Sluit menselijk af** — "Groet, Nathan" — geen corporate signatures
9. **Geen activisme** — geen morele druk, geen "red"/"samen"/"toekomst"-taal
10. **Track alles** — elke touchpoint in Airtable logging

---

## Error handling

- Gmail geen reply gevonden maar Nathan weet zeker dat er 1 is → vraag hem de reply te plakken
- Unsubscribe → Stage Closed Lost + tag, geen verdere pogingen
- Lead is Dutch maar reply is English → respons in English maar sign-off blijft "Groet, Nathan" (mix is ok bij NL merk dat EN klanten heeft)
- Bij twijfel over classificatie → stop en vraag Nathan

## Gebruik

Draai 1-2x per dag (of gekoppeld aan `bamboo-b2b-pipeline.json` die hot leads flagt).
