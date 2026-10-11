# AskTheMove demo video: HyperFrames project

Source for `../askthemove-demo.mp4` (1920x1080, 30 fps, H.264, silent, 58.8 s). The video is cut
from real screen recordings of the app and marked up like the landing page's lesson notebook.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | Root composition: fonts, colour tokens, shared CSS, the paper, and the nine frames on the timeline. |
| `compositions/frames/01-title.html` ... `09-end-card.html` | One sub-composition per frame: footage segments, camera, masks, the coach's marks and notes. |
| `compositions/frames/09-end-card.html` | The end card. All its text is in the `END_CARD` block in the markup. |
| `assets/notebook.js` | Shared helpers: hand-drawn stroke geometry (a port of the site's `ink.js`), camera poses, stroke drawing, handwriting. |
| `assets/vendor/gsap.min.js` | GSAP 3.14.2, vendored so the render needs no CDN. |
| `assets/fonts/` | Vollkorn, Kalam and Courier Prime, copied from the landing page. |
| `assets/brand/askthemove-mark.svg` | The site's favicon mark. |
| `BRIEF.md`, `STORYBOARD.md`, `frame.md` | The brief, the frame-by-frame plan with footage timings, and the visual system. |
| `hyperframes.json`, `package.json`, `meta.json` | HyperFrames project files (CLI pinned to 0.8.141). |

The footage and the renders are not included.

## Footage

The edit uses clips 02 to 05 from
`/mnt/project-files/launch/video/askthemove/footage/` (read only). Clip 01 (sign-up) is not used.
Copy them into `assets/footage/` before previewing or rendering:

```bash
mkdir -p assets/footage
cp /mnt/project-files/launch/video/askthemove/footage/0{2,3,4,5}-*.mp4 assets/footage/
```

Expected names: `02-pgn-import.mp4`, `03-game-review.mp4`, `04-variation-note.mp4`,
`05-bot-play.mp4`. Every segment's in and out points are in `STORYBOARD.md` and in the comments
above each `<video>`; if the clips are re-recorded, those times and the mark positions (source
pixels) must be re-checked.

## Re-render

Needs Node 22 or newer, ffmpeg, and a Chromium the HyperFrames CLI can find.

```bash
npx hyperframes@0.8.141 lint
npx hyperframes@0.8.141 snapshot --at 3.8,8,16,22.5,30,37,42,50,57   # spot-check frames
npx hyperframes@0.8.141 render --quality delivery --video-frame-format png --fps 30 \
  --output renders/askthemove-demo.mp4
```

`--video-frame-format png` keeps the UI text in the footage crisp. To preview and edit in the
studio: `npx hyperframes@0.8.141 preview`.

## Editing notes

- Change the end card in `compositions/frames/09-end-card.html` (`END_CARD` block).
  The URL is `askthemove.online`, the registered domain.
- Frame timing lives in two places: the frame's own `data-duration` and its host's
  `data-start` / `data-duration` in `index.html`. Frames overlap by 0.3 s (crossfade).
- The app is still called ChessLab in the recordings. The sidebar is masked on every stage
  (`.nb-mask--side`) and no camera pose shows it; clip 02's modal text is masked; clip 04 is
  never used after 38.4 s (its footer shows the old name). Check any new pose or segment for
  the old name before rendering.
- The app's "!" badge on 5...Bxd1 is a known quirk, covered by a clone patch (`.nb-patch` in
  `index.html`, with matching `<video>` copies in frames 04 and 05). Delete those blocks to
  show the footage untouched.
- Copy rules: the in-app tutor was off in the recording, so no on-screen line may call
  anything a Claude or AI explanation; 5...Bxd1 is never called brilliant; every number on
  screen comes from the footage.
