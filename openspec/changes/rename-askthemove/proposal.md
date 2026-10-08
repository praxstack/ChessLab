# Show the AskTheMove name in the interface

## Why

The hosted private beta will be shown to outside testers as AskTheMove. `hosted-beta-readiness` and `original-asset-pack` both left the interface rename out of scope, and `original-asset-pack` listed its timing as an open decision. On 8 October 2026 the founder approved renaming what a person sees in the app. The interface still showed ChessLab in the browser tab, the sidebar wordmark, the footer, the import dialog, the lesson attribution and exported files.

## What changes

- The page title, the sidebar wordmark and its accessible label, the footer and the lesson attribution read AskTheMove.
- The import dialog describes the study format by its `.chesslab.json` extension instead of a product name, and so does the server's error for an unsupported study file.
- New PGN and study downloads are named `askthemove-<id>`. The study file keeps the `.chesslab.json` extension. A PGN without an Event tag is exported as "AskTheMove study", and a bot without a stored name is exported as "AskTheMove bot".
- README and CONTEXT name the product AskTheMove and list the identifiers that keep the ChessLab working name.

## Non-goals

- Renaming the repository, npm package, Docker image, container or volume names, database files, the `chesslab_session` cookie, `CHESSLAB_*` environment variables, the `X-ChessLab-Backend-Key` header, browser storage keys, API paths, the `chesslab-study` format id or the `ChessLabOriginalPly` PGN tag. Each is internal or is read back from saved data, and renaming it would need a migration.
- Rewriting headers stored in saved games or in files exported before the rename.
- Server log lines, developer guides under `docs/`, the research sources, the generated dossier and the design archive, which keep the working name. A local install links the dossier and the design archive from the sidebar; a hosted install does not serve them.
- The landing page in `site/`, bot names and artwork.

## Status

Implemented on branch `claude/rename-askthemove`, stacked on `claude/original-assets`. Not deployed.

## Open decisions

- Whether and when to rename the repository and the internal identifiers listed above, and how to migrate existing cookies, storage keys and database paths if they change.
