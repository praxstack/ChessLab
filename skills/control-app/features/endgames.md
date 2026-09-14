# Endgame practice

Main navigation: Endgames. Public browsing shows 24 original positions. Search endgames and Endgame material filter the list; Choose <title> selects a board, teaching note and solved starting result. Flip endgame board changes only the preview orientation. Starting FEN is read-only.

Practice endgame creates an owned source study and opens the existing Practice this position dialog. Choose an engine, strength, color, clock and assistance; Start position practice creates a separate owned game. Moves, hints, undo, resignation, review, Restart position and Return to source study use the existing game controls. Source metadata identifies the drill only at its original position. Restart preserves that identity; arbitrary variations remain separate position practice.

Endgame attempts lists owned saved attempts for the selected drill, actual result, color, native engine target, plies, hints and takebacks. Resume or Review opens the saved game. No client-declared completion, vendor rating or new progress table.

Verification: scripts/check_app_browser.cjs retains all 103 prior flows and adds seven covering catalogue filters, evidence, typed mate, native Black-side response, restart/hints/history, mobile touch underpromotion/resume, guest privacy and auth continuation. Run the complete harness with synthetic isolated accounts. server/endgames.test.mjs checks real native tablebase hits, fifty-move termination, ownership, restart, underpromotion and persistent records. data/explorer/.venv/bin/python scripts/check_endgame_tables.py verifies all 290 published hashes plus 24 catalogue positions and 371 legal continuations against local python-chess.

No runtime network requests. A low-strength opponent can make mistakes. Solved labels apply only to the displayed zero-counter initial position; no full vendor curriculum equivalence or measured learning benefit is claimed.
