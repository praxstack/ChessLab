# ChessLab — SETUP (verified on this Mac, 2026-10-03)

Repo: `praxstack/ChessLab` (HEAD `9955411`, clean working tree, nothing tracked was modified). Commands run from the repo root.
Logs referenced below (`logs/v2/`, `smoke/v2/`) are audit artefacts kept outside the repo.

## 0. What this is

Local-first chess training web app. One Node process (Express 5 + `node:sqlite`) serves a React 19 SPA (Vite 8) and
drives native UCI chess engines as child processes. No Swift/Xcode, no Docker, no API keys.

- Not a macOS app: Xcode is not needed (`xcode_pending = false`). The only use of Apple CLT is `make`/`clang++` when
  the optional Stockfish 16 engine is compiled from source.
- No lint, formatter, type-checker or CI is configured in the repo (no eslint/prettier/tsconfig/.github). The only
  static gates are `vite build`, `openspec validate` and `git diff --check`.

## 1. Prerequisites (all already present on this Mac)

| Tool | Found | Needed for |
| --- | --- | --- |
| Node >= 24 (`package.json` engines) | v24.21.0 (mise) | everything |
| Stockfish (Homebrew) | `/opt/homebrew/bin/stockfish` = Stockfish 19 | required engine (`STOCKFISH_PATH`) |
| python3 3.13, `uv` | yes | optional installers/importers |
| `just` | `/opt/homebrew/bin/just` | task runner (optional, plain npm works) |
| `openspec`, `pandoc`, `zstd` | yes | `just check`, dossier rebuild, puzzle import |
| Playwright Chromium | `~/Library/Caches/ms-playwright/chromium-1234` | `just e2e` (`npx playwright install chromium` if missing) |

Nothing was installed with Homebrew for this repo in this run. (`brew fetch --force-bottle lc0` only downloads the
Lc0 bottle into the Homebrew cache; the binary is copied into `data/engines/lc0/`, nothing is linked system-wide.)

## 2. Install, build, run (the minimum)

```sh
npm ci                         # 0 vulnerabilities; fsevents install scripts are blocked (harmless)
cp .env.example .env           # already done; .env is identical to .env.example and is git-ignored
npm run dev                    # dev mode (Vite middleware)  -> http://127.0.0.1:8770
# or
npm run build && npm start     # production mode, serves web/dist -> http://127.0.0.1:8770
```

Stop with Ctrl-C. Create an account in the UI (username 3-32 chars, password 10-128 chars); it lives only in the
local SQLite file `data/chesslab.sqlite` (created on first start, git-ignored).

### Environment variables (`.env`, none are secrets for local use)

| Var | Value in `.env.example` | Notes |
| --- | --- | --- |
| `STOCKFISH_PATH` | `/opt/homebrew/bin/stockfish` | must identify as Stockfish; correct on this Mac |
| `HOST` | `127.0.0.1` | keep loopback |
| `PORT` | `8770` | change if busy |
| `CHESSLAB_DB` | `./data/chesslab.sqlite` | resolved from the working directory: run from the repo root |
| `COOKIE_SECURE` | `0` | `1` only behind HTTPS |
| `PUBLIC_ORIGIN`, `CHESSLAB_BACKEND_SECRET` | commented out | only for the private "Sites" hosting path; a 64-hex secret, set both or neither. Not needed locally. |
| `CHESSLAB_EXPLORER`, `CHESSLAB_PUZZLES`, `CHESSLAB_ENGINES_DIR` | unset | optional overrides of `data/explorer/catalogue.sqlite`, `data/puzzles/catalogue.sqlite`, `data/engines` |

Shell variables win over `.env`, so a second isolated instance is just:

```sh
HOST=127.0.0.1 PORT=18770 CHESSLAB_DB=/tmp/chesslab-test.sqlite npm run dev
```

Note: dev mode also opens Vite's HMR websocket on 127.0.0.1:24678; two dev instances at once will fight over it
(production mode has no such port).

## 3. Optional local assets (git-ignored `data/`, installed in this run)

A fresh clone has no `data/`. The app runs without it (Stockfish 19 only, 6 starter puzzles, no explorer), but
**2 of the 105 tests fail** until Stockfish 16, Stockfish 18, Stockfish 18 Lite, Lc0 and the tablebases exist.

