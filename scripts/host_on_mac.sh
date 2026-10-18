#!/bin/bash
# Hosts the private beta from this Mac at app.askthemove.online for free, through a Cloudflare Tunnel.
# No server, card or open port is needed. The site is offline while the Mac sleeps or is shut down.
#
#   scripts/host_on_mac.sh                 set up once, then start the app, the tunnel and daily backups
#   scripts/host_on_mac.sh update          pull main, rebuild and restart the app
#   scripts/host_on_mac.sh status          show whether the app answers
#   scripts/host_on_mac.sh backup          copy the database now (setup also schedules this daily)
#   scripts/host_on_mac.sh restore FILE    put a backup back in place and restart the app
#   scripts/host_on_mac.sh stop            stop the app and the tunnel (they start again at next login unless removed)
#   scripts/host_on_mac.sh start           start them again after stop, without rebuilding
#
# The beta keeps its own database in ~/AskTheMove, apart from the local development data in ./data.
set -euo pipefail

HOSTNAME_PUBLIC="${ASKTHEMOVE_HOSTNAME:-app.askthemove.online}"
TUNNEL_NAME=askthemove
PORT=8780
TUNNEL_METRICS=127.0.0.1:8781   # cloudflared answers /ready here once it has a live connection to Cloudflare
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="$HOME/AskTheMove"
DB="$HOME_DIR/chesslab.sqlite"
BACKUPS="$HOME_DIR/backups"
KEEP_BACKUPS=14
ENV_FILE="$REPO/.env.beta"
AGENTS="$HOME/Library/LaunchAgents"
APP_LABEL=online.askthemove.app
TUNNEL_LABEL=online.askthemove.tunnel
BACKUP_LABEL=online.askthemove.backup
TUNNEL_CONFIG="$HOME/.cloudflared/$TUNNEL_NAME.yml"
DOMAIN="${HOSTNAME_PUBLIC#*.}"

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nStopped: %s\n' "$*" >&2; exit 1; }
xml() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }
sf_is_18() {
  # Read all of the engine's reply first; grep -q closing the pipe early could fail it under pipefail.
  local out
  out="$(printf 'uci\nquit\n' | "$1" 2>/dev/null)" || true
  grep -q '^id name Stockfish 18' <<<"$out"
}
node_major() { "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

answers() { curl -fsS --max-time 5 "http://127.0.0.1:$PORT/api/status" 2>/dev/null | grep -q '"inviteRequired":true'; }
tunnel_ready() {
  # Loaded is not connected: wait until this Mac's cloudflared reports a live Cloudflare connection.
  for _ in $(seq 1 30); do curl -fsS --max-time 5 "http://$TUNNEL_METRICS/ready" >/dev/null 2>&1 && return 0; sleep 2; done
  return 1
}
serving() {
  # The answer must come from this launch agent's process. Another ChessLab on the same port would
  # otherwise pass, and the tunnel would publish its database.
  answers || return 1
  local pid; pid="$(launchctl print "gui/$(id -u)/$APP_LABEL" 2>/dev/null | awk '$1=="pid"{print $3; exit}')"
  [ -n "$pid" ] && lsof -nP -a -p "$pid" -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

rotate_logs() {
  # Keep each log under about 10 MB, with one older copy, so a crash loop can't fill the disk.
  local log
  for log in "$HOME_DIR"/logs/*.log; do
    # The app and cloudflared keep their log open (launchd appends), so copy, then truncate in place.
    [ -f "$log" ] && [ "$(wc -c < "$log")" -gt 10485760 ] && { cp -f "$log" "$log.1" && : > "$log"; }
  done
  return 0
}

private_dirs() {
  # The database holds password and session hashes, so only this user may read the folder.
  mkdir -p "$HOME_DIR/logs" "$BACKUPS"
  chmod 700 "$HOME_DIR" "$BACKUPS"
  for file in "$DB" "$DB-wal" "$DB-shm"; do [ -e "$file" ] && chmod 600 "$file"; done
  return 0
}

app_starts() {
  launchctl kickstart -k "gui/$(id -u)/$APP_LABEL" >/dev/null
  for _ in $(seq 1 30); do serving && return 0; sleep 2; done
  tail -n 30 "$HOME_DIR/logs/app.log" >&2 || true
  if answers; then echo "Another program is answering on port $PORT, not this Mac's AskTheMove service. Stop it (lsof -nP -iTCP:$PORT -sTCP:LISTEN shows which), then run this again." >&2; fi
  return 1
}
restart_app() { app_starts || fail "the app did not start. The lines above are its log."; }

usable_db() {
  "$NODE" -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1],{readOnly:true});if(d.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')process.exit(1);for(const t of ['users','sessions','games','progress'])if(!d.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').get('table',t))process.exit(1)" "$1" 2>/dev/null
}

pick_node() {
  command -v brew >/dev/null || fail "Homebrew is missing. Install it from https://brew.sh, then run this again."
  # An older Node from nvm or Volta may come first on PATH, so fall back to Homebrew's own Node.
  if [ "$(node_major "$(command -v node || echo node)")" -lt 24 ]; then
    local brew_node
    brew_node="$(brew --prefix)/opt/node/bin"
    [ -x "$brew_node/node" ] || brew install node
    [ "$(node_major "$brew_node/node")" -ge 24 ] || brew upgrade node
    export PATH="$brew_node:$PATH"
  fi
  NODE="$(command -v node)"
  [ "$(node_major "$NODE")" -ge 24 ] || fail "Node.js 24 or newer is needed; $NODE is older."
}

tools() {
  pick_node
  local brew_sf; brew_sf="$(brew --prefix)/opt/stockfish/bin/stockfish"
  STOCKFISH="$(command -v stockfish || true)"
  if [ -z "$STOCKFISH" ] || ! sf_is_18 "$STOCKFISH"; then
    # An older Stockfish on PATH would hide Homebrew's; install or upgrade Homebrew's and prefer it when it is 18.
    if [ -x "$brew_sf" ]; then brew upgrade stockfish || true; elif [ -n "$STOCKFISH" ]; then brew install stockfish || true; else brew install stockfish; fi
    if sf_is_18 "$brew_sf" || [ -z "$STOCKFISH" ]; then STOCKFISH="$brew_sf"; fi
  fi
  command -v cloudflared >/dev/null || brew install cloudflared
  CLOUDFLARED="$(command -v cloudflared)"
}

build() {
  cd "$REPO"
  npm ci --no-audit --no-fund
  # Build beside the live files and swap only after success, so a failed build never empties the site.
  local next="$REPO/.scratch/dist-next" old="$REPO/.scratch/dist-old"
  mkdir -p "$REPO/.scratch"
  rm -rf "$next" "$old"
  npx --no-install vite build --outDir "$next"
  [ -f "$next/index.html" ] || fail "the build produced no index.html; the live site was left as it was."
  if [ -d web/dist ]; then mv web/dist "$old"; fi
  mv "$next" web/dist
  rm -rf "$old"
}

link_engine() {
  # Analysis defaults to the engine id stockfish18, which looks in data/engines/stockfish18.
  # Point it at the Homebrew Stockfish unless scripts/install_engines.py already installed one.
  local dir="$REPO/data/engines/stockfish18"
  # A link left pointing at a removed Stockfish counts as missing; clear it so it can be relinked.
  # Homebrew may also have upgraded it past 18. Only links are removed; an installed engine file stays.
  if [ -L "$dir/stockfish" ] && { [ ! -e "$dir/stockfish" ] || ! sf_is_18 "$dir/stockfish"; }; then rm -f "$dir/stockfish"; fi
  if [ ! -e "$dir/stockfish" ] && ! sf_is_18 "$STOCKFISH"; then
    echo "Note: $STOCKFISH is not Stockfish 18, so it isn't offered as Stockfish 18. Choose another analysis engine in Settings, or run scripts/install_engines.py stockfish18."
  elif [ ! -e "$dir/stockfish" ]; then
    mkdir -p "$dir"
    ln -s "$STOCKFISH" "$dir/stockfish"
  fi
}

backup() {
  if [ -n "${ASKTHEMOVE_NODE:-}" ]; then NODE="$ASKTHEMOVE_NODE"; elif [ -z "${NODE:-}" ]; then pick_node; fi
  [ -f "$DB" ] || fail "there is no database at $DB yet."
  private_dirs
  local out
  out="$BACKUPS/chesslab-$(date -u +%Y%m%dT%H%M%SZ)-$$.sqlite"
  # VACUUM INTO writes one consistent file while the app keeps serving. It goes to a temporary
  # name and gets its final name only after it passes the same check a restore uses.
  # Clear partial files only from runs that are no longer running; another backup may be mid-way.
  local partial
  for partial in "$BACKUPS"/.partial-*; do
    if [ -e "$partial" ] && { [ "${partial##*.partial-}" = "$$" ] || ! kill -0 "${partial##*.partial-}" 2>/dev/null; }; then rm -f "$partial"; fi
  done
  ( umask 077
    "$NODE" -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync(process.argv[1],{readOnly:true}).prepare('VACUUM INTO ?').run(process.argv[2])" "$DB" "$BACKUPS/.partial-$$" ) \
    && usable_db "$BACKUPS/.partial-$$" || { rm -f "$BACKUPS/.partial-$$"; fail "the backup didn't complete; no file was kept."; }
  mv "$BACKUPS/.partial-$$" "$out"
  rotate_logs
  ls -1t "$BACKUPS"/chesslab-*.sqlite | tail -n +$((KEEP_BACKUPS + 1)) | while IFS= read -r stale; do rm -f "$stale"; done
  echo "Backed up to $out"
}

# The launch agents hold absolute paths (Node, the checkout), so setup and update both rewrite them.
# Umask 63 is 077, so files the app and backups create are readable only by this user.
write_app_agent() {
  mkdir -p "$AGENTS"
cat > "$AGENTS/$APP_LABEL.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$APP_LABEL</string>
  <key>ProgramArguments</key><array>
    <string>/bin/bash</string><string>-c</string><string>/usr/bin/caffeinate -i -w \$\$ &amp; exec "\$0" "\$@"</string>
    <string>$(xml "$NODE")</string><string>--env-file=$(xml "$ENV_FILE")</string><string>server/index.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$(xml "$REPO")</string>
  <key>Umask</key><integer>63</integer>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$(xml "$HOME_DIR")/logs/app.log</string>
  <key>StandardErrorPath</key><string>$(xml "$HOME_DIR")/logs/app.log</string>
</dict></plist>
PLIST
  chmod 644 "$AGENTS/$APP_LABEL.plist"  # launchd refuses agents others can write to
}

write_backup_agent() {
cat > "$AGENTS/$BACKUP_LABEL.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$BACKUP_LABEL</string>
  <key>ProgramArguments</key><array>
    <string>/bin/bash</string><string>$(xml "$REPO")/scripts/host_on_mac.sh</string><string>backup</string>
  </array>
  <key>EnvironmentVariables</key><dict><key>ASKTHEMOVE_NODE</key><string>$(xml "$NODE")</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>Umask</key><integer>63</integer>
  <key>StandardOutPath</key><string>$(xml "$HOME_DIR")/logs/backup.log</string>
  <key>StandardErrorPath</key><string>$(xml "$HOME_DIR")/logs/backup.log</string>
</dict></plist>
PLIST
  chmod 644 "$AGENTS/$BACKUP_LABEL.plist"  # launchd refuses agents others can write to
}

write_tunnel_agent() {
cat > "$AGENTS/$TUNNEL_LABEL.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$TUNNEL_LABEL</string>
  <key>ProgramArguments</key><array>
    <string>$(xml "$CLOUDFLARED")</string><string>tunnel</string><string>--metrics</string><string>$TUNNEL_METRICS</string><string>--config</string><string>$(xml "$TUNNEL_CONFIG")</string><string>run</string><string>$TUNNEL_NAME</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$(xml "$HOME_DIR")/logs/tunnel.log</string>
  <key>StandardErrorPath</key><string>$(xml "$HOME_DIR")/logs/tunnel.log</string>
</dict></plist>
PLIST
  chmod 644 "$AGENTS/$TUNNEL_LABEL.plist"  # launchd refuses agents others can write to
}

stop_app() {
  # Returns success only once nothing answers on the port and no process has the database open.
  launchctl bootout "gui/$(id -u)/$APP_LABEL" 2>/dev/null || true
  for _ in $(seq 1 30); do
    if ! answers && ! lsof -t "$DB" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

sync_env_stockfish() {
  # Setup wrote Stockfish's absolute path into .env.beta. If that binary moved, point the line at
  # the one found now and leave every other setting as it is.
  [ -f "$ENV_FILE" ] && grep -q '^STOCKFISH_PATH=' "$ENV_FILE" || return 0
  grep -qxF "STOCKFISH_PATH=$STOCKFISH" "$ENV_FILE" && return 0
  local current
  current="$(sed -n 's/^STOCKFISH_PATH=//p' "$ENV_FILE" | tail -n 1)"
  [ -x "$current" ] && return 0
  ( umask 077
    awk -v p="$STOCKFISH" '/^STOCKFISH_PATH=/{print "STOCKFISH_PATH=" p; next} {print}' "$ENV_FILE" > "$ENV_FILE.next" ) \
    && mv "$ENV_FILE.next" "$ENV_FILE" && echo "Pointed STOCKFISH_PATH in .env.beta at $STOCKFISH."
}

refresh_tunnel_agent() {
  # Rewrites the tunnel agent only when cloudflared moved. If the new one won't load, the old
  # agent is put back so the site keeps its connection.
  [ -f "$AGENTS/$TUNNEL_LABEL.plist" ] || return 0
  grep -qF "<string>$(xml "$CLOUDFLARED")</string>" "$AGENTS/$TUNNEL_LABEL.plist" && return 0
  # A stopped tunnel stays stopped; start loads it after checking for other connectors.
  if ! launchctl print "gui/$(id -u)/$TUNNEL_LABEL" >/dev/null 2>&1; then write_tunnel_agent; return 0; fi
  # Check the new cloudflared runs before the working connector is unloaded.
  "$CLOUDFLARED" --version >/dev/null 2>&1 || { echo "Warning: $CLOUDFLARED doesn't run, so the tunnel was left as it is." >&2; return 0; }
  local old; old="$(sed -n 's|.*<string>\([^<]*\)</string><string>tunnel</string>.*|\1|p' "$AGENTS/$TUNNEL_LABEL.plist" | head -n 1)"
  cp "$AGENTS/$TUNNEL_LABEL.plist" "$AGENTS/$TUNNEL_LABEL.plist.previous"
  write_tunnel_agent
  if reload_agent "$TUNNEL_LABEL" && tunnel_ready; then rm -f "$AGENTS/$TUNNEL_LABEL.plist.previous"; return 0; fi
  if [ -n "$old" ] && [ ! -x "$old" ]; then
    # The previous agent names a cloudflared that no longer exists, so putting it back can't help.
    rm -f "$AGENTS/$TUNNEL_LABEL.plist.previous"
    echo "Warning: the tunnel didn't start with $CLOUDFLARED, and the cloudflared it used before ($old) is gone, so the site is offline. Check $HOME_DIR/logs/tunnel.log, then run scripts/host_on_mac.sh start." >&2
    return 0
  fi
  mv "$AGENTS/$TUNNEL_LABEL.plist.previous" "$AGENTS/$TUNNEL_LABEL.plist"
  reload_agent "$TUNNEL_LABEL" || true
  echo "Warning: couldn't switch the tunnel to $CLOUDFLARED; it still uses the previous cloudflared." >&2
}

require_no_other_connector() {
  # Cloudflare spreads traffic over every connector of a tunnel; two Macs would serve two databases.
  local connectors=unknown
  for _ in $(seq 1 12); do
    connectors="$("$CLOUDFLARED" tunnel info --output json "$TUNNEL_NAME" 2>/dev/null | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log((JSON.parse(s).conns||[]).length)}catch{console.log("unknown")}})')" || connectors=unknown
    [ "$connectors" = 0 ] && return 0
    sleep 5
  done
  case "$connectors" in
    unknown) fail "couldn't ask Cloudflare whether the '$TUNNEL_NAME' tunnel is running on another computer (no network, or the Cloudflare login expired). Nothing was started. Check the internet connection and run this again; if it keeps failing, run 'cloudflared tunnel login' first." ;;
    *) fail "the '$TUNNEL_NAME' tunnel is still running somewhere ($connectors connection(s)). If another Mac hosts the site, stop it there first (scripts/host_on_mac.sh stop), so visitors don't land on two different databases. If this Mac was the only host, Cloudflare may still be listing its old connection; wait a minute and run this again." ;;
  esac
}

swap_agents() {
  # Rewrites the app and backup agents and reloads them. If either fails to load or the app
  # doesn't answer, the previous agents are put back and reloaded.
  local saved old_node
  # Check the new Node can read the settings before the running app is touched.
  ( cd "$REPO" && "$NODE" --env-file="$ENV_FILE" -e 0 ) || fail "$NODE can't run the app's settings file; the running app was left alone."
  old_node="$(sed -n 's|.*<string>\([^<]*\)</string><string>--env-file=.*|\1|p' "$AGENTS/$APP_LABEL.plist" 2>/dev/null | head -n 1)"
  saved="$(mktemp -d)"
  cp "$AGENTS/$APP_LABEL.plist" "$AGENTS/$BACKUP_LABEL.plist" "$saved"/ 2>/dev/null || true
  write_app_agent; write_backup_agent
  if reload_agent "$BACKUP_LABEL" && reload_agent "$APP_LABEL" && app_starts; then rm -rf "$saved"; return 0; fi
  if [ -n "$old_node" ] && [ ! -x "$old_node" ]; then
    # The previous agents point at a Node that no longer exists, so putting them back can't help.
    rm -rf "$saved"
    fail "the app didn't start with $NODE, and the Node it used before ($old_node) is gone. Its log is above. Fix Node (brew install node), then run scripts/host_on_mac.sh start."
  fi
  echo "The new launch agents didn't start, so the previous ones are being put back." >&2
  cp "$saved"/*.plist "$AGENTS"/ 2>/dev/null || true
  reload_agent "$BACKUP_LABEL" || true
  reload_agent "$APP_LABEL" || true
  rm -rf "$saved"
  restart_app
  fail "the launch agents couldn't be switched to $NODE; the app runs as it did before."
}

lock_maintenance() {
  # One setup, start, update or restore at a time; they share staging files and stop the app.
  # The lock is a symlink whose target is the holder's process id, so taking it is one atomic step.
  local lock="$HOME_DIR/.maintenance.lock" reap="$HOME_DIR/.maintenance.reap" holder
  mkdir -p "$HOME_DIR"
  for _ in $(seq 1 10); do
    if ln -s "$$" "$lock" 2>/dev/null; then
      trap '[ "$(readlink "$HOME_DIR/.maintenance.lock" 2>/dev/null)" != "$$" ] || rm -f "$HOME_DIR/.maintenance.lock"' EXIT
      return 0
    fi
    holder="$(readlink "$lock" 2>/dev/null || true)"
    if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then fail "another setup, start, update or restore is running (process $holder). Wait for it to finish."; fi
    # The holder has exited. Only one process clears it, and only if it is still the lock it checked.
    if mkdir "$reap" 2>/dev/null; then
      [ "$(readlink "$lock" 2>/dev/null || true)" != "$holder" ] || rm -f "$lock"
      rmdir "$reap"
    fi
    sleep 1
  done
  fail "couldn't take the maintenance lock at $lock. If no setup, start, update or restore is running, remove $lock and $reap, then try again."
}

load_agent() {
  # stop disables the agents so they stay off after a restart; loading turns them back on.
  launchctl enable "gui/$(id -u)/$1" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/$1.plist"
}

reload_agent() {
  launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true
  load_agent "$1"
}

case "${1:-setup}" in
  status)
    if serving; then echo "The app is running and invite-only on port $PORT."
    elif answers; then echo "Another program, not this service, is answering on port $PORT."
    else echo "The app is not answering on port $PORT."; fi
    launchctl print "gui/$(id -u)/$TUNNEL_LABEL" >/dev/null 2>&1 && echo "The tunnel service is loaded." || echo "The tunnel service is not loaded."
    latest="$(ls -1t "$BACKUPS"/chesslab-*.sqlite 2>/dev/null | head -n 1 || true)"
    echo "Latest backup: ${latest:-none yet}"
    exit 0 ;;
  stop)
    # Don't stop in the middle of an update or restore; it would start the app again afterwards.
    lock_maintenance
    # Disabled agents don't load at the next login either, so a stopped Mac stays off the tunnel
    # (for example after the site has moved to another Mac) until start runs its checks.
    for label in "$APP_LABEL" "$TUNNEL_LABEL"; do
      launchctl disable "gui/$(id -u)/$label" 2>/dev/null || true
      launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
    done
    for _ in $(seq 1 15); do
      launchctl print "gui/$(id -u)/$APP_LABEL" >/dev/null 2>&1 || launchctl print "gui/$(id -u)/$TUNNEL_LABEL" >/dev/null 2>&1 || break
      sleep 1
    done
    if launchctl print "gui/$(id -u)/$APP_LABEL" >/dev/null 2>&1 || launchctl print "gui/$(id -u)/$TUNNEL_LABEL" >/dev/null 2>&1; then
      fail "the app or tunnel is still loaded after 15 seconds. Run scripts/host_on_mac.sh stop again, or restart the Mac (they stay off after a restart)."
    fi
    echo "Stopped, and it stays stopped after a restart. Run scripts/host_on_mac.sh start to start again."
    exit 0 ;;
  start)
    # Starts what setup installed, without reinstalling or rebuilding anything.
    for label in "$APP_LABEL" "$TUNNEL_LABEL" "$BACKUP_LABEL"; do
      [ -f "$AGENTS/$label.plist" ] || fail "setup hasn't run on this Mac yet (scripts/host_on_mac.sh)."
    done
    # Don't start the app while an update or restore has it stopped to move files.
    lock_maintenance
    pick_node
    CLOUDFLARED="$(command -v cloudflared)" || fail "cloudflared is missing; run scripts/host_on_mac.sh to set up again."
    loaded() { launchctl print "gui/$(id -u)/$1" >/dev/null 2>&1; }
    if ! loaded "$TUNNEL_LABEL"; then
      # Another Mac may have taken over the site while this one was stopped.
      require_no_other_connector
      # Homebrew may have moved cloudflared since setup; rewriting also picks up this version's settings.
      write_tunnel_agent
    fi
    if ! loaded "$APP_LABEL" && ! grep -qF "<string>$(xml "$NODE")</string>" "$AGENTS/$APP_LABEL.plist"; then
      # The Node recorded at setup may be gone; start with the one picked here.
      write_app_agent; write_backup_agent
      if loaded "$BACKUP_LABEL"; then reload_agent "$BACKUP_LABEL"; fi
    fi
    for label in "$APP_LABEL" "$TUNNEL_LABEL" "$BACKUP_LABEL"; do
      loaded "$label" || load_agent "$label"
    done
    for _ in $(seq 1 30); do
      if serving; then
        tunnel_ready || { tail -n 30 "$HOME_DIR/logs/tunnel.log" >&2 || true; fail "the app runs, but the tunnel didn't connect to Cloudflare, so the site is offline. The lines above are the tunnel's log."; }
        echo "Started."; exit 0
      fi
      sleep 2
    done
    tail -n 30 "$HOME_DIR/logs/app.log" >&2 || true
    if answers; then echo "Another program is answering on port $PORT, not this Mac's AskTheMove service. Stop it (lsof -nP -iTCP:$PORT -sTCP:LISTEN shows which), then run this again." >&2; fi
    fail "the app did not start. The lines above are its log." ;;
  backup)
    backup
    exit 0 ;;
  restore)
    file="${2:-}"
    [ -f "$file" ] || fail "give the backup file to restore, for example: scripts/host_on_mac.sh restore $BACKUPS/chesslab-<date>.sqlite"
    [ -f "$AGENTS/$APP_LABEL.plist" ] || fail "run the setup first (scripts/host_on_mac.sh)."
    lock_maintenance
    pick_node
    # The Node that setup recorded may be gone; the app must restart with the one picked here.
    if ! grep -qF "<string>$(xml "$NODE")</string>" "$AGENTS/$APP_LABEL.plist"; then
      write_app_agent; write_backup_agent
      reload_agent "$BACKUP_LABEL" || echo "Warning: the daily backup agent didn't reload; run scripts/host_on_mac.sh start." >&2
    fi
    rmdir "$DB.before-restore" 2>/dev/null || true
    [ ! -e "$DB.before-restore" ] || fail "$DB.before-restore is left from a restore that didn't finish and may hold the only copy of the previous database. Move its files somewhere safe (or back into $HOME_DIR), remove the folder, then run this again."
    # Copy the chosen file first: the safety backup below may rotate the oldest backup away.
    ( umask 077; cp "$file" "$DB.restoring" )
    usable_db "$DB.restoring" || { rm -f "$DB.restoring"; fail "$file isn't a complete AskTheMove database. Nothing was changed."; }
    stop_app || { rm -f "$DB.restoring"; fail "the app didn't stop within 30 seconds, so nothing was changed. Run scripts/host_on_mac.sh start, then try again."; }
    # The safety backup is taken with the app stopped, so no write can land after it.
    keep_replaced=
    if [ -f "$DB" ] && usable_db "$DB"; then
      echo "Saving the current database first."
      ( backup ) || { rm -f "$DB.restoring"; load_agent "$APP_LABEL" || true; restart_app; fail "the safety backup of the current database failed, so nothing was changed."; }
    elif [ -e "$DB" ]; then keep_replaced=1; fi
    # Keep the database being replaced until the restored one is serving.
    mkdir -m 700 "$DB.before-restore"
    for part in "$DB" "$DB-wal" "$DB-shm"; do [ -e "$part" ] && mv "$part" "$DB.before-restore/"; done
    mv "$DB.restoring" "$DB"
    if ! load_agent "$APP_LABEL" || ! app_starts; then
      echo "The restored database didn't start, so the previous one is being put back." >&2
      # Unload first, so a restarting app can't recreate the database while files are swapped.
      stop_app || fail "the app didn't stop within 30 seconds, so nothing was put back yet. The previous database is in $DB.before-restore. Run scripts/host_on_mac.sh stop (restart the Mac if it still runs), move those files into $HOME_DIR in place of chesslab.sqlite and its -wal and -shm files, remove the folder, then run scripts/host_on_mac.sh start."
      rm -f "$DB" "$DB-wal" "$DB-shm"
      if [ -n "$(ls -A "$DB.before-restore")" ]; then
        mv "$DB.before-restore"/* "$HOME_DIR"/ || fail "couldn't put the previous database back. It is kept in $DB.before-restore; move its files into $HOME_DIR, then run scripts/host_on_mac.sh start."
      fi
      rmdir "$DB.before-restore"
      load_agent "$APP_LABEL" 2>/dev/null || true
      restart_app
      fail "the restore was undone; the app is running on the database it had before."
    fi
    if [ -n "$keep_replaced" ]; then
      # The replaced database failed its check, so no backup of it could be made. Keep it as it was.
      replaced="$HOME_DIR/replaced-$(date -u +%Y%m%dT%H%M%SZ)"
      mv "$DB.before-restore" "$replaced"
      echo "The database that was replaced failed its check, so it was kept as-is in $replaced in case anything can be recovered from it."
    else
      rm -rf "$DB.before-restore"
    fi
    echo "Restored $file and restarted. Anyone who signed in after that backup has to sign in again."
    exit 0 ;;
  update)
    lock_maintenance
    cd "$REPO"
    [ "$(git branch --show-current)" = main ] || fail "switch this folder to the main branch first (git switch main)."
    git diff --quiet && git diff --cached --quiet || fail "this folder has uncommitted changes. Commit or stash them first, so an update can be undone cleanly."
    snapshot="$DB.before-update"
    [ ! -e "$snapshot" ] || fail "$snapshot is left from an update that didn't finish and may hold the only copy of the database from before it. Check that the site works, move the folder somewhere safe, then run this again."
    tools
    git fetch origin main
    git merge-base --is-ancestor HEAD origin/main || fail "local main has commits that aren't on GitHub, so it can't fast-forward."
    old="$(git rev-parse HEAD)" new="$(git rev-parse origin/main)"
    if [ "$old" = "$new" ]; then
      # Nothing new to install, but Homebrew may have moved Node, Stockfish or cloudflared.
      sync_env_stockfish
      # The checkout may also have moved; both agents record its path.
      { grep -qF "<string>$(xml "$NODE")</string>" "$AGENTS/$APP_LABEL.plist" \
        && grep -qF "<string>$(xml "$REPO")</string>" "$AGENTS/$APP_LABEL.plist" \
        && grep -qF "<string>$(xml "$REPO")/scripts/host_on_mac.sh</string>" "$AGENTS/$BACKUP_LABEL.plist"; } || swap_agents
      link_engine
      refresh_tunnel_agent
      echo "Already up to date."
      exit 0
    fi
    # Install and build the new commit in a separate copy while the site keeps running.
    # Its node_modules and build are then moved into place, so the live folder never runs npm.
    trial="$REPO/.scratch/update-trial" keep="$REPO/.scratch/update-previous"
    git worktree remove --force "$trial" 2>/dev/null || rm -rf "${trial:?}"
    git worktree prune
    git worktree add --detach "$trial" "$new" >/dev/null
    if ! ( cd "$trial" && npm ci --no-audit --no-fund && npx --no-install vite build --outDir "$trial/.scratch/dist-next" ) \
      || [ ! -f "$trial/.scratch/dist-next/index.html" ]; then
      git worktree remove --force "$trial"
      fail "the new version didn't install or build; the live site was left as it was."
    fi
    saved="$(mktemp -d)"
    cp "$AGENTS/$APP_LABEL.plist" "$AGENTS/$BACKUP_LABEL.plist" "$saved"/ 2>/dev/null || true
    sync_env_stockfish
    rm -rf "${keep:?}"; mkdir -p "$keep"
    rollback() {
      # Needs no network: the old node_modules and build were kept, not rebuilt.
      echo "The update didn't come up, so the previous version is being put back." >&2
      # Never swap the database under a process that still has it open.
      stop_app || fail "the new version didn't stop within 30 seconds, so nothing was put back yet. Restart the Mac, then: copy the files in $snapshot into $HOME_DIR, run 'git reset --hard $old', move $keep/node_modules to $REPO/node_modules and $keep/dist to $REPO/web/dist, and run scripts/host_on_mac.sh start."
      if [ -f "$snapshot/.complete" ]; then
        rm -f "$DB" "$DB-wal" "$DB-shm"
        for part in "$snapshot"/*; do [ ! -e "$part" ] || cp -p "$part" "$HOME_DIR"/ \
          || fail "couldn't put the database back. The copy from before the update is in $snapshot; copy its files into $HOME_DIR, then run scripts/host_on_mac.sh start."; done
      fi
      git reset -q --hard "$old" || fail "couldn't move the checkout back to $old. Nothing else was changed back. The database from before the update is in $snapshot, and the previous packages and build are in $keep."
      if [ -e "$keep/node_modules" ]; then rm -rf "$REPO/node_modules"; mv "$keep/node_modules" "$REPO/node_modules"; fi
      if [ -e "$keep/dist" ]; then rm -rf "$REPO/web/dist"; mv "$keep/dist" "$REPO/web/dist"; fi
      cp "$saved"/*.plist "$AGENTS"/ 2>/dev/null || true
      reload_agent "$BACKUP_LABEL" || true
      reload_agent "$APP_LABEL" || true
      git worktree remove --force "$trial" 2>/dev/null || true
      app_starts || fail "the previous version didn't start either; its log is above. The database from before the update is in $snapshot."
      rm -rf "$snapshot" "$keep"
      fail "the update was undone; the site runs the version and database it had before."
    }
    # The new version may change the database when it starts. Stop the app before anything in the
    # live folder changes, so no code, old or new, touches the database until it has been copied.
    stop_app || { reload_agent "$APP_LABEL" || true; git worktree remove --force "$trial"; fail "the app didn't stop within 30 seconds, so the update was not applied."; }
    mkdir -m 700 "$snapshot"
    for part in "$DB" "$DB-wal" "$DB-shm"; do [ ! -e "$part" ] || cp -p "$part" "$snapshot"/ || rollback; done
    touch "$snapshot/.complete"
    { [ ! -e node_modules ] || mv node_modules "$keep/node_modules"; } \
      && { [ ! -e web/dist ] || mv web/dist "$keep/dist"; } \
      && git merge --ff-only -q "$new" \
      && mv "$trial/node_modules" node_modules && mv "$trial/.scratch/dist-next" web/dist \
      && ASKTHEMOVE_NODE="$NODE" bash "$REPO/scripts/host_on_mac.sh" write-agents \
      && reload_agent "$BACKUP_LABEL" && reload_agent "$APP_LABEL" && app_starts || rollback
    git worktree remove --force "$trial"
    rm -rf "$snapshot" "$keep"
    link_engine
    # cloudflared may have moved too. Restart the tunnel only when its path changed.
    refresh_tunnel_agent
    echo "Updated and running."
    exit 0 ;;
  write-agents)
    # Used by update, so the launch agents come from the version being installed.
    NODE="${ASKTHEMOVE_NODE:?}"
    write_app_agent; write_backup_agent
    exit 0 ;;
  setup) lock_maintenance ;;
  *) fail "unknown command $1. Use setup, update, status, backup, restore, start or stop." ;;
esac

[ "$(uname -s)" = Darwin ] || fail "this script is for macOS."
# The public beta runs main; update only moves main forward.
[ "$(git -C "$REPO" branch --show-current)" = main ] || fail "switch this folder to the main branch first (git switch main)."
if [ -f "$ENV_FILE" ] && ! grep -qxF "APP_ORIGIN=https://$HOSTNAME_PUBLIC" "$ENV_FILE"; then
  fail ".env.beta was made for a different address than https://$HOSTNAME_PUBLIC. Edit its APP_ORIGIN line to match, or move the file away to answer the setup questions again."
fi

say "Checking Node.js, Stockfish and cloudflared"
tools
"$STOCKFISH" quit | head -n 1 || true

say "Building the app"
build
link_engine
private_dirs

if [ ! -f "$ENV_FILE" ]; then
  say "Beta settings"
  echo "Type the invite codes testers will use, separated by commas."
  echo "Each code needs 8 to 128 characters: no spaces, no quote marks, and none of # \\ = \$. Nothing is shown while you type."
  while :; do
    IFS= read -rs codes; echo
    # Check with the server's own rules, so a bad code can't be saved and then stop the app from starting.
    if [ -n "$codes" ] && ! printf '%s' "$codes" | grep -q "[#\"'\`\\\\=\$]" && CODES="$codes" "$NODE" -e "const {pathToFileURL}=require('node:url');import(pathToFileURL(process.argv[1]).href).then(m=>process.exit(m.parseInviteCodes(process.env.CODES).length?0:1)).catch(()=>process.exit(1))" "$REPO/server/security.mjs"; then break; fi
    echo "That wasn't accepted. Each code needs 8 to 128 characters: no spaces, no quote marks, none of # \\ = \$, and no empty entries between commas. Type them again."
  done
  ( umask 077
    { echo "NODE_ENV=production"
      echo "HOST=127.0.0.1"
      echo "PORT=$PORT"
      echo "APP_ORIGIN=https://$HOSTNAME_PUBLIC"
      echo "TRUST_PROXY=1"
      echo "STOCKFISH_PATH=$STOCKFISH"
      echo "CHESSLAB_DB=$DB"
      echo "BETA_INVITE_CODES=$codes"
    } > "$ENV_FILE" )
  unset codes
  echo "Saved to .env.beta (only your user can read it; Git ignores it)."
fi
chmod 600 "$ENV_FILE"
sync_env_stockfish

say "Starting the app"
# caffeinate keeps the Mac from idle-sleeping while the app runs. Closing a laptop lid still sleeps it.
write_app_agent
reload_agent "$APP_LABEL"
restart_app
private_dirs
echo "The app answers on http://127.0.0.1:$PORT and requires an invite code."

say "Scheduling a daily backup"
# Runs at 03:00, or as soon as the Mac wakes if it was asleep then. Keeps the newest $KEEP_BACKUPS copies.
write_backup_agent
reload_agent "$BACKUP_LABEL"
[ -f "$DB" ] && backup

say "Connecting the tunnel"
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo "A browser window opens. Sign in to Cloudflare and choose $DOMAIN."
  "$CLOUDFLARED" tunnel login
fi
"$CLOUDFLARED" tunnel info "$TUNNEL_NAME" >/dev/null 2>&1 || "$CLOUDFLARED" tunnel create "$TUNNEL_NAME"
tunnel_id="$("$CLOUDFLARED" tunnel list --output json | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).find(t=>t.name===process.argv[1]).id))' "$TUNNEL_NAME")"
credentials="$HOME/.cloudflared/$tunnel_id.json"
if [ ! -f "$credentials" ]; then
  # The tunnel was made elsewhere (another Mac or the dashboard), so its key file isn't here. Fetch it.
  ( umask 077; "$CLOUDFLARED" tunnel token --cred-file "$credentials" "$TUNNEL_NAME" >/dev/null ) \
    || fail "the tunnel '$TUNNEL_NAME' exists in Cloudflare, but its key file isn't on this Mac and couldn't be fetched. If nothing else uses that tunnel, delete it in the Cloudflare dashboard (Zero Trust > Networks > Tunnels) and run this again."
fi
cat > "$TUNNEL_CONFIG" <<YAML
tunnel: $tunnel_id
credentials-file: $credentials
ingress:
  # Answered by cloudflared itself, so a 204 here proves the hostname reaches this tunnel.
  - hostname: $HOSTNAME_PUBLIC
    path: ^/\.well-known/askthemove-tunnel-$tunnel_id\$
    service: http_status:204
  - hostname: $HOSTNAME_PUBLIC
    service: http://127.0.0.1:$PORT
  - service: http_status:404
YAML
# Adds one CNAME for the app hostname only. It never touches the site, www or email records.
# If the record already exists, the probe below shows whether it points at this tunnel.
dns_existing=0
route_out="$("$CLOUDFLARED" tunnel route dns "$TUNNEL_NAME" "$HOSTNAME_PUBLIC" 2>&1)" || dns_existing=1
printf '%s\n' "$route_out"
# With a login for another domain, cloudflared appends that domain (app.askthemove.online.other.com).
if printf '%s' "$route_out" | grep -qF "$HOSTNAME_PUBLIC."; then
  fail "this Mac's Cloudflare login is for a different domain, so the record went there (see the line above). Delete that one record in that domain's DNS, move ~/.cloudflared/cert.pem away, and run this again to sign in to the account that holds $DOMAIN."
fi

# This marker is written only after the check below passed and this Mac's connector started,
# so a failed check can't excuse the next run from it.
host_marker="$HOME_DIR/.tunnel-host-$tunnel_id"
had_tunnel_agent=0
# Only a connector running on this Mac now excuses the check; a Mac that was stopped must recheck.
if [ -f "$host_marker" ] && launchctl print "gui/$(id -u)/$TUNNEL_LABEL" >/dev/null 2>&1; then had_tunnel_agent=1; fi
write_tunnel_agent
# Cloudflare spreads traffic over every running connector of a tunnel. Another Mac serving its own
# database through the same tunnel would mix accounts, so stop ours and require that none are left.
# A rerun on the Mac that already hosts the tunnel skips this: the connections are its own, and
# Cloudflare can keep listing them for a while after they stop.
if [ "$had_tunnel_agent" = 0 ]; then
  launchctl bootout "gui/$(id -u)/$TUNNEL_LABEL" 2>/dev/null || true
  require_no_other_connector
fi
reload_agent "$TUNNEL_LABEL"
touch "$host_marker"

say "Checking https://$HOSTNAME_PUBLIC"
probe="https://$HOSTNAME_PUBLIC/.well-known/askthemove-tunnel-$tunnel_id"
for _ in $(seq 1 30); do
  if [ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$probe" 2>/dev/null)" = 204 ] \
    && curl -fsS --max-time 10 "https://$HOSTNAME_PUBLIC/healthz" >/dev/null 2>&1; then
    echo "Live: https://$HOSTNAME_PUBLIC"
    echo "It starts again by itself when you log in. Logs: $HOME_DIR/logs. Backups: $BACKUPS"
    exit 0
  fi
  sleep 5
done
tail -n 20 "$HOME_DIR/logs/tunnel.log" >&2 || true
[ "$dns_existing" = 0 ] || fail "$HOSTNAME_PUBLIC already has a DNS record, and it doesn't reach this tunnel. Nothing was changed. In Cloudflare DNS for $DOMAIN, check the record named '${HOSTNAME_PUBLIC%%.*}'. If it's an old one you no longer need, delete only that record (leave the email records alone), then run this again. If this Mac is signed in to a different Cloudflare account, move ~/.cloudflared/cert.pem away and run this again to sign in to the one that holds $DOMAIN."
fail "the app runs, but https://$HOSTNAME_PUBLIC doesn't answer yet. DNS can take a few minutes; run scripts/host_on_mac.sh status, then try the address again."
