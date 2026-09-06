"""Generate the portable ChessLab dossier from project sources; requires Pandoc."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from string import Template
import subprocess
import sys
from urllib.parse import unquote, urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'report'
ASSETS = ROOT / 'scripts/report_assets'
CHAPTERS = [
 ('index','Overview','◇','Every move. Every why.','A complete record of the idea, the research, the work and the decisions still ahead.','overview'),
 ('product','Product vision','♙','Make the reasoning visible.','The full tutor vision, the first learning interaction, and the people it should serve.','product'),
 ('market','Market & customers','◎','A crowded board. A specific need.','Where the alternatives overlap, and what ChessLab still needs to prove.','market'),
 ('pricing','Pricing & economics','↗','Earn a place in the study budget.','Current reference prices, historical research, and transparent experiments.','pricing'),
 ('investor','Investor memo','♜','What would change my mind?','An angel-investor view of the opportunity, the missing evidence and the next useful milestone.','investor'),
 ('architecture','Architecture','⌘','Trust starts with the position.','Rules, engine evidence, explanations and the smallest credible implementation.','architecture'),
 ('application','Working application','♞','Play. Review. Explore.','The current bot and coach web build, its verification and the platform work ahead.','application'),
 ('delivery','Work & readiness','✓','A record of the work.','Historical setup and report receipts, with the current application status kept separate.','delivery'),
 ('discussion','Conversation','↳','The question behind the project.','The original confusion, the expanding vision, the research request and the project discussion.','discussion'),
 ('library','Document library','▤','The complete reading room.','Original research and every project document, with full reading pages and downloads.','library'),
]
TITLES = {
 'README.md':'ChessLab project introduction', 'CONTEXT.md':'Product context and vocabulary',
 'AGENTS.md':'Project working agreement', 'CLAUDE.md':'Claude project entrypoint',
 'docs/research/sources/startup-research.md':'Complete startup research',
 'docs/research/sources/learning-products.md':'Complete learning-products research',
 'docs/research/sources/startup-research.pdf':'Original startup research PDF',
 'docs/research/sources/original-conversation.md':'Original ChatGPT conversation, full available text',
 'docs/research/sources/original-conversation.json':'Original conversation retrieval record',
 'docs/research/sources/IMG_0860.png':'Original lesson: starting position',
 'docs/research/sources/IMG_0859.png':'Original lesson: incorrect rook move',
 'docs/research/assessment.md':'Previous run: research assessment',
 'skills.local.json':'Complete skill-source manifest',
 'scripts/setup_skills.py':'Repeatable skill-link setup helper',
 'scripts/build_report.py':'HTML dossier generator',
 'docs/dossier/evidence.json':'Current setup verification snapshot',
 'justfile':'Canonical project commands',
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def category(path):
    p = path.as_posix()
    if '/research/sources/' in p: return 'Original research'
    if p.startswith('openspec/'): return 'OpenSpec'
    if p.startswith('docs/dossier/'): return 'Dossier chapters'
    if p == 'docs/research/assessment.md': return 'Assessment'
    return 'Project & tooling'


def source_files():
    files = {ROOT/p for p in ['README.md','CONTEXT.md','AGENTS.md','CLAUDE.md','skills.local.json','justfile','.gitignore','.gitattributes']}
    for folder in ['docs','openspec','scripts']:
        files.update(p for p in (ROOT/folder).rglob('*') if p.is_file() and not p.is_symlink() and '__pycache__' not in p.parts and p.name != '.gitkeep')
    return sorted(files)


def doc_name(path):
    return path.relative_to(ROOT).as_posix().replace('/','--').replace('.','-') + '.html'


class Fragment(HTMLParser):
    def __init__(self, source, files, base):
        super().__init__(convert_charrefs=False)
        self.source, self.files, self.base = source, files, base
        self.result = []
        self.toc = []
        self.heading = None
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for key in ['href','src']:
            value = data.get(key)
            if not value: continue
            parsed = urlsplit(value)
            if parsed.scheme and parsed.scheme not in ['http','https','mailto']:
                data[key] = '#'
            elif not parsed.scheme and parsed.path:
                target = (self.source.parent / unquote(parsed.path)).resolve()
                if target in self.files:
                    if tag == 'img' or target.suffix.lower() in ['.png','.jpg','.jpeg','.svg','.pdf']:
                        data[key] = self.base+'/downloads/'+target.relative_to(ROOT).as_posix()
                    else:
                        data[key] = self.base+'/documents/'+doc_name(target)
                    if parsed.fragment: data[key] += '#'+parsed.fragment
                elif target.is_relative_to(OUT):
                    data[key] = self.base+'/'+target.relative_to(OUT).as_posix()
                    if parsed.fragment: data[key] += '#'+parsed.fragment
            if key == 'href' and parsed.scheme in ['https','http']:
                data['rel'] = 'noreferrer noopener'
        if tag == 'h2' and data.get('id'):
            self.heading = [data['id'],'']
        if tag == 'table': self.result.append('<div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable data table">')
        self.result.append('<'+tag+''.join(' '+k+('="'+html.escape(v,quote=True)+'"' if v is not None else '') for k,v in data.items())+'>')
    def handle_endtag(self, tag):
        self.result.append('</'+tag+'>')
        if tag == 'table': self.result.append('</div>')
        if tag == 'h2' and self.heading:
            self.toc.append(tuple(self.heading)); self.heading = None
    def handle_data(self, data):
        self.result.append(data)
        if self.heading is not None: self.heading[1] += data
    def handle_entityref(self, name): self.result.append('&'+name+';')
    def handle_charref(self, name): self.result.append('&#'+name+';')
    def handle_comment(self, data): pass


def markdown(path, files, base, shift=False):
    command = ['pandoc','--from=gfm-raw_html','--to=html5','--wrap=none']
    if shift: command += ['--shift-heading-level-by=1']
    result = subprocess.run(command+[str(path)],check=True,capture_output=True,text=True).stdout
    parsed = Fragment(path,files,base); parsed.feed(result)
    return ''.join(parsed.result), parsed.toc


def board():
    pieces={'d6':'♝','f4':'♖','a3':'♘','g3':'♙'}
    cells=[]
    for rank in range(8,0,-1):
        for column,file in enumerate('abcdefgh'):
            square=file+str(rank)
            dark=(rank+column)%2==0
            piece=pieces.get(square,'')
            cells.append(f'<span class="sq {"dark" if dark else ""} {"mark" if square=="g3" else ""}"'+(' data-piece="true"' if piece else '')+f'>{piece}<small>{square if piece else ""}</small></span>')
    return '<div class="board-frame"><div class="board" role="img" aria-label="Partial lesson diagram: black bishop d6, white rook f4, knight a3 and pawn g3. Other pieces are omitted.">'+''.join(cells)+'</div><div class="board-caption">FOUR PIECES FROM THE ORIGINAL LESSON<br>Partial diagram · other pieces omitted</div></div>'


def components(files):
    original = '''<section class="interactive" aria-label="Conditional material comparison"><div class="interactive-head"><strong>The lesson that started it</strong><small>CONDITIONAL MATERIAL EXAMPLE</small></div><div class="exchange-body"><button class="exchange-option" data-exchange="knight" aria-pressed="true"><span class="pieces" aria-hidden="true">♘ → ∅</span><strong>Lose the knight</strong><small>If it is captured without compensation</small></button><button class="exchange-option" data-exchange="rook" aria-pressed="false"><span class="pieces" aria-hidden="true">♖ ⇄ ♝</span><strong>Trade rook for bishop</strong><small>If the bishop is then recaptured</small></button></div><div id="exchange-result" class="exchange-result" aria-live="polite">Knight lost without a recapture: 3 points lost.</div><p class="disclosure">Compare the entire exchange. This arithmetic illustration is not a legal-move engine or proof that these are the only available choices.</p></section>'''
    concept = '''<section class="interactive" aria-label="Product interaction concept"><div class="interactive-head"><strong>One position. Several ways to understand it.</strong><small>INTERFACE CONCEPT · NOT A PLAYABLE APP</small></div><div class="concept"><div class="concept-left"><h3 id="concept-title">Inspect the question</h3><p id="concept-description" aria-live="polite">The learner has selected a confusing move. The original game is preserved while the explanation stays attached to this position.</p><div class="segmented" aria-label="Explore the interface concept"><button data-concept="inspect" aria-pressed="true">Inspect</button><button data-concept="explore" aria-pressed="false">Explore</button><button data-concept="return" aria-pressed="false">Return</button></div></div><div class="concept-right"><div class="branch-line" data-branch="return">Actual game <strong>· preserved</strong></div><div class="branch-line active" data-branch="inspect">Selected position <strong>· why this move?</strong></div><div class="branch-line nested" data-branch="explore">Alternative reply <strong>· what if?</strong></div><div class="branch-line nested">A question inside the branch</div><div class="branch-line">Continue the original game</div></div></div></section>'''
    fields=[('payers','Paying subscribers','1000','1'),('price','Price per subscriber / month','9','0.01'),('sessions','Sessions / subscriber / month','20','1'),('unit-cost','Variable cost per session','0.05','0.01'),('fee','Assumed payment fee (%)','3','0.1')]
    inputs=''.join(f'<label for="{id}">{label}<input type="number" id="{id}" value="{value}" min="0" step="{step}"'+(' max="100"' if id=='fee' else '')+'></label>' for id,label,value,step in fields)
    economics='<section class="interactive"><div class="interactive-head"><strong>Monthly contribution model</strong><small>ILLUSTRATIVE ASSUMPTIONS</small></div><form class="calculator" id="economics" onsubmit="return false"><div class="calculator-grid"><label for="currency">Display currency, no conversion<select id="currency"><option value="USD">USD · US dollar</option><option value="INR">INR · Indian rupee</option><option value="EUR">EUR · euro</option></select></label>'+inputs+'</div><div class="calc-results" aria-live="polite"><div><small>SUBSCRIPTION REVENUE</small><output id="revenue">$9,000.00</output></div><div><small>VARIABLE COST + FEES</small><output id="variable-cost">$1,270.00</output></div><div><small>CONTRIBUTION BEFORE OVERHEAD</small><output id="contribution">$7,730.00</output></div></div><p id="calc-error" class="error" role="status"></p></form><p class="disclosure">Revenue = subscribers × monthly price. Variable cost = subscribers × sessions × cost/session + revenue × fee%. This is not net profit and excludes free-user costs.</p></section>'
    architecture='<div class="flow" role="group" aria-label="Proposed analysis flow">'+''.join('<div><strong>'+a+'</strong><small>'+b+'</small></div>' for a,b in [('Rules & history','Validate and replay the selected position.'),('Engine & board facts','Compute bounded analysis and supported evidence.'),('Explanation','Describe what the evidence supports.'),('Learner action','Inspect, branch, compare and return.')])+'</div>'
    cards=[]
    for p in files:
        rel=p.relative_to(ROOT).as_posix(); cat=category(Path(rel)); title=TITLES.get(rel,p.stem.replace('-',' ').replace('_',' ').title())
        if rel.startswith('docs/dossier/') and p.suffix=='.md': title='Dossier source: '+p.stem.replace('-',' ').title()
        cards.append(f'<a class="document-card" href="documents/{doc_name(p)}" data-category="{cat}" data-search="{html.escape((title+" "+rel+" "+cat).lower(),quote=True)}"><span class="doc-type">{cat}</span><strong>{html.escape(title)}</strong><small>{html.escape(rel)}</small><span class="doc-arrow">Read full document →</span></a>')
    cats=sorted({category(p.relative_to(ROOT)) for p in files})
    library='<div class="library-controls"><label for="document-search">Search the full inventory<input id="document-search" type="search" placeholder="Try pricing, proposal, skills…"></label><label for="document-category">Document type<select id="document-category"><option value="">All types</option>'+''.join(f'<option>{c}</option>' for c in cats)+'</select></label></div><div id="document-count" class="result-count" aria-live="polite">'+str(len(files))+' documents</div><div class="document-grid">'+''.join(cards)+'</div><p id="no-documents" class="empty-state" hidden>No documents match. Try a different title or choose all types.</p>'
    images='<div class="image-pair">'+''.join(f'<figure><a href="downloads/docs/research/sources/{name}"><img src="downloads/docs/research/sources/{name}" alt="{caption}" loading="lazy"></a><figcaption>{caption}</figcaption></figure>' for name,caption in [('IMG_0860.png','Original lesson: the bishop attacks the knight and rook.'),('IMG_0859.png','Original lesson: saving the rook is marked incorrect.')])+'</div>'
    evidence='<div class="evidence-grid">'+''.join('<div class="evidence-card"><span class="chip '+state+'">'+label+'</span><strong>'+title+'</strong><p>'+body+'</p></div>' for state,label,title,body in [('good','VERIFIED LOCALLY','Setup checks pass','180 skill links, two mirrors, helper self-test and strict OpenSpec structure validation.'),('proposed','DRAFT','4 planning artifacts','Proposal, design, requirements and nine unperformed implementation tasks.'),('proposed','INCOMPLETE','Initial Git commit','Earlier signing failed. No commit or remote at the start of this report run.'),('','NOT DEMONSTRATED','Chess product outcomes','No playable app, product users, paid pilot or measured learning results.')])+'</div>'
    receipt='<p><a href="verification.json">Open the report verification receipt</a>. This records static and browser checks for the generated dossier, including their limits.</p>'
    return {'ORIGIN':original,'PRODUCT_DEMO':concept,'ECONOMICS':economics,'ARCHITECTURE':architecture,'LIBRARY':library,'ORIGINAL_IMAGES':images,'EVIDENCE':evidence,'REPORT_RECEIPT':receipt}


def render_page(title, section, body, toc, slug, base='.', lede='', home=False, doc=False):
    nav=''.join(f'<a class="nav-link" href="{base}/{s}.html"'+(' aria-current="page"' if slug==s or doc and s=='library' else '')+f'><span class="nav-symbol" aria-hidden="true">{icon}</span>{name}</a>' for s,name,icon,*rest in CHAPTERS)
    if home:
        hero='<section class="hero"><div class="hero-copy"><div class="eyebrow">ChessLab / Founder research edition</div><h1>Every move.<br><em>Every why.</em></h1><p>A chess tutor you can question, explore and rewind. The research, the work, and an honest look at what it would take to build it.</p><div class="hero-actions"><a class="button" href="investor.html">Read the investor memo <span aria-hidden="true">↗</span></a><a class="text-link" href="library.html">Explore the documents →</a></div></div><div class="hero-art">'+board()+'<div class="floating-note"><strong>The recapture changes everything.</strong>5 − 3 loses less than 3.</div></div></section><div class="hero-badges"><span class="chip good">Research preserved</span><span class="chip good">Setup verified</span><span class="chip proposed">Product proposed</span><span class="chip">No playable app yet</span></div>'
    else:
        hero=f'<header class="page-heading"><div class="eyebrow">{html.escape(section)} / Research dossier</div><h1>{html.escape(title)}</h1><p class="lede">{html.escape(lede)}</p></header>'
    anchors=''.join(f'<a href="#{html.escape(id,quote=True)}">{html.escape(text)}</a>' for id,text in toc)
    note='Read claims at their stated scope. Proposed ideas are not accepted specifications or verified product outcomes.'
    pagination=''
    if not doc:
        index=next(i for i,c in enumerate(CHAPTERS) if c[0]==slug)
        previous=CHAPTERS[index-1] if index else None; following=CHAPTERS[index+1] if index+1<len(CHAPTERS) else None
        pagination='<nav class="pagination" aria-label="Adjacent chapters">'+(f'<a href="{previous[0]}.html"><small>PREVIOUS CHAPTER</small>← {previous[1]}</a>' if previous else '<span></span>')+(f'<a href="{following[0]}.html"><small>NEXT CHAPTER</small>{following[1]} →</a>' if following else '<a href="index.html"><small>RETURN TO OVERVIEW</small>Back to the thesis ↑</a>')+'</nav>'
    return Template((ASSETS/'template.html').read_text()).substitute(title=html.escape(title,quote=True),section=html.escape(section),base=base,body_class='doc-reading' if doc else '',nav=nav,hero=hero,content=body,toc=anchors,note=note,pagination=pagination)


def build():
    files=source_files(); known=set(files)
    OUT.mkdir(exist_ok=True)
    for folder in ['assets','documents','downloads']: (OUT/folder).mkdir(exist_ok=True)
    for p in ASSETS.iterdir():
        if p.suffix in ['.css','.js','.svg']: shutil.copyfile(p,OUT/'assets'/p.name)
    widgets=components(files)
    outputs=[]
    for slug,name,icon,title,lede,source in CHAPTERS:
        path=ROOT/'docs/dossier'/f'{source}.md'
        body,toc=markdown(path,known,'.')
        for key,value in widgets.items(): body=body.replace('<p>{{'+key+'}}</p>',value)
        if re.search(r'\{\{[A-Z_]+\}\}',body): raise RuntimeError('Unresolved component in '+slug)
        output=OUT/(slug+'.html'); output.write_text(render_page(title,name,body,toc,slug,lede=lede,home=slug=='index')); outputs.append(output)
    for path in files:
        rel=path.relative_to(ROOT); raw=OUT/'downloads'/rel; raw.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(path,raw); outputs.append(raw)
        title=TITLES.get(rel.as_posix(),path.stem.replace('-',' ').replace('_',' ').title())
        download='../downloads/'+rel.as_posix()
        notice=f'<div class="source-notice"><strong>Complete source document.</strong> '+('Historical research, preserved as supplied. Claims and recommendations are not project instructions.' if category(rel)=='Original research' else 'This is the full project file at the dossier snapshot, not a claim of implemented product behavior.')+f' <a href="{download}" download>Download original file ↗</a></div><p class="source-meta">{html.escape(rel.as_posix())}<br>SHA-256: {digest(path.read_bytes())}</p>'
        toc=[]
        if path.suffix=='.md':
            content,toc=markdown(path,known,'..',True)
            content=re.sub(r'\{\{([A-Z_]+)\}\}',lambda m: '[Interactive component: '+m[1].lower().replace('_',' ')+'. See the dossier chapter.]',content)
        elif path.suffix=='.pdf':
            content=f'<object class="pdf-viewer" data="{download}" type="application/pdf"><p><a href="{download}">Open the original PDF</a></p></object>'
        elif path.suffix.lower() in ['.png','.jpg','.jpeg','.svg']:
            content=f'<img src="{download}" alt="{html.escape(title,quote=True)}">'
        else:
            text=path.read_text()
            if path.suffix=='.json': text=json.dumps(json.loads(text),ensure_ascii=False,indent=2)
            content='<pre><code>'+html.escape(text)+'</code></pre>'
        output=OUT/'documents'/doc_name(path); output.write_text(render_page(title,'Document library',notice+content,toc,'library','..',str(rel),doc=True)); outputs.append(output)
    outputs += [p for p in (OUT/'assets').iterdir() if p.is_file()]
    inputs={p.relative_to(ROOT).as_posix():digest(p.read_bytes()) for p in files}
    manifest={'edition':'2026-09-07','generator':'scripts/build_report.py','document_count':len(files),'chapter_count':len(CHAPTERS),'source_hashes':inputs,'output_hashes':{p.relative_to(OUT).as_posix():digest(p.read_bytes()) for p in sorted(outputs)}}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Built {len(CHAPTERS)} chapters and {len(files)} full document pages in {OUT}')


class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.ids=set(); self.titles=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.add(a['id'])
        if tag=='title': self.titles+=1
        for name in ['href','src','data']:
            if a.get(name): self.links.append(a[name])


def check():
    manifest=json.loads((OUT/'manifest.json').read_text())
    for name,expected in manifest['source_hashes'].items():
        if not (ROOT/name).is_file() or digest((ROOT/name).read_bytes())!=expected: raise RuntimeError('Changed source; rebuild: '+name)
    current={p.relative_to(ROOT).as_posix() for p in source_files()}
    if current != set(manifest['source_hashes']): raise RuntimeError('Source inventory changed; rebuild')
    for name,expected in manifest['output_hashes'].items():
        if not (OUT/name).is_file() or digest((OUT/name).read_bytes())!=expected: raise RuntimeError('Stale or edited output: '+name)
    pages={p:Links() for p in OUT.rglob('*.html') if 'downloads' not in p.parts}
    for p,parsed in pages.items(): parsed.feed(p.read_text())
    count=0
    for path,parsed in pages.items():
        if parsed.titles!=1: raise RuntimeError('Missing/duplicate title: '+str(path))
        for link in parsed.links:
            url=urlsplit(link)
            if url.scheme or url.netloc: continue
            target=(path.parent/unquote(url.path)).resolve() if url.path else path
            if not target.is_relative_to(OUT): raise RuntimeError('Link leaves portable site: '+link)
            if not target.exists(): raise RuntimeError(f'Broken link in {path.name}: {link}')
            if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids: raise RuntimeError(f'Broken anchor in {path.name}: {link}')
            count+=1
    print(f'PASS: {len(pages)} HTML pages, {count} local links, all source/output hashes and source coverage')
    return {'html_pages':len(pages),'local_links':count,'documents':manifest['document_count'],'source_output_hashes':'pass','scope':'Static dossier only; not product functionality'}


def bundle():
    target=ROOT/'ChessLab-dossier.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUT.rglob('*')):
            if path.is_file(): archive.write(path,'ChessLab-dossier/'+path.relative_to(OUT).as_posix())
    print('Portable archive: '+str(target))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true'); parser.add_argument('--zip',action='store_true')
    args=parser.parse_args()
    try:
        if args.check: check()
        elif args.zip: check(); bundle()
        else: build()
    except (RuntimeError,subprocess.CalledProcessError) as error:
        sys.exit(str(error))
