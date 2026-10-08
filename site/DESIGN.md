# Design: AskTheMove site

This file sets the visual system for the AskTheMove site: the landing page, the privacy notice, the beta terms and the 404 page. Read it before you change anything in `pages/` or `public/assets/app.css`. If a page needs something the system doesn't allow, change this file first.

## Personality

A patient coach sits next to you with a pencil and marks up your game in a lesson notebook.

The page is printed matter: a chess book's serif type and typewritten engine printouts. The coach writes over it, step by step, in blue ink and red pen.

It is chess at first glance: a board drawn like a book diagram, a score sheet in the margin, coordinates around the board and handwritten notation. It is teaching at second glance: every mark says something.

### Three voices

Each voice has its own typeface and colour. The product's whole idea is to turn the engine's voice into the coach's voice, so the page shows all three side by side.

| Voice | What it says | Face | Colour |
| --- | --- | --- | --- |
| The book | Headings, body copy, the form | Vollkorn (variable 400–900) | ink |
| The engine | Scores, depths, rules checks and lines, as a printout; also the printed labels of forms (the score sheet's headings, the note's step label) | Courier Prime 400 | graphite |
| The coach | Notes, circles, arrows, ticks, `??` | Kalam 400 / 700 | blue ink for explanations, red pen for mistakes and marking, graphite pencil for workings |

## References

- **Irving Chernev, *Logical Chess: Move by Move* (1957).** Every move of a game explained in plain words. This is the lesson's pacing: one move, one reason, then the next.
- **The paper score sheet.** Numbered rows with White and Black columns, moves written in pencil. Annotators add `??` in the margin and write variations in brackets. The walkthrough's move list is a score sheet, and the tried branch is written as a bracketed variation in blue.
- **Book diagrams from the Dover and Batsford era.** Dark squares are hatched, the frame is a double rule and the coordinates sit outside the frame. The board is drawn crisply this way, and the coach's marks go over it.
- **Rough Notation (roughnotation.com).** Its vocabulary of underline, circle, box, highlight, bracket and crossed-off, drawn in sequence as a group. We use the vocabulary, not the library: every stroke here is our own vanilla JS and SVG.
- **Bartosz Ciechanowski's explainers (ciechanow.ski).** Teaching on the page. One idea per figure, and the figure changes as the text explains it.
- **Josh Comeau's blog (joshwcomeau.com).** A warm teacher's voice and small, purposeful interactive figures. The research worker found this one.
- **Excalidraw (excalidraw.com).** A rough, hand-drawn diagram language that sits next to crisp UI without either one fighting the other.
- **Galleries.** Awwwards' "hand-drawn" tag is mostly icon kits. Lapa Ninja's illustration category (for example Marble, withmarble.com) leans towards children's education. Both are useful as a warning: hand-drawn tips into childish quickly. This page is for adults rated 800 to 1600.

## Layout: the lesson notebook

The page is one sheet of quad-ruled paper, with a red double margin rule down the left like an exercise book.

```
desktop (≥ 1080px)
| margin | main column (≤ 46rem)                  | side column (20rem)  |
|  96px  | printed text, figures, the form        | the coach's notes,   |
|  ‖red  |                                        | the score sheet      |

the lesson (the board walkthrough) spans both columns:
| margin | score sheet | board (crisp)       | coach's note, writing itself |
|        |             | Back · Next · Try another line                     |
```

- **Masthead.** The wordmark and one action ("Join the beta") over a heavy double rule, with nothing between them. The page is a single lesson, so the section links live in the footer.
- **Opening.** The h1 runs across both columns. The lede and the sign-up slip sit in the main column, and two coach notes sit in the side column. There is no card on the right and no split hero. The first thing below the form is the board.
- **The lesson** is the signature. The score sheet sits on the left, the board in the middle and the note on the right. The note writes itself while the pencil draws on the board.
- **Each section has its own shape.** "What a review leaves out" puts an engine printout next to the coach's questions. "How it works" is four steps joined by a pencil line in the margin. "Who it's for" is a two-column marking list. "Status" is a checklist the coach ticks off. The FAQ is questions with a hand-drawn plus. The page closes with "Homework".
- **Section heads have no eyebrows and no numbers in the margin.** Numbers appear only where order is real: the four steps of how it works, and move numbers.
- **On tablet (700–1079px)** the side notes flow under the main text. In the lesson, the board and the note stay side by side down to 700px, so the pencil and the writing are seen together; the controls and the score sheet go underneath.
- **On mobile (under 700px)** the margin rule moves to 12px from the edge. Content has 28px on the left and 16px on the right. Notes run inline. The lesson stacks as board, note, controls, then score sheet.

