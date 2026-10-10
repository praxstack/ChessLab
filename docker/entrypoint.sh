#!/bin/sh
# Hosts such as Railway and Fly.io mount a fresh volume at /data owned by root.
# Start as root only long enough to hand /data to the node user, then drop to it.
set -eu
if [ "$(id -u)" = 0 ]; then
  [ "$(stat -c %U /data)" = node ] || chown -R node:node /data
  exec setpriv --reuid=node --regid=node --init-groups -- "$@"
fi
exec "$@"
