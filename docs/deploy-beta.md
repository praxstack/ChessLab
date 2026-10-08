# Deploying the private beta

This guide covers running the app for a small invited group on one server. It has not been used for a real deployment. On 8 October 2026 the image was built and run in a sandbox. Health checks, invite gating, secure cookies, Stockfish analysis and data surviving a restart were all checked there, as a non-root user. No domain, host or Anthropic API key was involved.

The governing change is `openspec/changes/hosted-beta-readiness/`.

## What runs

One container serves the API and the built web app on port 8770. It runs Stockfish 18 as a child process and stores accounts, sessions, games and progress in SQLite under `/data`. A TLS reverse proxy (Caddy, nginx, Fly.io or Render) terminates HTTPS and forwards to the container.

Run exactly one instance. Rate limits, the AI-explanation quota and saved explanation evidence live in process memory. A restart clears them. SQLite allows one writer, and the data volume belongs to one machine. Accounts and sessions persist on the volume.

## Settings

Set these in the host's secret store or a `chmod 600` env file. Never commit them.

| Setting | Beta value | Purpose |
| --- | --- | --- |
| `APP_ORIGIN` | `https://app.example.com` | Required. The exact public origin, with no path. It turns on Secure cookies, HSTS, the content security policy and Origin checks, and turns off the `/research` and `/design` archives. |
| `TRUST_PROXY` | `1` | Number of proxy hops in front of the app. Each visitor then gets their own rate limit. `true` is rejected because it would trust addresses sent by any client. |
| `BETA_INVITE_CODES` | `code-one-2026,code-two-2026` | Comma-separated codes of 8–128 characters. New accounts need one; existing accounts sign in without one. Leave unset to allow open sign-up. An empty entry, such as a trailing comma, stops the server from starting. |
| `ANTHROPIC_API_KEY` | secret | Turns on "Explain why". Without it the button is hidden and the engine summary remains. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model for explanations. |
| `COACH_AI_EFFORT` | `low` | `low`, `medium` or `high`. Higher is slower and costs more. |
| `COACH_AI_TIMEOUT_MS` | `15000` | Limit per explanation, 2000–60000. On timeout the app shows the engine summary instead. |
| `COACH_AI_MAX_PER_HOUR` | `30` | Explanations per account per hour, 1–1000. |
| `COACH_ENGINE_MOVETIME_MS` | `800` | Stockfish time when an explanation needs fresh analysis, 100–2000. |
| `SERVE_ARCHIVES` | unset | `1` serves the research and design archives even when hosted. Keep it unset: the design archive holds frames captured from Chess.com. |
| `COOKIE_SECURE` | unset | Set automatically by an HTTPS `APP_ORIGIN`. |

The image already sets `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=8770`, `CHESSLAB_DB=/data/chesslab.sqlite`, `STOCKFISH_PATH`, `CHESSLAB_ENGINES_DIR`, and catalogue paths under `/data`. Do not set `PUBLIC_ORIGIN` or `CHESSLAB_BACKEND_SECRET`. Those belong to the earlier owner-private Sites tunnel. They make every request require that tunnel's secret header. The server refuses to start when `PUBLIC_ORIGIN` differs from `APP_ORIGIN`.

## Build the image

```sh
docker build -t chesslab:beta .
# On x86-64 CPUs without AVX2:
docker build --build-arg STOCKFISH_BUILD=sse41-popcnt -t chesslab:beta .
```

The build downloads the official Stockfish 18 Linux binary and checks it against a pinned SHA-256. The image targets `linux/amd64`, because the pinned downloads are x86-64 builds. On an arm64 host, build Stockfish from source in that stage instead. Stockfish is GPL-3.0; the image keeps its licence and authors files. If you publish the image itself, you must also offer the matching Stockfish source.

What the image does not include:

- The Stockfish 19 opponent. No official Stockfish 19 Linux binary was found, so Stockfish 18 is the default opponent and analysis engine.
- Stockfish 16, Stockfish 18 Lite, Maia and Leela. These need `scripts/install_engines.py` and Python model weights.
- Opening explorer and puzzle catalogues, and tablebases. Import them into the volume at the `/data/...` paths above if wanted. Without them those features report that they are unavailable.

## Option A: a VPS with Docker and Caddy

Use an x86-64 VPS. Resource needs for a beta group have not been measured. Open only ports 22, 80 and 443.

```sh
docker volume create chesslab-data
install -m 600 /dev/null /etc/chesslab.env   # then add the settings above
docker run -d --name chesslab --restart unless-stopped \
  --env-file /etc/chesslab.env \
  -p 127.0.0.1:8770:8770 \
  -v chesslab-data:/data \
  chesslab:beta
```

