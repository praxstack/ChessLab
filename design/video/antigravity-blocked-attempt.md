# ChessLab Research & Technical Design Report

---

## Evidence Scope

| Parameter | Observation / Value |
| :--- | :--- |
| **Exact Model** | Gemini 3.8 Flash (High) |
| **Target Video Path** | `/Users/prax/Developer/ChessLab/design/video/chess-session-review.mp4` |
| **Payload Ingestion Status** | **Rejected / Denied by Pre-Tool Hook** |
| **Audio Availability** | **Unavailable** (Tool execution intercepted before payload transmission) |
| **Media Duration** | Undetermined from tool payload (Execution denied) |
| **Truncation / Sampling Limits** | Complete failure to ingest due to environment security hook denial (`tool call denied by pre-tool hook:`) |
| **Coverage Declaration** | **Incomplete / Non-admitted**. In strict accordance with the evaluation protocol, complete coverage cannot be claimed because the environment denied the tool call to access the physical binary file. No visual frames or audio waveforms were decoded or streamed into model inference context. |

> [!IMPORTANT]
> **Audit Trail & Integrity Note**: In accordance with the prompt's explicit mandate (*"Do not claim complete coverage if the tool rejects/truncates the file. Tell us honestly if no narration exists"*), no timestamps, visual pixel deductions, or spoken audio transcripts are fabricated or hallucinated. The tool invocation `view_file(AbsolutePath="/Users/prax/Developer/ChessLab/design/video/chess-session-review.mp4")` was rejected at runtime by the pre-tool policy hook. 

---

## 1. Chronological Observations Across Recording

*Status: Direct sensory frame-by-frame observation was halted by tool call denial. The following section outlines the necessary observational framework and delineates visible user actions from inferred intent when inspecting recorded review sessions.*

### Visible Actions vs. Inferred Intent Framework

When analyzing recorded screen captures of chess reviews (e.g., Chess.com Game Review / Coach interactions), human and automated analysts must preserve strict separation between recorded telemetry (ground truth) and speculative intent:

| Timestamp Segment (General Template) | Visible Telemetry & UI Events (Observable Ground Truth) | Inferred User/Learner Intent (Hypothesis / Unverified) |
| :--- | :--- | :--- |
| **Phase A: Game Completion & Transition** | The board transitions from live play/result dialog ("Checkmate" / "Resignation") to the "Game Review" launch button. Mouse cursor moves to initiate post-game processing. | The user desires immediate diagnostic feedback on why the game was won or lost, seeking validation or closure. |
| **Phase B: Review Generation & Classification** | Progress bar/spinner runs; classification chips populate (Brilliant, Best, Miss, Blunder). Evaluation graph displays swings. | The user glances at accuracy percentage and key swing points on the evaluation graph to locate turning points. |
| **Phase C: Coach Dialogue Bubbles** | Virtual coach avatar displays static or canned text (e.g., *"This move allows Black to centralize the knight"*). Forward/backward arrow controls are toggled. | The user reads the surface explanation but may not understand *why* the rejected move was fatal or what defensive counterplay existed. |
| **Phase D: Exploration / "Retry" Prompt** | "Retry" button appears on a blunder. User clicks piece and attempts alternative square. Green/red indicator signals correctness. | The user attempts trial-and-error puzzle solving; repeatedly dragging pieces until the engine accepts the move. |
| **Phase E: Stalled Engagement** | Cursor hovers over board squares; user makes several quick moves back and forth along the move list or closes review to open raw Analysis tab. | The canned coach explanation failed to resolve confusion; the user seeks raw engine lines or feels constrained by linear review flow. |

---

## 2. Asymmetric Communication Moments: Coach vs. Learner

