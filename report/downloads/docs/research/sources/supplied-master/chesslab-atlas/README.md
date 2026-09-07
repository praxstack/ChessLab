# ChessLab Atlas

A self-contained, clean-room product dossier for an original online chess platform with branch-native conversational coaching.

## Start here

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8765
```

Then visit `http://127.0.0.1:8765`.

## Primary deliverables

- `ChessLab_Atlas_BRD.pdf` — 74-page tagged business requirements document
- `ChessLab_Atlas_Screenshot_Book.pdf` — 13-page desktop/mobile visual evidence book
- `index.html` — interactive capability atlas and UX prototype
- `BRD.md` — editable BRD source
- `research/one-to-one-traceability.csv` — 180-row capability → source → requirement → acceptance → screen mapping
- `research/capability-matrix.csv` — normalized capability map
- `research/screen-inventory.csv` — 209 screen and state records
- `research/requirements.csv` — 180 functional plus 35 non-functional requirements
- `research/source-ledger.csv` — 38-source evidence register
- `research/domain-summary.csv` and `research/source-coverage.csv` — coverage audits
- `research/methodology.md` — scope, evidence hierarchy, mapping method and stop rule
- `screenshots/` — full-page and viewport captures
- `QA_REPORT.md` — browser, data-integrity and PDF verification record
- `artifact-manifest.json` — file inventory and SHA-256 hashes

## Research and rights boundary

This dossier maps publicly documented product capabilities and user-owned ChessLab context. It does not copy Chess.com branding, interface text, source code, proprietary assets, sounds, move glyphs, confidential architecture, or private screens. Screenshots depict the original ChessLab Atlas prototype.

The prototype board is a UX demonstrator. It is not presented as a legal chess engine, production multiplayer system, security audit, learning-efficacy result, or full accessibility certification.

## Rebuild

`generate.py` regenerates the site data, BRD sources and research CSVs. PDF generation and browser captures require a Chromium-compatible automation environment.