Publishing the port on `127.0.0.1` keeps the app reachable only through the proxy. A minimal Caddyfile, which also obtains the certificate:

```
app.example.com {
	reverse_proxy 127.0.0.1:8770
}
```

Caddy adds the client address to `X-Forwarded-For`, so `TRUST_PROXY=1` is correct. Check `docker inspect --format '{{.State.Health.Status}}' chesslab` and `curl -fsS https://app.example.com/healthz` after starting.

## Option B: Fly.io or Render

Both can build from the `Dockerfile`. Keep one instance with one persistent volume.

**Fly.io.** Create one volume and mount it at `/data`. Point the HTTP service at internal port 8770, force HTTPS, and add an HTTP check on `/healthz`. Pin the app to one machine, because a volume belongs to one machine. Keep that machine running rather than stopped when idle; a cold start also restarts Stockfish. Put `ANTHROPIC_API_KEY` and `BETA_INVITE_CODES` in `fly secrets`. Set `APP_ORIGIN` and `TRUST_PROXY=1` as plain environment values.

**Render.** Create a Docker web service with a persistent disk mounted at `/data`. Persistent disks need a paid instance and limit the service to one instance. Set the health check path to `/healthz`. Add the settings as environment variables or a secret file.

On either platform, confirm the proxy hop count before relying on per-visitor limits. Log a test request's `X-Forwarded-For` and check that the last entry is your own address. This has not been checked on a platform.

## Backups

The database holds password hashes, session hashes, games and progress. Treat every copy as private data and encrypt it when stored off the server.

An online backup can run while the app is serving. `VACUUM INTO` writes one consistent file:

```sh
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker exec chesslab node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/data/chesslab.sqlite',{readOnly:true});db.prepare('VACUUM INTO ?').run(process.argv[1])" "/data/backup-$stamp.sqlite"
docker cp "chesslab:/data/backup-$stamp.sqlite" "./backup-$stamp.sqlite"
docker exec chesslab rm "/data/backup-$stamp.sqlite"
```

Run it at least daily from cron or the platform's scheduler. Copy the file off the server, and keep several days and weeks of copies. For a cold backup, stop the container and copy the whole volume, including any `chesslab.sqlite-wal` and `chesslab.sqlite-shm` files.

To restore, stop the container. Replace `/data/chesslab.sqlite` with the backup and remove any stale `-wal` and `-shm` files beside it. Then start the container again. Rehearse a restore before inviting testers. Restoring signs out anyone whose session was created after the backup.

## Pointing `app.<domain>` at it later

1. For a VPS, add an `A` (and `AAAA` if available) record for `app` pointing at the server. For Fly.io or Render, add the custom domain in the platform and create the `CNAME` or `A` record it gives you.
2. Wait for the platform or Caddy to issue the certificate.
3. Set `APP_ORIGIN=https://app.<domain>` exactly and restart. Requests from any other origin are refused once it is set.
4. Moving from a temporary hostname to `app.<domain>` signs everyone out, because session cookies are tied to the host. Accounts and data are unaffected.

The marketing site can live at the apex domain or `www` independently. Both are separate origins. Keep the app on its own subdomain so its cookies stay off the marketing site.

## Before inviting testers

- `APP_ORIGIN`, `TRUST_PROXY` and `BETA_INVITE_CODES` are set. `/api/status` reports `"hosted":true`, `"inviteRequired":true` and `"archives":false`.
- `/healthz` returns `{"status":"ok"}` through HTTPS, and the response carries `Strict-Transport-Security` and `Content-Security-Policy`.
- Sign-up without a code is refused, and sign-up with a code works.
- If the key is set, one "Explain why" answer is labelled as AI-generated and names the model. With a bad key, the page shows the engine summary and a short notice. Logs record only the fallback reason, never the key or prompt.
- A backup has been taken and restored on a scratch copy.
- The Anthropic Console has a spending limit. The per-account hourly limit caps each tester, not the total across testers.

## Known gaps

- No password reset, email verification or account deletion flow. Testers who forget a password need a manual reset.
- Rate limits and the AI quota are in memory and reset on restart. Each account allows 10 sign-in attempts per 15 minutes. Someone who knows a username can use that limit to lock its owner out for 15 minutes.
- The server checks that every move Claude cites appears in the evidence with the same check and mate markers, and that any mention of mate matches the side and distance the engine reported. It reads which side a mate sentence credits from simple wording patterns, so unusual phrasing can be misread. It does not check move order or claims about squares and defenders; the prompt alone governs those.
- Nothing here has been load-tested. Analysis runs two Stockfish searches at once and bot moves run one at a time. Up to eight more requests queue; beyond that the server answers "busy".
