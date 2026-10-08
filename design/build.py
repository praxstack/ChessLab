"""Build the static concept gallery with Python and the installed Pandoc."""
from pathlib import Path
import hashlib
import html
import json
import subprocess

ROOT = Path(__file__).resolve().parent
items = json.loads((ROOT / 'scenarios.json').read_text())
esc = html.escape
phases = list(dict.fromkeys(x['phase'] for x in items))


def page(name, title, body, active='gallery'):
    nav = [('gallery', 'index.html', 'Mockups'), ('video', 'video.html', 'Recording'),
           ('frames', 'frame-study.html', 'Frame study'), ('findings', 'findings.html', 'What we learned'), ('sources', 'sources.html', 'Sources & limits')]
    links = ''.join(f'<a href="{url}"'+(' aria-current="page"' if key == active else '')+f'>{label}</a>' for key, url, label in nav)
    text = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} · ChessLab concepts</title><link rel="stylesheet" href="gallery.css"></head><body>
<a class="skip" href="#main">Skip to content</a><header><a class="brand" href="index.html">♞ ChessLab <span>DESIGN STUDIES</span></a><nav aria-label="Main navigation">{links}</nav></header>
<main id="main">{body}</main><footer><span>07 September 2026 · Grok Imagine × Gemini video research</span><span>Concept images. No playable chess application.</span></footer><script src="gallery.js"></script></body></html>'''
    (ROOT / name).write_text(text)


def md(path):
    return subprocess.run(['pandoc', '--from=gfm-raw_html', '--to=html5', '--wrap=none', str(ROOT/path)], check=True, capture_output=True, text=True).stdout


cards = ''
for phase in phases:
    cards += f'<section class="phase" id="{phase.lower()}"><div class="section-title"><h2>{phase}</h2><span>{sum(x["phase"] == phase for x in items)} scenarios</span></div><div class="grid">'
    for x in (x for x in items if x['phase'] == phase):
        image = 'mockups/'+x['id']+'.jpg'
        assert (ROOT/image).is_file(), f'Missing generated image: {image}'
        cards += f'<a class="card" href="{x["id"]}.html" data-search="{esc(x["title"]+" "+x["brief"],quote=True)}"><div class="image-wrap"><img src="{image}" loading="lazy" alt="Imagine concept: {esc(x["title"],quote=True)}"></div><div class="card-caption"><h3>{esc(x["title"])}</h3><span aria-hidden="true">↗</span></div></a>'
    cards += '</div></section>'
hero = '''<section class="hero"><div><p class="eyebrow">THE COMPLETE LEARNING JOURNEY</p><h1>A coach you<br>can question.</h1><p class="lede">Start a game. Challenge the explanation. Follow a different reply. Find your way back.</p><p>Seventeen blue-themed Imagine mockups, informed by your recorded session and the original ChessLab vision.</p><a class="button" href="01-conversation.html">Enter the conversation ↗</a></div><a class="hero-image" href="01-conversation.html"><img src="mockups/01-conversation.jpg" alt="ChessLab concept with an interactive board, coach conversation and visible alternative line"><span>THE CENTRAL INTERACTION · Ask → test → return</span></a></section>'''
tools = '<section class="gallery-tools"><div class="phase-links">'+''.join(f'<a href="#{p.lower()}">{p}</a>' for p in phases)+'</div><label>Find a scenario<input id="search" type="search" placeholder="Try voice, import, compare…"></label></section><p id="empty" hidden role="status">No matching scenarios. Try another word.</p>'
page('index.html', 'A coach you can question', hero+'<aside class="notice">These are generated design concepts. Image text and chess positions may contain errors; the captions describe the intended behavior. No feature or subscription shown is available yet.</aside>'+tools+cards)

review = json.loads((ROOT/'review-notes.json').read_text()) if (ROOT/'review-notes.json').exists() else {}
for i, x in enumerate(items):
    previous, following = items[(i-1)%len(items)], items[(i+1)%len(items)]
    note = review.get(x['id'], 'Use this to discuss layout and flow. Exact labels, board state and controls still need implementation and testing.')
    body = f'''<div class="page-heading"><p class="eyebrow">{esc(x['phase'])} · IMAGINE CONCEPT</p><h1>{esc(x['title'])}</h1><p class="lede">A proposed part of the ChessLab learning experience.</p></div>
