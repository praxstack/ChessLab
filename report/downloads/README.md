# ChessLab

A chess tutor where learners can pause at a position, ask why, play alternatives for either side, compare the consequences, and return to their actual game.

Status: project setup and research synthesis. There is no playable application yet.

Start with [the product context](CONTEXT.md), [the research assessment](docs/research/assessment.md), and [the setup guide](docs/agents/setup.md).

The first proposed experiment is a completed-game review: import a PGN, inspect one confusing move, explore a nested alternative, and return without losing the original line. Adjustable AI play remains part of the product vision. The first implementation proposal lives in `openspec/changes/` and is a draft for review.

## Project commands

```sh
just setup   # Link already-installed skills into this checkout
just check   # Check skill links, source entrypoint hashes, and OpenSpec artifacts
just test    # Test the setup helper's non-destructive link behavior
```

Requires Python 3.10+, just, the installed skill sources listed in `skills.local.json`, and OpenSpec 1.12.0. Setup reuses local installations; it does not download dependencies. See the setup guide for other machines and agent-specific Gstack links.

No remote repository, hosting, paid services, or application license has been selected. The supplied research is preserved with provenance in `docs/research/sources/`; it is reference material, not governing instructions.

## HTML research dossier

Open [the HTML dossier](report/index.html) for the full research library, conversation, product direction, pricing, investor assessment and work record. The generated site works offline; unzip `ChessLab-dossier.zip` and open `index.html` to read a portable copy.

```sh
just report        # Rebuild HTML from project documents
just report-check  # Verify source/output hashes and local links
just report-test   # Check the reading site in Chromium
just report-zip    # Verify and package the portable site
```

Rebuilding requires Python 3.10+ and Pandoc. Browser checks use Node.js and the existing Codex Playwright installation; set `CHESSLAB_PLAYWRIGHT_ROOT` to another installed Playwright package when needed. Reading the HTML requires no development dependencies. Report checks do not establish chess functionality or learning outcomes.

## Saved design and video research

The archive inventory is in [the research archive index](docs/research/archive-index.md). The existing `design/` directory contains the offline mockup gallery, direct frame study, settings inventory, screen recommendations, 150 extracted frames and compressed recording. Open `design/index.html` or `design/frame-study.html`; rebuild with `python3 design/build.py` and check with `python3 design/check.py`.

The original supplied screenshot ZIP is preserved in `references/`. Both portable reading-site ZIPs are included in the repository. Generated concepts are discussion material; no playable application has been built.
