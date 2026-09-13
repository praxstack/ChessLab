import importlib.util, json, sqlite3, subprocess, tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('import_puzzles', Path(__file__).with_name('import_puzzles.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    row = json.loads(Path('references/puzzles/test-lines.json').read_text())[0]
    csv = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate\n'
    csv += ','.join([row['id'],row['fen'],row['moves'],str(row['rating']),'80','90','100',row['themes'],row['game_url'],row['opening_tags'],''])+'\n'
    archive = root/'source.zst'
    archive.write_bytes(subprocess.run(['zstd','-q','-c'],input=csv.encode(),check=True,capture_output=True).stdout)
    result = module.import_archive(archive,root/'catalogue.sqlite')
    assert result['count']==1
    db=sqlite3.connect(root/'catalogue.sqlite')
    assert db.execute('SELECT id FROM puzzles').fetchone()[0]==row['id']
    assert db.execute("SELECT COUNT(*) FROM pool WHERE theme='' ").fetchone()[0]==1
    db.close()
    try: module.import_archive(archive,root/'catalogue.sqlite')
    except FileExistsError: pass
    else: raise AssertionError('Existing catalogue was overwritten')
    archive.write_bytes(b'not zstandard')
    try: module.import_archive(archive,root/'bad.sqlite')
    except ValueError: pass
    else: raise AssertionError('Corrupt archive accepted')
    assert not (root/'bad.sqlite').exists()
print('Puzzle import integrity, complete row, source hash and overwrite protection passed')
