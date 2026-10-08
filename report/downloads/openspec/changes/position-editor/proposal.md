# Local custom position editor

Add the Set Up Position flow from the official analysis-board guide (read 13 September 2026): place, relocate and remove pieces, clear/reset/flip, choose side to move and castling rights, load FEN, then save an independent study for native analysis, variations and position practice. Include en-passant and move counters so the position is explicit.

Baseline: 8f5279f724ba28d8d2bfd305d72cd90d54ae6737 and the accepted position-practice recording. Preserve 61 application tests, original studies, rule history, account isolation, prior thresholds and verification gates. Mutable: editor UI, position validation/save route, existing FEN imports where they share the boundary, clock display for Black-first positions, and focused checks. Root implements and reviews; native team execution remains blocked by the installed runtime validator. Stop and reassess after two unsuccessful candidates without weakening gates.

This is part of full parity. Opening/drill collections, the full curriculum, conversational branching tutor, human multiplayer and billing remain unfinished. A custom FEN begins new history and cannot reconstruct repetition before it; editing a reviewed board therefore creates a separate study.
