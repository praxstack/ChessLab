"""Check the generated gallery, linked files, provenance, and viewing copy."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parent
manifest = json.loads((root/'manifest.json').read_text())
for name, expected in manifest['files'].items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest() == expected, f'Rebuild changed file: {name}'


class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=set(); self.titles=0; self.images=0; self.cards=[]
    def handle_starttag(self, tag, attrs):
        values=dict(attrs)
        if 'card' in values.get('class','').split(): self.cards.append(values.get('href'))
        if tag=='title': self.titles+=1
        if values.get('id'): self.ids.add(values['id'])
        if tag=='img':
            assert values.get('alt'), 'Image needs descriptive alternative text'
            self.images+=1
        for attr in ['href','src','poster']:
            if values.get(attr): self.links.append(values[attr])


pages={p.resolve():Page() for p in root.glob('*.html')}
for path, parser in pages.items(): parser.feed(path.read_text()); assert parser.titles==1
links=0
for path, parser in pages.items():
    for value in parser.links:
        url=urlsplit(value)
        if url.scheme or url.netloc: continue
        target=(path.parent/unquote(url.path)).resolve() if url.path else path
        assert target.is_relative_to(root) and target.exists(), f'Broken local link: {value}'
        if url.fragment and target in pages: assert unquote(url.fragment) in pages[target].ids, value
        links+=1
items=json.loads((root/'scenarios.json').read_text())
sampling=json.loads((root/'video/study/sampling.json').read_text())
frame_times={x['seconds'] for x in sampling['frames']}|set(sampling['targeted_seconds'])
assert len(frame_times)==150 and min(frame_times)==0 and max(frame_times)==919
assert all((root/f'video/study/frames/{t:04d}.jpg').read_bytes().startswith(b'\xff\xd8') for t in frame_times)
assert len(list((root/'video/study/sheets').glob('*.jpg')))==19
receipts=json.loads((root/'imagine-provenance.json').read_text())['images']
assert len(items)==len(receipts)==17
cards=pages[(root/'index.html').resolve()].cards
assert len(cards)==17 and set(cards)=={x['id']+'.html' for x in items}, 'Each scenario needs exactly one gallery card'
assert {x['id'] for x in items}=={x['scenario'] for x in receipts}
for item in receipts:
    data=(root/item['local_path']).read_bytes()
    assert data.startswith(b'\xff\xd8') and hashlib.sha256(data).hexdigest()==item['sha256']
    assert item['tool_receipt'], 'Missing actual Imagine tool output'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type','-of','json',str(root/'video/chess-session-review.mp4')]))
assert abs(float(probe['format']['duration'])-919.599375)<0.1
assert {'audio','video'}<={x['codec_type'] for x in probe['streams']}
print(f'PASS: {len(pages)} HTML pages, {links} local links, 17 image receipts, hashes, full-duration video and audio')
