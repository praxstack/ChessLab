---
format: 1920x1080
duration: 58.8s
message: "Every claim the coach makes comes with Stockfish evidence you can see."
arc: Demo Loop (question, import, review, evidence, your own line, study, play, CTA)
audience: adult club and online players rated about 800 to 1600 who review their own games
mode: autonomous
music: none
narration: none
---

# AskTheMove demo: storyboard

A silent demo cut from real screen recordings, marked up like a coach's lesson notebook. The
story follows one real game (Légal's trap from Black's side): import it, let Stockfish 18 review
it, find the key move 5...Bxd1, read the evidence (mate in 2), try the engine's alternative as
your own variation, save a note, then play a bot. Times are absolute (root timeline); each frame
crossfades in over the last 0.3 s of the one before.

Footage source: `/mnt/project-files/launch/video/askthemove/footage/` (copied to
`assets/footage/` only for rendering). Clip 01 (sign-up) is not used.

## Frame 1 — Title

- scene: Masthead, "Ask the move why" with "why" circled in red, blue note
- duration: 4.5s
- poster: 3.8s
- transition_in: cut
- status: animated
- voiceover: none
- src: compositions/frames/01-title.html
- blueprint: compose
- time: 0.0 to 4.5

0.0 masthead and title already on the page (the first frame works as a thumbnail). 0.45 red
ring around "why". About 1.1 the note writes itself:
"Your games, reviewed move by move, with Stockfish evidence you can check."

## Frame 2 — Import a game

- scene: PGN pasted in the import modal, underlined; the game plays to mate; king circled
- duration: 8.4s
- poster: 7.8s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/02-import.html
- blueprint: compose
- footage: 02 4.45-7.45 (1x), 02 18.0-31.0 (5x), 02 31.0-33.8 (1x)
- time: 4.2 to 12.6

Label "1 / 7 Import a game". Note "Paste in a game you lost." Red underline under the move
list. Cut past the import toast to the board; the game runs at 5x to 7.Nd5#. Red ring on the
mated king. Note "Mated in seven moves. Why?"

## Frame 3 — Game review

- scene: Review panel at 2x; the opening banner circled; the advantage graph fills and leaps
- duration: 7.6s
- poster: 6.6s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/03-review.html
- blueprint: compose
- footage: 03 3.7-4.7 (1x), 03 4.7-48.7 (10x), 03 48.7-50.9 (1x)
- time: 12.3 to 19.9

Label "2 / 7 Game review". Notes "Stockfish 18 reviews every move.", "It names the opening:
Philidor Defense, C41." (red ring on the C41 banner), camera pans to the graph, "And graphs who
was ahead." Review complete: red ring on the graph's leap at the end of the game.

## Frame 4 — Key moves

- scene: Key moves list, 5...Bxd1 circled; over to the board, the bishop on d1 circled
- duration: 5.6s
- poster: 5.0s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/04-key-move.html
- blueprint: compose
- footage: 03 53.3-55.5 (1x), 03 55.5-59.41 (1.15x)
- time: 19.6 to 25.2

Label "3 / 7 Key moves". Note "The key moves are flagged." Red ring on the "5... Bxd1 Mate
sequence" row. Click; camera to the board; red ring on Black's bishop on d1. Note "5…Bxd1 grabs
White's queen." The app's "!" badge on the move is covered (clone patch).

## Frame 5 — Evidence

- scene: The evidence card at 2.2x: M2 circled, the engine receipt underlined; the mate drawn on the board
- duration: 6.6s
- poster: 6.2s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/05-evidence.html
- blueprint: compose
- footage: 03 59.4-63.0 (1x), 03 63.0-64.75 (1x), 04 0.0-1.25 (1x)
- time: 24.9 to 31.5

Label "4 / 7 Evidence". Red ring on "M2" (White's score). Note "But Stockfish sees mate in 2 for
White." Blue underline under "Stockfish 18 · 1000 ms · depth 20". Note "Engine, time and depth
are on the card." Camera to the board; red arrows c4 to f7 and c3 to d5. Note "The line: 6.Bxf7+
Ke7 7.Nd5#"

## Frame 6 — Your own line

- scene: Compare before move: the engine's arrow, e5 circled; the variation played; its card, +1.86 circled
- duration: 8.5s
- poster: 8.0s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/06-your-line.html
- blueprint: compose
- footage: 04 1.6-4.6 (1x), 04 4.6-15.6 (4.4x), 04 21.0-23.4 (0.8x)
- time: 31.2 to 39.7

Label "5 / 7 Your own line". Red ring on the knight on e5 (the engine's candidate arrow points
at it). Note "Before the move, Stockfish wanted 5…dxe5." Try a variation; 5...dxe5 6.Qxg4 at
4.4x. Note "So try that line yourself." Cut to the Variation lab card; red ring on +1.86. Note
"Stockfish checks it too: +1.86, not mate in 2."

## Frame 7 — Study notes

- scene: A position note typed in; saved; the "Study saved." toast ticked
- duration: 5.4s
- poster: 4.6s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/07-study.html
- blueprint: compose
- footage: 04 28.0-35.5 (3x), 04 35.5-38.4 (1x)
- time: 39.4 to 44.8

Label "6 / 7 Study notes". Note "Write down what you learned." Camera to the toast; red tick.
Note "Saved as a study." Clip 04 after 38.5 s (footer with the old name, cut-off board) is never
used.

## Frame 8 — Play a bot

- scene: Bot roster, Barnaby circled; strength 1200 and 10 min circled; the game with clocks
- duration: 8.6s
- poster: 7.0s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/08-play.html
- blueprint: compose
- footage: 05 9.2-11.4 (1x), 05 14.6-19.0 (1.6x), 05 20.75-48.125 (7.5x)
- time: 44.5 to 53.1

Label "7 / 7 Play a bot". Note "Then play a bot. Each one has a rating." Red ring on Barnaby's
tile. Options: red rings on "1200" and "10 min". Note "Barnaby, set to 1200, on a 10-minute
clock." The game at 7.5x; red ring on Barnaby's clock.

## Frame 9 — End card

- scene: "Ask the move. Join the beta." with the URL and the coach's note
- duration: 6.0s
- poster: 5.5s
- transition_in: crossfade
- status: animated
- voiceover: none
- src: compositions/frames/09-end-card.html
- blueprint: compose
- time: 52.8 to 58.8

Masthead; "Ask the move."; "Join the beta." with a highlighter swipe on "beta";
"askthemove.online" underlined in blue; note "In the beta, a coach explains each move in plain
words, grounded in this evidence." and a blue arrow to the call to action. All end-card text is
in the `END_CARD` block of `compositions/frames/09-end-card.html`.

## Video direction

- Silent. On-screen text carries the story: one step label and two or three handwritten notes
  per frame, 56px Kalam (14px at quarter size). No karaoke caption band: the notes are the
  captions, and the figure keeps the full lower part of the frame for the app.
- The coach's marks are the motion: rings, underlines, arrows and a tick, drawn stroke by
  stroke in red pen (blue ink for receipts and the end card). Nothing loops or floats.
- The camera zooms 1.3x to 2.3x into the part of the app being discussed and never shows the
  sidebar (x < 290), where the old product name is.
- Speed-ups: review 10x, autoplay 5x, variation 4.4x, typing 3x, bot game 7.5x. The card in
  frame 6 is held at 0.8x (static UI).
- Honest copy: the in-app coach (Claude tutor) was off; nothing is called an AI or Claude
  explanation. 5...Bxd1 is never called brilliant. Every number on screen comes from the footage.
