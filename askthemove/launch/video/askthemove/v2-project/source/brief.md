# AskTheMove product demo (16:9, about 2 to 2.5 minutes)

## Topic
How AskTheMove works, shown on the real app: a learner pastes a game she lost, Stockfish 18 reviews every move,
the key move is graded a blunder with evidence (mate in 2 for White), she compares the engine's choice, tries
her own line, practises the key positions with hints, plays a rated bot, and sees the other training areas.

## Audience
Reviewers of a startup or accelerator application who asked for "a demo that shows us how the product works",
limited to 3 minutes and 100 MB. They have not seen the app before and may watch without sound, so the
captions carry every claim.

## Format
general, 16:9 (1920x1080) at 30 fps, about 2 to 2.5 minutes (vstate min 1.5, max 3.0). Chapters: AskTheMove,
Import, Review, The blunder, Your line, Practice, Play, More, Join. Narrated with Kokoro af_heart (offline).

## Persistent subject
The app window itself: a new `screen` block that plays real screen recordings of the app (ChessLab main
fe3d7c9, run locally in hosted "Private beta" mode with Stockfish 18), carried from the first shot to the last
app shot. Its camera pushes in on whatever the line talks about, and the coach's red pen circles and underlines
the thing on screen, in the landing page's hand-drawn style. Beside it, one text card per shot says the point in
large type.

## Style
AskTheMove's own identity from `site/DESIGN.md` (the lesson notebook): paper ground #fbfaf4, ink #171d29, red
pen #c92324 for mistakes and marking, blue ballpoint #1f48ae for the coach explaining, highlighter yellow.
Vollkorn for the book's voice (headings and text cards), Kalam for the coach's handwritten notes on the footage,
Courier Prime for engine facts. Brand "AskTheMove", mark "AM", tag "Product demo". Music: calm, ducked.

## Facts
Every claim is shown in the footage (recorded on 11 October 2026 from ChessLab main fe3d7c9):
- The game: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5# 1-0, Black is "maya".
- Review: "Stockfish 18 · 1s per position · 13/13 moves saved"; opening banner C41 Philidor Defense; grades
  Best, Good, Inaccuracy, Blunder, Checkmate; key moves 3…Bg4 Inaccuracy, 4…g6 Inaccuracy, 5…Bxd1 Blunder,
  7.Nd5# Checkmate.
- Evidence card for 5…Bxd1: "Bxd1 captures a queen. Sample line: Bxf7+ → Ke7 → Nd5#", M2, engine receipt
  with Stockfish 18, 1000 ms and the depth.
- Compare before move: candidate +1.84 dxe5 Qxg4 Nc6 d3 Nf6 Qf3; Variation lab after 6.Qxg4: +1.89, depth 16, no mate.
- Practice key moves as Black: 3 positions. 3…Bg4: Nf6 found (+0.34); 4…g6: Nc6 found; 5…Bxd1: Bxd1 again is
  reviewed ("Revisit your idea. The search finds mate in 2 for White"), hint "Look at the pawn on d6", then dxe5
  found (+1.84). Results: 2 first try, 1 solved with practice.
- Bots: 43 bots in the roster (plus 2 engines); Barnaby, rated 1050, 10 min clock, "Retired lighthouse keeper".
- Other areas in the sidebar: Puzzles, Learn (0/12 guided lessons), Openings (3,810 named lines), Endgames (24
  original practice positions), Vision. The local puzzle set is empty in this container, so puzzles are not claimed.
- The AI coach ("Explain why") is built and merged but needs a server key and an invite code; this container
  has no key, so it is not shown; the end card mentions it only as available to invited beta players.
- Brand: AskTheMove, askthemove.online (the beta sign-up page).

## Output
1920x1080, 30 fps, H.264 + AAC, -16 LUFS, under 3 minutes and under 100 MB. Deliver to
/mnt/project-files/launch/video/askthemove/ as askthemove-demo-v2.mp4 (the first, silent demo stays).
