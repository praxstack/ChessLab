# AskTheMove runs in the learner's browser

## Why

On 28 October 2026 the owner decided AskTheMove should not need a server. Stockfish already runs in the browser on `askthemove.online/puzzleanalyzr`, the owner has a $0 budget with no credit card, and the server today is the owner's Mac behind a Cloudflare Tunnel, so the app is offline whenever the Mac sleeps. Decision record: https://claude.ai/artifact/VJ9zZmY4cnAWtnRy2QaSvg (owner's yes: 28 Oct 2026 10:55 UTC; go: 30 Oct 2026 13:10 UTC).

Almost everything the Express server does is plain JavaScript that can run in the browser. The one exception is the owner's Claude key, which must never ship to a browser.

## What changes

- The web app becomes a static, client-side rendered app. Every `/api/*` call in `web/src/main.jsx` goes to an in-browser router (`web/src/local/`) instead of the network. The router reuses the same rules modules the server uses today.
- Storage moves from SQLite to IndexedDB, behind a small storage interface with an in-memory version for tests. There are no accounts: one local profile per browser. Back up and Restore save and load everything as one JSON file. The app asks for persistent storage.
- Stockfish 19 Lite (the same build as the puzzle page) runs in a Web Worker for analysis, game review, hints and bots. Thinking time becomes a learner setting (Quick 0.5 s, Normal 1.5 s, Deep 4 s per position; default Normal). Endgames with 7 or fewer pieces ask the free Lichess tablebase API.
- The coach works two ways. (A) Bring your own key: the learner's Claude key stays in their browser and calls Claude directly. (B) Invite code: a small Cloudflare Worker (`deploy/coach-worker/`) holds the owner's key, builds the prompt itself from chess evidence, verifies the answer, and enforces the per-code daily cap (default 50) in Cloudflare D1. Both use the existing system prompt and `verifyAnswer` rules from `server/coach-explain.mjs`, moved to `shared/coach/`.
- The built app deploys to a separate free Cloudflare Pages project (`askthemove-app`, preview address `askthemove-app.pages.dev`). `app.askthemove.online` keeps the "board is resting" page until the owner says the app is ready.

## Non-goals

- Deleting `server/`. It keeps working (`just app`) until the browser app reaches parity; a later change removes it.
- Sync across devices and accounts. Planned later through the same Worker and D1, only when testers ask for it.
- Maia and Leela bots, the full 95 MB Stockfish 19 "Deep" download, multi-threaded Stockfish, and the opening explorer catalogue. Each is a follow-up once the base works.
- Board feel, animation and coach quality. Those are the next changes, on this new base.
- Any deploy. The owner deploys with `wrangler`.

## Constraints

- $0 hosting, no credit card. Cloudflare free plan only.
- The owner's Claude key never appears in the browser bundle, the repo, logs or chat.
- The Worker must not be usable as a general Claude proxy: it accepts only structured chess evidence, never free text prompts, and caps `max_tokens`.
- The rules library owns legality; the engine supplies bounded evidence; Claude only explains supplied facts (unchanged from `grounded-coach-ai`).
