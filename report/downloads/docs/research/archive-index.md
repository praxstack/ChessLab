# Research and design archive

Saved for discussion on 7 September 2026. This is a research and design snapshot, not an implemented chess application. The existing OpenSpec change remains a draft.

## Where everything lives

Paths below are relative to the repository root. Existing gallery paths are retained so previously opened local pages remain usable.

On 2026-10-08 the project adopted an original-asset policy for its hosted beta. Screenshots, recordings, audio and page captures of another product were removed from the current tree; the rows below say what changed. Earlier commits still contain those files.

| Location | Contents |
| --- | --- |
| `docs/research/sources/` | Supplied startup PDF and text, learning-products research, original conversation retrieval and lesson screenshots, with provenance. The dossier no longer copies or displays the two lesson screenshots. |
| `docs/research/assessment.md` | Initial product, market and technical assessment. |
| `docs/dossier/` | Source chapters covering product, market, pricing, investor assessment, architecture, discussion and readiness. |
| `report/index.html` | Generated offline research dossier and full document library. |
| `design/index.html` | 17 Grok Imagine design concepts, with scenario briefs, review notes and generation receipts. |
| `design/frame-study.html` | Direct visual analysis of the recording, kept as written notes. |
| `design/settings-study.html` | 26 observed settings controls and the option lists visible in the recording. |
| `design/screen-plan.html` | Proposed screen states and changes informed by the frames. |
| `design/frame-atlas.html` | The 150 sampled times. The frames and 19 contact sheets were removed on 2026-10-08. |
| `design/video/` | Gemini report, blocked Antigravity attempt, sampling records and provenance. The compressed recording and frame images were removed on 2026-10-08. |
| Screenshot archive and Chrome reference session | Removed from the current tree on 2026-10-08. The user's original screenshot archive and the 2026-09-08 Chrome session captures remain in earlier commits and with the user. |
| `ChessLab-dossier.zip` | Portable copy of the research dossier. |
| Design studies archive | Removed on 2026-10-08 because it bundled the compressed recording and its frames. |
| `report-desktop.png`, `report-mobile.png`, `report-pricing.png` | Earlier report review screenshots. |
| `CONTEXT.md`, `openspec/`, `docs/agents/` | Product context, draft specification and working conventions. Research is reference material, not governing instructions. |

## Evidence and limits

Grok Imagine generated the mockups through its authenticated CLI. Gemini's web app accepted the full compressed video after Antigravity's file hook blocked its attempted ingestion. Gemini's first response contained errors; the saved findings distinguish corrected model output from direct frame inspection.

The follow-up pass inspected selected frames across the full 15:20 recording, with every second sampled in the settings section. It was not uninterrupted viewing of every video frame or a complete speech transcription. Some generated mockups contain invalid chess positions or incorrect labels; these are flagged in their review notes.

The original 636 MiB desktop recording remains untouched outside Git. A 14.3 MiB viewing copy with the full duration and audio was committed on 7 September and removed from the current tree on 8 October; `design/video/provenance.json` still records the original path, size and hash. No original recording was deleted or substituted.

The archive includes source documents, generated reading pages, images, receipts, compressed media and portable ZIP deliverables. Local browser extension downloads, browser caches and provider diagnostic stderr files remain on disk outside Git. No account credentials are required to read the saved HTML.

## Verification before committing

The setup helper self-test and the standalone OpenSpec validation are checked separately from the documentation builds. `just check` currently fails because the globally linked `gstack-cso` skill differs from its recorded setup hash. The manifest is preserved rather than silently updated. Earlier passing receipts remain historical snapshots.

Both reading sites have runnable source/output checks: `just report-check` and `python3 design/check.py`. Earlier browser receipts retain their dates and tested scope. Rebuilding documentation does not establish chess functionality, learning outcomes, demand, a commercial release or deployment.
