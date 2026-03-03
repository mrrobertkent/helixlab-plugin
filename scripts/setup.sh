#!/bin/bash
# setup.sh — HelixLab dependency checker and setup guide
# Usage: setup.sh [--check] [--yes]
#   --check   Report dependency status only (no install prompts)
#   --yes     Skip prompts and auto-install missing dependencies

set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Flags ---
CHECK_ONLY=false
AUTO_YES=false

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --yes)   AUTO_YES=true ;;
  esac
done

# --- Helpers ---
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${BLUE}→${NC} $1"; }

# --- OS Detection ---
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &>/dev/null; then
      echo "macos-brew"
    else
      echo "macos"
    fi
  elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian|pop|linuxmint|elementary) echo "debian" ;;
      fedora|rhel|centos|rocky|alma)          echo "rhel" ;;
      arch|manjaro|endeavouros)               echo "arch" ;;
      *)
        if [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
          echo "wsl"
        else
          echo "linux-unknown"
        fi
        ;;
    esac
  elif grep -qi microsoft /proc/version 2>/dev/null; then
    echo "wsl"
  else
    echo "unknown"
  fi
}

detect_arch() {
  local machine
  machine=$(uname -m)
  case "$machine" in
    x86_64|amd64) echo "amd64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) echo "unknown" ;;
  esac
}

install_command_for() {
  local os="$1"
  case "$os" in
    macos-brew|macos)
      local arch
      arch=$(detect_arch)
      echo "# Download static ffmpeg (includes drawtext): curl -L -o /tmp/ffmpeg.zip https://ffmpeg.martin-riedl.de/redirect/latest/macos/${arch}/release/ffmpeg.zip && curl -L -o /tmp/ffprobe.zip https://ffmpeg.martin-riedl.de/redirect/latest/macos/${arch}/release/ffprobe.zip && mkdir -p ~/.local/bin && unzip -o /tmp/ffmpeg.zip -d ~/.local/bin/ && unzip -o /tmp/ffprobe.zip -d ~/.local/bin/ && chmod +x ~/.local/bin/ffmpeg ~/.local/bin/ffprobe && rm /tmp/ffmpeg.zip /tmp/ffprobe.zip" ;;
    debian|wsl)    echo "sudo apt update && sudo apt install -y ffmpeg bc" ;;
    rhel)          echo "sudo dnf install -y ffmpeg bc" ;;
    arch)          echo "sudo pacman -S --noconfirm ffmpeg bc" ;;
    *)             echo "# Install ffmpeg, ffprobe, and bc using your package manager" ;;
  esac
}

install_static_ffmpeg() {
  local os arch base_url
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch=$(detect_arch)
  [[ "$os" == "darwin" ]] && os="macos"
  base_url="https://ffmpeg.martin-riedl.de/redirect/latest/${os}/${arch}/release"

  if [[ "$arch" == "unknown" ]]; then
    err "Unsupported architecture: $(uname -m)"
    return 1
  fi

  info "Downloading static ffmpeg for ${os}/${arch}..."
  curl -L -o /tmp/ffmpeg.zip "${base_url}/ffmpeg.zip" || { err "Download failed"; return 1; }
  curl -L -o /tmp/ffprobe.zip "${base_url}/ffprobe.zip" || { err "Download failed"; return 1; }

  mkdir -p ~/.local/bin
  unzip -o /tmp/ffmpeg.zip -d ~/.local/bin/ || { err "Unzip failed"; return 1; }
  unzip -o /tmp/ffprobe.zip -d ~/.local/bin/ || { err "Unzip failed"; return 1; }
  chmod +x ~/.local/bin/ffmpeg ~/.local/bin/ffprobe
  rm -f /tmp/ffmpeg.zip /tmp/ffprobe.zip

  ok "Installed ffmpeg and ffprobe to ~/.local/bin/"
  info "Ensure ~/.local/bin is in your PATH (add to ~/.zshrc or ~/.bashrc):"
  echo -e "    ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
}

os_label_for() {
  local os="$1"
  case "$os" in
    macos-brew)    echo "macOS (Homebrew)" ;;
    macos)         echo "macOS (no Homebrew)" ;;
    debian)        echo "Debian/Ubuntu" ;;
    rhel)          echo "RHEL/Fedora" ;;
    arch)          echo "Arch Linux" ;;
    wsl)           echo "WSL" ;;
    *)             echo "Unknown Linux" ;;
  esac
}

# ============================================================
# Phase 1: Dependency Check & Install
# ============================================================

echo ""
echo -e "${BOLD}HelixLab Setup${NC}"
echo -e "────────────────────────────────────"

OS=$(detect_os)
echo -e "\n${CYAN}System${NC}"
info "OS detected: $(os_label_for "$OS")"

echo -e "\n${CYAN}Dependencies${NC}"

MISSING=()

