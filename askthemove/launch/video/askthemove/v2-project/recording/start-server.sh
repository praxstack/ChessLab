#!/bin/bash
# Starts AskTheMove (ChessLab main) for recording on port 8802, hosted-beta mode on loopback.
V=/tmp/claude-0/-home-claude/b1b296ce-ac43-5e7c-9fa8-201429abfd6d/scratchpad/video/atm2
cd /home/claude/chesslab-video
if [ "$1" = "--fresh" ]; then rm -f "$V"/data/chesslab.sqlite*; fi
mkdir -p "$V/data" "$V/engines"
export PATH=/tmp/node-v24.21.0-linux-x64/bin:$PATH
NODE_ENV=production HOST=127.0.0.1 PORT=8802 APP_ORIGIN=http://127.0.0.1:8802 \
CHESSLAB_DB=$V/data/chesslab.sqlite \
STOCKFISH_PATH=/tmp/sf18dl/x/stockfish/stockfish-ubuntu-x86-64-avx2 \
CHESSLAB_ENGINES_DIR=$V/engines COOKIE_SECURE=0 \
nohup node server/index.mjs > $V/server.log 2>&1 &
echo $! > $V/server.pid
