"""Independent python-chess oracle for numbered starts and castling transitions."""
import json
import random
import chess

assert chess.__version__ == '1.11.2'
rng = random.Random(960)
cases = []

def record(board, label):
    assert board.is_valid(), (label, board.status(), board.fen())
    moves = []
    for move in board.legal_moves:
        san = board.san(move)
        board.push(move)
        moves.append([move.uci(), san, board.shredder_fen()])
        board.pop()
    cases.append({'label': label, 'fen': board.shredder_fen(), 'moves': moves})

for number in range(960):
    board = chess.Board.from_chess960_pos(number)
    record(board, f'start:{number}')
    for square, piece in list(board.piece_map().items()):
        if piece.color == chess.WHITE and piece.piece_type not in (chess.KING, chess.ROOK):
            board.remove_piece_at(square)
    record(board, f'castle:white:{number}')
    record(board.mirror(), f'castle:black:{number}')

for number in (0, 42, 314, 518, 959):
    board = chess.Board.from_chess960_pos(number)
    for ply in range(80):
        record(board, f'game:{number}:{ply}')
        if board.is_game_over():
            break
        board.push(rng.choice(list(board.legal_moves)))

for fen in (
    '4k3/8/8/8/8/8/8/R1K4R w HA - 0 1',
    '4k3/8/8/8/8/8/8/R4KR1 w GA - 0 1',
    '4k3/8/8/8/8/8/8/R3KR2 w FA - 0 1',
    '4k3/8/8/8/8/8/8/R5KR w HA - 0 1',
    '4k3/8/8/8/8/8/8/1R1K3R w HB - 0 1',
    '4k3/8/8/8/8/8/8/2RK3R w HC - 0 1',
    '4kr2/8/8/8/8/8/8/R3K2R w HA - 0 1',
    '4k3/8/8/8/8/8/8/rR2K2R w HB - 0 1',
    '4k3/8/8/3pP3/8/8/8/R4KR1 w GA d6 0 1',
    '4k3/P7/8/8/8/8/8/R4KR1 w GA - 0 1',
):
    record(chess.Board(fen, chess960=True), fen)

print(json.dumps(cases, separators=(',', ':')))