## Tokens

All colours are OKLCH custom properties on `:root` in `app.css`. Pages use the tokens and never use raw values.

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `oklch(98.4% 0.008 95)` (#fbfaf4) | page |
| `--paper-2` | `oklch(96.5% 0.014 88)` (#f7f3e9) | engine printouts |
| `--card` | `oklch(99.3% 0.004 95)` | form fields, light squares |
| `--grid` | `oklch(89% 0.035 235)` | quad ruling, at low alpha |
| `--margin` | `oklch(70% 0.12 15)` | the margin rule (decorative only, 2.7:1) |
| `--ink` | `oklch(23% 0.025 265)` (#171d29) | printed text, 16.2:1 on paper |
| `--ink-2` | `oklch(40% 0.02 265)` | secondary text, 8.8:1 |
| `--graphite` | `oklch(46% 0.006 270)` | pencil and engine text, 6.8:1 |
| `--graphite-2` | `oklch(62% 0.006 270)` | faint pencil marks only, never body text |
| `--red` | `oklch(54% 0.2 27)` (#c92324) | teacher's red pen, 5.4:1 |
| `--blue` | `oklch(44% 0.17 264)` (#1f48ae) | ballpoint blue, 7.7:1; primary button fill (white text 8.1:1) |
| `--highlight` | `oklch(91% 0.15 102)` | highlighter swipes (ink on it: 13:1) |
| `--hatch` | `oklch(62% 0.03 255)` | the hatching on dark squares |

The accent rules:

- **Red** means a mistake, a threat, or the teacher marking something (circles, `??`, ticks).
- **Blue** is the coach explaining, and the one primary action.
- **The highlighter** marks key words in headings and the last move on the board.
- No colour carries meaning alone. Every status has a word ("Works today", "In development", "Next"), and every mark on the board is also described in the note.

### Type scale

| Role | Face | Size | Line height |
| --- | --- | --- | --- |
| Hero (h1) | Vollkorn 800 | `clamp(3rem, 1.4rem + 5.4vw, 6rem)`, never above 6rem | 0.95 |
| Section (h2) | Vollkorn 750 | `clamp(2rem, 1.3rem + 2.5vw, 3.4rem)` | 1.04 |
| Sub-head (h3) | Vollkorn 650 | 1.375rem | 1.2 |
| Body | Vollkorn 400 | 1.125rem | 1.6, measure ≤ 64ch |
| Small | Vollkorn 400 | 0.9375rem | 1.5 |
| Coach note | Kalam 400 | 1.375rem, 1.0625rem minimum | 1.3 |
| Coach large | Kalam 700 | 1.75–2.25rem | 1.1 |
| Engine | Courier Prime 400 | 0.9375rem; labels 0.8125rem caps with +0.06em tracking | 1.45 |

- Vollkorn's oldstyle figures stay in prose. Notation and numbers in tables use `lnum tnum`.
- Headings are always upright. Kalam has a natural slant: that is handwriting, not italic emphasis, and it never sets a heading in the book's voice.

### Spacing

The spacing scale is in 4-point steps: `--s-1` 4px, `--s-2` 8px, `--s-3` 12px, `--s-4` 16px, `--s-5` 24px, `--s-6` 32px, `--s-7` 48px, `--s-8` 64px, `--s-9` 96px and `--s-10` 128px. Sections don't share one padding value: the lesson is tight, the problem section breathes, and the closing is generous.

## Motion language: the pen

Everything that moves is the coach drawing or writing. Nothing loops, bounces or floats.

| Gesture | How | Timing |
| --- | --- | --- |
| Stroke (arrow shaft, circle, underline, tick) | SVG path with `pathLength="1"`, `stroke-dashoffset` from 1 to 0, path jittered from a seeded random so it wobbles like a hand | about 1.1 ms per pixel of length, 260–1100 ms; `--ease-stroke: cubic-bezier(0.65, 0, 0.35, 1)` (easeInOutCubic), because a hand accelerates into a stroke and slows into its end |
| Pen lift | a pause between strokes | 160–260 ms |
| Arrowhead | two short strokes after the shaft | 140 ms each |
| Pencil tip | on the board only, a red-blue pencil, held right-handed, follows the stroke's end point (`getPointAtLength`), travels between strokes that follow closely, and lifts away when done | follows the stroke |
| Handwriting | each word is revealed left to right with `clip-path` | 34 ms per character, plus 90 ms after a full stop and 45 ms after a comma; a note outside the lesson takes at most about 2.5 s |
| Highlighter | one left-to-right swipe | 520 ms, ease-out |
| Pieces | glide with `transform` | 420 ms, `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` |
| Buttons | `scale(0.97)` on press; hover colour shifts only behind `(hover: hover) and (pointer: fine)` | 160 ms ease-out |

- **Triggers.** Each section draws once, when its top passes about 80% of the viewport. Within a section, one pen does the marks in document order, and a mark further down waits until it is on screen itself. The lesson autoplays once, when half the board is in view, and its hold between steps pauses on mouse hover, focus or a hidden tab.
- **Who is driving.** When the visitor clicks Next, Back or a move on the score sheet, the coach draws 1.4 times faster. Arrow keys show each step finished, because keyboard steps repeat quickly and should feel instant. Replay runs the lesson again from the start.
- **Pacing.** In each lesson step the pieces move, the title is written, and then each sentence is preceded by the stroke it explains. The coach then holds for about 3 seconds before the next step. Next, Back and the score-sheet moves are always available.
- **Reduced motion.** Every drawing and note is shown finished and there is no autoplay. Step changes are instant, and the pencil is hidden. If the setting changes while the page is open, every drawing in progress finishes at once.
- **At rest.** Every mark is in the HTML that the build writes. Without JavaScript, or before a section is reached, the page is complete. JavaScript hides a mark only just before it draws that mark.

## Components

- **Sign-up slip.** Form fields look like printed boxes on the page: a 1.5px ink border on a `--card` fill, at least 52px tall. Labels are always visible, set in Vollkorn. The primary button has a blue fill and paper text, and no hard offset shadow (that is a neobrutalist costume, not this world). The coach's arrow and note point to the email field.
- **Browser surfaces.** `::selection` is the highlighter. The caret and `accent-color` are blue ink. Focus is a 3px blue-ink outline that appears instantly.
- **Board.** Light squares use `--card`. Dark squares use `--hatch` diagonal hatching over a pale blue tint. The frame is a double ink rule, and Kalam graphite coordinates sit outside the frame. The cburnett pieces stay.
- **Marks on the board.** Arrows are red for a threat, blue for an idea and graphite for cover, with open, hand-drawn heads. Squares are circled. Covered escape squares get a pencil ×. `??` and `#` are written in red.
- **Engine printout.** Courier Prime on `--paper-2`, with a perforated top edge and a slight lift off the page.
- **Status mark.** A red tick for "Works today", a dashed graphite circle for "In development" and a blue arrow for "Next", each with its word.

## Anti-patterns (do not ship)

- **Chess.com's look:** green and cream boards, their piece sets, their move-quality icons ("brilliant" and so on).
- **The old page:** a dark "analysis room", a hero split with the headline on the left and a card on the right, stacked identical sections, mock UI cards with title bars.
- **Generic structure:** three-card feature grids, icon tiles, an eyebrow on every section, numbered labels to the left of section headings.
- **Childish sketch styling:** a wobbly border on every box, tape on everything, rainbow sticky notes, doodle people. The book is printed and crisp, and only the coach's marks are hand-drawn.
- **Marks that say nothing.** Every circle, arrow or underline points at a claim the text makes.
- **Long body copy in handwriting.** A coach note is about 60 words at most.
- **Calm-wellness softness:** gradients, blobs, glass, pastel pills. That belongs to Praxmodoro, and this site must never look like it.
- **Invented numbers or quotes.** Engine figures come only from `public/assets/demo-data.js`, which `npm test` verifies.
- **Em dashes in new copy, and strings of middle dots.** Write two sentences instead.
- **Dark mode.** This world is paper under a desk lamp, and the page is light by design. It sets `color-scheme: light` so form controls match.
- **Inline `style` or `script`.** The CSP forbids them. Positions come from `data-x` and `data-y` classes, and runtime styles are set through the CSSOM.
