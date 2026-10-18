# Deploying the private beta

This guide covers running the app for a small invited group on one server. Option E below (your own Mac) is the chosen host; it had not been used for a real deployment when written. On 8 October 2026 the image was built and run in a sandbox. Health checks, invite gating, secure cookies, Stockfish analysis and data surviving a restart were all checked there, as a non-root user. No domain, host or Anthropic API key was involved.

The governing change is `openspec/changes/hosted-beta-readiness/`.

## What runs

One container serves the API and the built web app on port 8770. It runs Stockfish 18 as a child process and stores accounts, sessions, games and progress in SQLite under `/data`. A TLS reverse proxy (Caddy, nginx, Fly.io or Render) terminates HTTPS and forwards to the container.

Run exactly one instance. Rate limits, the hourly AI-explanation quota and saved explanation evidence live in process memory. A restart clears them. The daily AI-explanation count is stored in SQLite and survives a restart. After a restart, or 30 minutes after an analysis, a learner asking for an explanation is asked to run the analysis again. SQLite allows one writer, and the data volume belongs to one machine. Accounts and sessions persist on the volume.

## Settings

Set these in the host's secret store or a `chmod 600` env file. Never commit them.

| Setting | Beta value | Purpose |
| --- | --- | --- |
| `APP_ORIGIN` | `https://app.example.com` | Required. The exact public origin, with no path. It turns on Secure cookies, HSTS, the content security policy and Origin checks, and turns off the `/research` and `/design` archives. |
| `TRUST_PROXY` | `1` | Number of proxy hops in front of the app. Each visitor then gets their own rate limit. `true` is rejected because it would trust addresses sent by any client. |
| `BETA_INVITE_CODES` | `code-one-2026,code-two-2026` | Comma-separated codes of 8–128 characters. New accounts need one; existing accounts sign in without one. Leave unset to allow open sign-up. An empty entry, such as a trailing comma, stops the server from starting. |
| `COACH_AI_INVITE_CODES` | `asha-5c1e9a07d3b2,ravi-8f40b6e2a91c` | Codes whose accounts may use your Claude key, same format as `BETA_INVITE_CODES`. Each one also works as a sign-up code, so setting it turns the invite gate on. See [who your Claude key pays for](#who-your-claude-key-pays-for). |
| `ANTHROPIC_API_KEY` | secret | Turns on "Explain why". Without it the button is hidden and the engine summary remains. On a hosted server it is used only for accounts created with a `COACH_AI_INVITE_CODES` code. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model for explanations. |
| `COACH_AI_EFFORT` | `low` | `low`, `medium` or `high`. Higher is slower and costs more. |
| `COACH_AI_TIMEOUT_MS` | `15000` | Limit per explanation, 2000–60000. On timeout the app shows the engine summary instead. |
| `COACH_AI_MAX_PER_HOUR` | `30` | Explanations per account per hour, 1–1000. |
| `COACH_AI_MAX_PER_DAY` | `50` | Explanations per UTC day, 1–5000. On a hosted server the count is per coach code, shared by every account created with it; on a local server it is per account. The day starts at 00:00 UTC, which is 05:30 in India. |
| `COACH_ENGINE_MOVETIME_MS` | `800` | Stockfish time when an explanation needs fresh analysis, 100–2000. |
| `SERVE_ARCHIVES` | unset | `1` serves the research and design archives even when hosted. Keep it unset: the archives are internal founder research, not part of the beta. |
| `COOKIE_SECURE` | unset | Set automatically by an HTTPS `APP_ORIGIN`. |

The image already sets `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=8770`, `CHESSLAB_DB=/data/chesslab.sqlite`, `STOCKFISH_PATH`, `CHESSLAB_ENGINES_DIR`, and catalogue paths under `/data`. Do not set `PUBLIC_ORIGIN` or `CHESSLAB_BACKEND_SECRET`. Those belong to the earlier owner-private Sites tunnel. They make every request require that tunnel's secret header. The server refuses to start when `PUBLIC_ORIGIN` differs from `APP_ORIGIN`.

## Who your Claude key pays for

The key in `ANTHROPIC_API_KEY` belongs to you, so the server decides whose explanations it pays for:

- **Local server** (no `APP_ORIGIN`): every account on it, which in practice is you while developing.
- **Hosted server** (`APP_ORIGIN` set): only accounts created with one of the `COACH_AI_INVITE_CODES` codes, such as friends and family. Accounts created with a `BETA_INVITE_CODES` code, or with no code, never see "Explain why" and get the engine summary.

Give each person their own code, and make it hard to guess, such as their name followed by the output of `openssl rand -hex 6`: a code is all anyone needs to sign up on your key. To stop paying for someone, remove their code from `COACH_AI_INVITE_CODES` and restart. Their account keeps working with the engine summary, and they can still sign in. Each account stores a SHA-256 digest of the code it signed up with, never the code itself, so a code moved between the two lists later changes what its accounts get.

All the accounts created with one coach code share `COACH_AI_MAX_PER_DAY` explanations a day, so someone who opens a second account or passes their code on gets no more. Each account also gets at most `COACH_AI_MAX_PER_HOUR` an hour. At about 2 to 4 cents each on Claude Opus 5.5 at low effort (an estimate, not a measurement), the default of 50 a day is at most about $2 per code per day.

To run the key on a Claude Max plan's monthly API credits instead of buying any: link the plan's credits to a Console organization (claude.ai, Settings > Billing > API credits), leave auto-reload off in the Console, create a workspace for this app with a monthly spend limit, and create the key in that workspace. When the credits run out, requests stop until the next month and the app falls back to the engine summary. Usage is not charged to the Claude plan.

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

**Fly.io.** Create one volume and mount it at `/data`. Point the HTTP service at internal port 8770, force HTTPS, and add an HTTP check on `/healthz`. Pin the app to one machine, because a volume belongs to one machine. Keep that machine running rather than stopped when idle; a cold start also restarts Stockfish. Put `ANTHROPIC_API_KEY`, `BETA_INVITE_CODES` and `COACH_AI_INVITE_CODES` in `fly secrets`. Set `APP_ORIGIN` and `TRUST_PROXY=1` as plain environment values.

**Render.** Create a Docker web service with a persistent disk mounted at `/data`. Persistent disks need a paid instance and limit the service to one instance. Set the health check path to `/healthz`. Add the settings as environment variables or a secret file.

On either platform, confirm the proxy hop count before relying on per-visitor limits. Log a test request's `X-Forwarded-For` and check that the last entry is your own address. This has not been checked on a platform.

## Option C: Railway

Railway builds the `Dockerfile` from GitHub on every push to `main`. Railway stopped accepting `railway.toml` for new services in 2026, so the health check is set in the dashboard. The Hobby plan costs at least $5 a month, which includes $5 of usage; RAM, CPU, disk and traffic beyond that are billed. This app's real usage has not been measured yet, so set a usage limit and check the estimate after the first days. New accounts get a 30-day trial with $5 of credit. The Southeast Asia region (Singapore) is the closest to India.

1. Create a project from the GitHub repository, pick the `main` branch, and turn on **Wait for CI** so Railway skips a commit whose `Beta image` check fails.
2. In the service settings choose the Singapore region, keep one replica, and set the health check path to `/healthz`.
3. Add a volume mounted at `/data`. Railway mounts it owned by root; the image's entrypoint gives it to the `node` user and starts the server as `node`.
4. Add the settings from the table above as service variables, plus `PORT=8770`. Set `TRUST_PROXY=1`. With `APP_ORIGIN` set and no `BETA_INVITE_CODES`, the server refuses to start, so the health check fails and Railway keeps the previous release (set `ALLOW_OPEN_REGISTRATION=1` only to open sign-up on purpose). Railway's proxy hop count is not guaranteed to be one, so check `X-Forwarded-For` as described above before relying on per-visitor limits.
5. Add the custom domain `app.<domain>` and the `CNAME` record Railway shows. On Cloudflare DNS, leave the record unproxied (grey cloud) so Railway's proxy is the only hop.
6. Set a usage limit in the workspace's billing settings.

Railway does not overlap two deployments that share a volume, so a redeploy has a short gap. Run the `Beta image` GitHub workflow by hand with the live URL to check health, security headers and `/api/status` from outside.

## Option D: one small server (AWS free plan or Azure for Students)

Use an Ubuntu 24.04 x86-64 server with at least 1 GB of memory: an AWS `t3.micro` in Mumbai (`ap-south-1`) on the AWS free plan, or an Azure `B1s` in Central India with Azure for Students. Don't pick an Arm (Graviton) size, because the image's Stockfish is an x86-64 build.

1. Create the server with an SSH key pair and a fixed public IP (an Elastic IP on AWS, a static IP on Azure). Paste `deploy/vm/cloud-init.yaml` as its user data or custom data. Allow inbound ports 22, 80 and 443 only, with password sign-in off.
2. Add an `A` record for `app` pointing at the IP, unproxied (grey cloud) on Cloudflare. Caddy on the server obtains the certificate.
3. Copy the server's `ssh-ed25519 …` host key line from its first-boot console log (AWS: Instance, Actions, Monitor and troubleshoot, Get system log; Azure: Boot diagnostics, Serial log), between the `BEGIN SSH HOST KEY KEYS` markers. In the GitHub repository settings add the variables `VM_HOST`, `VM_HOST_KEY` (that line, such as `ssh-ed25519 AAAA…`), `VM_USER` (`ubuntu` on AWS, `azureuser` on Azure) and `APP_ORIGIN`, and the secrets `VM_SSH_KEY` (the private key) and `BETA_INVITE_CODES`.
4. Run the `Deploy to server` workflow. It builds the image on GitHub, copies the image and a settings file to the server over SSH, restarts the container on the `chesslab-data` volume, and checks `/healthz` through HTTPS. Each later push to `main` that changes the app deploys again, but only after the `Beta image` check passes for that commit.

The workflow refuses to deploy without `BETA_INVITE_CODES`, and refuses `ANTHROPIC_API_KEY` unless the server has the coach budget and `COACH_AI_INVITE_CODES` is set. The previous container is kept stopped until the new one starts, runs Stockfish, is invite-gated and answers over HTTPS, and is started again if any of that fails. If image checks finish out of order, a checked commit deploys only when nothing newer on `main` changes the image. The settings file is written to `/etc/chesslab.env` (root, mode 600) on every deploy from the repository's variables and secrets. Change a setting in GitHub, then run the workflow again. The image is copied straight to the server and is not published to a registry.

## Option E: your own Mac, free (chosen for the AskTheMove beta from 18 October 2026)

This costs nothing and needs no card or server: the app runs natively on the Mac, as it does for local use, and a free Cloudflare Tunnel connects `app.<domain>` to it. No port is opened on the home network. The site is offline whenever the Mac sleeps, is shut down or loses its connection. It needs the domain's DNS on Cloudflare, Homebrew, and the repository checked out on `main`.

```sh
scripts/host_on_mac.sh          # first time: installs Node, Stockfish and cloudflared if missing, builds, asks for invite codes, starts
scripts/host_on_mac.sh update   # after new commits on main
scripts/host_on_mac.sh status
scripts/host_on_mac.sh backup                 # copy the database now
scripts/host_on_mac.sh restore <backup-file>  # put a backup back and restart
scripts/host_on_mac.sh stop
```

The first run asks for the invite codes without showing them and writes `.env.beta` (mode 600, ignored by Git) with `APP_ORIGIN`, `TRUST_PROXY=1` and a database at `~/AskTheMove/chesslab.sqlite`, separate from local development data. `cloudflared tunnel login` opens a browser to choose the domain. The script creates a tunnel named `askthemove` and adds one `CNAME` for the app hostname; it never changes other records. Two launch agents in `~/Library/LaunchAgents` keep the app (port 8780, wrapped in `caffeinate -i`) and the tunnel running and start them at login. Logs are in `~/AskTheMove/logs`. `~/AskTheMove` is mode 700 and the app runs with umask 077, so other accounts on the Mac can't read the database. Analysis's default engine id (`stockfish18`) is linked to the Homebrew Stockfish in `data/engines/stockfish18` unless `scripts/install_engines.py` already put one there. The build is written beside the live files and swapped in only when it succeeds, so a failed `update` leaves the site as it was. If the hostname already points somewhere other than this tunnel, the script stops without changing DNS. A closed laptop lid still sleeps the Mac. The proxy hop count through Cloudflare has not been checked; follow the `X-Forwarded-For` check above before relying on per-visitor limits.

## Backups

The database holds password hashes, session hashes, games and progress. Treat every copy as private data and encrypt it when stored off the server.

An online backup can run while the app is serving. `VACUUM INTO` writes one consistent file:

```sh
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker exec --user node chesslab node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/data/chesslab.sqlite',{readOnly:true});db.prepare('VACUUM INTO ?').run(process.argv[1])" "/data/backup-$stamp.sqlite"
docker cp "chesslab:/data/backup-$stamp.sqlite" "./backup-$stamp.sqlite"
docker exec --user node chesslab rm "/data/backup-$stamp.sqlite"
```

Run it at least daily from cron or the platform's scheduler. Copy the file off the server, and keep several days and weeks of copies. For a cold backup, stop the container and copy the whole volume, including any `chesslab.sqlite-wal` and `chesslab.sqlite-shm` files.

On the Mac host (Option E), the script does this without Docker. Setup schedules `scripts/host_on_mac.sh backup` daily at 03:00 (or on wake if the Mac was asleep) through a third launch agent, `online.askthemove.backup`. It writes `~/AskTheMove/backups/chesslab-<UTC time>.sqlite` with `VACUUM INTO` while the app keeps serving, at mode 600, and keeps the newest 14. Copy some of them off the Mac, encrypted, for example to an encrypted disk image. To restore, run `scripts/host_on_mac.sh restore ~/AskTheMove/backups/<file>`: it saves the current database as a fresh backup, stops the app, replaces the database, removes stale `-wal` and `-shm` files and starts the app again. To rehearse, run `backup` and then `restore` with the file it printed; the data is unchanged and only sessions created in between are signed out.

For Docker hosts, to restore, stop the container. Replace `/data/chesslab.sqlite` with the backup and remove any stale `-wal` and `-shm` files beside it. Then start the container again. Rehearse a restore before inviting testers. Restoring signs out anyone whose session was created after the backup.

## Pointing `app.<domain>` at it later

1. For a VPS, add an `A` (and `AAAA` if available) record for `app` pointing at the server. For Fly.io or Render, add the custom domain in the platform and create the `CNAME` or `A` record it gives you.
2. Wait for the platform or Caddy to issue the certificate.
3. Set `APP_ORIGIN=https://app.<domain>` exactly and restart. Requests from any other origin are refused once it is set.
4. Moving from a temporary hostname to `app.<domain>` signs everyone out, because session cookies are tied to the host. Accounts and data are unaffected.

The marketing site can live at the apex domain or `www` independently. Both are separate origins. Keep the app on its own subdomain so its cookies stay off the marketing site.

## Before inviting testers

- `APP_ORIGIN`, `TRUST_PROXY` and `BETA_INVITE_CODES` or `COACH_AI_INVITE_CODES` are set. `/api/status` reports `"hosted":true`, `"inviteRequired":true` and `"archives":false`.
- `/healthz` returns `{"status":"ok"}` through HTTPS, and the response carries `Strict-Transport-Security` and `Content-Security-Policy`.
- Sign-up without a code is refused, and sign-up with a code works.
- An account created with a `COACH_AI_INVITE_CODES` code sees "Explain why"; one created with a `BETA_INVITE_CODES` code does not.
- If the key is set, one "Explain why" answer is labelled as AI-generated and names the model. With a bad key, the page shows the engine summary and a short notice. Logs record only the fallback reason, never the key or prompt.
- A backup has been taken and restored on a scratch copy.
- The key's Console workspace has a monthly spend limit and auto-reload is off. The hourly limit is per account and the daily limit is per coach code, shared by every account created with it; neither caps the total across codes.

## Known gaps

- No password reset, email verification or account deletion flow. Testers who forget a password need a manual reset.
- Rate limits and the hourly AI quota are in memory and reset on restart. The daily AI count does not. Each account allows 10 sign-in attempts per 15 minutes. Someone who knows a username can use that limit to lock its owner out for 15 minutes.
- The server checks that every move Claude cites appears in the evidence with the same check and mate markers, that any mention of mate matches the side and distance the engine reported, that every number appears in the evidence, and that a piece said to be won, lost or traded is one the evidence lines capture. These checks read simple wording patterns, so unusual phrasing can be misread, and they do not check which side gains the material. They do not check move order or claims about squares and defenders; the prompt alone governs those. Answers over 110 words or two paragraphs are withheld.
- Nothing here has been load-tested. Analysis runs two Stockfish searches at once and bot moves run one at a time. Up to eight more requests queue; beyond that the server answers "busy".
