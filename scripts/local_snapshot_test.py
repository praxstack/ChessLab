import importlib.util
from pathlib import Path
import sqlite3
import tempfile

spec = importlib.util.spec_from_file_location('local_snapshot', Path(__file__).with_name('local_snapshot.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as folder:
    source, destination = Path(folder) / 'source.sqlite', Path(folder) / 'copy.sqlite'
    db = sqlite3.connect(source)
    db.execute('PRAGMA journal_mode=WAL')
    for table in ('users', 'games', 'progress'):
        db.execute(f'CREATE TABLE {table} (id INTEGER)')
        db.execute(f'INSERT INTO {table} VALUES (1)')
    db.commit()
    assert module.snapshot(source, destination) == {'users': 1, 'games': 1, 'progress': 1}
    before = destination.read_bytes()
    try:
        module.snapshot(source, destination)
        raise AssertionError('Existing destination was overwritten')
    except ValueError:
        assert destination.read_bytes() == before
    db.close()
print('SQLite WAL snapshot and overwrite protection passed')
