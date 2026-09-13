#!/usr/bin/env python3
"""Import a local PGN zip with pinned chess==1.11.2; never overwrite a database."""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path
import sqlite3
import tempfile
import zipfile
from collections import Counter
from datetime import datetime, timezone
import chess
import chess.pgn

MAX_PLIES = 60
SCHEMA = '''
CREATE TABLE metadata(data TEXT NOT NULL);
CREATE TABLE games(id INTEGER PRIMARY KEY, headers TEXT NOT NULL, moves TEXT NOT NULL);
CREATE TABLE edges(position TEXT NOT NULL, move TEXT NOT NULL, white INTEGER NOT NULL,
 draw INTEGER NOT NULL, black INTEGER NOT NULL, samples TEXT NOT NULL,
 PRIMARY KEY(position,move)) WITHOUT ROWID;
'''
UPSERT = '''INSERT INTO edges VALUES(?,?,?,?,?,?) ON CONFLICT(position,move) DO UPDATE SET
 white=white+excluded.white,draw=draw+excluded.draw,black=black+excluded.black,
 samples=CASE WHEN white+draw+black<3 THEN samples||','||excluded.samples ELSE samples END'''

TOKEN = re.compile(r'(?:1/2-1/2|1-0|0-1|\*|\d+\.(?:\.\.)?|\.\.\.|\$\d+|[!?]{1,2}|[()]|(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?|0-0(?:-0)?)[+#]?)')

class StrictPgn:
    def __init__(self, stream):
        self.stream = stream; self.comment = False; self.variation = 0
    def readline(self):
        line = self.stream.readline(1_000_001)
        if len(line) > 1_000_000:
            raise ValueError('PGN line exceeds 1 MB.')
        if not line:
            if self.comment or self.variation: raise ValueError('Unclosed PGN annotation.')
            return line
        text = line.strip()
        if not self.comment and text.startswith('%'): return line
        if not self.comment and text.startswith('['):
            if self.variation or not re.fullmatch(r'\[\w+\s+"(?:[^"\\]|\\.)*"\]', text):
                raise ValueError('Malformed PGN header.')
            return line
        i = 0
        while i < len(line):
            if self.comment:
                end = line.find('}', i)
                if end < 0: return line
                self.comment = False; i = end+1; continue
            if line[i].isspace(): i += 1; continue
            if line[i] == ';': break
            if line[i] == '{': self.comment = True; i += 1; continue
            token = TOKEN.match(line, i)
            if not token: raise ValueError('Unrecognized PGN movetext token.')
            value = token.group()
            if value == '(': self.variation += 1
            if value == ')':
                self.variation -= 1
                if self.variation < 0: raise ValueError('Unexpected PGN variation close.')
            i = token.end()
        return line

class MainLine(chess.pgn.BaseVisitor):
    def begin_game(self):
        self.headers = {}; self.moves = []; self.edges = []; self.seen = set(); self.errors = []
    def visit_header(self, name, value):
        self.headers[name] = value
    def begin_variation(self):
        return chess.pgn.SKIP
    def visit_move(self, board, move):
        if not board.is_legal(move): self.errors.append('Illegal or null move')
        if len(self.moves) < MAX_PLIES:
            key = ' '.join(board.fen(en_passant='legal').split()[:4])
            if key not in self.seen:
                self.edges.append((key, move.uci())); self.seen.add(key)
        self.moves.append(move.uci())
        if len(self.moves) > 1000:
            raise ValueError('A game exceeds 1,000 half-moves.')
    def visit_result(self, result):
        if self.headers.get('Result', result) != result:
            self.errors.append('Conflicting result')
        self.headers['Result'] = result
    def handle_error(self, error):
        self.errors.append(str(error))
    def result(self):
        return self

def add_game(db, game, game_id):
    h = game.headers
    if game.errors or h.get('Variant', 'Standard') not in ('Standard', 'Chess') or h.get('FEN') or h.get('SetUp', '0') != '0':
        return 'invalid_or_nonstandard'
    result = h.get('Result')
    if result not in ('1-0', '0-1', '1/2-1/2') or not game.moves:
        return 'unfinished_or_empty'
    headers = {k: str(v)[:300] for k,v in h.items() if k in ('White','Black','WhiteElo','BlackElo','Date','Event','Result','ECO','Opening','LichessURL','Site','TimeControl')}
    db.execute('INSERT INTO games VALUES(?,?,?)', (game_id, json.dumps(headers), json.dumps(game.moves)))
    score = (int(result=='1-0'), int(result=='1/2-1/2'), int(result=='0-1'))
    db.executemany(UPSERT, [(key, move, *score, str(game_id)) for key,move in game.edges])
    return 'accepted'

def import_archive(archive, destination, *, label, url):
    if chess.__version__ != '1.11.2':
        raise ValueError('Use pinned chess==1.11.2.')
    archive, destination = Path(archive).resolve(), Path(destination).resolve()
    if destination.exists():
        raise ValueError('Destination exists; choose a new path.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with archive.open('rb') as source_file:
        digest = hashlib.file_digest(source_file, 'sha256').hexdigest()
    fd, temporary = tempfile.mkstemp(prefix='.explorer-', suffix='.sqlite', dir=destination.parent); os.close(fd)
    counts = Counter(); db = None
    try:
        db = sqlite3.connect(temporary)
        db.executescript('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA cache_size=-131072;' + SCHEMA)
        with zipfile.ZipFile(archive) as zipped:
            members = [m for m in zipped.infolist() if m.filename.endswith('.pgn') and not m.is_dir()]
            if not members or sum(m.file_size for m in members) > 4_000_000_000:
                raise ValueError('Expected PGN members totaling at most 4 GB.')
            for member in members:
                with zipped.open(member) as raw, io.TextIOWrapper(raw, encoding='utf-8-sig', errors='strict') as stream:
                    checked = StrictPgn(stream)
                    while (game := chess.pgn.read_game(checked, Visitor=MainLine)) is not None:
                        status = add_game(db, game, counts['accepted']+1); counts[status] += 1
                        counts['read'] += 1
                        if counts['read'] % 10000 == 0:
                            db.commit(); print(json.dumps(dict(counts)), flush=True)
        if not counts['accepted']:
            raise ValueError('No complete legal standard games found.')
        source = {'label':label, 'url':url, 'license':'CC0', 'archive':archive.name, 'sha256':digest,
                  'parser':'python-chess 1.11.2', 'maxPlies':MAX_PLIES, 'counts':dict(counts),
                  'count':counts['accepted'], 'importedAt':datetime.now(timezone.utc).isoformat(),
                  'selection':'Lichess online games, 2500+ versus 2300+, excluding bullet',
                  'counting':'First encounter per game; first 60 half-moves. Up to three example games per move.'}
        db.execute('INSERT INTO metadata VALUES(?)', (json.dumps(source),)); db.commit()
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Database integrity check failed.')
        db.close(); db = None
        os.link(temporary, destination)
        return source
    finally:
        if db: db.close()
        os.unlink(temporary)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive'); parser.add_argument('destination')
    parser.add_argument('--label', required=True); parser.add_argument('--url', required=True)
    args = parser.parse_args()
    print(json.dumps(import_archive(args.archive,args.destination,label=args.label,url=args.url),indent=2))
