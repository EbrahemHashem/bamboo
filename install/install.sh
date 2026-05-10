#!/usr/bin/env bash
set -e

# ============================================================
#  BAMBOO DISPOSABLES BV — AI System Installer
#  Run: bash install.sh (vanuit de unzipped bamboo/ folder)
# ============================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BAMBOO_DIR="$(cd "$SCRIPT_PATH/.." && pwd)"
MODULES_DIR="$(cd "$BAMBOO_DIR/../_modules" && pwd 2>/dev/null || echo "")"
PROJECT_DIR="$HOME/Bamboo"

# Check modules dir
if [ -z "$MODULES_DIR" ] || [ ! -d "$MODULES_DIR" ]; then
    echo -e "${RED}❌ _modules/ folder niet gevonden.${NC}"
    echo "   Verwacht op: $BAMBOO_DIR/../_modules"
    echo "   Zorg dat bamboo/ naast _modules/ staat in de uitgepakte map."
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════════════╗"
echo "  ║                                                       ║"
echo "  ║     BAMBOO DISPOSABLES BV — AI Growth OS Installer    ║"
echo "  ║     6 Systemen · 4 Engines                            ║"
echo "  ║     Scrape · Content · Ads · Conversion · Revenue     ║"
echo "  ║     Intelligence (centrale hersenlaag)                ║"
echo "  ║                                                       ║"
echo "  ╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  Bamboo folder:  ${BOLD}$BAMBOO_DIR${NC}"
echo -e "  Modules folder: ${BOLD}$MODULES_DIR${NC}"
echo -e "  Installs naar:  ${BOLD}$PROJECT_DIR${NC}"
echo ""

# ---------- Helpers ----------
log_step() { echo ""; echo -e "${CYAN}${BOLD}▸ $1${NC}"; echo ""; }
log_ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
log_err()  { echo -e "  ${RED}❌ $1${NC}"; }

# ========== STAP 1/13: Xcode Command Line Tools ==========
log_step "Stap 1/13 — Xcode Command Line Tools"
if xcode-select -p &>/dev/null; then
    log_ok "Xcode CLT al geïnstalleerd"
else
    xcode-select --install 2>/dev/null || true
    echo "  → Klik 'Install' als er een popup verschijnt, wacht max 5 min"
    TIMEOUT=300; ELAPSED=0
    while ! xcode-select -p &>/dev/null && [ $ELAPSED -lt $TIMEOUT ]; do
        sleep 5; ELAPSED=$((ELAPSED + 5))
    done
    xcode-select -p &>/dev/null && log_ok "Xcode CLT geïnstalleerd" || log_warn "Xcode CLT handmatig installeren via xcode-select --install"
fi

# ========== STAP 2/13: Homebrew ==========
log_step "Stap 2/13 — Homebrew"
if command -v brew &>/dev/null; then
    log_ok "Homebrew al geïnstalleerd"
else
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
    fi
    command -v brew &>/dev/null && log_ok "Homebrew geïnstalleerd" || { log_err "Homebrew installatie mislukt"; exit 1; }
fi

# ========== STAP 3/13: Git / Python / Node ==========
log_step "Stap 3/13 — Git, Python 3, Node.js"
command -v git &>/dev/null || brew install git
command -v python3 &>/dev/null || brew install python@3.11
command -v node &>/dev/null || brew install node
log_ok "Git $(git --version | awk '{print $3}')"
log_ok "Python $(python3 --version | awk '{print $2}')"
log_ok "Node $(node --version)"

# ========== STAP 4/13: Docker (voor n8n lokaal, optioneel) ==========
log_step "Stap 4/13 — Docker Desktop (optioneel, voor lokale n8n)"
if command -v docker &>/dev/null; then
    log_ok "Docker al geïnstalleerd"
