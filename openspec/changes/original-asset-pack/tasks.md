## 1. Baseline
- [x] 1.1 Record `npm test` (125 tests: 110 pass, 6 environment failures, 9 skipped), `npm run build`, strict OpenSpec validation and before-screenshots of the bot picker, a game board and the review panel.

## 2. Artwork
- [x] 2.1 OA-001 Replace the piece images with the unmodified cburnett SVGs from lila `53f8fc8`, record provenance and hashes, serve the GPL-2.0 text and attribution, add Credits to Settings, and migrate stored piece-set ids.
- [x] 2.2 OA-002 Replace the navigation icons with pinned Lucide icons and the ISC licence.
- [x] 2.3 OA-003 Generate the original palette and board themes, replace the favicon, migrate stored theme ids, and check contrast for text, buttons and coordinates.
- [ ] 2.4 OA-001 Confirm the cburnett licence on Wikimedia Commons (blocked from this environment) and decide whether to also credit CC BY-SA 3.0.

## 3. Bots
- [x] 3.1 OA-004 Replace the roster with 43 invented characters, remove the copied portraits, roster records and engine-level references, and add the deterministic portrait generator with a check mode.
- [x] 3.2 OA-005 Define the strength ladder from engine controls, use it for raw engine levels and the novice policy, and show medals in place of crowns.
- [x] 3.3 OA-006 Resolve retired bot ids to the nearest current bot, keep stored names, refuse malformed ids, and test each case.

## 4. Copy and captures
- [x] 4.1 OA-008 Remove other-site names and unavailable engine options from interface strings.
- [x] 4.2 OA-007 Remove the recording, frames, screenshot archive, Chrome reference session, design-studies archive and dossier copies; update the design and dossier generators and their checks.
- [x] 4.3 OA-008 Rewrite README, CONTEXT and docs in neutral language and add dated supersession notes to earlier changes.
- [ ] 4.4 OA-007 Founder decision: make the repository private or purge the removed files from history.
- [x] 4.5 OA-007 Founder decision: keep or remove `docs/verification/` screenshots of earlier builds and the two lesson screenshots in `docs/research/sources/`. 2026-10-08: the `docs/verification/` screenshots and recordings were removed and `design/check.py` keeps them out; the two lesson screenshots stay as the founder's research sources.

## 5. Delivery
- [x] 5.1 Run the full test suite, production build, design check, dossier check, portrait check and strict OpenSpec validation; record environment failures separately.
- [x] 5.2 Capture after-screenshots of the bot picker, a game board and the review panel at desktop and mobile widths.
