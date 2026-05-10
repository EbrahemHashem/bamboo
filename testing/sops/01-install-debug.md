# SOP 01 — Install Script Debug

**Gebruik wanneer:** `install.sh` stopt met error, hangt, of laat items weg.

---

## Stap 1: Log de exacte fout

Run opnieuw met verbose logging:
```bash
bash -x ~/Downloads/bamboo-build/bamboo/install/install.sh 2>&1 | tee /tmp/bamboo-install.log
```

Check de laatste regels van de log — welk commando faalde?

---

## Stap 2: Per-stap diagnose

### Stap 1 faalt — Xcode CLT
```bash
xcode-select -p
# Als /Applications/Xcode.app/... → ok
# Als error → installeer handmatig:
xcode-select --install
```
Wacht op popup, klik Install, wacht 10 min. Run install.sh opnieuw.

### Stap 2 faalt — Homebrew
```bash
# Check PATH
which brew
ls -la /opt/homebrew/bin/brew

# Handmatig fixen:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/opt/homebrew/bin/brew shellenv)"
```
Op Intel Macs is path `/usr/local/bin/brew` — check je hardware.

### Stap 3 faalt — Git/Python/Node
```bash
brew doctor
brew update
brew install git python@3.11 node
```
Als `brew install` faalt met "SHA256 mismatch" → `brew update` en probeer opnieuw.

### Stap 4 faalt — Docker
Docker is **optioneel**. Als het faalt:
- Optie A: Skip → Nathan gebruikt n8n.cloud ipv lokaal
- Optie B: Handmatig installeer Docker Desktop via https://docker.com/products/docker-desktop

### Stap 5 faalt — Claude Code CLI
```bash
# Check of Node/npm werken eerst
node --version
npm --version

# Install met sudo als permissie error:
sudo npm install -g @anthropic-ai/claude-code

# Check PATH
which claude
ls -la $(npm config get prefix)/bin/claude
```

Als nog niet werkt: nieuwe terminal openen (PATH refresh) en `claude --version` proberen.

### Stap 6 faalt — Python packages
```bash
# Check pip werkt
python3 -m pip --version

# Install handmatig
python3 -m pip install --upgrade httpx "mcp[cli]" fastmcp

# Als SSL errors: update certs
/Applications/Python*/Install\ Certificates.command
```

### Stap 7 faalt — Project folder kopie
```bash
# Check source exists
ls -la ~/Downloads/bamboo-build/bamboo/

# Handmatig kopiëren
cp -rf ~/Downloads/bamboo-build/bamboo/* ~/Bamboo/
```

### Stap 8 faalt — Skills niet gekopieerd
```bash
# Check _modules/skills/ bestaat
ls ~/Downloads/bamboo-build/_modules/skills/

# Handmatig kopieer alle Bamboo skills
mkdir -p ~/.claude/commands
for skill in scrape-ads competitor-research competitor-analyst content-machine content-ideator content-scripter daily-content-researcher generate-ad-statics static-to-video image-prompt-architect script-ads ad-machine ad-brief launch-ads bulk-ads-upload media-buyer-agent n8n mcp-builder skill-builder; do
  cp ~/Downloads/bamboo-build/_modules/skills/${skill}.md ~/.claude/commands/
done
ls ~/.claude/commands/ | wc -l   # moet 19 zijn
```

### Stap 9 faalt — MCP servers
```bash
# Check _modules/mcp-servers/ bestaat
ls ~/Downloads/bamboo-build/_modules/mcp-servers/

# Handmatig kopieer
mkdir -p ~/mcp-servers
cp -rf ~/Downloads/bamboo-build/_modules/mcp-servers/* ~/mcp-servers/
```

### Stap 10 faalt — n8n workflows
```bash
mkdir -p ~/n8n-workflows/bamboo
cp ~/Downloads/bamboo-build/bamboo/systems/*/[^.]*.json ~/n8n-workflows/bamboo/
ls ~/n8n-workflows/bamboo/   # moet 3 json files zijn
```

### Stap 11 faalt — Claude settings
```bash
cp ~/Downloads/bamboo-build/bamboo/install/settings.json.template ~/.claude/settings.local.json
cp ~/Downloads/bamboo-build/bamboo/install/.env.template ~/Bamboo/.env
```

---

## Stap 3: Volledig opnieuw beginnen

Als install script corrupt state heeft achtergelaten:

```bash
# Clean up
rm -rf ~/Bamboo
rm -rf ~/.claude/commands
rm -f ~/.claude/settings.local.json
rm -rf ~/mcp-servers
rm -rf ~/n8n-workflows/bamboo

# Opnieuw
bash ~/Downloads/bamboo-build/bamboo/install/install.sh
```

**Waarschuwing:** `rm -rf ~/.claude/commands` wist ook andere skills die Nathan mogelijk al had. Alleen doen op echt schone test machine.

---

## Stap 4: Bug rapporteren

Als install.sh een reproduceerbare bug heeft:

1. Log in `testing/BUGS-FOUND.md`
2. Plak de exacte error regel
3. Noem macOS versie, Apple Silicon vs Intel
4. Voeg `install.log` toe als attachment
5. Mark Fase B checks als blocker

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| "command not found: brew" na install | PATH niet geladen | `eval "$(/opt/homebrew/bin/brew shellenv)"` + nieuwe terminal |
| "EACCES permission denied" bij npm | ownership issue | `sudo chown -R $(whoami) $(npm config get prefix)/lib/node_modules` |
| "Python 3 not found" na brew install | symlink mist | `brew link python@3.11` |
| "claude: command not found" | npm prefix niet in PATH | Check `echo $PATH` bevat `$(npm config get prefix)/bin` |
| "Docker Desktop not running" | niet opgestart | `open -a Docker` en wacht 2 min |
| Intel Mac, brew faalt | verkeerde brew path | Intel gebruikt `/usr/local/bin/brew` niet `/opt/homebrew/bin/brew` |
