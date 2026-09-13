---
name: control-app
description: Drives ChessLab's real local web app with isolated accounts, native engines, screenshots and video proof. Use for /control-app or ChessLab user-flow verification before a review PR.
disable-model-invocation: true
---

# Control ChessLab

## Launch

Run commands from this ChessLab checkout. Install `npm ci`, then `npx playwright install chromium` if Chromium is missing. Native Stockfish must be available at `STOCKFISH_PATH` or the existing platform default. Full puzzle-training proof also needs the imported local catalogue at `data/puzzles/catalogue.sqlite` or `CHESSLAB_PUZZLES`; see `docs/local-workspace.md`.

`just proof` builds and launches the production app in an isolated temporary SQLite database on a free loopback port, creates a synthetic account, drives the UI, records evidence, and stops its own server. It never uses the user's account database. Do not run engine suites concurrently with this proof on a memory-constrained Mac.

For manual inspection, run `npm run dev` and open the printed loopback URL. Stop only the process you launched with SIGTERM.

## Doctor

Run `just local-check`. It launches the production entrypoint in isolation, confirms app/archive/piece responses, tests actual engine readiness, rejects private data paths, and cleans up. A failure means fix the instance before UI proof.

## Drive

Use [the feature map](features/README.md) and `scripts/check_app_browser.cjs`. Stable handles include `Search bots`, `Play Martin, 250`, `Play entered move`, `Try a variation`, `Save study`, and `Open settings`.

For a chosen evidence folder, build first, then run:

```sh
CHESSLAB_EVIDENCE_DIR=data/my-proof node scripts/check_app_browser.cjs
```

Use a new evidence folder per run. Existing fixtures cover desktop and mobile. Extend this harness for a new mapped interaction. Exercise controls and verify server persistence. Do not replace user actions with internal state setters or test-only API routes.

## Evidence

The output folder contains `local-user-flow.webm`, screenshots of the picker, game, review, nested study, puzzle, library and mobile controls, and `receipt.json`. A passing process alone does not establish visual quality. Inspect the screenshots and video, then read the receipt.

Only synthetic test accounts belong in PR evidence. Hash source/build and proof files together in a separate manifest after the last change. A changed build invalidates previous proof for that build. This proves local behavior, not full Chess.com equivalence or hosted delivery.

## Cleanup

The harness closes its browser, engines and server and removes only its own temporary database. Evidence stays in the requested folder. Confirm the video and receipt still exist after exit. Failed attempts also clean up; retain their failure logs and distinguish them from the accepted run.

## Helpers

- `just local-check` checks the actual local entrypoint and archive mounts.
- `just proof` exercises the mapped user flows and records video.
- `python3 scripts/local_snapshot_test.py` verifies consistent SQLite snapshots and overwrite refusal.

Use `/maintain-verification-skill` when changed UI flows make the feature map stale.
