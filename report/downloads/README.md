# ChessLab

Play a bot, review a decision, try a different line, and return to the actual game.

ChessLab now has a local web application with a large blue board, five bot levels, server analysis, saved variations, PGN import/export and accounts on the same server. Six original introductory lessons and six puzzles provide a small practice collection. The coach explains engine evidence. Learner questions are saved notes, not a free-form conversational AI.

The current build follows the user's platform-first direction: bot and coach play first. Human multiplayer and billing are deferred. It does not reproduce Chess.com's full platform, content library or scoring system. The full branching conversational tutor remains the longer-term objective.

## Run the application

Use Node.js 24 or newer and install native Stockfish on the server. On macOS:

```sh
brew install stockfish
npm ci
cp .env.example .env
npm run dev
```

Open [ChessLab at localhost:8770](http://127.0.0.1:8770). Check `STOCKFISH_PATH` in `.env` against `command -v stockfish`, especially on Intel Macs or other operating systems. The server runs Stockfish as a process. It sends moves and analysis to the browser, with no engine or model download.

For the built application:

```sh
npm run build
npm start
```

Read [the application guide](docs/application.md) for accounts, studies, settings, backups, checks and limits. Start with [the product context](CONTEXT.md) and [the current OpenSpec change](openspec/changes/build-coach-web-platform/proposal.md) before changing product behavior.

## Verify changes

```sh
just test       # Setup helper, application and frontend state tests
just app-check  # Application tests and production build
just e2e        # Built app in an isolated database and browser smoke test
just check      # Local skill links/hashes, OpenSpec and whitespace
```

Browser checks use an existing Playwright installation. Set `CHESSLAB_PLAYWRIGHT_ROOT` if it is not at the installed Codex path. Agent setup requires Python 3.10+, `just`, OpenSpec and the existing skill sources in `skills.local.json`. These tools are separate from the runtime dependencies. See [the setup guide](docs/agents/setup.md).

The recorded `gstack-cso` entrypoint hash has drifted from its installed source. The setup check reports that failure until the changed source is reviewed and the manifest is deliberately updated. Application checks do not waive the setup check. Passing local tests does not establish public deployment, scalable hosting or learning outcomes.

## Research and design archive

The supplied research remains reference material, not governing instructions. Read [the assessment](docs/research/assessment.md), [the archive index](docs/research/archive-index.md), and [the HTML dossier](report/index.html). The dossier records earlier research and setup status. Its historical statements about the absence of an application describe that earlier work.

```sh
just report        # Rebuild HTML from source documents
just report-check  # Verify source/output hashes and local links
just report-test   # Check the reading site in Chromium
just report-zip    # Verify and package the portable site
```

Rebuilding the dossier requires Python 3.10+ and Pandoc. Reading the generated HTML works offline. `ChessLab-dossier.zip` is a portable snapshot and may predate current application work. Rebuild and verify before treating generated reports as current. Never hand-edit derived HTML.

The `design/` directory preserves the mockup gallery, direct frame study, settings inventory, 150 extracted frames and compressed recording. Open `design/index.html` or `design/frame-study.html`; rebuild with `python3 design/build.py` and check with `python3 design/check.py`. The supplied screenshot ZIP remains in `references/`. These archives explain the visual direction; they are not runtime evidence.

The server's Stockfish installation is separate from this repository. See [the engine decision](docs/adr/0001-server-chess-engine.md) for licensing and operational boundaries. Repository publication and public hosting are separate delivery steps.
