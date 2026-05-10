---
name: bm-routine-registry
type: deploy-script
owner: bamboo
---

# BM Routine Registry — Deploy All

Reads all Bamboo routine files and executes `CronCreate` calls. Idempotent.

## When to run

- After adding/removing a routine
- After cron change in frontmatter
- After .env update
- First deploy

## Steps

### 1. Read all routine files

```
Glob: clients/bamboo/routines/bm-*.md
Exclude: _template-routine.md, bm-routine-logger.md, bm-routine-registry.md, README.md
```

For each file: parse frontmatter (`name`, `cron`, `timezone`, `status`).

### 2. Sync with CronList

```
Call CronList → filter triggers with name-prefix bm-*
```

For each existing trigger NOT in `routines/`: `CronDelete`.

### 3. Create/update triggers

For each routine where `status == active`:

```
CronCreate(
  name="bm-{routine.name}",
  cron=routine.cron,
  timezone=routine.timezone,
  prompt="Run skill: {routine.name}. Check .env for creds. Log to bm-routine-logger on complete."
)
```

Skip `status == disabled` or `status == draft`.

### 4. Smoke test

After all registrations: `CronList`, expect exactly N active triggers.

### 5. Report

Telegram summary to Nathan:
```
🚀 BM Routine Registry — deploy complete
✅ Active: 10 routines
⏸ Draft: 1 (ad-performance-loop)
🗑 Removed: 0
Next runs:
  bm-daily-intelligence — tomorrow 07:30 NL
  bm-competitor-daily-scrape — tomorrow 07:00 NL
  ...
```

## Arguments

- `--dry-run` — preview
- `--only=<routine-name>` — single routine
- `--force-recreate` — nuclear reset

## Output

```json
{
  "deployed": ["bm-competitor-daily-scrape", ...],
  "disabled": [],
  "draft": ["bm-ad-performance-loop"],
  "removed": [],
  "errors": [],
  "next_runs": { "bm-daily-intelligence": "2026-04-18T07:30:00+02:00", ... }
}
```

## Error handling

- `CronCreate` fails for 1 routine → log, continue
- Critical fail → stop, Telegram alert

## Verification

```bash
/bm-routine-registry --dry-run
/bm-routine-registry
/cron-list | grep bm-
```

## Roll-back

```bash
/bm-routine-registry --delete-all
# or
CronDelete(name="bm-competitor-daily-scrape")
```

---

**Important:** Individual routines do not manage their own cron. 1 file = 1 skill = 1 trigger.
