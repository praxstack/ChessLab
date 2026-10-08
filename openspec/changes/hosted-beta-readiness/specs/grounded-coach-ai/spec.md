## Purpose

Let a learner ask Claude to explain the engine evidence for one position. The server supplies every chess fact, the model only explains it, and a deterministic engine summary stands in whenever the answer cannot be trusted or obtained.

## ADDED Requirements

### Requirement: AI-001 Evidence-only model input
The server SHALL replay the submitted history, obtain bounded engine analysis and send the model only structured evidence derived from them. The evidence comprises side to move, check state, legal move count, material, engine identity and search limits, and up to three candidate lines in SAN with capture and check flags. It also covers the played or asked move's classification, estimated loss and engine reply line. It MUST NOT include account identifiers, usernames, game identifiers, saved notes or free-form learner text. Evidence SHALL be refused when the analysed position does not match the replayed history.

#### Scenario: Explain a reviewed move
- **WHEN** a signed-in learner asks for an explanation of a position with engine evidence
- **THEN** the model request contains only the fixed instructions and that position's structured evidence, and the response names the engine, search time and depth it rests on

#### Scenario: Evidence matches the panel
- **WHEN** the learner has just analysed the position, or opens a saved full-game review step
- **THEN** the explanation reuses that same account's evidence for that exact position rather than a fresh search with different lines

### Requirement: AI-002 Server verification of cited moves
Every move the answer cites SHALL appear in the supplied evidence, and any "mate in N" claim SHALL match an engine mate score in it. Piece moves, captures, castling, promotions and checks written outside the required citation markers SHALL also count as citations. Bare square names are not checked. An answer that fails any check, is empty, too long, truncated or refused MUST be withheld and replaced by the deterministic engine summary.

#### Scenario: Invented move
- **WHEN** the model's answer cites a legal-looking move that is not in the evidence
- **THEN** the learner receives the deterministic engine summary with an "unverified claims" reason, and the model text is not shown

### Requirement: AI-003 Why-not follow-up from computed evidence
A follow-up SHALL name one move, in SAN or UCI, optionally after "why not". The server SHALL check that move is legal in the position before any model call. It SHALL then compute engine evidence for that move, its classification, loss and best reply line, and only then request an explanation. Illegal or unparseable moves MUST be rejected with an explicit error and no model call.

#### Scenario: Ask about an alternative
- **WHEN** the learner asks "Why not Nf3?" in a position where Nf3 is legal
- **THEN** the engine first evaluates Nf3, and the answer compares it only with moves present in the computed evidence

#### Scenario: Ask about an illegal move
- **WHEN** the learner asks about a move that is illegal in the position
- **THEN** the request is rejected with a recoverable error and Claude is not called

### Requirement: AI-004 Graceful fallback and private logging
When no API key is configured, the explanation control SHALL be hidden and existing review behaviour SHALL remain. When the model times out, is rate-limited or unreachable, rejects credentials, refuses or errors, the response SHALL be the deterministic engine summary with a short reason. Logs MUST record only the fallback reason and status. They MUST never record the API key, the prompt or learner data.

#### Scenario: Claude unavailable
- **WHEN** the server has no key, or the request exceeds its time limit
- **THEN** the learner sees the verified engine summary and a notice, and the review continues to work

### Requirement: AI-005 Bounded cost and load
Each account SHALL have an hourly explanation quota. The server SHALL cap concurrent model requests, each request's time and output tokens, and the engine time used for fresh evidence. Exceeding the quota SHALL return the deterministic summary with a rate-limit reason rather than an error page.

#### Scenario: Quota reached
- **WHEN** an account exceeds its hourly explanation quota
- **THEN** further explanations that hour return the engine summary with a rate-limit notice, and other accounts are unaffected

### Requirement: AI-006 Labelled explanations
Model answers SHALL be labelled as AI-generated, name the model, and state the engine, search time and depth they were grounded in, and that the engine lines remain the evidence. Fallback answers SHALL be labelled as the verified engine summary.

#### Scenario: Read an answer
- **WHEN** an explanation is shown
- **THEN** its label distinguishes an AI-generated explanation from the engine summary and cites its evidence source
