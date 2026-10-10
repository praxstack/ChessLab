# Host the private beta on Railway

## Why

On 10 October 2026 the founder asked for the app to be hosted as a private beta, with Claude doing every step that does not need the founder's own accounts. The image from `hosted-beta-readiness` had only been run in a sandbox. Hosts such as Railway and Fly.io mount a fresh volume at `/data` owned by root, and the image ran as `node` from the start, so the server could not create its database on those hosts.

Railway's Hobby plan was chosen: $5 a month including $5 of usage, a Singapore region near India, builds from the `Dockerfile` on every push to `main`, and every setup step can be done in its web dashboard. Fly.io costs about the same in Singapore but needs a command-line token for each deploy.

## What changes

- The image starts through `docker/entrypoint.sh`. As root it gives `/data` to the `node` user when needed, then runs the server as `node` with `setpriv`. Started as any other user, it runs the command unchanged.
- `railway.toml` sets the Dockerfile build, the `/healthz` health check, a bounded restart policy and the paths that trigger a rebuild.
- The `Beta image` GitHub workflow builds the image and checks it on a root-owned volume: health, server user, Stockfish, invite gating and an account surviving a restart. Run by hand with a URL, it checks the live beta's health, security headers and status.
- `docs/deploy-beta.md` gains a Railway section, and its backup commands run as `node`.

## Non-goals

- Creating the Railway account, paying, setting secrets or DNS. The founder does those.
- Turning on "Explain why" for testers. That waits for `coach-budget`, so the hosted Claude key covers only invited accounts with a daily cap.

## Status

Not deployed yet.