for dep in ffmpeg ffprobe bc; do
  if command -v "$dep" &>/dev/null; then
    VERSION=""
    case "$dep" in
      ffmpeg)  VERSION=" ($(ffmpeg -version 2>&1 | head -1 | sed 's/ffmpeg version //' | cut -d' ' -f1))" ;;
      ffprobe) VERSION=" ($(ffprobe -version 2>&1 | head -1 | sed 's/ffprobe version //' | cut -d' ' -f1))" ;;
      bc)      VERSION="" ;;
    esac
    ok "$dep installed${VERSION}"
  else
    err "$dep not found"
    MISSING+=("$dep")
  fi
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
  echo -e "\n${GREEN}${BOLD}All dependencies installed.${NC}"

  # Check for drawtext filter (required for timestamp overlays)
  echo -e "\n${CYAN}Optional Features${NC}"
  if ffmpeg -filters 2>/dev/null | grep -q "drawtext"; then
    ok "drawtext filter available (timestamp overlay enabled)"
  else
    warn "drawtext filter missing (timestamp overlay disabled)"
    case "$OS" in
      macos-brew|macos)
        info "The standard brew install does NOT include drawtext"
        info "Download a static build with all filters:"
        echo -e "    ${BOLD}bash scripts/setup.sh --yes${NC}  (auto-install static build)"
        echo -e "    Or manually from: ${BOLD}https://ffmpeg.martin-riedl.de${NC}"
        ;;
      *)
        info "Install ffmpeg from your distro package manager (includes drawtext by default)"
        ;;
    esac
  fi
else
  INSTALL_CMD=$(install_command_for "$OS")
  echo -e "\n${YELLOW}${BOLD}Missing: ${MISSING[*]}${NC}"

  case "$OS" in
    macos-brew|macos)
      info "Recommended: Install static ffmpeg build (includes drawtext filter):"
      echo -e "    ${BOLD}bash scripts/setup.sh --yes${NC}  (auto-download + install)"
      echo -e "    Or manually from: ${BOLD}https://ffmpeg.martin-riedl.de${NC}"
      ;;
    *)
      info "Install command: ${BOLD}${INSTALL_CMD}${NC}"
      ;;
  esac

  if [[ "$CHECK_ONLY" == true ]]; then
    echo -e "\n  Run ${BOLD}bash scripts/setup.sh${NC} (without --check) to install."
  elif [[ "$AUTO_YES" == true ]]; then
    echo ""
    case "$OS" in
      macos-brew|macos)
        info "Installing static ffmpeg build (--yes)..."
        install_static_ffmpeg
        ;;
      *)
        info "Installing (--yes)..."
        eval "$INSTALL_CMD"
        ;;
    esac
    echo ""
    ok "Installation complete. Re-run to verify."
  elif [[ "$OS" != "unknown" && "$OS" != "linux-unknown" ]]; then
    echo ""
    read -rp "  Install now? [Y/n] " REPLY
    REPLY=${REPLY:-Y}
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
      case "$OS" in
        macos-brew|macos)
          install_static_ffmpeg
          ;;
        *)
          eval "$INSTALL_CMD"
          ;;
      esac
      echo ""
      ok "Installation complete. Re-run to verify."
    else
      info "Skipped. Run the command above manually."
    fi
  else
    info "Install the missing dependencies manually, then re-run this script."
  fi
fi

# ============================================================
# Phase 2: Agent Detection & Next Steps
# ============================================================

echo -e "\n${CYAN}AI Agent Detection${NC}"

AGENT_FOUND=false

# Claude Code
if command -v claude &>/dev/null || [[ -d "$HOME/.claude" ]]; then
  ok "Claude Code detected"
  info "Install as plugin:"
  echo -e "    ${BOLD}/plugin marketplace add https://github.com/mrrobertkent/helixlab-plugin${NC}"
  echo -e "    ${BOLD}/plugin install helixlab${NC}"
  info "Add --scope project to share the plugin with teammates via Git"
  info "Tip: Enable auto-update in /plugin → Marketplaces → Enable auto-update"
  AGENT_FOUND=true
fi

# Cursor
if [[ -d "$HOME/.cursor" ]] || command -v cursor &>/dev/null; then
  ok "Cursor detected"
  info ".cursor/rules/ auto-activates when video files are in context"
  info "Alternatively, copy AGENTS.md to your project root"
  AGENT_FOUND=true
fi

# VS Code + Copilot
if command -v code &>/dev/null; then
  ok "VS Code detected"
  info "Copy AGENTS.md to your project root for Copilot integration"
  AGENT_FOUND=true
fi

# Gemini CLI
if command -v gemini &>/dev/null || [[ -d "$HOME/.gemini" ]]; then
  ok "Gemini CLI detected"
  info "Copy GEMINI.md to your project root"
  info "Or configure: ~/.gemini/settings.json → context.fileName: [\"AGENTS.md\"]"
  AGENT_FOUND=true
fi

# Windsurf
if [[ -d "$HOME/.windsurf" ]] || command -v windsurf &>/dev/null; then
  ok "Windsurf detected"
  info "Copy AGENTS.md to your project root"
  AGENT_FOUND=true
fi

# Codex CLI
if command -v codex &>/dev/null; then
  ok "Codex CLI detected"
  info "Copy AGENTS.md to your project root"
  AGENT_FOUND=true
fi

# Aider
if command -v aider &>/dev/null; then
  ok "Aider detected"
  info "Copy AGENTS.md to your project root"
  AGENT_FOUND=true
fi

# Goose
if command -v goose &>/dev/null; then
  ok "Goose detected"
  info "Copy AGENTS.md to your project root"
  AGENT_FOUND=true
fi

if [[ "$AGENT_FOUND" == false ]]; then
  warn "No AI coding agent detected"
  info "Copy AGENTS.md to your project root for any agent that supports it"
  info "See README.md for agent-specific installation instructions"
fi

echo -e "\n${CYAN}Documentation${NC}"
info "README:    https://github.com/mrrobertkent/helixlab-plugin"
info "AGENTS.md: Agent-readable tool reference (copy to project root)"
info "GEMINI.md: Gemini-specific instructions (copy to project root)"

echo ""
