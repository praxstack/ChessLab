"""Import an official local Lichess CSV.zst into a new SQLite catalogue."""
import csv, hashlib, io, json, os, re, sqlite3, subprocess, sys, tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def import_archive(source, destination):
    source, destination = Path(source), Path(destination)
    if destination.exists():
        raise FileExistsError('Refusing to replace an existing puzzle catalogue.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with source.open('rb') as archive:
        digest = hashlib.file_digest(archive, 'sha256').hexdigest()
    handle, temporary = tempfile.mkstemp(prefix='.puzzles-', suffix='.sqlite', dir=destination.parent)
    os.close(handle)
    process = None
    db = None
    try:
        db = sqlite3.connect(temporary)
        db.executescript('''PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA cache_size=-64000;
        CREATE TABLE puzzles (seq INTEGER PRIMARY KEY, id TEXT NOT NULL, fen TEXT NOT NULL, moves TEXT NOT NULL, rating INTEGER NOT NULL, themes TEXT NOT NULL, game_url TEXT NOT NULL, opening_tags TEXT NOT NULL);
        CREATE TABLE pool (theme TEXT NOT NULL, rating INTEGER NOT NULL, seq INTEGER NOT NULL);
        CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);''')
        process = subprocess.Popen(['zstd', '-dc', str(source)], stdout=subprocess.PIPE)
        reader = csv.DictReader(io.TextIOWrapper(process.stdout, encoding='utf-8', newline=''))
        required = ['PuzzleId','FEN','Moves','Rating','RatingDeviation','Popularity','NbPlays','Themes','GameUrl','OpeningTags']
        if reader.fieldnames not in [required, required+['DailyDate']]:
            raise ValueError('Unexpected source columns.')
        rows, pools, themes, count = [], [], Counter(), 0
        for row in reader:
            count += 1
            moves, tags = row['Moves'].split(), row['Themes'].split()
            rating = int(row['Rating'])
            if not re.fullmatch(r'[A-Za-z0-9]{5,12}',row['PuzzleId']) or not 0 <= rating <= 5000 or len(row['FEN']) > 150 or len(row['FEN'].split()) != 6 or not 2 <= len(moves) <= 100 or len(moves)%2 or any(not re.fullmatch(r'[a-h][1-8][a-h][1-8][qrbn]?',m) for m in moves) or any(not re.fullmatch(r'[A-Za-z][A-Za-z0-9]{0,40}',t) for t in tags) or len(tags)>30:
                raise ValueError(f'Invalid puzzle row {count}')
            url = row['GameUrl']
            if not re.fullmatch(r'https://lichess\.org/[A-Za-z0-9]{8}(?:/(?:white|black))?(?:#[0-9]+)?',url):
                raise ValueError(f'Invalid source URL at row {count}')
            rows.append((count,row['PuzzleId'],row['FEN'],row['Moves'],rating,' '.join(tags),url,row['OpeningTags']))
            pools.extend((theme,rating,count) for theme in ['',*set(tags)])
            themes.update(set(tags))
            if count%10000==0:
                db.executemany('INSERT INTO puzzles VALUES (?,?,?,?,?,?,?,?)',rows)
                db.executemany('INSERT INTO pool VALUES (?,?,?)',pools)
                db.commit();rows.clear();pools.clear()
                if count%500000==0: print(json.dumps({'imported':count}),flush=True)
        db.executemany('INSERT INTO puzzles VALUES (?,?,?,?,?,?,?,?)',rows)
        db.executemany('INSERT INTO pool VALUES (?,?,?)',pools)
        if process.wait() != 0: raise ValueError('Archive decompression failed.')
        print('Building catalogue indexes',flush=True)
        db.executescript('CREATE UNIQUE INDEX puzzle_id ON puzzles(id); CREATE INDEX puzzle_pool ON pool(theme,rating,seq);')
        metadata = {'source':'https://database.lichess.org/#puzzles','download':'https://database.lichess.org/lichess_db_puzzle.csv.zst','license':'CC0-1.0','archiveSha256':digest,'archiveBytes':source.stat().st_size,'importedAt':datetime.now(timezone.utc).isoformat(),'count':count,'themes':dict(sorted(themes.items())),'validation':'Every source row structurally validated; each selected solution legally replayed before serving.'}
        db.execute('INSERT INTO metadata VALUES (?,?)',('catalogue',json.dumps(metadata)))
        db.commit()
        assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        db.close();db=None
        os.link(temporary,destination)
        print(json.dumps(metadata),flush=True)
        return metadata
    finally:
        if process and process.poll() is None: process.terminate();process.wait()
        if db: db.close()
        Path(temporary).unlink(missing_ok=True)

if __name__ == '__main__':
    import_archive(*sys.argv[1:])
