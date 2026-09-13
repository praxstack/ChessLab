# Learning

## Sub-features

Four-level course path, twelve original guided lessons with two legal board challenges each, six preserved starter lessons, library search/level/topic filters, next unfinished lesson, per-account saved steps and completion, promotion and mobile board controls.

## How to get to it (user POV)

Choose Learn in Main navigation. Follow the Learning path, choose Lesson library, or use the Starter lessons section. For the original six puzzle exercises, choose Puzzles → Starter exercises.

## Driving it with Playwright

Preserve the starter flow: open Your king comes first, submit Stay on e1 and pass, then Kxe2, capturing the rook. Open A rook left loose, submit e1d1, then d3e4. Confirm wrong answers do not complete and correct answers persist through reload.

Open Rooks travel in straight lines. Try a1a2 and verify the board and completion are unchanged. Capture a7 through board clicks, then continue to challenge two. Reload, return to Learn, choose Continue lesson and verify step two. Play h8h2 and check both-challenge completion plus preserved starter progress. Next lesson opens Bishops follow diagonals. Complete both bishop challenges and both knight challenges; verify the first course shows 3 / 3 complete.

Return to the library and filter promotion / Intermediate / Endgames; teaching keywords must find Promote with a plan. Open Promote with a plan. Use the board and promotion chooser for a8=Q. In the second challenge c8=Q must not advance; c8=R completes it. At 390px, verify the promotion controls, saved result, flip and lack of overflow. Clear the search, choose Advanced/Tactics, and complete both multi-move mating-net source lines. Verify every learner move and automatic reply, plus persisted final completion. Record the path, filtered library, completed lesson, mobile promotion and advanced result.

## Gotchas

The original six lesson IDs retain their original server answer route and completion. New lessons use a separate server-owned session with identity and revision; the old answer route cannot bypass required board challenges. Both challenges are required. A failed save rolls back completion and position together. Retries preserve existing credit and create a fresh identity. Advanced positions are attributed CC0 examples; the shown defensive line is not a claim of exhaustive optimal play. The complete vendor catalogue, learning outcomes and full branching conversational tutor remain unverified. Do not call this local collection full content parity.
