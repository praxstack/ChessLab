# Chess960 rules boundary

## Grounding
BotSetup submits options to the game API. The server validates options, stores a JSON game in an owned SQLite row, and reconstructs its board from initialFen plus full UCI history before every move. Native UCI adapters independently validate engine continuations. Browser chess-state reconstructs the same history for the board and move list. Studies preserve main-line prefixes; PGN parsing walks every variation. Review and mistake practice bind engine evidence to history. FEN alone cannot retain repetition, and its castling field alone cannot identify a variant after rights disappear.

## Usage and shape
Callers use `createChess(initialFen, variant)` and existing `replay(moves, initialFen, variant)`. Game records add `variant: 'chess960'` and a numbered initial position where applicable; missing variant means Standard. A local Chess960 adapter hides chessops square/role types behind the board operations already used by the application. It owns UCI/SAN conversion, castling, history and repetition. Standard uses the unchanged chess.js implementation. A copied board retains its variant explicitly.

## Candidate A: Shared local rules adapter
Browser and server use the same variant-aware rules module. Existing replay callers pass a variant, engines set UCI_Chess960, and imports declare Variant. This hides rules and notation behind existing operations; callers still own their game history. No remote state or per-square request is needed.

## Candidate B: Server-authoritative Python board service
Reuse installed python-chess for all Chess960 moves and return board, legal targets and SAN through an API. This removes a browser rules dependency but exposes a new async position protocol to every board, branch, move list and study preview. It requires either a process per interaction or another long-running service. Offline board navigation would then depend on a running backend. Its smaller rules wrapper hides less application complexity.

## Synthesis
Choose A. Against the fixed criteria of legality, preserved history, existing-flow compatibility, local operation and interface depth, both can provide rules; A preserves synchronous replay and concentrates notation conversion. Graft B's existing python-chess implementation as an independent rules oracle. Reject a hand-written Chess960 move generator and a complete Standard rules migration. This comparison and judgment were performed sequentially by the root agent; installed Astra runtime validation prevents independent agents. No independent or cross-model architecture review is claimed.

## Frozen acceptance and rollback
Baseline/rollback: 2d58b3e53a5529e894adcb0ff6478b3516ca9ac1, installed application source 7b8d067eb5d475ccac38e6e2f27d46a967059b28. Preserve the existing 95 application tests and 87 app-control flows, their assertions and account data. Add differential checks against python-chess for all 960 starts and castling edge cases, plus saved variant, engine, branch, export and reload checks. Mutate only candidate application/specification additions and their new evidence; never change protected governance or weaken existing evaluators. Stop after two no-gain candidates and retain the last accepted installation. Source and proof receipts remain separate. No fixed user token budget exists.

## Tradeoffs and dependency
The adapter covers the existing board API, not every chess.js feature. A new GPL-3.0-or-later rules dependency is justified because the installed JavaScript rules library does not support Chess960. Pin chessops 0.15.1, retain its license/source attribution, and serve it locally. Standard opening statistics and puzzle corpora remain Standard-specific. Engine eligibility must be explicit; a Standard-trained model is not evidence of Chess960 support.

## Implementation findings
+ The threat preview needs an opponent-turn projection even when the player's king is checked. The adapter keeps this projection internal; game-position validation still rejects opposite check. Pinned defenders and en passant remain covered.
+ chessops caps textual FEN counters at four digits. The adapter retains numeric counters so the existing editor's 10,000 boundary and subsequent moves round-trip without truncation.
+ The strict browser source-preservation assertion exposed a pre-existing study-save response timestamp mismatch. The shared save route now returns exactly the record it writes. A deterministic test retains the strict full-record comparison; no timestamp is ignored.
