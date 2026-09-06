# ChessLab concept gallery

Open `index.html` for 17 Grok Imagine concept screens and the video research. The gallery works offline. Open `video.html` for the compressed recording, and `findings.html` for the evidence and limitations.

Rebuild with `python3 design/build.py`; verify with `python3 design/check.py` from the repository root. Building uses the existing Pandoc installation; verification uses FFprobe. No new packages are needed.

For a browser preview: `python3 -m http.server 8769 --bind 127.0.0.1 --directory design`. This server runs only while that process is alive. Opening `index.html` directly does not need a server.

The original recording remains on the Desktop unchanged. The smaller MP4 is a lossy viewing copy with audio retained. See `video/provenance.json` for sizes, duration and hashes.

`scenarios.json`, the Markdown findings, review notes and generation prompts are source material. HTML is generated. The per-image provenance records the actual Imagine output path and tool receipt. Generated chess positions and UI text are not validated application behavior.

The follow-up frame study adds `frame-study.html`, `settings-study.html`, `screen-plan.html` and `frame-atlas.html`: 150 exact-time screenshots, 19 contact sheets and 26 visible settings controls. See `video/study/sampling.json` for the extraction coverage.
