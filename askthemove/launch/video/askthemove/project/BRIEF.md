---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Every claim the coach makes comes with Stockfish evidence you can see."
destination: website
aspect: 1920x1080
language: en
audience: adult club and online players rated about 800 to 1600 who review their own games
length: 45-60s
angle: product demo from real app footage, marked up like a coach's lesson notebook
narration: no
---

## Intent

The actual product demo for AskTheMove (the app is still called ChessLab in the repo and in
the footage). It is cut from real screen recordings of the app, not mock screens. The owner
(Prax) asked for "the actual video", edited with HyperFrames. It should feel like the new
landing page: a coach's lesson notebook on paper, with the coach marking up the footage in red
pen and blue ink (circles, arrows, underlines drawn on with a stroke animation), like a teacher
marking up a lesson.

The video is silent. On-screen text carries the story and must be readable at phone size.

## Assets

- footage/01-sign-up.mp4: beta account sign-up (11.6 s). Optional; not used in this cut.
- footage/02-pgn-import.mp4: PGN import, flip board, autoplay to 7.Nd5# (34.1 s).
- footage/03-game-review.mp4: Stockfish 18 review, advantage graph, Philidor C41, key moves,
  evidence card for 5...Bxd1 (64.8 s). The review runs in real time from 5 to 50 s: speed it up.
- footage/04-variation-note.mp4: compare before move, try a variation (5...dxe5 6.Qxg4),
  position note, "Study saved." (49.1 s). Avoid 39-44 s (board top rank cut off).
- footage/05-bot-play.mp4: bot Barnaby, strength 1200, 10 min clock, six moves (59.0 s).
- Source of the footage: /mnt/project-files/launch/video/askthemove/footage/ (read only).
  Copies live in assets/footage/ only for rendering; they are not delivered with the project.
- Brand: the landing page at /home/claude/chesslab-site/site (commit f461366), its DESIGN.md
  and fonts (Vollkorn, Kalam, Courier Prime), exported to scratch and captured.

## Customizations

- Silent: no voice-over, no music, no SFX. Captions are designed on-screen text, not karaoke.
- Hand-drawn annotations over the footage, drawn on with a stroke animation.
- Zoom and pan into the parts of the screen that matter; cut dead time.
- End card "Ask the move. Join the beta." with `askthemove.online`, kept in one editable place
  (`compositions/frames/09-end-card.html`, the `END_CARD` block in the markup).

## Notes

- "ChessLab" must never appear: the sidebar wordmark (every clip), the import modal's text in
  02 ("A ChessLab study file", ".chesslab.json"), the page footer in 04. Crop or mask.
- Avoid 02's import toast ("with comments and variations"): the PGN has neither.
- Honest copy: the Claude tutor was off. No caption may call anything a Claude or AI
  explanation. The cards' wording is deterministic engine-evidence text. Allowed claims: full
  Stockfish 18 review with an advantage graph, Philidor C41, key moves, an evidence card with
  engine, time and depth, "compare before move", variations and position notes saved as a
  study, bot opponents with ratings and clocks. The end card may say a coach explains moves in
  plain words, grounded in that evidence, "in the beta". No pricing, rating promises or
  invented stats.
- The "!" badge on 5...Bxd1 is an app quirk; do not call the move brilliant.
- The domain is `askthemove.online`, registered on Cloudflare on 8 October 2026.
- auth status: signed out (expected); nothing here needs HeyGen.
