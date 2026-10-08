## 1. Baseline
- [x] 1.1 Record `npm test` on `claude/original-assets` (129 tests: 114 pass, 6 environment failures, 9 skipped), `npm run build`, strict OpenSpec validation and the dossier check.

## 2. Interface
- [x] 2.1 PN-001 Rename the page title, the sidebar wordmark and its accessible label, the footer and the lesson attribution; describe the study format by its extension in the import dialog.
- [x] 2.2 PN-002 Name new downloads `askthemove-<id>` and use AskTheMove in default PGN Event and bot names, keeping `ChessLabOriginalPly` and the `chesslab-study` format id.
- [x] 2.3 PN-003 Keep storage keys, cookie, database, environment and format identifiers; name the extension in the unsupported-file error; test import of a study file exported before the rename.

## 3. Documentation
- [x] 3.1 Name the product AskTheMove in README and CONTEXT and list the identifiers that keep the working name.
- [ ] 3.2 Founder decision: rename the repository, package, Docker image and the internal identifiers in the non-goals, with a migration for each stored one.

## 4. Delivery
- [x] 4.1 Run the full test suite, production build, strict OpenSpec validation and dossier check; record environment failures separately.
- [x] 4.2 Capture the sidebar, a game review and the import dialog in Chromium and confirm no visible text reads ChessLab.
