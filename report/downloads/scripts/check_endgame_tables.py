"""Run with the existing data/explorer/.venv/bin/python (python-chess)."""
import hashlib
import json
from pathlib import Path
import chess
import chess.syzygy

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/verification/endgame-practice/tablebase-download.json').read_text())
tables = root / 'data/tablebases/standard'
assert len(manifest['files']) == 290
assert sum(item['bytes'] for item in manifest['files']) == 983957920
for item in manifest['files']:
    path = tables / item['name']
    assert path.stat().st_size == item['bytes'], item['name']
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == item['sha256'], item['name']
positions = json.loads((root / 'server/endgames.json').read_text())
assert len(positions) == 24
assert len({item['id'] for item in positions}) == 24
probed = 0
with chess.syzygy.open_tablebase(tables) as tablebase:
    for item in positions:
        board = chess.Board(item['fen'])
        assert board.is_valid() and not board.is_game_over(), item['id']
        assert board.halfmove_clock == 0 and not board.castling_rights
        assert len(board.piece_map()) <= 5
        assert tablebase.probe_wdl(board) == item['wdl'], item['id']
        assert tablebase.probe_dtz(board) == item['dtz'], item['id']
        assert item['whiteOutcome'] == item['wdl'] * (1 if board.turn else -1)
        for move in list(board.legal_moves):
            board.push(move)
            assert tablebase.probe_wdl(board) in (-2, -1, 0, 1, 2)
            assert isinstance(tablebase.probe_dtz(board), int)
            board.pop()
            probed += 1
print(json.dumps(dict(status='pass',files=290,bytes=983957920,positions=24,legalContinuationsProbed=probed,pythonChess=chess.__version__)))
