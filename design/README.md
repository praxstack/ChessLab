# ChessLab concept gallery

Open `index.html` for 17 Grok Imagine concept screens and the video research. The gallery works offline. `video.html` summarizes the recorded session, and `findings.html` holds the evidence and limitations.

Rebuild with `python3 design/build.py`; verify with `python3 design/check.py` from the repository root. Building uses the existing Pandoc installation. No new packages are needed.

For a browser preview: `python3 -m http.server 8769 --bind 127.0.0.1 --directory design`. This server runs only while that process is alive. Opening `index.html` directly does not need a server.

The original recording remains on the Desktop unchanged. On 2026-10-08 the project adopted an original-asset policy for its hosted beta: the compressed recording, its stills, the 150 sampled frames, crops and contact sheets showed another product's interface, so they were removed from this folder. Earlier commits still contain them. `video/provenance.json` keeps the sizes, duration and hashes.

`scenarios.json`, the Markdown findings, review notes and generation prompts are source material. HTML is generated. The per-image provenance records the actual Imagine output path and tool receipt. Generated chess positions and UI text are not validated application behavior.

The follow-up frame study adds `frame-study.html`, `settings-study.html`, `screen-plan.html` and `frame-atlas.html`: written notes from 150 exact-time screenshots and 26 visible settings controls. See `video/study/sampling.json` for the extraction coverage; the screenshots themselves are no longer stored here.
