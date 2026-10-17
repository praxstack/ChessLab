# Tutor loop

## Why

Review Practice lets a learner retry a flagged move with two hints, but it stops at the move. The BRD's tutor requirements (FR-068 misunderstanding model, FR-069 teach-back, FR-070 spaced related retry, FR-099 mastery rule) are not built. A learner can find the right move without knowing why, and nothing brings the same idea back later to check that it stuck.

The plan doc "AskTheMove Tutor Loop" (https://claude.ai/code/artifact/0d418ce8-af03-4cf0-8e7d-1f3ff4acfaff, 17 October 2026) describes the loop. It reuses the learner loop from praxstack/kai-mori-fanout-sh (`public/learn/src/engine/loop.js` and `recall.js`).

## What changes

One flagged move from a reviewed game goes through these steps:

1. Board: the position before the learner's mistake, answer hidden.
2. You try: the learner plays a move. The saved engine line or a fresh bounded search decides it, as Review Practice does today.
3. What your move missed: a wrong try gets a mistake tag and one short reason, then the next hint. After two misses the app teaches the move.
4. Say why: the learner picks why the right move works from three answers built from engine facts. They may then type the reason in their own words, and Claude grades it against the same facts.
5. Replay: the engine line plays out on the board with chalk-drawn arrows and a short label at each step.
6. Play it out: the learner plays the position on against a bot.
7. New puzzle, same idea: a puzzle from the catalogue with the same mistake tag.
8. Recall later: the tag comes back after 1, 3 and 6 sessions until the learner solves a fresh puzzle on it unaided in a later session.

Decisions by the founder on 17 October 2026:

- The loop lives inside Game Review, in the existing Practice panel, not in a new tab. A "due today" card on Home lists recall that is due.
- "Say why" uses both forms: three answers first, then an optional typed reason graded by Claude.
- Each explanation draws chalk-style lines on the board: when the app teaches a move, when it shows the say-why answer, and during the replay.
- Work starts now with the loop rules, before the hosted server is live.

## Increments

1. Loop and recall rules in `server/tutor-loop.mjs`, pure functions with tests. No screens. (This change's first PR.)
2. Mistake tagger for the four starter tags: missed capture, missed check, missed mate, left a piece undefended.
3. Try, feedback and say why inside Review Practice, with chalk lines.
4. Replay and play it out.
5. Same-tag puzzles and recall, with the "due today" card on Home. Needs the puzzle catalogue imported on the server.
6. Optional narrated replay. The founder listens to one voice sample before anything is batch-rendered.

## Non-goals

- A separate Tutor tab.
- Calendar-day scheduling. Spacing counts sessions, so a missed week is not debt.
- Letting Claude's grade of a typed reason change recall credit. Claude may misgrade, so the grade is feedback only.

## Cost

Claude is called only for the optional typed reason and the coach line on a wrong try. Each call counts toward the existing 50-a-day invite-code cap (`COACH_AI_MAX_PER_DAY`). The three-answer pick, tags, chalk lines and recall use no model.

## Open questions

- How many related puzzles each tag needs in the catalogue before recall can avoid repeats.
- Whether the learning effect shows up in testers' later games. Unproven.
