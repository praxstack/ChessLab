# Learning

## Sub-features

Wrong/right lesson answers, puzzle moves, completion persistence.

## How to get to it (user POV)

Choose Learn in Main navigation. For the original six puzzle exercises, choose Puzzles → Starter exercises.

## Driving it with Playwright

Open Your king comes first. Submit Stay on e1 and pass, then Kxe2, capturing the rook. Open A rook left loose, submit e1d1, then d3e4. Assert wrong answers do not complete and correct answers persist through reload.

## Gotchas

These checks cover the original starter collection. Full custom training has its own feature map; the full lesson curriculum and calibrated user puzzle ratings remain separate work.
