# Chess960

- New game → Game options → GAME TYPE → Chess960; choose an optional position number, a compatible engine and side. Start, play and reload. Rematch preserves the start.
- Import a Chess960 PGN with FEN and nested variations. Use First position, Try a variation and king-to-rook clicks; save and reload the branch. Download PGN and study JSON with the variant intact.
- Practice this position inherits and locks the source game type. Drag-castle, wait for the real engine and Undo back to the initial position. The source tree stays intact.
- On mobile, tap king then rook. Check stationary-king castling and persisted study history. Position editor retains the variant, accepts rook-file rights and supports typed stationary-rook castling after saving.
- Existing Standard tests/flows stay protected. `server/chess960.test.mjs` compares all numbered starts and thousands of transitions to an independent local Python rules implementation; actual engines replay canonical king-to-rook UCI history.

The main harness appends these flows to its protected journey. Proof must contain screenshots 63–68 and video; a saved receipt alone is not visual acceptance. No account database or model weights belong in evidence.
