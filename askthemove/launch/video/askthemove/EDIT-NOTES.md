# AskTheMove demo: edit notes

- Video: `askthemove-demo.mp4`, 1920x1080, 30 fps, H.264, no audio track, 58.8 s (1764 frames), 8,718,229 bytes
  (8.3 MiB; the shared folder adds a provenance (C2PA) record to the file, the frames are the
  render's exactly).
- Poster: `askthemove-demo-poster.png` (1280x720, frame 853, at 28.43 s: the evidence card with "M2" circled and the engine line underlined).
- Contact sheet: `askthemove-demo-contact.png` (one frame every 2 s, timestamps burned in).
- Source project: `project/` (HyperFrames 0.8.141; footage and renders not included; see
  `project/README.md` to re-render).
- Footage: `footage/02` to `footage/05`, read only. `footage/01-sign-up.mp4` is not used.

The video is silent. All words on screen are listed below. The look is the landing page's
lesson notebook (quad-ruled paper, red margin rule, Vollkorn, Courier Prime and Kalam), with
the app footage pasted in as a figure and the coach's marks drawn on it stroke by stroke.

## Timeline

Times are in the final video. Each frame crossfades in over the last 0.3 s of the one before.
Footage times are in the source clip.

| Time | Frame | Footage used (source time, speed) | Marks drawn |
| --- | --- | --- | --- |
| 0.0-4.5 | 1. Title | none | red ring around "why" |
| 4.2-12.6 | 2. Import a game | 02 4.45-7.45 (1x); 02 18.0-31.0 (5x); 02 31.0-33.8 (1x) | red underline under the pasted move list; red ring on the mated king (e7) |
| 12.3-19.9 | 3. Game review | 03 3.7-4.7 (1x); 03 4.7-48.7 (10x); 03 48.7-50.9 (1x) | red ring on the C41 Philidor Defense banner; red ring on the graph's last leap |
| 19.6-25.2 | 4. Key moves | 03 53.3-55.5 (1x); 03 55.5-59.41 (1.15x) | red ring on the "5... Bxd1 Mate sequence" row; red ring on Black's bishop on d1 |
| 24.9-31.5 | 5. Evidence | 03 59.4-63.0 (1x); 03 63.0-64.75 (1x); 04 0.0-1.25 (1x) | red ring on "M2"; blue underline under "Stockfish 18 · 1000 ms · depth 20"; red arrows c4 to f7 and c3 to d5 |
| 31.2-39.7 | 6. Your own line | 04 1.6-4.6 (1x); 04 4.6-15.6 (4.4x); 04 21.0-23.4 (0.8x) | red ring on the knight on e5 (the engine's candidate arrow d6-e5); red ring on "+1.86" |
| 39.4-44.8 | 7. Study notes | 04 28.0-35.5 (3x); 04 35.5-38.4 (1x) | red tick beside the "Study saved." toast |
| 44.5-53.1 | 8. Play a bot | 05 9.2-11.4 (1x); 05 14.6-19.0 (1.6x); 05 20.75-48.125 (7.5x) | red rings on Barnaby's tile, "1200", "10 min", and Barnaby's clock |
| 52.8-58.8 | 9. End card | none | highlighter on "beta"; blue underline under the URL; blue arrow from the note to "Join the beta." |

Cut on purpose: 02's import toast ("with comments and variations", 7.6-12.5 s); 03's real-time
review (sped up 10x); 04 after 38.4 s (top rank cut off, footer with the old name); 02's
textarea placeholder before the paste lands (4.40 s), which shows a sample PGN with a comment
and a variation.

## Every line of text added on screen

Frame 1, Title (0.0-4.5)
- AskTheMove (masthead wordmark, with the site's mark)
- Ask the move why
- Your games, reviewed move by move, with Stockfish evidence you can check.

Frame 2 (4.2-12.6)
- 1 / 7 IMPORT A GAME
- Paste in a game you lost.
- Mated in seven moves. Why?

Frame 3 (12.3-19.9)
- 2 / 7 GAME REVIEW
- Stockfish 18 reviews every move.
- It names the opening: Philidor Defense, C41.
- And graphs who was ahead.

Frame 4 (19.6-25.2)
- 3 / 7 KEY MOVES
- The key moves are flagged.
- 5…Bxd1 grabs White’s queen.

Frame 5 (24.9-31.5)
- 4 / 7 EVIDENCE
- But Stockfish sees mate in 2 for White.
- Engine, time and depth are on the card.
- The line: 6.Bxf7+ Ke7 7.Nd5#

Frame 6 (31.2-39.7)
- 5 / 7 YOUR OWN LINE
- Before the move, Stockfish wanted 5…dxe5.
- So try that line yourself.
- Stockfish checks it too: +1.86, not mate in 2.

Frame 7 (39.4-44.8)
- 6 / 7 STUDY NOTES
- Write down what you learned.
- Saved as a study.

Frame 8 (44.5-53.1)
- 7 / 7 PLAY A BOT
- Then play a bot. Each one has a rating.
- Barnaby, set to 1200, on a 10-minute clock.

Frame 9, End card (52.8-58.8)
- AskTheMove (masthead wordmark, with the site's mark)
- Ask the move.
- Join the beta.
- askthemove.online
- In the beta, a coach explains each move in plain words, grounded in this evidence.

The end-card text lives in one place: the `END_CARD` block in
`project/compositions/frames/09-end-card.html`. The URL is `askthemove.online`, the registered domain.

### Where each claim is shown

- Stockfish 18 reviews every move: "Reviewing n / 13" counting up in frame 3; the panel
  footnote "Stockfish 18 · 1s per position · 13/13 moves saved" in frame 4.
- Philidor Defense, C41: the opening banner in frame 3. Advantage graph: frame 3.
- Key moves: the Key moves list in frame 4.
- 5...Bxd1 takes the queen: the board and the card's "Bxd1 captures a queen" (frames 4 and 5).
- Mate in 2 for White, engine, time and depth: the evidence card ("M2 White's score",
  "Stockfish 18 · 1000 ms · depth 20", "Sample line: Bxf7+ → Ke7 → Nd5#") in frame 5.
- Stockfish wanted 5...dxe5: after "Compare before move", the app's candidate arrow d6-e5 on the
  board (frame 6). The candidate row "+1.87 dxe5 ..." is in the panel but out of shot.
- +1.86 for the variation: the Variation lab card ("+1.86 White's score", "Stockfish 18 · 1000
  ms · depth 17") in frame 6.
- Saved as a study: the app's "Study saved." toast in frame 7.
- Bots with ratings, strength 1200, 10-minute clock: roster, game options and the game's clocks
  in frame 8.
- Nothing on screen calls anything a Claude or AI explanation (the tutor was off). 5...Bxd1 is
  not called brilliant. No pricing, rating promises or invented numbers; every number on screen
  is from the footage. The end card's coach line is scoped to "in the beta".

## Where "ChessLab" was removed

- Sidebar wordmark (every clip, source x 20-262, y 30-100): every camera pose keeps the
  visible area at source x 290 or more, so the sidebar is never in shot; a solid mask
  (#1e2330, source x 0-272, full height) also sits over it on every footage stage as a backstop.
- Clip 02 import modal: the paragraph naming the study format (source x 585-1337, y 238-310)
  and the file chooser label ".pgn or .chesslab.json" (x 585-865, y 414-452) are masked
  (#212937) and also above the shot (the modal pose starts at y 452). The masks switch off
  when the shot changes to the board.
- Clip 04 page footer (after about 38.5 s): never used; the edit leaves clip 04 at 38.4 s.
- Checked in the final render on the contact sheet (every 2 s), on a second sheet (every
  0.5 s) and on full-size frames at every cut, crossfade, camera move and mask edge: the name
  does not appear anywhere.

## Other changes to the footage

- The app's green "!" badge on 5...Bxd1 (a known quirk) is covered in frames 4 and 5 by a
  clone patch: a 42 px disc that shows the same footage taken from clean spots with the same
  colours (the page band to the right, the equally highlighted empty g4 square, the c1 square).
  To show the footage untouched, delete the `.nb-patch` blocks (see `project/README.md`).
- Speed changes as listed in the timeline. The Variation lab card (frame 6) is slowed to 0.8x;
  it is static apart from the pointer.

## Verification

- `hyperframes lint`: 0 errors, 0 warnings.
- Rendered with `hyperframes render --quality delivery --video-frame-format png --fps 30`
  (4 min 26 s). The renderer warns that the recordings have sparse keyframes (one every
  8.33 s); it pulls frames with ffmpeg, and an ffmpeg `freezedetect` pass over the figure
  found still spans only where the app itself is still (finished board, finished review,
  static cards), none inside the sped-up segments.
- ffprobe: H.264 High, yuv420p, 1920x1080, 30/1 fps, 1764 frames, 58.8 s, one video stream
  and no audio stream. The delivered copy decodes to the same frames as the render (md5 of
  the decoded video matches).
- Re-rendered on 8 October 2026 for the end-card URL `askthemove.online`, with the same
  command and HyperFrames 0.8.141 (11 min 15 s here, software GPU). `hyperframes check`
  passed with no findings on the end card. Compared with the previous render, frames 0-1590
  (up to 53.0 s) decode identically; in frames 1591-1763 (the end card) the URL and its
  underline change and the rest differs only by encoder noise. The underline still spans
  the text (2 px before it and 10 px past it; 3 and 9 px before). The poster (frame 853) is unchanged;
  the contact sheet's 54, 56 and 58 s tiles were replaced.
- Looked at: the contact sheet (one frame every 2 s at 480 px, a quarter of the frame), a
  second sheet with one frame every 0.5 s, and full-size frames at every cut, every
  crossfade, the three camera moves (22.25-22.8 s, 28.5-29.1 s, 41.85-42.45 s), the import
  modal (with its dimmed backdrop brightened to read it) and the badge patch (23.5 s, 30.5 s).
- No "ChessLab" anywhere. No clipped text and no text running into other text; the
  coach's notes (56 px, 14 px at a quarter size) and step labels (40 px, 10 px) read at a
  quarter size. Each note was checked against the footage it sits beside (see "Where each
  claim is shown").
- Fixed after the first full render: the title is now on screen from the first frame (it
  used to fade in from blank paper); the rings on the C41 banner, the graph's last leap,
  the 5...Bxd1 row and "+1.86", and the tick beside "Study saved.", were moved so the pen no
  longer crosses the app's own text; step labels went from 34 px to 40 px.

## Not verified

- There is no OCR tool here, so the "ChessLab" check is by eye, on frames sampled every
  0.5 s plus every cut, crossfade, camera move and mask edge. Between samples the check rests
  on the geometry: the sidebar mask is on every footage stage, and the camera never frames
  source x < 290.
- Playback was checked only by decoding with ffmpeg. Not tested in a browser, QuickTime or
  any social player, and the HyperFrames studio preview was not opened.
- Speed-ups (review 10x, autoplay 5x, variation 4.4x, typing 3x, bot game 7.5x) are not
  labelled on screen. No caption says how long a review takes; the real review is about
  45 s for 13 moves at 1 s per position.
- The badge patch can leave 1-2 px differences that show only when zoomed 5-10x.
- App colours can differ slightly from the recording (the browser and ffmpeg decode the
  recordings with small colour differences).
- `askthemove.online` is registered, but nothing is served there yet; the address on the end
  card was not opened.
- The fonts were copied from the landing page; their licence files were not checked here.
