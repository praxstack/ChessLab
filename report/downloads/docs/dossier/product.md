## Update: 7 September 2026

The user subsequently authorized a platform-first build, starting with bot/coach play. Human multiplayer follows that stage; billing is last. The [current application chapter](application.md) records the implemented baseline. The original tutor vision below remains the longer-term objective.

## Historical record

## The experience we are trying to build

The user wants to play against an AI with selectable difficulty, inspect every move, and question the examiner repeatedly. “What if I moved this piece?” must lead to a real alternative. “What if the opponent refused the capture?” must allow a different reply. A question inside that alternative must remain connected to the right position. Returning to the actual game must feel effortless.

The full vision includes position snapshots, a persistent variation tree, natural-language questions at each node, visual explanations, branch comparison, adjustable sparring, and eventually personalized practice. This is a learning workspace built around a game the learner actually cares about.

{{PRODUCT_DEMO}}

## What the product should look like

The board is the main object. Beside it, show the current question and a short explanation with a “Show the sequence” action. Keep a compact move tree below or beside the board. Label the actual game clearly. Always expose “Back to my game” and “Return to this position.” The learner should not need to understand a graph data structure to explore a line.

Reveal complexity gradually. Start with the learner's move and the immediate consequence. Offer more detail about defenders, candidate moves and alternate replies only when requested. Use text, arrows and highlighting together. Color alone must never encode correctness.

On a small screen, keep the board and current question together, then put branches in an expandable panel. Provide keyboard moves and text descriptions. Do not require dragging pieces or interpreting an evaluation bar to understand the explanation.

## First target customer

My proposed starting segment is **adult online rapid players around 800–1600 who already review completed games but struggle to understand an engine explanation**. This is a hypothesis. Rating bands vary between platforms and are not interchangeable with FIDE titles.

Their job is: “Help me understand the mistake I just made, so I recognize the same idea in my next game.” Their current alternatives are a free analysis board, a platform review, asking a stronger player, a coach, or a video explanation. ChessLab must earn an additional step in that routine.

Coaches and clubs are useful early recruiting partners and reviewers. A separate classroom product is not necessary to learn from them. Absolute beginners who still need piece-movement instruction and advanced tournament players with specialized preparation needs are less focused first audiences.

## The first useful build

| Step | Learner action | Observable result |
| --- | --- | --- |
| Bring a game | Import a completed PGN | The original moves are preserved and replay correctly |
| Choose a moment | Select the move that confused them | The board, history and question stay aligned |
| Predict | State what they expected to happen | Their misconception is recorded before the explanation |
| Inspect | Replay a supported capture or defensive sequence | The whole exchange, including recaptures, is visible |
| Challenge | Try a different move for either side | A legal branch appears without changing the original game |
| Go deeper | Explore another alternative inside that branch | Parent, anchor and sibling lines remain accessible |
| Return | Go back to the anchor or actual game | The learner resumes exactly where intended |
| Check learning | Solve a related position later | Understanding is tested beyond recognizing the explanation |

The existing draft starts with deterministic capture/defense explanations and manually explored questions. It does **not** promise unrestricted conversational coaching in that first prototype. This is a real reduction from the full vision and must remain visible in any demo.

## From prototype to a complete first release

A prototype can test a narrow interaction with a small legal position corpus. A usable first release needs reliable import, persistence, export, failed-save recovery, responsive controls, understandable limits, and evidence-linked answers for its advertised scope. Broader question handling should expand only when unsupported claims can be detected or explicitly declined.

In-product AI games then bring the play → inspect → resume loop into one place. Human-like play is a separate capability from lowering an engine's strength. Learner memory, delayed retries, shareable studies, and coach collaboration should follow observed repeated use.

## How learning should be measured

Record the learner's prediction, ask for an explanation in their own words, and test an unseen related position after a delay. Compare with their existing review workflow, accounting for difficulty and ordering. Report correct answers and misunderstandings, not only ratings of helpfulness.

A transfer test needs a chess educator and real learners. No such experiment has run here. The supplied learning-products note describes observational associations between study activities and rating improvement. Those associations do not establish that ChessLab will cause improvement, or improve attention outside chess.

## What I would defer

Rated multiplayer, a social feed, an opening marketplace, three native clients, voice personalities, large model training, school administration, and a generalized tutoring platform all add work before the central lesson has been tested. They are future possibilities, not requirements for this first learning experiment.