```sh
# Engines (Apple Silicon only). ~515 MB. SF16 is compiled with make/clang (~1 min).
python3 scripts/install_engines.py stockfish18 stockfish18-lite stockfish16 lc0
# 3-5 piece Syzygy tablebases: 290 files, 984 MB, SHA-256 verified, resumable.
python3 scripts/download_tablebases.py      # rerun if it dies with RemoteDisconnected (it did once at 278/290)
# python-chess venv used by the Chess960 oracle test and the explorer importer
uv venv data/explorer/.venv
uv pip install --python data/explorer/.venv/bin/python chess==1.11.2
```

State on this Mac after this run:

| Asset | Path | Status |
| --- | --- | --- |
| Stockfish 19 | Homebrew | installed |
| Stockfish 18, 18 Lite (WASM), 16, Lc0 0.32.1 + T1-256x10 net | `data/engines/` (513 MB) | installed, all five answer moves over HTTP |
| Syzygy 3-4-5 | `data/tablebases/standard/` (290 files, 963 MB) | installed, `/api/status` reports `tablebases:true` |
| python-chess venv | `data/explorer/.venv` | installed |
| Maia2 / Maia3 (5 engine ids) | `data/engines/python`, `maia2`, `maia3` | NOT installed (see 6) |
| Lichess puzzle catalogue | `data/puzzles/catalogue.sqlite` (2.8 GB) | installed, 6,157,341 rows (`logs/v2/puzzles-import.log`) |
| Opening explorer catalogue | `data/explorer/catalogue.sqlite` (1.3 GB) | installed from Lichess Elite 2025-11 (`logs/v2/explorer-import.log`, ~9 min) |

## 4. Tests

```sh
npm test                                             # node:test, serial, ~71 s
python3 scripts/setup_skills.py --self-test          # PASS
python3 scripts/local_snapshot_test.py               # PASS
python3 scripts/import_puzzles_test.py               # PASS (prints one harmless "zstd: unsupported format" line)
python3 scripts/download_tablebases_test.py          # PASS (not part of `just test`)
data/explorer/.venv/bin/python scripts/import_explorer_test.py   # PASS (needs the venv, not part of `just test`)
OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive   # 21 passed, 0 failed
```

Results of `npm test` (105 tests, `logs/v2/npm-test-run1.log`, `npm-test-run2.log`):

| State of `data/` | pass | fail | skipped |
| --- | --- | --- | --- |
| Stockfish 19 + SF18 + SF18 Lite, partial tablebases (before installing SF16/Lc0) | 96 | 2 | 7 |
| + Stockfish 16 + Lc0 + full tablebases (current state) | **100** | **0** | 5 (Maia ids, "Required runtime files are not installed") |

The two failures on a machine without the optional engines are not product bugs but hard test dependencies:
`server/chess960.test.mjs:52,58` and `server/endgames.test.mjs:14` loop over `stockfish16` (and `lc0`) with no skip,
so the spawn fails with "Stockfish is unavailable" (`server/engine.mjs:199`). On a clean clone the earlier run
recorded 4 failures (also python-chess oracle and SF18 Lite missing), see `logs/npm-test.log`.

`just test` = setup self-test + `npm test` + two Python tests: all pass in the current state.
`just app-check` = `npm test` + `npm run build`: passes in the current state.

### Known failing gates

1. `just check` fails at its first step on this Mac: `python3 scripts/setup_skills.py --check` ->
   `RuntimeError: Missing installed skill: ~/.agents/skills/diagnosing-bugs/SKILL.md`.
   `skills.local.json` pins 180 agent-skill entrypoints by path + SHA-256; 128 distinct sources are missing and 7
   have drifted here. This is agent tooling, not the application. Do not run `just setup` to "fix" it. The other
   two parts pass when run directly (`openspec validate ...`, `git diff --check`).
