## 1. Prepare the first implementation

- [ ] 1.1 Record user acceptance or revisions of this draft and the selected dependencies; verify the decision is recorded before application implementation.
- [ ] 1.2 Reconstruct a small educator-reviewed legal position corpus for CL-001 and CL-004, including the motivating exchange; verify every supplied move by rules-library replay and preserve source provenance.

## 2. Build the exploration

- [ ] 2.1 Implement completed-PGN import and history-bearing nodes for CL-001; verify valid replay, draw-relevant history, rejected imports and preservation of the previous study.
- [ ] 2.2 Implement nested legal branches, selection, anchors and comparison for CL-002 and CL-003; verify a nested round trip preserves the original game, sibling branches and score perspective.
- [ ] 2.3 Add bounded worker analysis and supported evidence explanations for CL-004; verify capture/recapture counts, rejected illegal or unsupported claims, failure recovery and stale-result rejection.
- [ ] 2.4 Add local save/restore and study export/import for CL-005; verify round-trip equivalence and a simulated storage failure with an export still available.
- [ ] 2.5 Add keyboard board/navigation controls and text explanations for CL-006; verify the full branch-and-return interaction without dragging or color cues.

## 3. Validate the integrated prototype

- [ ] 3.1 Replace the explicit unavailable `just e2e` recipe with a real browser check covering import, nested exploration, explanation, return and reload; verify it fails if the original line or branch questions are lost.
- [ ] 3.2 Prepare a separate learner-study proposal with a chess educator, including comparative positions, teach-back, delayed transfer and repeat-use observations; verify its assumptions and decision thresholds are labeled proposed until accepted.
