# Local Vision delivery

Vision now offers Coordinates, Moves and mixed 30-second rounds, a three-second countdown, White/Black/random perspective and optional board coordinates. Moves require moving the lone piece; coordinates require selecting the square. Mouse, touch and keyboard input work through the existing board. The server protects scores, deadlines and revisions; local accounts retain recent rounds and bests for identical settings.

[Full video proof](proof/local-user-flow.webm) · [Coordinate round](proof/70-vision-coordinates.png) · [Completed result](proof/71-vision-complete.png) · [Moves](proof/72-vision-moves.png) · [Mobile](proof/73-vision-mobile.png) · [History](proof/74-vision-history.png).

## Verification

- 102 application tests pass, preserving all previous tests. Snapshot and puzzle importer checks pass.
- Independent chessops geometry agrees with chess.js for all 640 combinations of five pieces, 64 squares and both orientations. Generated prompts are also checked.
- The real HTTP suite covers malformed/early/late answers, concurrent revisions, foreign and guest denial, restart, all 18 setting combinations, quit exclusion and unchanged game/puzzle/lesson records.
- All 103 browser flows pass. The prior 96-flow prefix is byte-identical. New flows cover a complete timed round, wrong/right coordinates, keyboard board input, reload recovery, black-side dragging, mobile touch, mixed mode, stale-action recovery, cancelled sign-in and private account boundaries.
- The production entrypoint doctor passes on the final build. Strict validation passes all 20 OpenSpec changes.
- Proof contains 75 screenshots and a 157.8-second video (15,287,501 bytes) with synthetic accounts. Root inspected desktop results, move prompts and mobile captures. Recording samples show completed scoring, countdown, invalid notation and the ensuing correct move/score. Mobile sections occupy a narrow viewport inside the fixed video canvas.

The first browser run found ambiguous selector labels. Explicit accessible names fixed the product; the full harness was rerun. Sign-in now preserves the selected Vision settings. Failed attempt logs remain alongside the final checks; the first recording is retained only in ignored scratch. No protected assertion was removed or skipped.

## Boundaries

This is local functional proof, not complete Chess.com parity or measured learning effectiveness. The reference setup and one live queen-move round were inspected; other piece distributions and proprietary scoring/statistics are not asserted equivalent. The local exercise supports five non-pawn pieces. Pawn/promotion exercises, guest scoring and public rankings are outside this increment. Full conversational tutoring, remaining curriculum/platform mappings and later multiplayer/billing remain unfinished.

The installed Astra Team runtime validator still rejects this session (verified version 0.153.4). No independent or delegated review ran. Required setup/check commands still fail on the existing installed unslop skill hash mismatch. Neither gate was modified or waived. No new dependency, engine or model was installed for Vision.

The manifest binds source, build, packages, datasets and proof. Its own hash and subsequent installation receipt remain outside the attested content. Baseline/rollback source: f11e5fc0b3503e33503f9e15edcbf82773aa0fe4. Local installation follows a consistent account snapshot and preserves all existing tables.