else
    read -p "  Docker installeren voor lokale n8n? (y/n, default: n): " INSTALL_DOCKER
    if [[ "$INSTALL_DOCKER" == "y" ]]; then
        brew install --cask docker
        log_ok "Docker Desktop geïnstalleerd"
        log_warn "Open Docker Desktop handmatig en laat het volledig opstarten"
    else
        log_warn "Docker overgeslagen — je kunt n8n.cloud gebruiken als alternatief"
    fi
fi

# ========== STAP 5/13: Claude Code CLI ==========
log_step "Stap 5/13 — Claude Code CLI"
if command -v claude &>/dev/null; then
    log_ok "Claude Code al geïnstalleerd"
else
    npm install -g @anthropic-ai/claude-code
    command -v claude &>/dev/null && log_ok "Claude Code geïnstalleerd" || log_warn "Herstart terminal en check 'claude --version'"
fi

# ========== STAP 6/13: Python packages ==========
log_step "Stap 6/13 — Python packages"
pip3 install --quiet --upgrade httpx "mcp[cli]" fastmcp 2>&1 | tail -3 || true
log_ok "httpx, mcp[cli], fastmcp geïnstalleerd"

# ========== STAP 7/13: Project folder ~/Bamboo/ ==========
log_step "Stap 7/13 — ~/Bamboo/ project folder"
mkdir -p "$PROJECT_DIR"/{tasks,systems,knowledge-base,brand-assets,intake-docs}

# Copy alle Bamboo brand files
for f in CLAUDE.md brand-voice.md avatar.md products.md competitors.json hookbank.md creative-strategy.md top-ads.md; do
    if [ -f "$BAMBOO_DIR/$f" ]; then
        cp -f "$BAMBOO_DIR/$f" "$PROJECT_DIR/"
        log_ok "$f"
    fi
done

# Copy systems/ folder
if [ -d "$BAMBOO_DIR/systems" ]; then
    cp -rf "$BAMBOO_DIR/systems"/* "$PROJECT_DIR/systems/" 2>/dev/null
    log_ok "systems/ (6 systemen: scraping, content, ads, conversion, revenue, intelligence)"
fi

# Copy knowledge-base
if [ -d "$BAMBOO_DIR/knowledge-base" ]; then
    cp -rf "$BAMBOO_DIR/knowledge-base"/* "$PROJECT_DIR/knowledge-base/" 2>/dev/null
    log_ok "knowledge-base/"
fi

log_ok "Project folder: $PROJECT_DIR"

# ========== STAP 8/13: Skills installeren ==========
log_step "Stap 8/13 — Skills → ~/.claude/commands/"
mkdir -p "$HOME/.claude/commands"

SKILL_COUNT=0
# Skills die Bamboo 3 systemen nodig hebben (uit _modules/skills/)
BAMBOO_SKILLS=(
    # Systeem 1 — Competitor Scraping
    "scrape-ads.md" "competitor-research.md" "competitor-analyst.md"
    # Systeem 2 — Content Machine
    "content-machine.md" "content-ideator.md" "content-scripter.md"
    "daily-content-researcher.md" "generate-ad-statics.md" "static-to-video.md"
    "image-prompt-architect.md" "script-ads.md"
    # Systeem 3 — Ad Management
    "ad-machine.md" "ad-brief.md" "launch-ads.md" "bulk-ads-upload.md"
    "media-buyer-agent.md"
    # Algemeen ondersteunend
    "n8n.md" "mcp-builder.md" "skill-builder.md"
    # Systeem 5 — Revenue Engine (hergebruikt uit _modules)
    "respond-to-leads.md" "cs-agent.md"
    # Systeem 6 — Intelligence Engine (hergebruikt uit _modules)
    "finance-analyst.md"
)

for skill in "${BAMBOO_SKILLS[@]}"; do
    if [ -f "$MODULES_DIR/skills/$skill" ]; then
        cp "$MODULES_DIR/skills/$skill" "$HOME/.claude/commands/"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    else
        log_warn "Skill niet gevonden: $skill"
    fi
done

# Bamboo-specifieke skills (uit systems/*/skills/ — Engines 4, 5, 6)
for eng in 4-conversion-engine 5-revenue-engine 6-intelligence-engine; do
    eng_skills_dir="$BAMBOO_DIR/systems/$eng/skills"
    if [ -d "$eng_skills_dir" ]; then
        for skill_file in "$eng_skills_dir"/*.md; do
            if [ -f "$skill_file" ]; then
                cp "$skill_file" "$HOME/.claude/commands/"
                SKILL_COUNT=$((SKILL_COUNT + 1))
            fi
        done
    fi
done

log_ok "$SKILL_COUNT skills → ~/.claude/commands/"

# ========== STAP 9/13: MCP Servers ==========
log_step "Stap 9/13 — MCP Servers → ~/mcp-servers/"
mkdir -p "$HOME/mcp-servers"

MCP_COUNT=0
if [ -d "$MODULES_DIR/mcp-servers" ]; then
    for server_dir in "$MODULES_DIR/mcp-servers"/*/; do
        if [ -d "$server_dir" ]; then
            server_name="$(basename "$server_dir")"
            mkdir -p "$HOME/mcp-servers/$server_name"
            cp -r "$server_dir"* "$HOME/mcp-servers/$server_name/"
            MCP_COUNT=$((MCP_COUNT + 1))
            log_ok "$server_name"
        fi
    done
