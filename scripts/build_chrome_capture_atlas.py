#!/usr/bin/env python3
"""Build a static HTML index for the captured ChessLab evidence set."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse


ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$")
NUMBERED_RE = re.compile(r"^(\d+)-(.+)\.png$", re.IGNORECASE)
CHESSLAB_RE = re.compile(r"^chesslab-.+\.png$", re.IGNORECASE)

GROUPS = (
    ("coach", "Coach", 1, 17, "https://www.chess.com/play/coach?source=play_root"),
    ("puzzles", "Puzzles", 18, 30, "https://www.chess.com/puzzles"),
    ("bots", "Bots", 31, 39, "https://www.chess.com/play/computer"),
    ("review", "Review", 40, 46, "https://www.chess.com/analysis"),
)

STYLE = r"""
:root {
  color-scheme: dark;
  --ink: #e8f1ff;
  --muted: #92a7c6;
  --faint: #617796;
  --bg: #07111f;
  --panel: #0d1a2d;
  --panel-2: #11233b;
  --line: rgba(155, 190, 235, .17);
  --blue: #54a9ff;
  --cyan: #6be4f2;
  --green: #73e0b1;
  --amber: #ffca75;
  --red: #ff8e99;
  --shadow: 0 22px 70px rgba(0, 0, 0, .25);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(circle at 78% -10%, rgba(45, 128, 212, .25), transparent 34rem),
    radial-gradient(circle at 5% 40%, rgba(15, 71, 135, .18), transparent 28rem),
    var(--bg);
  color: var(--ink);
  font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
  line-height: 1.5;
}
a { color: var(--cyan); text-decoration: none; }
a:hover { color: white; }
a:focus-visible, button:focus-visible, audio:focus-visible { outline: 2px solid var(--amber); outline-offset: 4px; }
.shell { display: grid; grid-template-columns: 250px minmax(0, 1fr); min-height: 100vh; }
.rail {
  position: sticky; top: 0; height: 100vh; padding: 28px 20px;
  border-right: 1px solid var(--line); background: rgba(5, 13, 25, .76); backdrop-filter: blur(18px);
}
.mark { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 800; letter-spacing: .08em; font-size: .74rem; }
.mark-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 22px var(--cyan); }
.rail p { margin: 24px 0 14px; color: var(--faint); font-size: .73rem; text-transform: uppercase; letter-spacing: .16em; }
.nav { display: grid; gap: 5px; }
.nav a { display: flex; justify-content: space-between; gap: 12px; padding: 9px 10px; border-radius: 8px; color: var(--muted); font-size: .9rem; }
.nav a:hover { background: rgba(84, 169, 255, .1); color: var(--ink); }
.nav small { color: var(--faint); font-variant-numeric: tabular-nums; }
.rail-foot { position: absolute; bottom: 28px; left: 20px; right: 20px; color: var(--faint); font-size: .75rem; }
.main { width: min(1500px, 100%); padding: 32px clamp(20px, 4vw, 64px) 80px; }
.hero { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, .6fr); gap: 30px; align-items: end; padding: 38px 0 34px; }
.eyebrow { margin: 0 0 14px; color: var(--cyan); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; }
h1 { max-width: 800px; margin: 0; font-size: clamp(2.5rem, 6vw, 5.8rem); line-height: .98; letter-spacing: -.065em; }
.dek { max-width: 700px; margin: 22px 0 0; color: var(--muted); font-size: 1.03rem; }
.hero-note { border-left: 2px solid var(--blue); padding: 3px 0 3px 18px; color: var(--muted); font-size: .9rem; }
.hero-note strong { display: block; color: var(--ink); font-size: 1.05rem; }
.status-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 8px 0 60px; }
.status { min-height: 98px; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: linear-gradient(145deg, rgba(21, 48, 80, .7), rgba(11, 24, 42, .8)); box-shadow: var(--shadow); }
.status .value { display: block; margin-bottom: 8px; color: var(--cyan); font-size: 1.65rem; font-weight: 800; line-height: 1; }
.status .label { color: var(--muted); font-size: .78rem; }
.status.warn { border-color: rgba(255, 202, 117, .45); }
.status.warn .value { color: var(--amber); font-size: 1rem; line-height: 1.25; }
.status.open .value { color: var(--red); font-size: 1rem; line-height: 1.25; }
.section { scroll-margin-top: 24px; margin-top: 58px; }
.section-head { display: flex; justify-content: space-between; gap: 18px; align-items: end; margin-bottom: 17px; border-bottom: 1px solid var(--line); padding-bottom: 14px; }
.section-kicker { color: var(--blue); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; }
h2 { margin: 3px 0 0; font-size: clamp(1.55rem, 3vw, 2.35rem); letter-spacing: -.04em; }
.section-head p { max-width: 520px; margin: 0; color: var(--muted); font-size: .84rem; text-align: right; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 15px; }
.card { overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: rgba(13, 26, 45, .88); box-shadow: 0 12px 40px rgba(0, 0, 0, .13); }
.card:hover { border-color: rgba(107, 228, 242, .55); transform: translateY(-2px); transition: transform .18s ease, border-color .18s ease; }
.shot { display: block; position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: #07101d; border-bottom: 1px solid var(--line); }
.shot img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; }
.shot-label { position: absolute; left: 10px; top: 10px; padding: 4px 7px; border: 1px solid rgba(255,255,255,.16); border-radius: 5px; background: rgba(3, 12, 24, .82); color: var(--cyan); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .68rem; }
.card-body { padding: 14px 15px 15px; }
.card-title { margin: 0; font-size: .98rem; line-height: 1.25; }
.meta { display: flex; flex-wrap: wrap; gap: 7px 12px; margin-top: 11px; color: var(--faint); font-size: .72rem; }
.meta a { color: var(--muted); }
.meta a:hover { color: var(--cyan); }
.chip { display: inline-block; padding: 3px 6px; border-radius: 4px; background: rgba(84, 169, 255, .1); color: var(--blue); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .66rem; letter-spacing: .03em; }
.chip.green { background: rgba(115, 224, 177, .1); color: var(--green); }
.chip.red { background: rgba(255, 142, 153, .1); color: var(--red); }
.chip.amber { background: rgba(255, 202, 117, .1); color: var(--amber); }
.audio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.audio-card { min-width: 0; padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: rgba(13, 26, 45, .86); }
.audio-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.audio-title { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .78rem; }
.audio-card audio { width: 100%; height: 34px; margin: 14px 0 7px; }
.transcript { margin: 8px 0 0; color: var(--ink); font-size: .9rem; }
.transcript-note { margin: 8px 0 0; color: var(--muted); font-size: .74rem; }
.audio-intro, .separation { margin: 0 0 17px; color: var(--muted); font-size: .9rem; }
.separation { padding: 13px 15px; border-left: 2px solid var(--amber); background: rgba(255, 202, 117, .06); }
.empty { padding: 24px; border: 1px dashed var(--line); border-radius: 10px; color: var(--muted); }
@media (max-width: 900px) {
  .shell { display: block; }
  .rail { position: relative; height: auto; padding: 18px 20px; border-right: 0; border-bottom: 1px solid var(--line); }
  .rail p { margin: 18px 0 8px; }
  .nav { display: flex; flex-wrap: wrap; }
  .nav a { padding: 6px 8px; }
  .rail-foot { display: none; }
  .hero { grid-template-columns: 1fr; padding-top: 24px; }
  .hero-note { max-width: 600px; }
}
@media (max-width: 620px) {
  .main { padding-inline: 15px; }
  .status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .status { min-height: 84px; padding: 12px; }
  .status .value { font-size: 1.3rem; }
  .section-head { display: block; }
  .section-head p { margin-top: 8px; text-align: left; }
  .grid, .audio-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .card:hover { transform: none; transition: none; }
}
"""


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def rel_url(path: Path, output: Path) -> str:
    relative = Path(os.path.relpath(path, output.parent)).as_posix()
    # /tmp is a symlink on macOS; fall back to a direct file URL when a relative
    # link would traverse a different physical root than the source file.
    if output.parent.exists() and Path(output.parent, relative).exists():
        return relative
    return path.resolve().as_uri()


def safe_external_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return value


def timestamp_from_text(text: str) -> str | None:
    first = text.splitlines()[0].strip() if text.splitlines() else ""
    return first if ISO_RE.match(first) else None


def explicit_browser_url(text: str) -> str | None:
    match = re.search(r"Browser tab:.*?URL:\s*[\"']([^\"']+)", text, re.IGNORECASE)
    return safe_external_url(match.group(1)) if match else None


def human_title(stem: str) -> str:
    stem = re.sub(r"^\d+-", "", stem)
    return re.sub(r"\s+", " ", stem.replace("-", " ").replace("_", " ")).strip().title()


def group_for(number: int) -> tuple[str, str, str] | None:
    for slug, label, start, end, url in GROUPS:
        if start <= number <= end:
            return slug, label, url
    if number >= 47:
        return "online", "Online", "https://www.chess.com/play/online"
    return None


def load_json(path: Path, fallback: object) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def load_audio(source: Path) -> tuple[list[dict], dict[str, dict]]:
    audio_dir = source / "audio"
    primary = load_json(audio_dir / "transcripts.json", {})
    additional = load_json(audio_dir / "additional.json", {})
    provenance = load_json(audio_dir / "provenance.json", [])
    by_name: dict[str, dict] = {}
    for item in primary.get("files", []) if isinstance(primary, dict) else []:
        if isinstance(item, dict) and item.get("filename"):
            by_name[str(item["filename"])] = {**item, "accepted": bool(item.get("transcript"))}
    for item in additional.get("files", []) if isinstance(additional, dict) else []:
        if isinstance(item, dict) and item.get("filename"):
            accepted = bool(item.get("transcript")) and item.get("kind") != "sound_effect"
            by_name[str(item["filename"])] = {**by_name.get(str(item["filename"]), {}), **item, "accepted": accepted}
    for item in provenance if isinstance(provenance, list) else []:
        if isinstance(item, dict) and item.get("file"):
            name = str(item["file"])
            by_name[name] = {**by_name.get(name, {}), "source": item.get("source"), "observedAt": item.get("observedAt")}
    sources_path = audio_dir / "sources.jsonl"
    try:
        for line in sources_path.read_text(encoding="utf-8").splitlines():
            item = json.loads(line)
            if isinstance(item, dict) and item.get("file"):
                name = str(item["file"])
                by_name[name] = {**by_name.get(name, {}), "source": item.get("url", by_name.get(name, {}).get("source")), "capturedAt": item.get("capturedAt", by_name.get(name, {}).get("capturedAt"))}
    except (OSError, json.JSONDecodeError):
        pass
    files = []
    for path in sorted(audio_dir.glob("*.mp3"), key=lambda p: p.name.lower()):
        files.append({"path": path, **by_name.get(path.name, {})})
    return files, by_name


def card_html(item: dict, source: Path, output: Path) -> str:
    path: Path = item["path"]
    number = item.get("number")
    stamp = item.get("timestamp")
    title = item.get("title", human_title(path.stem))
    txt = item.get("txt")
    url = item.get("url")
    link_label = item.get("url_label", "Reference entry point")
    chips = item.get("chips", [])
    chip_html = "".join(f'<span class="chip {esc(c.get("tone", ""))}">{esc(c["label"])}</span>' if isinstance(c, dict) else f'<span class="chip">{esc(c)}</span>' for c in chips)
    source_link = f'<a href="{esc(rel_url(txt, output))}">Source TXT</a>' if txt else ""
    url_link = f'<a href="{esc(url)}" target="_blank" rel="noreferrer">{esc(link_label)}</a>' if url else ""
    stamp_html = f'<time datetime="{esc(stamp)}">{esc(stamp)}</time>' if stamp else '<span>Capture time unavailable</span>'
    number_label = f"{int(number):02d}" if number is not None else "FIX"
    return f'''<article class="card">
  <a class="shot" href="{esc(rel_url(path, output))}" target="_blank" rel="noreferrer">
    <img loading="lazy" src="{esc(rel_url(path, output))}" alt="{esc(title)} screenshot">
    <span class="shot-label">{esc(number_label)}</span>
  </a>
  <div class="card-body">
    <h3 class="card-title">{esc(title)}</h3>
    <div class="meta">{chip_html}<span>{stamp_html}</span></div>
    <div class="meta">{source_link}{url_link}</div>
  </div>
</article>'''


def audio_html(item: dict, source: Path, output: Path) -> str:
    path: Path = item["path"]
    accepted = bool(item.get("accepted"))
    transcript = item.get("transcript")
    kind = item.get("kind")
    confidence = item.get("confidence")
    duration = item.get("durationSeconds")
    observed = item.get("capturedAt") or item.get("observedAt")
    source_url = safe_external_url(item.get("source"))
    source_link = f'<a href="{esc(source_url)}" target="_blank" rel="noreferrer">Public source</a>' if source_url else ""
    if accepted:
        transcript_html = f'<p class="transcript">“{esc(transcript)}”</p>'
        note = f'Accepted speech transcript · {esc(confidence or "confidence not recorded")}'
        if item.get("orthographyCorrections"):
            note += " · chess spelling editorialized"
    elif kind == "sound_effect":
        transcript_html = '<p class="transcript-note">Sound effect · no accepted speech transcript</p>'
        note = "Raw ASR withheld; source metadata identifies a sound effect."
    else:
        transcript_html = '<p class="transcript-note">No accepted transcript recorded.</p>'
        note = "Transcript metadata unavailable."
    duration_text = f"{float(duration):.1f}s" if isinstance(duration, (int, float)) else "duration unknown"
    observed_text = f" · observed {esc(observed)}" if observed else ""
    return f'''<article class="audio-card">
  <div class="audio-top"><span class="audio-title">{esc(path.name)}</span><span class="chip {'green' if accepted else 'amber'}">{('speech' if accepted else 'audio')}</span></div>
  <audio controls preload="none" src="{esc(rel_url(path, output))}"></audio>
  <div class="meta"><span>{esc(duration_text)}</span><span>{esc(note)}{observed_text}</span></div>
  {transcript_html}
  <div class="meta">{source_link}</div>
</article>'''


def build(source: Path, output: Path) -> tuple[str, dict[str, int]]:
    numbered: list[dict] = []
    for path in sorted(source.glob("*.png"), key=lambda p: (int(NUMBERED_RE.match(p.name).group(1)) if NUMBERED_RE.match(p.name) else 10_000, p.name.lower())):
        match = NUMBERED_RE.match(path.name)
        if not match:
            continue
        number = int(match.group(1))
        group = group_for(number)
        if not group:
            continue
        txt = path.with_suffix(".txt")
        text = txt.read_text(encoding="utf-8", errors="replace") if txt.exists() else ""
        numbered.append({
            "path": path,
            "number": number,
            "txt": txt if txt.exists() else None,
            "timestamp": timestamp_from_text(text),
            "title": human_title(path.stem),
            "url": explicit_browser_url(text) or group[2],
            "url_label": "Captured page URL" if explicit_browser_url(text) else "Reference entry point",
            "group": group[0],
            "chips": ([{"label": "capture", "tone": ""}] if txt.exists() else [{"label": "image only", "tone": "amber"}]),
        })

    fixes: list[dict] = []
    proof = {
        "chesslab-puzzle-auth-fixed.png": [("puzzle-auth-green.txt", "green proof", "green")],
        "chesslab-puzzle-login-interruption.png": [("puzzle-auth-red.txt", "red proof", "red")],
        "chesslab-next-puzzle.png": [("puzzle-next-red.txt", "follow-up note", "amber")],
    }
    for path in sorted(source.glob("chesslab-*.png"), key=lambda p: p.name.lower()):
        chips = []
        chips.append({"label": "ChessLab capture", "tone": ""})
        links = []
        for filename, label, tone in proof.get(path.name, []):
            note = source / filename
            if note.exists():
                links.append((note, label, tone))
                chips.append({"label": label, "tone": tone})
        fixes.append({"path": path, "title": human_title(path.stem), "timestamp": None, "txt": None, "url": None, "chips": chips, "proof": links})

    audio, _ = load_audio(source)
    by_group = {slug: [item for item in numbered if item["group"] == slug] for slug, *_ in GROUPS}
    if any(item["group"] == "online" for item in numbered):
        by_group["online"] = [item for item in numbered if item["group"] == "online"]
    nav = []
    for slug, label, *_ in GROUPS:
        if by_group.get(slug):
            nav.append((slug, label, len(by_group[slug])))
    if by_group.get("online"):
        nav.append(("online", "Online", len(by_group["online"])))
    nav.extend([("fixes", "ChessLab fixes", len(fixes)), ("audio", "Audio", len(audio))])

    stats = {
        "numbered": len(numbered),
        "txt": sum(1 for item in numbered if item["txt"]),
        "fixes": len(fixes),
        "audio": len(audio),
        "accepted": sum(1 for item in audio if item.get("accepted")),
    }

    nav_html = "".join(f'<a href="#{esc(slug)}">{esc(label)} <small>{count:02d}</small></a>' for slug, label, count in nav)
    sections = []
    section_copy = {
        "coach": ("01—17", "Coach behavior, hints, takebacks and the review handoff."),
        "puzzles": ("18—30", "Puzzle entry, completion, next-puzzle action and retry."),
        "bots": ("31—39", "Play-mode choice, bot roster, clocks, assistance and resignation."),
        "review": ("40—46", "Review controls and the observed blunder explanation flow."),
        "online": ("47+", "Unrated online setup and an auto-aborted match; no agent move was submitted."),
    }
    for slug, label, count in nav:
        if slug in {"fixes", "audio"}:
            continue
        kicker, copy = section_copy[slug]
        cards = "".join(card_html(item, source, output) for item in by_group[slug])
        sections.append(f'''<section class="section" id="{esc(slug)}">
  <div class="section-head"><div><div class="section-kicker">{esc(kicker)} · {count:02d} captures</div><h2>{esc(label)}</h2></div><p>{esc(copy)}</p></div>
  <div class="grid">{cards}</div>
</section>''')

    fix_cards = []
    for item in fixes:
        card = card_html(item, source, output)
        if item.get("proof"):
            links = " · ".join(f'<a href="{esc(rel_url(note, output))}">{esc(label)}</a>' for note, label, _ in item["proof"])
            card = card.replace('</div>\n</article>', f'<div class="meta">Proof note: {links}</div>\n  </div>\n</article>')
        fix_cards.append(card)
    sections.append(f'''<section class="section" id="fixes">
  <div class="section-head"><div><div class="section-kicker">Local evidence · {len(fixes):02d} screenshots</div><h2>ChessLab fixes</h2></div><p>Separate local-app evidence. These screenshots do not establish reference-product behavior or parity.</p></div>
  <p class="separation">Authentication and puzzle continuation checks are linked as red/green proof notes where the source directory contains them.</p>
  <div class="grid">{"".join(fix_cards) if fix_cards else '<div class="empty">No ChessLab fix screenshots found.</div>'}</div>
</section>''')

    audio_cards = "".join(audio_html(item, source, output) for item in audio)
    audio_links = []
    for filename, label in (("transcripts.md", "transcripts.md"), ("transcripts.json", "transcripts.json"), ("provenance.json", "provenance.json")):
        metadata_path = source / "audio" / filename
        if metadata_path.exists():
            audio_links.append(f'<a href="{esc(rel_url(metadata_path, output))}">{esc(label)}</a>')
    audio_link_text = " · ".join(audio_links)
    sections.append(f'''<section class="section" id="audio">
  <div class="section-head"><div><div class="section-kicker">Audio evidence · {stats["accepted"]:02d} accepted transcripts</div><h2>Audio</h2></div><p>Local playback controls for captured MP3s. Accepted speech transcripts are shown; sound-effect ASR is intentionally withheld.</p></div>
  <p class="audio-intro">Metadata: {audio_link_text}. Confidence is qualitative; token scores are not calibrated probabilities. Captured network files may be prefetched, so clip playback is not asserted unless separately verified.</p>
  <div class="audio-grid">{audio_cards if audio_cards else '<div class="empty">No MP3 files found.</div>'}</div>
</section>''')

    html_doc = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Navigable evidence atlas for the ChessLab Chrome capture session.">
  <title>ChessLab · Capture Atlas</title>
  <style>{STYLE}</style>
</head>
<body>
  <div class="shell">
    <aside class="rail">
      <a class="mark" href="#top"><span class="mark-dot"></span>CAPTURE ATLAS</a>
      <p>Evidence index</p>
      <nav class="nav" aria-label="Atlas sections">{nav_html}</nav>
      <div class="rail-foot">08 SEP 2026<br>Originals stay linked.</div>
    </aside>
    <main class="main" id="top">
      <header class="hero">
        <div>
          <p class="eyebrow">ChessLab / Chrome session / evidence surface</p>
          <h1>What the reference session actually shows.</h1>
          <p class="dek">A compact, navigable index of captured screens and audio. Open any original at full size, then follow its source TXT or provenance link.</p>
        </div>
        <div class="hero-note"><strong>Evidence, not a parity claim.</strong> Screens document observed reference behavior. The complete product mapping remains unfinished.</div>
      </header>
      <p class="separation">Recording gap: the first action recording ended at 00:29:36 UTC; the next recorder call returned at 03:06:13 UTC. This is a screenshot sequence with separate audio clips, not a continuous synchronized video. Online play: automatic approval review blocked the first coordinate move and Chess.com auto-aborted the match. No completed human game is claimed. <a href="{esc(rel_url(source / 'session-report.md', output))}">Read the complete session report</a>.</p>
      <div class="status-grid" aria-label="Session status">
        <div class="status"><span class="value">2</span><span class="label">reference games resigned</span></div>
        <div class="status"><span class="value">2</span><span class="label">puzzles solved</span></div>
        <div class="status warn"><span class="value">Coach warning</span><span class="label">Retry is unverified</span></div>
        <div class="status open"><span class="value">Unfinished</span><span class="label">full product parity</span></div>
      </div>
      {''.join(sections)}
    </main>
  </div>
</body>
</html>
'''
    return html_doc, stats


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a ChessLab Chrome capture atlas.")
    parser.add_argument("--source", type=Path, default=None, help="Capture directory (default: cwd/references/chrome-session-2026-09-08)")
    parser.add_argument("--output", type=Path, default=None, help="HTML output path (default: source/index.html)")
    parser.add_argument("--dry-run", action="store_true", help="Discover inputs and print counts without writing HTML")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    source = (args.source or (Path.cwd() / "references" / "chrome-session-2026-09-08")).expanduser()
    output = (args.output or (source / "index.html")).expanduser()
    if not source.is_dir():
        print(f"error: source directory not found: {source}", file=sys.stderr)
        return 2
    document, stats = build(source, output)
    print(f"source={source}")
    print(f"output={output}")
    print("discovered=" + ", ".join(f"{key}:{value}" for key, value in stats.items()))
    if args.dry_run:
        print("dry-run: no files written")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(document, encoding="utf-8")
    print(f"wrote={output} bytes={output.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