2. `just e2e` (`node scripts/check_app_browser.cjs`) fails:
   - `scripts/check_app_browser.cjs:239` reads `.classification` immediately after the board updates and gets the
     previous move's label (`Inaccuracy` instead of `Checkmate`). Measured: the label is stale for < 56 ms, then
     correct (`logs/v2/e2e-probe2.log`). 4 of 5 runs fail here; 1 run timed out earlier at line 197 under load.
   - With that assertion replaced by a waiting one (scratch copy, repo untouched) the run reaches
     `check_app_browser.cjs:343`, which asserts the local Lichess puzzle catalogue has exactly 6,100,952 rows.
     That archive (304,429,328 bytes, `references/puzzles/provenance.json`) is a rolling upstream file that is now
     307,234,795 bytes (modified 2026-10-02), so the count cannot be reproduced. The rest of the script also needs
     the explorer catalogue. See section 6.

## 5. Smoke test performed (reproducible)

```sh
S=<audit-dir>/ChessLab/smoke
HOST=127.0.0.1 PORT=18770 CHESSLAB_DB=$S/v2/dev.sqlite npm run dev &      # or: PORT=18771 ... npm start
curl -s http://127.0.0.1:18770/api/status
node $S/api-smoke-v2.mjs http://127.0.0.1:18770
kill $(lsof -nP -t -iTCP:18770 -sTCP:LISTEN)
```

- Dev mode (`smoke/v2/dev-routes.log`): `/` 200 (Vite HTML), `/src/main.jsx` 200, `/api/status` 200
  `{"engine":{"available":true,"name":"Stockfish 19","chess960":true,"tablebases":true},"billingEnabled":false}`,
  `/api/bots` 200 (166 bots), `/api/me`, `/api/learn`, `/api/curriculum`, `/api/endgames`, `/api/openings` 200,
  `/api/games` 401 when signed out, `/research/` and `/design/` 200, piece PNG 200, SPA fallback 200.
- Production mode (`smoke/v2/prod-routes.log`): same, `/assets/index-*.js` 200 (451 kB), headers
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`.
- API client (`smoke/v2/api-smoke-dev.log`, `api-smoke-prod.log`): 19 of 20 checks pass in both modes: register,
  weak-password rejection, a move + engine reply against stockfish19 / 18 / 16 / 18-lite / lc0, illegal-move and
  stale-revision rejection, 3-line analysis, tablebase analysis (tbhits > 0), PGN import/export, lessons, logout.
- The 1 failing check is a real defect: whole-game review of `1. f3 e5 2. g4 Qh4#` at `movetime: 200` returns
  HTTP 503 "Stockfish returned no usable analysis" every time. Root cause in `server/engine.mjs:157,177-180`:
  bound-only (`upperbound`/`lowerbound`) info lines are dropped, and when Stockfish's final `bestmove` was only
  ever reported on such a line the result is treated as empty. The UI default (1000 ms) reviews the same game fine.
- Both servers were stopped; no ChessLab listener or engine process is left running. A stray dev server from an
  earlier audit run (pid 17827, port 18770) was also stopped.

Importing nothing else is required to try the app: open http://127.0.0.1:8770, register, Play -> pick a bot or
the Engines tab, play, then Review.

## 6. Not installed / manual steps

- **Maia2 / Maia3** (5 optional opponent ids): `python3 scripts/install_engines.py maia` creates a Python 3.12 venv
  with PyTorch from two pinned GitHub commits and downloads five model checkpoints from Hugging Face. Skipped here
  (large, and the 5 Maia subtests skip cleanly). After installing, run `python3 scripts/install_engines.py --verify`.
- **Opening explorer** (already done here; steps for a fresh clone): download `https://database.nikonoel.fr/lichess_elite_2025-11.zip` (80 MB) to
  `data/explorer/` then
  `data/explorer/.venv/bin/python scripts/import_explorer.py data/explorer/lichess_elite_2025-11.zip data/explorer/catalogue.sqlite --label 'Lichess Elite · November 2025' --url https://database.nikonoel.fr/lichess_elite_2025-11.zip`
  (full legal replay of every game with python-chess: slow). Until then `/api/explorer` returns `available:false`.
- **Puzzle catalogue** (already done here): download `https://database.lichess.org/lichess_db_puzzle.csv.zst` to `data/puzzles/` and run `python3 scripts/import_puzzles.py` (see `logs/v2/puzzles-import.log`; ~6.16M rows today, so the e2e row-count assertion of 6,100,952 cannot match).
- **Torch / Komodo**: shown as disabled options in Settings; no code path exists.
- `just proof`, `just local-check`, `just report*`: not required to run the app; not executed.