<figure class="full-concept {'portrait' if x['id']=='14-mobile' else ''}"><a href="mockups/{x['id']}.jpg"><img src="mockups/{x['id']}.jpg" alt="Generated interface concept: {esc(x['title'],quote=True)}"></a><figcaption>Open the image for full resolution. Generated with Grok Imagine; illustrative content, not a working application.</figcaption></figure>
<div class="reading-grid"><section><h2>What this screen must make possible</h2><p>{esc(x['brief'])}</p></section><aside><h2>Review note</h2><p>{esc(note)}</p></aside></div><div class="pager"><a href="{previous['id']}.html">← {esc(previous['title'])}</a><a href="index.html">All scenarios</a><a href="{following['id']}.html">{esc(following['title'])} →</a></div>'''
    page(x['id']+'.html', x['title'], body)

stills = [(60,'Coach commentary during play'),(764,'A recommendation you want to question'),(780,'An alternative appears in the move list'),(807,'The continuation remains visible')]
removed = '<aside class="notice">On 2026-10-08 the project adopted an original-asset policy for its hosted beta. The screen recording, its stills, frames, crops and contact sheets showed another product’s interface, so they were removed from the repository. The written observations below remain. Earlier commits still contain the media.</aside>'
video = '''<div class="page-heading"><p class="eyebrow">YOUR SESSION · 15 MINUTES 20 SECONDS</p><h1>The source session.</h1><p class="lede">A recorded review session that informed these studies. The recording itself is no longer stored here.</p></div>'''+removed+'''<div class="actions"><a href="gemini.html">Read Gemini’s corrected report →</a></div><aside class="notice">The recording contained audio. No independently checked captions or complete transcript were produced. Gemini’s audio summary is model-derived.</aside><ul class="prose">'''
for t, title in stills:
    video += f'<li><strong>{t//60}:{t%60:02d}</strong> · {esc(title)}</li>'
page('video.html','The source session',video+'</ul>','video')
page('findings.html','What the recording changes','<article class="prose">'+md('findings.md')+'</article>','findings')
page('gemini.html','Gemini corrected report','<aside class="notice">Model output, with known first-response errors corrected. Not an independently certified transcript. Read <a href="findings.html">our checks and qualifications</a>.</aside><article class="prose">'+md('video/gemini-web-corrected.md')+'</article>','sources')
page('antigravity.html','Antigravity attempt: blocked','<aside class="notice">This attempt did not ingest the video. Its generic recommendations are excluded from the video evidence.</aside><article class="prose">'+md('video/antigravity-blocked-attempt.md')+'</article>','sources')
source = '''<div class="page-heading"><p class="eyebrow">PROVENANCE & BOUNDARIES</p><h1>What made these studies.</h1><p class="lede">Actual media generation and uploaded-video analysis, with their limits kept visible.</p></div><div class="reading-grid"><article class="prose"><h2>Video route</h2><p>FFmpeg made a smaller viewing copy of the recording; it was removed from the repository on 2026-10-08. Antigravity’s pre-tool hook rejected its initial file access. Gemini’s web app then received the full video and returned observations. The observed web mode was Flash Extended; no exact backend version or API processing mode was exposed.</p><p><a href="gemini.html">Corrected Gemini report</a> · <a href="antigravity.html">Blocked Antigravity attempt</a> · <a href="video/provenance.json">Compression receipt and source hashes</a></p><h2>Imagine route</h2><p>The authenticated Grok Build CLI invoked its actual Imagine image_gen tool. Seventeen separate final images cover the listed scenarios. The first exploratory image was replaced after review; practice, accessibility and pricing received one further refinement pass. No image was hand-painted or presented as implemented software.</p><p><a href="imagine-prompts.txt">Generation brief</a> · <a href="scenarios.json">Scenario inventory</a> · <a href="imagine-provenance.json">Per-image generation record</a></p><h2>How to use this</h2><p>Review the learning flow and visual direction. Treat generated board positions, small labels and numerical text as illustrative. A real prototype must use legal chess state, verified analysis, accessible controls and honest save/error behavior.</p><p><a href="findings.html">Our findings and design critique</a> · <a href="manifest.json">Gallery hash manifest</a></p></article><aside class="note"><h2>The next build</h2><p>One verified position. A question the learner actually wants to ask. An alternative for either side. A follow-up inside that alternative. A comparison, and an exact return.</p><p>The larger journey is a design exploration. Mockups do not prove learning, demand, pricing, model reliability or readiness to launch.</p></aside></div>'''
page('sources.html','Sources and limits',source,'sources')
for name, title in [('frame-study', 'The session frame by frame'), ('settings-study', 'Settings and visible options'), ('screen-plan', 'What the frames add to our screens')]:
    page(name+'.html', title, '<article class="prose">'+md(name+'.md')+'</article>', 'frames')
study = json.loads((ROOT/'video/study/sampling.json').read_text())
frame_times = sorted({x['seconds'] for x in study['frames']} | set(study['targeted_seconds']))
atlas = '<div class="page-heading"><p class="eyebrow">FULL-DURATION VISUAL COVERAGE</p><h1>The frame atlas.</h1><p class="lede">150 exact-time samples of the recorded session, listed by time.</p><p><a href="frame-study.html">Read the annotated study</a> · <a href="settings-study.html">Settings inventory</a> · <a href="video/study/sampling.json">Sampling record</a> · <a href="video/study/scene-candidates.json">Transition candidates</a></p></div>'+removed
atlas += '<section><h2>Sampled times</h2><p class="phase-links">'+''.join(f'<span>{seconds//60:02d}:{seconds%60:02d}</span>' for seconds in frame_times)+'</p></section>'
page('frame-atlas.html', 'All sampled frames', atlas, 'frames')
files = [p for p in ROOT.rglob('*') if p.is_file() and p.name not in ['manifest.json','verification.json'] and p.suffix not in ['.zip','.log'] and not p.name.endswith('stderr.txt') and not p.name.endswith('-run.txt') and '__pycache__' not in p.parts]
(ROOT/'manifest.json').write_text(json.dumps({'scope':'Static design gallery; no chess application','files':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}},indent=2)+'\n')
print(f'Built {len(items)} scenario pages and 10 reading pages.')