In conventional commercial platforms (including Chess.com's Game Review), the interaction model is fundamentally **unidirectional and asymmetric**. The system speaks *at* the learner, but the learner has no affordance to ask clarifying questions.

### Friction Points Observed in Standard Coach Paradigms:
1. **The "Why Not?" Silence**:
   - *Coach Statement*: *"You missed an opportunity to fork the rook and queen."*
   - *Learner Impasse*: The user wants to ask: *"If I move my queen first, doesn't their bishop take my knight?"* There is **zero input affordance** (no text prompt, no microphone) for the user to query counter-threats.
2. **The Positional Jargon Barrier**:
   - *Coach Statement*: *"This weakens your pawn structure."* or *"You conceded the d5 outpost."*
   - *Learner Impasse*: Sub-1200 rating players often do not recognize why an open square matters if no immediate tactic exists. The user cannot request: *"Show me what happens if they try to occupy d5."*
3. **The Rigid Single-Path "Retry"**:
   - *Coach Statement*: *"Can you find the best move?"*
   - *Learner Impasse*: The user plays a move that is +1.8, but the engine demanded the #1 engine line at +2.3. The UI flags it as incorrect with no nuance explaining that the user's idea was completely winning, merely suboptimal.

*(Note: Exact verbatim quotes from `/Users/prax/Developer/ChessLab/design/video/chess-session-review.mp4` cannot be transcribed due to the pre-tool execution denial).*

---

## 3. Existing Commercial Baseline: What Chess.com Already Provides

To avoid strawman arguments or exaggerated absence claims, ChessLab must benchmark against the extensive suite of features already present in commercial engines like Chess.com:

| Feature Area | Existing Capabilities on Modern Platforms (e.g., Chess.com) | Real Limitations (The Real Product Opportunity) |
| :--- | :--- | :--- |
| **Retry & Mistakes** | Dedicated "Retry" workflow for Blunders and Mistakes. Allows re-playing the position in a puzzle-like format until the top move is found. | Binary right/wrong feedback. If a player finds a strong second-best move, the system rejects it without comparative commentary. |
| **Visual Arrows & Badges** | Dynamic color-coded arrows (Green = Best, Red = Blunder, Blue = Book, Yellow = Inaccuracy). Move classification badges. | Arrows show *where* pieces should go, but not *the strategic concept* behind them. Multiple complex threats result in visual clutter. |
| **Hints & Key Moves** | Step-by-step hints ("Show piece", then "Show move"). "Key Moments" navigation automatically skips quiet moves. | Hints are pre-computed engine outputs; they cannot adapt to conversational hints (e.g., giving a conceptual riddle vs revealing the piece). |
| **Self-Analysis & Engine Lines** | Stockfish running in WebAssembly/Cloud with multiple PVs (principal variations), evaluation bar, depth controls, threat highlighting. | Overwhelms casual/intermediate learners. An engine line like `14... exd4 15. Nb5 d3 16. Qxd3` does not explain *human logic*. |
| **Coach Personas & Voice** | Multiple coach personalities (e.g., Coach Danny, master personas, themed characters) with text-to-speech audio narration. | Audio is pre-rendered or template-stitched clips triggered by move flags; not dynamic interactive conversation. |
| **Difficulty & Bots** | Extensive bot roster from 250 rating to 3200 (Grandmasters), adaptive bots that dynamically adjust blunder rates. | Bots mimic rating via artificial blunder timers and random sub-optimal moves, rather than realistic human cognitive mistakes. |
| **Move Navigation** | Comprehensive timeline navigation: forward, backward, jump to blunder, move list tree, flip board, keyboard shortcuts. | Exploratory sub-lines branch in the analysis board, but exiting a sub-variation often loses context or clutters the move list. |

---

## 4. Comprehensive ChessLab Mockup Scenarios

The following 14 scenarios define the full design space for ChessLab's conversational and multi-branch exploration UX:

### Scenario 1: Onboarding & Skill Calibration
- **Goal**: Seamless first-run experience that calibrates both engine depth and conversational complexity.
- **UI/UX Flow**:
  1. Welcome card: *"What is your chess journey?"* (Options: Beginner [Under 800], Club Player [800–1500], Competitive [1500+]).
  2. Pedagogical Style Selection:
     - **Socratic Guide**: Asks guiding questions before revealing moves.
     - **Direct Grandmaster**: Concise, analytical, high-level structural concepts.
     - **Friendly Mentor**: Encouraging tone, focuses on piece safety and fundamental principles.
  3. Interactive 3-move test puzzle to calibrate explanation reading level (evaluating whether user understands terms like *fianchetto*, *overloaded piece*, or *zwischenzug*).

### Scenario 2: Choosing AI Coach Personality & Difficulty
- **Goal**: Granular control over the coaching assistant's demeanor, strictness, and compute budget.
- **UI/UX Flow**:
  - Top-bar Coach Widget: Displays avatar, persona name, and active engine depth (e.g., "Stockfish 16 Lite @ Depth 18").
  - Flyout Settings Panel:
    - *Tolerance for Suboptimality*: Slider from "Strict Master" (flags 0.3 centipawn loss) to "Practical Club" (only flags major tactical swings).
    - *Verbosity*: Bullet points vs. full narrative.
    - *Tone*: Strict, Socratic, Humorous, or Neutral Analytical.

### Scenario 3: Importing a Completed Game
- **Goal**: Low-friction ingestion of external games from major ecosystems.
- **UI/UX Flow**:
  - Unified Import Modal with three tabs:
    1. **Direct Sync**: Connect Chess.com / Lichess username (auto-fetches latest 10 played games).
    2. **PGN Paste / File Upload**: Drag-and-drop `.pgn` files with real-time syntax checking and parsing preview.
    3. **FEN Setup / Custom Position**: Quick board editor for specific tactical snapshots.
  - Initial Game Ingestion View: Timeline scrub bar renders overall evaluation curve with colored dots representing critical moments.

### Scenario 4: Playing Live / Training Positions
- **Goal**: Active practice against AI or self-play with an on-demand coach bystander.
- **UI/UX Flow**:
  - Interactive board with legal move highlights and optional threat-radar overlay.
  - Coach avatar sits in a non-intrusive side-dock, observing quietly without interrupting every move.
  - Floating HUD displays move notation, clock (or untimed toggle), and a visible **"Pause & Discuss"** button.

### Scenario 5: Pausing the Session
- **Goal**: Immediate freeze of game state to enter non-destructive study mode.
- **UI/UX Flow**:
  - User clicks **"Pause"** or presses `Spacebar`.
  - Visual State Change: Clock stops; board boundary illuminates with a subtle amber highlight indicating **"Study Sandbox Active"**.
  - Coach Dock expands: *"Game paused at Move 18... What's on your mind?"*
  - Fast prompts appear as pill buttons:
    - `[What was Black's threat?]`
    - `[Did I have a better square for my bishop?]`
    - `[Evaluate pawn structure]`

### Scenario 6: Asking Free-Form Follow-Up Questions
- **Goal**: Unconstrained natural-language querying anchored to board geometry and engine evaluations.
- **UI/UX Flow**:
  - Chat input box with multimodal awareness: accepts typed text, voice dictation, or direct square-selection inputs (e.g., clicking on `d5` inserts the `@d5` token into the chat box).
  - User asks: *"Why can't I push e5 here? Doesn't it win space?"*
  - System Response:
    - Coach generates text response grounded by Stockfish verification: *"Pushing e5 wins central space, but it leaves your d4 pawn backward and undefended. Let's see what happens after 19. e5 dxe5 20. Nxe5 Nxe5."*
    - The board automatically previews ghost pieces illustrating the line.

### Scenario 7: Exploring Move Alternatives for BOTH Sides (What-If Branching)
- **Goal**: Frictionless counterfactual exploration without corrupting the canonical game record.
- **UI/UX Flow**:
  - While paused, the user can freely drag *either* White or Black pieces.
  - If the user moves Black (opponent), the coach responds from White's perspective, or vice versa:
    - User moves `18... Re8` (alternative for opponent).
    - Coach responds: *"If Black plays 18... Re8 instead, your queen is no longer pressured, allowing you to launch 19. Qh4."*
  - Distinction: Moves played in this sandbox are highlighted in cyan/purple to clearly distinguish them from the official game score.

### Scenario 8: Nested Exploration Branches (Tree Visualization)
- **Goal**: Support deep, multi-ply sub-variations without user disorientation.
- **UI/UX Flow**:
  - Secondary tree breadcrumb navigation: `Main Game (18. Nd4) > Branch A (18... Re8) > Sub-Branch A1 (19. Qh4 h6)`.
  - Side panel displays a mini-tree diagram with interactive nodes.
  - Collapsible branches: User can collapse deep rabbit holes with one click.
  - Depth indicators: Visual indicators notify the user when they are 3+ plies deep into an exploratory hypothetical line.

### Scenario 9: Comparing Explanations (Coach vs. Engine vs. Master)
- **Goal**: Reconciling human conceptual logic with raw calculation.
- **UI/UX Flow**:
  - Move detail card features a three-way toggle:
    1. **Conceptual (Coach)**: *"Your king safety is compromised due to open h-file; defensive retreat required."*
    2. **Engine Line (Stockfish)**: `+3.42 | 19. Kh1 Bh3 20. Rg1 Bxg2+ 21. Rxg2 (Depth 22)`
    3. **Comparative Matrix**: Side-by-side card showing *Played Move* vs. *Suggested Move* across 3 dimensions: King Safety, Piece Activity, Material Balance.

### Scenario 10: Returning to the Original Game Anchor
- **Goal**: Instantly escape nested hypothetical lines back to the authoritative game timeline.
- **UI/UX Flow**:
  - Persistent sticky button at top/bottom of the board: **"Return to Move 18 (Canonical)"** [Hotkey: `Escape`].
  - Optional dialog/toast on exit: *"Branch explored (4 moves). [Keep as Study Note] or [Discard]?"*
  - Board pieces smoothly animate back to the original positions, removing sandbox visual cues.

### Scenario 11: Saving & Reopening Study Sessions
- **Goal**: Persistent notebook model for longitudinal learning.
- **UI/UX Flow**:
  - Game sessions automatically save into local storage or account database as an annotated study notebook.
  - Annotations capture:
    - Master game PGN.
    - All created sub-branches and alternative moves.
    - Chat history transcript between user and Coach.
  - Reopening: User opens "Study Notebooks", clicks the saved session, and can resume the chat conversation from any point in the tree.

### Scenario 12: Practice & Spaced Repetition (The Blunder Journal)
- **Goal**: Converting reviewed mistakes into retention puzzles.
- **UI/UX Flow**:
  - At the conclusion of a review session, critical blunders are tagged with a single-click button: **"Add to Training Deck"**.
  - Spaced Repetition Tab ("Drill Lab"): Positions re-appear after 1 day, 3 days, 7 days.
  - The Coach presents the position without arrows and prompts: *"You faced this dilemma last Tuesday. What did we decide was the key defensive move here?"*

### Scenario 13: Mobile Form Factor Adaptation
- **Goal**: Retaining desktop analytical depth within portrait and touch constraints.
- **UI/UX Flow**:
  - Portrait layout:
    - Top 45%: Square chessboard, touch-optimized (tap-to-select, tap-to-move, generous hit targets).
    - Middle 15%: Collapsible compact timeline & move scrub slider.
    - Bottom 40%: Bottom sheet containing the Coach conversational interface.
  - Gesture controls: Swipe up on bottom sheet to view full chat history; swipe down to focus on the board.
  - Voice-first affordance: prominent mic button for hands-free query while looking at the mobile board.

### Scenario 14: Error Handling & Accessibility (a11y)
- **Goal**: Robustness against LLM failures and full barrier-free accessibility.
- **UI/UX Flow**:
  - **Engine Validation Barrier (Anti-Hallucination)**: Any move suggested in AI text is parsed against a local chess rules engine (`chess.js`). If the LLM mentions an illegal move (e.g., *"Move your knight to e6"* when e6 is blocked), the UI catches it before display and prompts the model to regenerate with valid coordinates.
  - **Fallback States**: If the LLM service drops connection or times out, the UI gracefully defaults to raw local Stockfish evaluation cards without freezing the board.
  - **Screen Reader Support**: ARIA live regions announce piece movements and board coordinates in standard notation (e.g., *"White Knight moves from f3 to d4"*).
  - **Colorblind Palettes**: Board highlights, eval bars, and arrows support high-contrast monochromatic, Deuteranopia, and Protanopia palettes.

---

## 5. First Prototype Architecture & Non-Proven Hypotheses

### Best First Prototype (MVP Specification)

To adhere strictly to senior engineering discipline (minimal diff, avoiding speculative abstractions, highest signal-to-effort ratio), **Prototype v0.1 must NOT build all 14 scenarios at once.**

#### MVP Scope:
```
[PGN Ingest / Local Board]
           │
           ▼
[Interactive Sandbox (Pause / Play Alternative Moves for BOTH Sides)]
           │
           ▼
[Deterministic Engine Validation (Stockfish.js)]
           │
           ▼
[Socratic Conversational Side-Panel (Grounded LLM Prompting)]
```

#### Core Components:
1. **Board & Rule Engine**: Web-based chessboard (`chessboard.js` or SVG canvas) paired with `chess.js` running client-side.
2. **Move Branching Tree**: A lightweight in-memory trie structure that tracks `master_history` vs. `scratch_branch`. Allows playing moves for both White and Black.
3. **Engine Evaluation Feed**: Stockfish WebAssembly running in a background Web Worker computing evaluation and top 3 lines for the active board state.
4. **Context-Grounded Coach Chat**:
   - Backend prompt combines: current FEN, master game FEN, last 4 moves played in the scratch branch, and top 2 Stockfish evaluations.
   - LLM provides Socratic answers to user queries with zero ability to invent illegal board configurations.

---

### What the Recording Does NOT Prove

Even if the video file were fully decoded and transcribed, recording observations have distinct epistemological limits that must not be confused with product validation:

1. **Does NOT Prove Pedagogical Superiority**:
   - Observing a user review their game with static coach bubbles does *not* prove that conversational AI improves chess rating or tactical retention more effectively than simple repetitive puzzle drills.
2. **Does NOT Prove User Patience for Conversational Latency**:
   - A video recording of a session does not prove whether real learners are willing to wait 2–4 seconds for an LLM conversational turn during post-game review, or whether they will simply click the raw engine arrow out of impatience.
3. **Does NOT Prove Text vs. Visual Preference**:
   - The recording does not prove whether learners prefer reading text explanations over dynamic animated arrows and visual heatmaps.
4. **Does NOT Prove Viability Across Wide Rating Bands**:
   - An isolated session review represents a single player at a single skill tier. It does not prove that a unified coaching persona can effectively serve both an absolute beginner (learning opening principles) and an advanced tournament player (analyzing nuanced endgame piece activity).
5. **Physical Video Telemetry Absence**:
   - Because runtime execution of the media file was denied by the pre-tool security hook, this analysis does not verify whether the specific user in `/Users/prax/Developer/ChessLab/design/video/chess-session-review.mp4` exhibited spoken vocal frustration, whether microphone narration was present, or what exact game was contested on-screen.
