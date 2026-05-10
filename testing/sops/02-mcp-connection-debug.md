# SOP 02 — MCP Connection Debug

**Gebruik wanneer:** Claude Code start, maar `/mcp list` toont servers als disconnected, error, of missing.

---

## Stap 1: Lijst MCP status

Binnen Claude Code sessie:
```
/mcp
```

Verwacht: 6 servers, allemaal "connected"
- airtable
- apify
- meta-ads
- nano-banana
- google-drive
- n8n

---

## Stap 2: Check settings file

```bash
cat ~/.claude/settings.local.json | python3 -m json.tool
```

Als dit een JSON parse error geeft → settings file is corrupt. Restore vanuit template:
```bash
cp ~/Downloads/bamboo-build/bamboo/install/settings.json.template ~/.claude/settings.local.json
```

---

## Stap 3: Check env vars

```bash
cat ~/Bamboo/.env | grep -v "^#" | grep -v "^$"
```

Verwacht: ~15 regels met `KEY=VALUE`. Geen regels met `PLAK_JE_KEY_HIER`.

**Veelgemaakte fout:** template keys niet vervangen. Zoek op `PLAK`:
```bash
grep PLAK ~/Bamboo/.env
```
Als output → vervang die regels met echte (test) keys.

---

## Stap 4: Per-MCP diagnose

### Airtable MCP error

```bash
# Test token handmatig
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  https://api.airtable.com/v0/meta/bases
```
Verwacht: JSON met bases. Error codes:
- `401 invalid_authentication_token` → token verkeerd of verlopen
- `403 insufficient_permissions` → PAT mist scopes `data.records:read/write`, `schema.bases:read`
- `404 not found` → base ID klopt niet

**Fix**: Genereer nieuwe PAT op https://airtable.com/create/tokens met alle nodige scopes.

### Apify MCP error

```bash
curl "https://api.apify.com/v2/users/me?token=$APIFY_API_TOKEN"
```
Verwacht: JSON met user info. Als `401` → token fout. Nieuwe genereren op https://console.apify.com/settings/integrations.

### Meta Ads MCP error

```bash
python3 ~/mcp-servers/meta-ads-mcp/server.py --test 2>&1 | head -30
```
Zie `sops/05-meta-ads-debug.md` voor diepere diagnose.

### Nano Banana / Gemini MCP error

```bash
curl -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models"
```
Verwacht: lijst modellen. Als `PERMISSION_DENIED` → key mist access tot Gemini 3. Upgrade in Google AI Studio.

### Google Drive MCP error

- Check `GOOGLE_DRIVE_CREDENTIALS_JSON` path bestaat
- Service account JSON moet Drive API scope hebben
- Target folder moet gedeeld zijn met service account email

```bash
cat $GOOGLE_DRIVE_CREDENTIALS_JSON | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['client_email'])"
```
Deze email moet editor-rechten hebben op de target Drive folder.

### n8n MCP error

```bash
curl $N8N_HOST/api/v1/workflows -H "X-N8N-API-KEY: $N8N_API_KEY"
```
- Als localhost:5678 connection refused → n8n container draait niet (`docker ps`)
- Als 401 → API key fout of n8n version doesn't support API keys (upgrade naar latest)

---

## Stap 5: Claude Code MCP logs

```bash
# Find claude logs
ls ~/Library/Logs/Claude\ Code/

# Tail most recent
tail -100 ~/Library/Logs/Claude\ Code/*.log | grep -i mcp
```

Search naar lines met `MCP server "xxx" failed to start` — dat is de exacte reden.

---

## Stap 6: Restart MCPs

Binnen Claude Code:
```
/mcp restart airtable
/mcp restart apify
# etc
```

Of volledige Claude sessie afsluiten en opnieuw openen:
```bash
# Exit claude sessie (Ctrl+D of /exit)
cd ~/Bamboo && claude
```

---

## Stap 7: Env var expansion check

Claude Code leest `${VAR_NAME}` in settings.json maar **alleen als de env var in de shell staat** waar claude vanaf start.

Fix: laad `.env` in je shell voor je `claude` runt:
```bash
cd ~/Bamboo
set -a
source .env
set +a
claude
```

Of zet env vars in `~/.zshrc`:
```bash
export AIRTABLE_API_KEY=pat_xxx
export APIFY_API_TOKEN=apify_xxx
# ...
```

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| "MCP server 'airtable' failed to start" | npx package niet cachet | `npx -y airtable-mcp-server` eerst handmatig |
| Env vars leeg in Claude sessie | Shell niet geladen | `source ~/Bamboo/.env` voor `claude` start |
| "Command not found: npx" | Node/npm niet in PATH | Herstart terminal na install |
| Meta Ads server crasht | Python deps mist | `pip3 install -r ~/mcp-servers/meta-ads-mcp/requirements.txt` |
| Settings.json invalid | Trailing comma / comment | `python3 -m json.tool` om te valideren |
| n8n 401 unauthorized | API key niet geconfigureerd in n8n settings | n8n UI → Settings → API → create key |
