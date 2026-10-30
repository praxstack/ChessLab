# AskTheMove coach Worker

A small Cloudflare Worker that lets learners with an invite code use "Explain why" on the owner's Claude key. The browser app sends chess evidence only: the moves of the game and the engine's moves and scores. The Worker replays every move with the rules library, rebuilds the facts, sends the fixed coach prompt to Claude, and checks the answer before returning it. When anything fails, it returns the engine summary with a short reason.

It is not a general Claude proxy:

- It accepts only `POST /explain` with `{inviteCode, evidence, asked}`. Any other field, free text, or a body over 32 KB is refused before Claude is called.
- The prompt, model and token cap are fixed on the Worker. The caller cannot set them.
- Each invite code may use `COACH_MAX_PER_DAY` explanations per UTC day (default 50), counted in D1.
- Only the sites in `APP_ORIGINS` may call it.
- The Claude key and the invite code digests are Worker secrets. They are never in this repository, in the browser app, or in the Worker's logs.

Everything here fits the Cloudflare free plan (Workers: 100,000 requests a day; D1: 5 GB and 100,000 writes a day). No credit card is needed. Claude itself is billed by Anthropic to the owner's key, so keep the daily cap and the number of codes small.

## Deploy (the owner runs this)

Run these from the repository root on your Mac. `npx wrangler` downloads Wrangler the first time.

1. Install the app's packages, which the Worker bundles (chess rules):

   ```sh
   npm ci
   cd deploy/coach-worker
   ```

2. Sign in to Cloudflare (opens the browser):

   ```sh
   npx wrangler login
   ```

3. Create the database, then paste the `database_id` it prints into `wrangler.toml` in place of the zeros:

   ```sh
   npx wrangler d1 create askthemove-coach
   ```

4. Create the table:

   ```sh
   npx wrangler d1 migrations apply askthemove-coach --remote
   ```

5. Choose invite codes (long and random, one per tester, for example from `openssl rand -hex 8`). For each code, make its SHA-256 digest. The Worker trims spaces from the ends of a code before hashing:

   ```sh
   printf %s 'the-invite-code' | shasum -a 256
   ```

   Keep the codes themselves somewhere private. Only the digests go to Cloudflare.

6. Store the secrets. Each command asks you to paste the value, so it never lands in your shell history:

   ```sh
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put COACH_INVITE_DIGESTS
   ```

   For `COACH_INVITE_DIGESTS`, paste the digests separated by commas.

7. Check `APP_ORIGINS`, `COACH_MAX_PER_DAY` and `ANTHROPIC_MODEL` in `wrangler.toml`, then deploy:

   ```sh
   npx wrangler deploy
   ```

   Wrangler prints the Worker's address, such as `https://askthemove-coach.<your-subdomain>.workers.dev`.

8. Build the browser app with that address so it shows the invite code option:

   ```sh
   cd ../..
   VITE_COACH_URL=https://askthemove-coach.<your-subdomain>.workers.dev npm run build:app
   ```

   Add the same origin to the app's Content Security Policy `connect-src` (`web/public/_headers`).

## Everyday changes

- Add or remove a tester: update the digest list with `npx wrangler secret put COACH_INVITE_DIGESTS`. It takes effect at once.
- Change the daily cap: edit `COACH_MAX_PER_DAY` in `wrangler.toml` and run `npx wrangler deploy`.
- See today's use per code digest:

  ```sh
  npx wrangler d1 execute askthemove-coach --remote --command "SELECT budget, count FROM coach_daily WHERE day = date('now')"
  ```

- Watch for failures: `npx wrangler tail` shows reasons such as `upstream_busy (HTTP 429)`, never keys, codes or answers.

## Tests

`npm test` at the repository root runs `worker.test.mjs` with a fake Anthropic fetch and an in-memory SQLite database in place of D1. No key and no network are needed.
