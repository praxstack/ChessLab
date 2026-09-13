import io
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
import chess.pgn
from import_explorer import MainLine, SCHEMA, StrictPgn, add_game, import_archive

class ImportTest(unittest.TestCase):
    def test_counts_legality_and_atomic_publication(self):
        db = sqlite3.connect(':memory:'); db.executescript(SCHEMA)
        valid = '[Result "1-0"]\n\n1. Nf3 Nf6 2. Ng1 Ng8 3. e4 e5 1-0\n'
        game = chess.pgn.read_game(io.StringIO(valid), Visitor=MainLine)
        self.assertEqual(add_game(db,game,1),'accepted')
        start = ' '.join(chess.Board().fen().split()[:4])
        self.assertEqual(db.execute('SELECT move,white FROM edges WHERE position=?',(start,)).fetchall(), [('g1f3',1)])
        invalid = chess.pgn.read_game(io.StringIO('[Result "0-1"]\n\n1. e4 e5 2. Bh6 0-1'),Visitor=MainLine)
        self.assertEqual(add_game(db,invalid,2),'invalid_or_nonstandard')
        self.assertEqual(db.execute('SELECT count(*) FROM games').fetchone()[0],1)
        with tempfile.TemporaryDirectory() as tmp:
            archive, target = Path(tmp)/'a.zip', Path(tmp)/'games.sqlite'
            with zipfile.ZipFile(archive,'w') as z: z.writestr('a.pgn',valid)
            receipt = import_archive(archive,target,label='Synthetic',url='https://example.invalid')
            self.assertEqual(receipt['count'],1); self.assertTrue(target.exists())
            with self.assertRaises(ValueError): import_archive(archive,target,label='Synthetic',url='https://example.invalid')
            with zipfile.ZipFile(archive,'w') as z: z.writestr('a.pgn','[Result "*"]\n\n1. e4 *')
            with self.assertRaises(ValueError): import_archive(archive,Path(tmp)/'bad.sqlite',label='Synthetic',url='https://example.invalid')
            self.assertFalse((Path(tmp)/'bad.sqlite').exists())
        with self.assertRaises(ValueError): StrictPgn(io.StringIO('1. e4 e5 2. Qh9 1-0')).readline()
        with self.assertRaises(ValueError): StrictPgn(io.StringIO('1. e4 -- *')).readline()
        checked=StrictPgn(io.StringIO('1. e4 {a multiline\ncomment} e5 (1... c5) 2. Nf3!? *'))
        while checked.readline(): pass
        db.close()

if __name__ == '__main__': unittest.main()
