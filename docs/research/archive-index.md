# Research and design archive

Saved for discussion on 7 September 2026. This is a research and design snapshot, not an implemented chess application. The existing OpenSpec change remains a draft.

## Where everything lives

Paths below are relative to the repository root. Existing gallery paths are retained so previously opened local pages remain usable.

| Location | Contents |
| --- | --- |
| `docs/research/sources/` | Supplied startup PDF and text, learning-products research, original conversation retrieval and lesson screenshots, with provenance. |
| `docs/research/assessment.md` | Initial product, market and technical assessment. |
| `docs/dossier/` | Source chapters covering product, market, pricing, investor assessment, architecture, discussion and readiness. |
| `report/index.html` | Generated offline research dossier and full document library. |
| `design/index.html` | 17 Grok Imagine design concepts, with scenario briefs, review notes and generation receipts. |
| `design/frame-study.html` | Direct visual analysis of the recording. |
| `design/settings-study.html` | 26 observed settings controls and the option lists visible in the recording. |
| `design/screen-plan.html` | Proposed screen states and changes informed by the frames. |
| `design/frame-atlas.html` | 150 timestamped frames and 19 contact sheets. |
| `design/video/` | Compressed full-duration recording with audio, Gemini report, blocked Antigravity attempt, frame evidence and provenance. |
| `references/chesscom-screenshots.zip` | The user's original screenshot archive, preserved byte for byte. This commit does not claim a new analysis of every screenshot in that archive. |
| `ChessLab-dossier.zip` | Portable copy of the research dossier. |
| `ChessLab-design-studies.zip` | Portable design gallery, frame study and compressed recording. |
| `report-desktop.png`, `report-mobile.png`, `report-pricing.png` | Earlier report review screenshots. |
| `CONTEXT.md`, `openspec/`, `docs/agents/` | Product context, draft specification and working conventions. Research is reference material, not governing instructions. |

## Evidence and limits

Grok Imagine generated the mockups through its authenticated CLI. Gemini's web app accepted the full compressed video after Antigravity's file hook blocked its attempted ingestion. Gemini's first response contained errors; the saved findings distinguish corrected model output from direct frame inspection.

The follow-up pass inspected selected frames across the full 15:20 recording, with every second sampled in the settings section. It was not uninterrupted viewing of every video frame or a complete speech transcription. Some generated mockups contain invalid chess positions or incorrect labels; these are flagged in their review notes.

The original 636 MiB desktop recording remains untouched outside Git. The committed 14.3 MiB viewing copy retains the full duration and audio. Its provenance records the original path, size and hash. No original recording was deleted or substituted.

The archive includes source documents, generated reading pages, images, receipts, compressed media and portable ZIP deliverables. Local browser extension downloads, browser caches and provider diagnostic stderr files remain on disk outside Git. No account credentials are required to read the saved HTML.

## Verification before committing

The setup helper self-test and the standalone OpenSpec validation are checked separately from the documentation builds. `just check` currently fails because the globally linked `gstack-cso` skill differs from its recorded setup hash. The manifest is preserved rather than silently updated. Earlier passing receipts remain historical snapshots.

Both reading sites have runnable source/output checks: `just report-check` and `python3 design/check.py`. Earlier browser receipts retain their dates and tested scope. Rebuilding documentation does not establish chess functionality, learning outcomes, demand, a commercial release or deployment.
