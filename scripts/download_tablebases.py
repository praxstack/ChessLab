"""Download the pinned 3–5-piece Syzygy set with published SHA-256 verification."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

def download(item, target):
    name = item['name']
    if Path(name).name != name or not name.endswith(('.rtbw', '.rtbz')):
        raise ValueError('Invalid tablebase filename')
    path = target / name
    def valid(file):
        if not file.exists() or file.stat().st_size != item['bytes']:
            return False
        with file.open('rb') as source:
            return hashlib.file_digest(source, 'sha256').hexdigest() == item['sha256']
    if valid(path):
        return name
    part = target / (name + '.part')
    with urllib.request.urlopen(item['url'], timeout=60) as response, part.open('wb') as output:
        while block := response.read(1024 * 1024):
            output.write(block)
        output.flush()
        os.fsync(output.fileno())
    if not valid(part):
        raise ValueError('Tablebase checksum mismatch: ' + name)
    part.replace(path)
    return name

if __name__ == '__main__':
    manifest = json.loads((ROOT / 'docs/verification/endgame-practice/tablebase-download.json').read_text())
    target = ROOT / 'data/tablebases/standard'
    target.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for count, name in enumerate(pool.map(lambda item: download(item, target), manifest['files']), 1):
            if count % 20 == 0 or count == len(manifest['files']):
                print(f'{count}/{len(manifest["files"])} verified', flush=True)
