"""Small offline check for hash verification, atomic replacement and safe reuse."""
import hashlib
from pathlib import Path
import tempfile
from download_tablebases import download

with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    target = root / 'tables'
    target.mkdir()
    source = root / 'source'
    source.write_bytes(b'verified-table-data')
    item = dict(name='KQvK.rtbw', bytes=source.stat().st_size, sha256=hashlib.sha256(source.read_bytes()).hexdigest(), url=source.as_uri())
    destination = target / item['name']
    destination.write_bytes(b'keep until verified')
    wrong = {**item, 'sha256': '0' * 64}
    try:
        download(wrong, target)
        raise AssertionError('Accepted corrupt data')
    except ValueError as error:
        assert 'checksum' in str(error)
    assert destination.read_bytes() == b'keep until verified'
    download(item, target)
    assert destination.read_bytes() == source.read_bytes()
    assert not (target / (item['name'] + '.part')).exists()
    source.unlink()
    assert download(item, target) == item['name']
    try:
        download({**item, 'name': '../KQvK.rtbw'}, target)
        raise AssertionError('Accepted escaping filename')
    except ValueError as error:
        assert 'filename' in str(error)
print('Atomic table download, checksum rejection, safe reuse and filename validation passed')