fi
log_ok "$MCP_COUNT MCP servers → ~/mcp-servers/"

# ========== STAP 10/13: n8n workflows ==========
log_step "Stap 10/13 — n8n workflows → ~/n8n-workflows/bamboo/"
mkdir -p "$HOME/n8n-workflows/bamboo"

# Bamboo-specifieke workflows
for wf_dir in "$BAMBOO_DIR/systems"/*; do
    if [ -d "$wf_dir" ]; then
        for wf in "$wf_dir"/*.json; do
            if [ -f "$wf" ]; then
                cp "$wf" "$HOME/n8n-workflows/bamboo/"
                log_ok "$(basename "$wf")"
            fi
        done
    fi
done

# ========== STAP 11/13: Claude settings.json ==========
log_step "Stap 11/13 — Claude Code settings"
mkdir -p "$HOME/.claude"

if [ -f "$SCRIPT_PATH/settings.json.template" ]; then
    cp -f "$SCRIPT_PATH/settings.json.template" "$HOME/.claude/settings.local.json"
    log_ok "settings.local.json aangemaakt"
    log_warn "Keys invullen in ~/.claude/settings.local.json"
else
    log_warn "settings.json.template niet gevonden"
fi

# .env file aanmaken in project dir
if [ -f "$SCRIPT_PATH/.env.template" ]; then
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        cp "$SCRIPT_PATH/.env.template" "$PROJECT_DIR/.env"
        log_ok ".env aangemaakt in $PROJECT_DIR"
        log_warn "Keys invullen in $PROJECT_DIR/.env"
    else
        log_warn ".env bestaat al — niet overschreven"
    fi
fi

# ========== STAP 12/13: .gitignore voor veiligheid ==========
log_step "Stap 12/13 — .gitignore (voorkomt per ongeluk keys committen)"
cat > "$PROJECT_DIR/.gitignore" <<'GITIGNORE'
.env
.env.local
*.secret
settings.local.json
node_modules/
__pycache__/
.DS_Store
GITIGNORE
log_ok ".gitignore"

# ========== STAP 13/13: Verificatie ==========
log_step "Stap 13/13 — Verificatie"

echo -e "  ${BOLD}Software:${NC}"
command -v git &>/dev/null      && log_ok "Git"         || log_err "Git mist"
command -v python3 &>/dev/null  && log_ok "Python"      || log_err "Python mist"
command -v node &>/dev/null     && log_ok "Node.js"     || log_err "Node.js mist"
command -v claude &>/dev/null   && log_ok "Claude Code" || log_warn "Claude Code — herstart terminal"

echo ""
echo -e "  ${BOLD}Bamboo project:${NC}"
[ -f "$PROJECT_DIR/CLAUDE.md" ]       && log_ok "~/Bamboo/CLAUDE.md"       || log_err "CLAUDE.md mist"
[ -f "$PROJECT_DIR/brand-voice.md" ]  && log_ok "~/Bamboo/brand-voice.md"  || log_err "brand-voice.md mist"
[ -f "$PROJECT_DIR/hookbank.md" ]     && log_ok "~/Bamboo/hookbank.md"     || log_err "hookbank.md mist"
[ -f "$PROJECT_DIR/competitors.json" ] && log_ok "~/Bamboo/competitors.json" || log_err "competitors.json mist"
[ -d "$PROJECT_DIR/systems/1-competitor-scraping" ] && log_ok "Systeem 1 — Competitor Scraping" || log_err "Systeem 1 mist"
[ -d "$PROJECT_DIR/systems/2-content-machine" ]     && log_ok "Systeem 2 — Content Machine"     || log_err "Systeem 2 mist"
[ -d "$PROJECT_DIR/systems/3-ad-management" ]       && log_ok "Systeem 3 — Ad Management"       || log_err "Systeem 3 mist"
[ -d "$PROJECT_DIR/systems/4-conversion-engine" ]   && log_ok "Systeem 4 — Conversion Engine"   || log_err "Systeem 4 mist"
[ -d "$PROJECT_DIR/systems/5-revenue-engine" ]      && log_ok "Systeem 5 — Revenue Engine"      || log_err "Systeem 5 mist"
[ -d "$PROJECT_DIR/systems/6-intelligence-engine" ] && log_ok "Systeem 6 — Intelligence Engine" || log_err "Systeem 6 mist"

echo ""
echo -e "  ${BOLD}AI assets:${NC}"
INSTALLED_SKILLS=$(ls "$HOME/.claude/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
log_ok "$INSTALLED_SKILLS skills in ~/.claude/commands/"
BAMBOO_WFS=$(ls "$HOME/n8n-workflows/bamboo/"*.json 2>/dev/null | wc -l | tr -d ' ')
log_ok "$BAMBOO_WFS Bamboo n8n workflows in ~/n8n-workflows/bamboo/"
[ -f "$HOME/.claude/settings.local.json" ] && log_ok "Claude settings" || log_warn "Claude settings mist"
[ -f "$PROJECT_DIR/.env" ] && log_ok ".env file" || log_warn ".env mist"

# ========== DONE ==========
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║      ✅ Bamboo installatie compleet!          ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  ${BOLD}Volgende stappen:${NC}"
echo ""
echo -e "  1. ${CYAN}claude login${NC}                                     — log in bij Claude Code"
echo -e "  2. Edit ${CYAN}~/Bamboo/.env${NC}                                 — vul API keys in"
echo -e "  3. Edit ${CYAN}~/.claude/settings.local.json${NC}                  — MCP server configs"
echo -e "  4. ${CYAN}cd ~/Bamboo && claude${NC}                           — open project in Claude Code"
echo -e "  5. Volg ${CYAN}~/Bamboo/systems/1-competitor-scraping/README.md${NC} — Airtable base opzetten"
echo -e "  6. Volg ${CYAN}~/Bamboo/systems/4-conversion-engine/shopify-setup.md${NC} — Shopify token"
echo -e "  7. Volg ${CYAN}~/Bamboo/systems/5-revenue-engine/klaviyo-setup.md${NC} — Klaviyo key"
echo -e "  8. Open ${CYAN}~/Bamboo/systems/6-intelligence-engine/dashboard.html${NC} — management dashboard"
echo ""
echo -e "  ${BOLD}Engines:${NC} Acquisition (1+2+3) · Conversion (4) · Revenue (5) · Intelligence (6)"
echo -e "  ${BOLD}Videocursus:${NC} 8 modules in ~/Bamboo/intake-docs/video-cursus/"
echo ""
