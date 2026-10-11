---
version: alpha
name: AskTheMove Lesson Notebook (video / frame layer)
description: >
  The frame-level system for the AskTheMove demo video. It is the landing page's design
  (site/DESIGN.md and public/assets/app.css on branch claude/beta-waitlist-site, commit
  f461366) carried to a 1920x1080 frame: one sheet of quad-ruled paper with a red double
  margin rule, printed matter in Vollkorn and Courier Prime, and a coach who marks it up
  in red pen and blue ink. The app footage is pasted in as a figure. The first draft of
  this file came from `build-frame` (cobalt-grid preset, seeded from a capture of the
  site); it was then rewritten by hand to match DESIGN.md, which wins on every token.
unit: the frame, 1920x1080 at 30 fps
principle: printed matter is crisp; only the coach's marks are hand-drawn; every mark says something

colors:
  paper: "#fbfaf4"        # oklch(98.4% 0.008 95), the page
  paper-2: "#f7f3e9"      # oklch(96.5% 0.014 88), engine printouts (unused in this cut)
  card: "#fdfdfa"         # oklch(99.3% 0.004 95)
  grid: "oklch(86% 0.045 235 / 0.4)"   # quad ruling, 26px cells
  margin: "oklch(70% 0.12 15)"         # red double margin rule (decorative only)
  margin-soft: "oklch(70% 0.12 15 / 0.45)"
  ink: "#171d29"          # oklch(23% 0.025 265), printed text and rules
  ink-2: "oklch(40% 0.02 265)"         # printed labels
  graphite: "oklch(46% 0.006 270)"     # label counters
  graphite-2: "oklch(62% 0.006 270)"   # dashed label rule
  red: "#c92324"          # oklch(54% 0.2 27), the red pen: circles, arrows, ticks
  blue: "#1f48ae"         # oklch(44% 0.17 264), the blue ink: the coach's notes
  blue-deep: "#11338a"    # oklch(36% 0.15 264), the URL
  highlight: "oklch(91% 0.15 102)"     # highlighter swipe, multiply
  shadow: "oklch(23% 0.025 265 / 0.22)"

typography:
  # The book: printed headings
  title:      { fontFamily: "Vollkorn", px: 192, weight: 800, lineHeight: 0.95, tracking: "-0.03em" }
  end-title:  { fontFamily: "Vollkorn", px: 184, weight: 800, lineHeight: 0.95, tracking: "-0.03em" }
  cta:        { fontFamily: "Vollkorn", px: 118, weight: 750, lineHeight: 1, tracking: "-0.02em" }
  url:        { fontFamily: "Vollkorn", px: 80, weight: 700, color: "blue-deep" }
  wordmark:   { fontFamily: "Vollkorn", px: 54, weight: 800, tracking: "-0.01em" }
  # The engine: printed labels
  step-label: { fontFamily: "Courier Prime", px: 40, weight: 400, tracking: "0.04em", upper: true, color: "ink-2", counter: "graphite" }
  # The coach: handwriting
  note:       { fontFamily: "Kalam", px: 56, weight: 700, lineHeight: 1.12, color: "blue" }
  title-note: { fontFamily: "Kalam", px: 66, weight: 700, lineHeight: 1.16, color: "blue" }
  end-note:   { fontFamily: "Kalam", px: 54, weight: 700, lineHeight: 1.14, color: "blue" }

spacing:
  grid-cell: "26px"
  margin-rule-x: "92px"      # 2px margin + 1.5px soft, 6px apart
  content-left: "132px"
  figure: "x 132, y 64, 1176 x 952"
  note-column: "x 1356, y 64, 520 wide"
  note-gap: "40px"
  label-gap: "36px"

components:
  paper:
    description: "Quad ruling 26px over paper, red double margin rule at x 92. Under every frame."
  figure:
    description: >
      The app footage, pasted in as a book figure: overflow hidden, a 2px ink rule,
      a 5px paper gap, a 1.5px outer ink rule (the double rule of a book diagram), and a
      soft lift shadow. Inside it a 1920x1080 stage carries the footage, the masks and the
      marks, and moves as a camera (x, y, scale; transform-origin 0 0).
  step-label:
    description: >
      "1 / 7   IMPORT A GAME": the site's note label (count, then label text) in Courier
      Prime caps over a dashed graphite rule. Order is real here, so the count is allowed.
  note:
    description: >
      Kalam 700 in blue ink, written word by word (clip reveal, ~26 ms per character, a
      beat after punctuation). One idea per line of thought; notes stack down the column.
  marks:
    description: >
      Red pen on the footage: a loop that overruns its start (ring), a slightly bowed
      underline, arrows with open two-stroke heads, a teacher's tick. Blue ink for
      receipts and the end card's underline and arrow. Geometry is the site's ink.js,
      seeded. Strokes are drawn with pathLength 1 and dashoffset 1 to 0, ease in-out,
      ~1.1 ms per canvas px, with short pen lifts. Pen width ~7px on screen at any zoom.
  masthead:
    description: "Title and end card only: mark + wordmark over a heavy double rule."
  highlighter:
    description: "End card only: one butt-capped swipe under 'beta', multiply."

motion:
  rules:
    - "Everything that moves is the coach drawing or writing, or the camera framing the footage."
    - "Nothing loops, bounces or floats. Printed text is set, never written: on the title it is on the page from the first frame (so the first frame works as a thumbnail); elsewhere it sets in with a short rise or fade."
    - "Frames crossfade over 0.3 s; the outgoing note column fades out in the same window."
    - "Camera moves are 0.55 to 0.8 s, power2.inOut; cuts inside a frame are hard cuts on the footage."

anti-patterns:
  - "No em dashes or strings of middle dots in new copy."
  - "No dark mode, no chess.com look, no tape, no rainbow sticky notes, no wobbly boxes."
  - "No 'brilliant'. No invented numbers: every figure on screen comes from the footage."
  - "No caption calls anything a Claude or AI explanation (the tutor was off in the recording)."
---

# AskTheMove notebook frame

The video is one lesson on one sheet of paper. Each frame keeps the same page: the ruling,
the margin rule, the figure on the left and the coach's note column on the right. Only the
footage inside the figure and the coach's writing change.

## Layout

```
| margin |  figure (app footage, 1176 x 952)          |  note column (520)      |
|  x 92  |  x 132 .. 1308, y 64 .. 1016                |  x 1356 .. 1876         |
|  ‖red  |  camera: zoom and pan inside the figure     |  1 / 7  STEP LABEL      |
|        |  red pen marks drawn on the footage         |  Kalam notes, blue ink  |
```

Title and end card drop the figure: masthead at the top, the book's display type, and a
coach's note in blue ink, as on the landing page's opening.

## Legibility

Notes are 56px Kalam 700, so at a quarter of the frame (a phone in portrait looking at a
landscape video) they are still 14px. The camera zooms the app (1.3x to 2.3x) so the UI text
being discussed is at least ~25px on the frame. Step labels (40px, 10px at a quarter) are secondary.

## Masks

The app is still called ChessLab in the footage. The sidebar (wordmark) is masked on every
stage and no camera pose ever shows x < 290. Clip 02's import modal text is masked and out of
shot. Clip 04's footer (after 38.5 s) is never used. The app's "!" badge on 5...Bxd1 is covered
by a clone patch (see `index.html`, `.nb-patch`).
