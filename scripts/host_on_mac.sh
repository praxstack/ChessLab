#!/bin/bash
# Hosts the private beta from this Mac at app.askthemove.online for free, through a Cloudflare Tunnel.
# No server, card or open port is needed. The site is offline while the Mac sleeps or is shut down.
#
#   scripts/host_on_mac.sh          set up once, then start the app and the tunnel
#   scripts/host_on_mac.sh update   pull main, rebuild and restart the app
#   scripts/host_on_mac.sh status   show whether the app answers
#   scripts/host_on_mac.sh stop     stop the app and the tunnel (they start again at next login unless removed)
#
# The beta keeps its own database in ~/AskTheMove, apart from the local development data in ./data.
set -euo pipefail

HOSTNAME_PUBLIC="${ASKTHEMOVE_HOSTNAME:-app.askthemove.online}"
TUNNEL_NAME=askthemove
PORT=8780
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="$HOME/AskTheMove"
ENV_FILE="$REPO/.env.beta"
AGENTS="$HOME/Library/LaunchAgents"
APP_LABEL=online.askthemove.app
TUNNEL_LABEL=online.askthemove.tunnel
TUNNEL_CONFIG="$HOME/.cloudflared/$TUNNEL_NAME.yml"

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nStopped: %s\n' "$*" >&2; exit 1; }

answers() { curl -fsS --max-time 5 "http://127.0.0.1:$PORT/api/status" 2>/dev/null | grep -q '"inviteRequired":true'; }

restart_app() {
  launchctl kickstart -k "gui/$(id -u)/$APP_LABEL" >/dev/null
  for _ in $(seq 1 30); do answers && return 0; sleep 2; done
  tail -n 30 "$HOME_DIR/logs/app.log" >&2 || true
  fail "the app did not start. The lines above are its log."
}

case "${1:-setup}" in
  status)
    if answers; then echo "The app is running and invite-only on port $PORT."; else echo "The app is not answering on port $PORT."; fi
    launchctl print "gui/$(id -u)/$TUNNEL_LABEL" >/dev/null 2>&1 && echo "The tunnel service is loaded." || echo "The tunnel service is not loaded."
    exit 0 ;;
  stop)
    launchctl bootout "gui/$(id -u)/$APP_LABEL" 2>/dev/null || true
    launchctl bootout "gui/$(id -u)/$TUNNEL_LABEL" 2>/dev/null || true
    echo "Stopped. Run scripts/host_on_mac.sh to start again."
    exit 0 ;;
  update)
    cd "$REPO"
    [ "$(git branch --show-current)" = main ] || fail "switch this folder to the main branch first (git switch main)."
    git pull --ff-only origin main
    npm ci --no-audit --no-fund
    npm run build
    restart_app
    echo "Updated and running."
    exit 0 ;;
  setup) ;;
  *) fail "unknown command $1. Use setup, update, status or stop." ;;
esac

[ "$(uname -s)" = Darwin ] || fail "this script is for macOS."
command -v brew >/dev/null || fail "Homebrew is missing. Install it from https://brew.sh, then run this again."

say "Checking Node.js, Stockfish and cloudflared"
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$node_major" -ge 24 ] || brew install node
command -v stockfish >/dev/null || brew install stockfish
command -v cloudflared >/dev/null || brew install cloudflared
NODE="$(command -v node)"
STOCKFISH="$(command -v stockfish)"
CLOUDFLARED="$(command -v cloudflared)"
"$STOCKFISH" quit | head -n 1 || true

say "Building the app"
cd "$REPO"
npm ci --no-audit --no-fund
npm run build
mkdir -p "$HOME_DIR/logs"

if [ ! -f "$ENV_FILE" ]; then
  say "Beta settings"
  echo "Type the invite codes testers will use, separated by commas (at least 12 characters each)."
  echo "Nothing is shown while you type."
  IFS= read -rs codes; echo
  [ -n "$codes" ] || fail "invite codes are required, so strangers can't sign up."
  ( umask 077
    { echo "NODE_ENV=production"
      echo "HOST=127.0.0.1"
      echo "PORT=$PORT"
      echo "APP_ORIGIN=https://$HOSTNAME_PUBLIC"
      echo "TRUST_PROXY=1"
      echo "STOCKFISH_PATH=$STOCKFISH"
      echo "CHESSLAB_DB=$HOME_DIR/chesslab.sqlite"
      echo "BETA_INVITE_CODES=$codes"
    } > "$ENV_FILE" )
  unset codes
  echo "Saved to .env.beta (only your user can read it; Git ignores it)."
fi

say "Starting the app"
mkdir -p "$AGENTS"
# caffeinate keeps the Mac from idle-sleeping while the app runs. Closing a laptop lid still sleeps it.
cat > "$AGENTS/$APP_LABEL.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$APP_LABEL</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/caffeinate</string><string>-i</string>
    <string>$NODE</string><string>--env-file=$ENV_FILE</string><string>server/index.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME_DIR/logs/app.log</string>
  <key>StandardErrorPath</key><string>$HOME_DIR/logs/app.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$APP_LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENTS/$APP_LABEL.plist"
restart_app
echo "The app answers on http://127.0.0.1:$PORT and requires an invite code."

say "Connecting the tunnel"
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo "A browser window opens. Sign in to Cloudflare and choose askthemove.online."
  "$CLOUDFLARED" tunnel login
fi
"$CLOUDFLARED" tunnel info "$TUNNEL_NAME" >/dev/null 2>&1 || "$CLOUDFLARED" tunnel create "$TUNNEL_NAME"
tunnel_id="$("$CLOUDFLARED" tunnel list --output json | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).find(t=>t.name===process.argv[1]).id))' "$TUNNEL_NAME")"
cat > "$TUNNEL_CONFIG" <<YAML
tunnel: $tunnel_id
credentials-file: $HOME/.cloudflared/$tunnel_id.json
ingress:
  - hostname: $HOSTNAME_PUBLIC
    service: http://127.0.0.1:$PORT
  - service: http_status:404
YAML
# Adds one CNAME for the app hostname only. It never touches the site, www or email records.
"$CLOUDFLARED" tunnel route dns "$TUNNEL_NAME" "$HOSTNAME_PUBLIC" || echo "The DNS record may already exist; continuing."

cat > "$AGENTS/$TUNNEL_LABEL.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$TUNNEL_LABEL</string>
  <key>ProgramArguments</key><array>
    <string>$CLOUDFLARED</string><string>tunnel</string><string>--config</string><string>$TUNNEL_CONFIG</string><string>run</string><string>$TUNNEL_NAME</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME_DIR/logs/tunnel.log</string>
  <key>StandardErrorPath</key><string>$HOME_DIR/logs/tunnel.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$TUNNEL_LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENTS/$TUNNEL_LABEL.plist"

say "Checking https://$HOSTNAME_PUBLIC"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 10 "https://$HOSTNAME_PUBLIC/healthz" >/dev/null 2>&1; then
    echo "Live: https://$HOSTNAME_PUBLIC"
    echo "It starts again by itself when you log in. Logs: $HOME_DIR/logs"
    exit 0
  fi
  sleep 5
done
tail -n 20 "$HOME_DIR/logs/tunnel.log" >&2 || true
fail "the app runs, but https://$HOSTNAME_PUBLIC doesn't answer yet. DNS can take a few minutes; run scripts/host_on_mac.sh status, then try the address again."
