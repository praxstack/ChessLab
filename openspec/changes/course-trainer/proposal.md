# Course trainer

## Why

On 6 November 2026 the founder named Chessly (chessly.com) as AskTheMove's main competitor and Chessable as the second, and asked for one-to-one parity and better, without removing anything the app has. Chessly, Chessable and Chess.com Courses all sell the same loop underneath: a course of chapters, each a set of lines the learner drills from one side with a note per move, idea quizzes, a shuffle across chapters, and a schedule that brings lines back later. AskTheMove has the ends of that loop (bots, engine review, puzzles, coach, studies) and not the middle. Map and sprint plan: https://claude.ai/artifact/XsAJN2qtiXPm2tP5Zs5eid.

## What changes

This change adds the rules and storage for that middle, with no user interface. It follows the browser-first architecture (`browser-first-app`): plain modules under `shared/`, IndexedDB collections, local routes answered in the browser.

- `shared/course.js`: the course shape (course, chapter, line, quiz), its limits and validation. Every line is replayed through the rules library; notes and drawings are bound to a ply; quiz answers stay hidden in the learner view.
- `shared/trainer-schedule.js`: one spaced-repetition card per line. Ladder mode keeps Chessable's familiar 8 steps (4 hours to 6 months) but a miss drops one step, not to the bottom, and two misses in a row restart. Adaptive mode is FSRS-shaped (stability and difficulty per card).
- `shared/drill.js`: a drill session plays one line: the learner plays their side, the app answers with the book reply, the hint ladder is Review Practice's (square, then move), the second miss shows the move. The result (pass, hinted, miss) feeds the schedule.
- `shared/course-import.js`: PGN (one or many games, variations, comments, `[%cal]`/`[%csl]` drawings) to course, one chapter per game and one line per leaf; a Lichess study link to its public PGN export; course back to PGN, one game per line, so a course made here moves to any other trainer.
- IndexedDB collections `courses`, `course_cards`, `drill_sessions`; backup format version 2, which still restores version 1 files.
- Local routes under `/api/courses`: list, create, import PGN, import Lichess study, read, export PGN, delete, schedule mode, review queue, shuffle, start a drill, move, hint, answer a quiz.

## Non-goals

- Any screen. The Courses tab follows in the next change, on the UI overhaul's token names.
- Course content. The content pipeline (CC0 openings, public-domain books, Stockfish-checked lines, Claude-written notes) is a separate change.
- Copying any Chessly, Chessable or Chess.com course text, lines or video. We replicate the system, never their courses. Every course carries a source and licence.
- The repertoire bot ("play your course against Maia") and the post-game "where you left the book" check. Separate change.

## Constraints

- $0, browser only, no key in the bundle.
- The rules library owns legality; the engine's verdict on a line is optional data on the line.
- Existing games, studies, lessons, puzzles and their progress are untouched; the backup still restores old files.
