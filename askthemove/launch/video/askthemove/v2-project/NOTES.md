# askthemove-demo: how this video was made

- **What it shows:** one real game (Maya, Black, mated in 7 after 5…Bxd1) taken through the real app: import, Stockfish review, the blunder card with its mate line, the variation lab (dxe5, +1.89, no mate), practice of her key moves, bots (Barnaby 1050), and the lessons, openings, endgames and vision pages. The AI coach is mentioned for invited beta players but not shown, because it needs an API key.
- **App:** ChessLab / AskTheMove `main` at `fe3d7c9` (Merge PR #26, 2026-10-11), run locally with its own Stockfish 18. Six clips recorded with Playwright at 1920x1080, 30 fps.
- **Tool:** motion-video skill from praxstack/claude-video-skills-for-people-who-feel-neglected-by-claude (`d5b8fd1`, PR #6), plus a `screen` block for recorded footage. Node 22.22, ffmpeg 6.1.1, headless Chromium. All free and offline.
- **Voice:** Kokoro `af_heart` at speed 1.0, baked into the MP4. Music: synthesized "calm" bed (music.py), mixed to -16 LUFS.
- **Length:** 2:10 (129.7 s), 1920x1080 at 30 fps, about 58 MB.
- **Style:** `paper` look, brand AskTheMove (mark AM). Vollkorn titles with lining figures (so 1 never reads as I in "Bxd1" or "1050"), Kalam hand-drawn notes, Courier Prime for notation.
- **Checks:** 95 stills, legibility 0 fails (smallest film text 28 px); the app's own interface text is reported apart via footage rects. QA 12/12: voice sync 23/23, no black, no freezes, no flicker, moving text 0 fails.
- **Re-render:** in the project root: `node <scripts>/capture.mjs --page source/index.html --width 1920 --height 1080 --fps 30 --out build/silent.mp4 --prime 0.25 --workers 4`, then `python3 <scripts>/music.py --project . --mood calm`, `python3 <scripts>/mix.py --project .`, `python3 <scripts>/qa.py --project .`.
- **Swap the voice:** `python edge_voice_swap.py en-IN-NeerjaNeural` on a laptop (needs `pip install edge-tts` and ffmpeg).
- **Limits:** the AI coach is not on screen (no API key in the recording, by design). Nothing else was cut.
