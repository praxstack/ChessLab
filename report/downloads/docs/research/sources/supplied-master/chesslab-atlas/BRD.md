# ChessLab Atlas: Clean-room Capability Map and Business Requirements Document

**Version:** 1.0  
**Research cut:** 7 September 2026  
**Audience:** Founder, product, design, engineering, legal, trust and safety, data, content, and go-to-market teams  
**Status:** Research-backed planning baseline, not legal approval or a claim of shipped parity

## 1. Direct answer

ChessLab should not be a visual copy of Chess.com. It should be a clean-room chess platform that maps the same broad capability territory, then wins on one durable difference: a branch-native conversational tutor that keeps every question, explanation, board annotation, engine line, learner prediction, and return point attached to the exact position where it belongs.

This dossier maps the full platform surface: acquisition, human play, Daily chess, bots, guided coach, review, self-analysis, opening exploration, collections, puzzles, lessons, practice, stats, broadcasts, community, tournaments, settings, accessibility, safety, memberships, APIs, data, and operations. It intentionally excludes copied Chess.com visual identity, text, proprietary assets, move-classification glyphs, sounds, confidential implementation, and automated harvesting.

## 2. Clean-room boundary

- Research uses publicly indexed first-party help and legal pages, plus the user-owned ChessLab repository context.
- Reference capability names are descriptive. ChessLab must create original information architecture, copy, icons, board themes, piece art, sounds, coach characters, and interaction details.
- No engine, coach, or recommendation may assist an ongoing human game. The Fair Play Lock is a P0 product invariant.
- Screenshots in this package depict the original ChessLab Atlas prototype, not Chess.com pages.

## 3. Product thesis

Most chess products answer “what is the best move?” ChessLab should answer the harder learning loop: “What did I believe, why did that belief fail here, what changes if the opponent chooses another reply, and can I recognize the idea later?” The product therefore treats a position as a durable workspace rather than a transient engine frame.

### 3.1 North-star experience
1. Play a human, bot, or guided coach game.
2. Review the completed game and select a confusing moment.
3. State a prediction or question before the answer is revealed.
4. Explore a legal alternative, then alternatives inside it.
5. Compare outcomes and evidence, return to the original game, and preserve the entire trail.
6. Complete a teach-back or delayed related retry so “understood” means more than reading prose.

## 4. Business objectives and success measures
- **Activation:** New members who complete a legal game or learning interaction and understand the next action within 24 hours.
- **Meaningful review rate:** Completed human games followed by at least one reviewed key moment or branch exploration.
- **Explanation usefulness:** Learner confirms understanding, succeeds on teach-back, or improves on a related retry.
- **Branch depth with return:** Sessions that explore nested alternatives and successfully return to the anchor without losing context.
- **Learning transfer:** Performance on delayed, structurally related positions rather than repetition of the exact line.
- **Healthy play:** Match completion, low abort rate, reconnect recovery and report-adjusted satisfaction.
- **Retention:** Weekly retained learners segmented by play-only, review, puzzle, lesson and coach cohorts.
- **Safety:** Abuse exposure, block/report resolution time, false-positive rate and protected-user incident rate.
- **Reliability:** Move latency, disconnect rate, clock disputes, analysis failures and study-save conflicts.
- **Unit economics:** Engine and model cost per meaningful learning session, premium conversion and gross margin.

## 5. Users and jobs to be done

- **New learner:** “Help me play legally, understand one idea at a time, and avoid feeling buried by engine notation.”
- **Adult improver:** “Show why my move failed, let me test my own alternatives, and remember the exact misunderstanding.”
- **Competitive player:** “Give me reproducible analysis, opening and phase statistics, and a study workspace that never corrupts the actual game.”
- **Coach or creator:** “Turn positions and branches into reusable, shareable teaching experiences with learner evidence.”
- **Community organizer:** “Run clubs, events and tournaments with clear roles, safety tools and auditability.”
- **Parent or protected learner:** “Allow chess learning with strict control over contact and public exposure.”

## 6. Scope and capability map

This baseline contains **180 mapped capabilities** across **18 domains**, **209 screen and state definitions**, and **215 requirements**.

### Acquisition & Onboarding
- **CAP-001 Landing proposition (P0)**: Explain play, learn, review and community value without requiring authentication. Sources: S33.
- **CAP-002 Multi-method registration (P0)**: Support email, phone and federated sign-in choices with duplicate-account protection. Sources: S29.
- **CAP-003 Age and consent gate (P0)**: Collect age band and parental consent where required before social features unlock. Sources: S32.
- **CAP-004 Skill calibration (P1)**: Ask for experience or infer a starting band, then tune onboarding content and bot strength. Sources: S12, S03.
- **CAP-005 Goal selection (P1)**: Let users choose play, rating improvement, tactics, openings or casual learning goals. Sources: S12, S13.
- **CAP-006 Coach preference (P1)**: Choose a coaching personality, voice and feedback intensity with neutral default. Sources: S04.
- **CAP-007 First success path (P0)**: Guide a new learner through one legal move, one explanation and one saved progress event. Sources: S04, S12.
- **CAP-008 Trial and plan education (P1)**: Explain free limits and premium value before checkout without hiding core play. Sources: S33.

### Home & Personalization
- **CAP-009 Modular home dashboard (P1)**: Allow home modules to be reordered, shown or hidden per user. Sources: S22.
- **CAP-010 Continue activity (P0)**: Surface active games, unfinished lessons, analysis drafts and branch conversations. Sources: S20, S08.
- **CAP-011 Quick play launcher (P0)**: Start a default game from the home surface in one action. Sources: S19.
- **CAP-012 Daily learning card (P1)**: Offer a daily puzzle or lesson with streak credit and recovery state. Sources: S10.
- **CAP-013 Progress pulse (P1)**: Summarize rating trends, accuracy, recent mistakes and recommended next action. Sources: S23, S24, S25.
- **CAP-014 Event discovery (P2)**: Show current and upcoming broadcasts or tournaments relevant to the user. Sources: S26, S15.
- **CAP-015 Social inbox summary (P2)**: Aggregate friend requests, messages, club activity and notifications. Sources: S28, S27.
- **CAP-016 Streaks and habits (P2)**: Track consecutive active days across play, puzzles, lessons and review. Sources: S10.

### Live Play
- **CAP-017 Time control presets (P0)**: Support standard Bullet, Blitz, Rapid and custom initial-plus-increment clocks. Sources: S19.
- **CAP-018 Rated or casual toggle (P0)**: Allow rated and unrated challenges with clear consequences. Sources: S19.
- **CAP-019 Rating range controls (P1)**: Set relative opponent rating bounds and warn about queue impact. Sources: S19.
- **CAP-020 Fast matchmaking (P0)**: Search narrow first, expand safely, and respect blocks and abuse controls. Sources: S19, S32.
- **CAP-021 Direct challenge (P1)**: Challenge a friend or named user with shareable acceptance state. Sources: S28.
- **CAP-022 Open challenge browser (P2)**: List and chart public seeks with filters and instant acceptance. Sources: S19.
- **CAP-023 Real-time game workspace (P0)**: Render board, clocks, move list, player cards, status and game actions in sync. Sources: S19.
- **CAP-024 Move entry methods (P0)**: Support click-click, drag, keyboard notation where accessible, and promotion choice. Sources: S29.
- **CAP-025 Premoves and confirmations (P1)**: Offer premoves and optional move confirmation by game type and device. Sources: S29.
- **CAP-026 Draw, resign, abort and timeout (P0)**: Model all terminal states, permissions and rating consequences. Sources: S31.
- **CAP-027 Reconnect and clock authority (P0)**: Resume transient disconnects while preserving server-authoritative clocks. Sources: S19.
- **CAP-028 Focus mode (P1)**: Collapse distractions to board, clocks and essential actions. Sources: S29.
- **CAP-029 Post-game hub (P0)**: Offer rematch, review, analysis, share, report and next-game actions. Sources: S05, S21, S31.

### Daily & Correspondence
- **CAP-030 Days-per-move games (P1)**: Support long-running games with per-move deadlines and multiple concurrent boards. Sources: S17.
- **CAP-031 Daily challenge filters (P2)**: Filter by move speed, minimum games, timeout history and membership. Sources: S17.
- **CAP-032 Vacation state (P2)**: Pause eligible clocks according to policy and expose remaining allowance. Sources: S17.
- **CAP-033 Conditional move trees (P2)**: Let players pre-author multiple response lines while it is the opponent turn. Sources: S17.
- **CAP-034 Allowed study workspace (P0)**: Permit non-engine self-analysis and opening reference only where policy allows. Sources: S30, S31.
- **CAP-035 Daily game notifications (P1)**: Send configurable turn, low-time, invitation and result reminders. Sources: S29.

### Bots & Guided Coach
- **CAP-036 Bot catalog (P1)**: Browse opponents by level, style, theme and completion state. Sources: S03.
- **CAP-037 Bot profile (P1)**: Show estimated strength, behavior description, optional assistance and rewards. Sources: S03.
- **CAP-038 Adaptive opponent (P2)**: Adjust challenge within bounded rules without misrepresenting calibrated human rating. Sources: S03.
- **CAP-039 Fixed engine opponent (P0)**: Expose deterministic strength settings and search limits for practice. Sources: S03.
- **CAP-040 Coach setup (P0)**: Choose strength, side, coach persona and assistance preferences before play. Sources: S04.
- **CAP-041 Move-by-move feedback (P0)**: Explain move quality and strategic consequence after each move in guided games. Sources: S04.
- **CAP-042 Hints and progressive reveal (P0)**: Offer concept hint first, candidate region second, best move last. Sources: S04.
- **CAP-043 Undo and retry (P0)**: Allow learner-safe reversal without affecting competitive ratings. Sources: S04.
- **CAP-044 Threat and suggestion overlays (P1)**: Render original visual arrows and highlights tied to verified board facts. Sources: S04.
- **CAP-045 Resume guided games (P1)**: Persist coach and bot sessions across navigation and devices. Sources: S04, S35.
- **CAP-046 Custom-position practice (P1)**: Start bot or coach play from imported FEN, game node or constructed setup. Sources: S13.

### Game Review & Analysis
- **CAP-047 Review generation (P0)**: Create a post-game analysis job with stable version, engine limits and progress state. Sources: S05, S07.
- **CAP-048 Review highlights (P0)**: Summarize accuracy, opening, result, advantage graph and decisive moments. Sources: S05.
- **CAP-049 Move classification (P0)**: Classify moves consistently, explain uncertainty and avoid proprietary glyph copying. Sources: S05, S02.
- **CAP-050 Key-moment navigation (P0)**: Jump among critical moments while keeping board, graph and explanation synchronized. Sources: S05.
- **CAP-051 Retry from mistake (P0)**: Let the learner replay a critical position and compare the new result. Sources: S05.
- **CAP-052 Coach narration (P1)**: Provide concise written feedback, optional audio and selectable detail level. Sources: S05.
- **CAP-053 Self-analysis board (P0)**: Explore legal continuations manually with engine toggle, lines and evaluation. Sources: S06.
- **CAP-054 Multi-line engine analysis (P0)**: Show bounded principal variations, depth, engine identity and score perspective. Sources: S06, S07.
- **CAP-055 Charts (P1)**: Plot score, time, best-move difference and learning themes against move index. Sources: S06.
- **CAP-056 Annotations (P0)**: Attach comments, arrows, square highlights, symbols and variation lines to nodes. Sources: S06, S21.
- **CAP-057 Cloud analysis tier (P1)**: Queue deeper server-side analysis with quotas, cancellation and cost controls. Sources: S07.
- **CAP-058 Import PGN and FEN (P0)**: Validate untrusted input, preserve the current study on failure and record provenance. Sources: S21.
- **CAP-059 Export annotated study (P0)**: Export PGN or native study with comments, branches, timestamps and engine metadata. Sources: S21.
- **CAP-060 Continue from position (P1)**: Launch legal practice or bot play from any completed-game or study node. Sources: S06.

### Branch-Native Conversational Tutor
- **CAP-061 History-bearing node model (P0)**: Store board state plus rule-relevant history, not FEN alone. Sources: S37.
- **CAP-062 Nested branch tree (P0)**: Create alternatives inside alternatives without altering the actual game line. Sources: S37.
- **CAP-063 Stable return anchors (P0)**: Return from exploration to the exact original node and preserve every sibling branch. Sources: S37.
- **CAP-064 Node-attached questions (P0)**: Bind each learner question and answer to a position, branch and evidence version. Sources: S37.
- **CAP-065 Ask why, what-if and compare (P0)**: Support causal questions, alternative replies and side-by-side branch comparison. Sources: S37.
- **CAP-066 Evidence panel (P0)**: Separate legal facts, engine estimates, demonstrated lines and uncertain explanations. Sources: S37.
- **CAP-067 Board-text agreement (P0)**: Guarantee that arrows, highlighted pieces, material counts and prose reference one node. Sources: S37.
- **CAP-068 Misunderstanding model (P1)**: Capture the learner prediction, expose the failing assumption and schedule a related retry. Sources: S37.
- **CAP-069 Teach-back check (P1)**: Ask the learner to explain the idea before revealing a polished summary. Sources: S37.
- **CAP-070 Spaced branch retry (P2)**: Revisit prior misunderstandings using transformed but related positions. Sources: S37.
- **CAP-071 Share and fork study (P1)**: Share a view-only or editable branch workspace with provenance and permissions. Sources: S08, S37.
- **CAP-072 Creator workspace (P2)**: Let coaches package branches, questions and retries into reusable studies. Sources: S37.

### Opening Explorer & Collections
- **CAP-073 Master opening database (P1)**: Show move frequency, outcomes, opening names and notable games by position. Sources: S09.
- **CAP-074 Personal opening explorer (P1)**: Filter the user game corpus by color, time class, date and continuation. Sources: S09, S23.
- **CAP-075 Opponent research boundary (P0)**: Allow completed public-game study while preventing live assistance. Sources: S30, S31.
- **CAP-076 Collection library (P1)**: Organize games and studies into private, public or shared collections. Sources: S08.
- **CAP-077 Collection roles (P1)**: Support owner, editor and viewer permissions with audit history. Sources: S08.
- **CAP-078 Community collections (P2)**: Discover, preview, bookmark and fork public study collections. Sources: S08.
- **CAP-079 Search and bulk actions (P1)**: Search games and studies, then move, tag, export or delete selected items. Sources: S08, S20.

### Puzzles & Tactics
- **CAP-080 Rated puzzle queue (P0)**: Serve rating-appropriate legal puzzles and update puzzle rating after full solution. Sources: S10.
- **CAP-081 Progressive puzzle feedback (P0)**: Show correctness, opponent replies, explanation and retry without leaking early. Sources: S10.
- **CAP-082 Puzzle Rush (P1)**: Run timed survival and fixed-duration modes with mistake limits and summaries. Sources: S10.
- **CAP-083 Puzzle Battle (P2)**: Match similar puzzle-battle ratings and synchronize score, timer and error state. Sources: S11.
- **CAP-084 Daily puzzle (P1)**: Publish one daily puzzle with local-day streak, discussion and share state. Sources: S10.
- **CAP-085 Custom puzzle filters (P1)**: Choose themes, rating band, failed-only and unrated learning mode. Sources: S10.
- **CAP-086 Puzzle history (P1)**: Review attempts, themes, accuracy, time and failed positions. Sources: S10.
- **CAP-087 Hearts or recovery model (P2)**: Allow limited errors in beginner-friendly modes without corrupting rated results. Sources: S10.
- **CAP-088 Puzzle taxonomy versioning (P1)**: Version themes so classification changes do not rewrite historical analytics silently. Sources: S10.

### Lessons, Practice & Curriculum
- **CAP-089 Structured learning path (P1)**: Sequence concepts by prerequisites, skill band and mastery checks. Sources: S12.
- **CAP-090 Lesson library (P1)**: Browse and filter courses by level, topic, format and instructor. Sources: S12.
- **CAP-091 Interactive lesson player (P0)**: Combine explanation, board challenge, feedback, progress and resume. Sources: S12.
- **CAP-092 Opening practice (P1)**: Select an opening and color, then practice required lines against a compliant bot. Sources: S13.
- **CAP-093 Master-game practice (P2)**: Enter key historical positions and compare learner choices with source games. Sources: S13.
- **CAP-094 Thematic drills (P1)**: Practice pawn structures, tactical motifs and strategic patterns repeatedly. Sources: S13.
- **CAP-095 Custom-position training (P1)**: Paste FEN or choose a saved node and define the training objective. Sources: S13.
- **CAP-096 Endgame curriculum (P1)**: Offer category, subtheme, challenge, practice and learn modes. Sources: S14.
- **CAP-097 Board vision trainer (P2)**: Train coordinates and move visualization with timed scoring and orientation options. Sources: S14.
- **CAP-098 Recommendation engine (P1)**: Recommend the next lesson or drill from demonstrated mistakes, not generic level alone. Sources: S05, S24.
- **CAP-099 Mastery and retry policy (P1)**: Require successful transfer or teach-back before marking a concept mastered. Sources: S37.

### Profile, Stats & Progress
- **CAP-100 Public profile (P1)**: Show identity, optional details, ratings, awards, clubs and recent public activity. Sources: S29.
- **CAP-101 Rating dashboards (P0)**: Track separate ratings and histories by time control and game type. Sources: S20.
- **CAP-102 Opening stats (P1)**: Show frequency, results and continuation trees with filters and mini-board. Sources: S23.
- **CAP-103 Advanced chess stats (P2)**: Measure opening, tactics, strategy and endgame strengths with explainable methodology. Sources: S25.
- **CAP-104 Insights workspace (P2)**: Analyze patterns by time class, date range, result, accuracy and activity time. Sources: S24.
- **CAP-105 Achievement system (P2)**: Award verifiable milestones and show locked criteria without pay-to-win ratings. Sources: S10.
- **CAP-106 Game archive (P0)**: Filter by game type, date, opponent, result and opening with stable pagination. Sources: S20.
- **CAP-107 Bot and coach privacy (P0)**: Keep guided-game history private by default and allow deletion. Sources: S03, S04.

### Watch, Events & Content
- **CAP-108 Live chess channel (P2)**: Provide an integrated current broadcast with schedule and chat policy. Sources: S26.
- **CAP-109 Event directory (P2)**: List ongoing and upcoming tournaments, leagues and broadcasts. Sources: S26.
- **CAP-110 Event broadcast board (P2)**: Synchronize board, clocks, standings, commentary, engine and video. Sources: S26.
- **CAP-111 Streamer directory (P2)**: List currently live creators and hand off to approved external platforms. Sources: S26.
- **CAP-112 Playing-now spectating (P2)**: Surface notable live games with delay and fair-play controls. Sources: S26, S31.
- **CAP-113 Editorial hub (P2)**: Publish news, recaps, instructional articles and author pages with moderation. Sources: S26.
- **CAP-114 Embeddable public views (P2)**: Generate safe embed codes for games, studies and events. Sources: S21, S26.

### Community & Social
- **CAP-115 Friends graph (P1)**: Send, accept, decline, cancel and limit friend requests. Sources: S28.
- **CAP-116 Follow graph (P2)**: Follow creators or players independently of mutual friendship. Sources: S28.
- **CAP-117 Persistent chat (P1)**: Keep one-to-one and group chat available across navigation with unread state. Sources: S28.
- **CAP-118 In-game chat controls (P0)**: Allow everyone, request-only, friends-only or disabled chat policies. Sources: S32.
- **CAP-119 Club discovery (P2)**: Search and browse clubs by interest, location, activity and language. Sources: S27.
- **CAP-120 Club membership workflow (P2)**: Support open, request-to-join and invitation-only membership. Sources: S27.
- **CAP-121 Club spaces (P2)**: Provide notes, forums, chat, matches, vote chess and events. Sources: S27.
- **CAP-122 Club roles and audit (P2)**: Model owner, super-admin, admin, coordinator and member permissions. Sources: S27.
- **CAP-123 Forums and comments (P2)**: Thread discussions with edits, reports, moderation and notification controls. Sources: S27, S31.
- **CAP-124 User blogs (P2)**: Let members publish moderated long-form posts and follow authors. Sources: S28.
- **CAP-125 Notifications center (P1)**: Aggregate social, game, learning, commerce and system notifications. Sources: S29.

### Tournaments & Variants
- **CAP-126 Arena tournaments (P2)**: Support continuous pairing, streak scoring, countdown and standings. Sources: S15.
- **CAP-127 Swiss tournaments (P2)**: Support scheduled rounds, pairings, tie-breaks and result correction workflow. Sources: S15.
- **CAP-128 Daily tournaments (P2)**: Support group stages, simultaneous round-robin games and advancement. Sources: S16.
- **CAP-129 Tournament creation (P2)**: Configure format, time control, visibility, eligibility and participant caps. Sources: S15, S16.
- **CAP-130 Tournament moderation (P2)**: Provide director controls, chat policy, removal, cancellation and audit logs. Sources: S15, S31.
- **CAP-131 Variant lobby (P3)**: Browse variants with play, lobby, arenas, watch, leaders and archive tabs. Sources: S18.
- **CAP-132 Custom variant editor (P3)**: Compose supported rule modules and validate starting positions. Sources: S18.
- **CAP-133 Variant-specific ratings (P3)**: Keep ratings and archives separate per variant and time class. Sources: S18.

### Settings, Accessibility & Devices
- **CAP-134 Board and piece themes (P1)**: Offer original or licensed themes, backgrounds, coordinates and animation choices. Sources: S29, S02.
- **CAP-135 Move and sound preferences (P1)**: Configure move method, legal markers, premoves, confirmations and sound themes. Sources: S29.
- **CAP-136 Gameplay settings (P1)**: Centralize live, daily, bot, coach and puzzle behavior preferences. Sources: S29.
- **CAP-137 Coach settings (P1)**: Choose persona, voice, appearance locations, autosave and feedback intensity. Sources: S04.
- **CAP-138 Notification routing (P1)**: Choose in-app, push and email delivery by notification category. Sources: S29.
- **CAP-139 Privacy controls (P0)**: Control profile fields, friends visibility, challenges and contact permissions. Sources: S29, S32.
- **CAP-140 Localization (P1)**: Support interface language, content language, locale, notation and timezone. Sources: S29.
- **CAP-141 Keyboard operation (P0)**: Make all game, review and learning workflows operable without dragging. Sources: S29.
- **CAP-142 Screen-reader semantics (P0)**: Expose board state, move list, clocks, alerts and annotations semantically. Sources: S29.
- **CAP-143 Reduced motion and contrast (P0)**: Respect OS preferences and provide accessible contrast modes. Sources: S29.
- **CAP-144 Responsive web (P0)**: Preserve complete core workflows from 320 px mobile to wide desktop. Sources: S35, S36.
- **CAP-145 Native-app parity matrix (P1)**: Document every web/mobile parity gap and degrade explicitly. Sources: S35, S36.
- **CAP-146 Offline drafts (P2)**: Allow local study notes and queued uploads without permitting offline competitive moves. Sources: S35.

### Trust, Safety & Fair Play
- **CAP-147 Fair Play Lock (P0)**: Disable engine, coach, recommendations and branch explanations for ongoing human games. Sources: S30, S31, S37.
- **CAP-148 Game-context policy engine (P0)**: Determine allowed tools from game type, status, rating and opponent class. Sources: S30, S31.
- **CAP-149 Report workflow (P0)**: Report cheating, abuse or illegal content with category, evidence and block option. Sources: S31, S32.
- **CAP-150 Block graph enforcement (P0)**: Apply blocks to messaging, challenges, matchmaking, tournaments and content. Sources: S32.
- **CAP-151 Safe mode (P1)**: Disable messages, chats and comments while preserving play and learning. Sources: S32.
- **CAP-152 Child safety controls (P0)**: Gate social access, parental consent and discovery based on age and jurisdiction. Sources: S32.
- **CAP-153 Moderation console (P1)**: Queue reports, preserve evidence, document actions and enforce least privilege. Sources: S31.
- **CAP-154 Fair-play case handling (P1)**: Separate automated signals, human review, appeals and rating restoration. Sources: S31.
- **CAP-155 Prompt-injection boundary (P0)**: Treat imported PGN, comments, chat and community content as untrusted data. Sources: S37.
- **CAP-156 Anti-harassment controls (P1)**: Rate-limit invitations and messages, detect spam patterns and allow quiet defaults. Sources: S32.
- **CAP-157 Audit trail (P0)**: Record sensitive admin, entitlement, moderation and analysis-policy decisions. Sources: S31.

### Membership, Commerce & Entitlements
- **CAP-158 Free core access (P0)**: Keep unlimited basic human chess while limiting selected analysis and learning extras. Sources: S33.
- **CAP-159 Tiered entitlement service (P1)**: Resolve Gold, Platinum, Diamond and promotional entitlements server-side. Sources: S33.
- **CAP-160 Usage meters (P1)**: Track review, coach, puzzle and cloud-analysis limits with reset and grace rules. Sources: S33, S07, S10.
- **CAP-161 Plan comparison (P1)**: Compare tiers by benefit, limit, renewal period and platform-specific billing. Sources: S33.
- **CAP-162 Trial lifecycle (P2)**: Support eligibility, reminders, conversion, cancellation and rollback. Sources: S33.
- **CAP-163 Upgrade proration (P2)**: Calculate unused value or extended time according to payment channel. Sources: S33.
- **CAP-164 Family plan (P2)**: Support one payer, up to five invited members and independent accounts. Sources: S34.
- **CAP-165 Student verification (P3)**: Apply country-specific discounts with eligibility and renewal checks. Sources: S33.
- **CAP-166 Gift membership (P3)**: Schedule delivery, recipient resolution and redemption with fraud controls. Sources: S33.
- **CAP-167 Billing and receipts (P1)**: Expose invoices, payment status, renewal date and support-safe identifiers. Sources: S33.

### Platform, Data & Operations
- **CAP-168 Authoritative chess rules service (P0)**: Validate legal moves, draw state, repetition and game termination server-side. Sources: S37.
- **CAP-169 Real-time game service (P0)**: Maintain rooms, clocks, move ordering, reconnection and event fan-out. Sources: S19.
- **CAP-170 Analysis job service (P0)**: Run bounded engine work asynchronously with cancellation, deduplication and versioning. Sources: S07, S37.
- **CAP-171 Coach evidence pipeline (P0)**: Generate explanations only from legal state, engine output and deterministic facts. Sources: S37.
- **CAP-172 Content management (P1)**: Version lessons, puzzles, articles, translations, prerequisites and publication state. Sources: S10, S12.
- **CAP-173 Search platform (P1)**: Index players, games, studies, clubs, events and content with permission filters. Sources: S08, S20, S27.
- **CAP-174 Object and media storage (P1)**: Store avatars, diagrams, exports and audio with scanning and lifecycle rules. Sources: S29.
- **CAP-175 Public API (P2)**: Expose documented read-only public data with rate limits and privacy exclusions. Sources: S02.
- **CAP-176 Webhooks and integrations (P3)**: Publish approved game, study and event updates with signed delivery. Sources: S02.
- **CAP-177 Experimentation system (P2)**: Assign controlled UX and learning experiments with consent and guardrails. Sources: S24.
- **CAP-178 Observability (P0)**: Trace game moves, websocket health, engine jobs, coach errors and entitlement checks. Sources: S38.
- **CAP-179 Backup and recovery (P0)**: Back up accounts, games, studies and content with tested restoration targets. Sources: S38.
- **CAP-180 Data export and deletion (P0)**: Support privacy access, portability, retention and deletion workflows. Sources: S29.

## 7. Functional requirements

### FR-001 - Landing proposition
**Domain:** Acquisition & Onboarding  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Explain play, learn, review and community value without requiring authentication.  
**Acceptance:** Given an eligible user and valid starting state, when the "Landing proposition" workflow is exercised, ChessLab shall explain play, learn, review and community value without requiring authentication; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S33

### FR-002 - Multi-method registration
**Domain:** Acquisition & Onboarding  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Support email, phone and federated sign-in choices with duplicate-account protection.  
**Acceptance:** Given an eligible user and valid starting state, when the "Multi-method registration" workflow is exercised, ChessLab shall support email, phone and federated sign-in choices with duplicate-account protection; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S29

### FR-003 - Age and consent gate
**Domain:** Acquisition & Onboarding  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Collect age band and parental consent where required before social features unlock.  
**Acceptance:** Given an eligible user and valid starting state, when the "Age and consent gate" workflow is exercised, ChessLab shall collect age band and parental consent where required before social features unlock; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S32

### FR-004 - Skill calibration
**Domain:** Acquisition & Onboarding  
**Priority:** P1  
**Phase:** Growth  
**Requirement:** Ask for experience or infer a starting band, then tune onboarding content and bot strength.  
**Acceptance:** Given an eligible user and valid starting state, when the "Skill calibration" workflow is exercised, ChessLab shall ask for experience or infer a starting band, then tune onboarding content and bot strength; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S12,S03

### FR-005 - Goal selection
**Domain:** Acquisition & Onboarding  
**Priority:** P1  
**Phase:** Growth  
**Requirement:** Let users choose play, rating improvement, tactics, openings or casual learning goals.  
**Acceptance:** Given an eligible user and valid starting state, when the "Goal selection" workflow is exercised, ChessLab shall let users choose play, rating improvement, tactics, openings or casual learning goals; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S12,S13

### FR-006 - Coach preference
**Domain:** Acquisition & Onboarding  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Choose a coaching personality, voice and feedback intensity with neutral default.  
**Acceptance:** Given an eligible user and valid starting state, when the "Coach preference" workflow is exercised, ChessLab shall choose a coaching personality, voice and feedback intensity with neutral default; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S04

### FR-007 - First success path
**Domain:** Acquisition & Onboarding  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Guide a new learner through one legal move, one explanation and one saved progress event.  
**Acceptance:** Given an eligible user and valid starting state, when the "First success path" workflow is exercised, ChessLab shall guide a new learner through one legal move, one explanation and one saved progress event; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S04,S12

### FR-008 - Trial and plan education
**Domain:** Acquisition & Onboarding  
**Priority:** P1  
**Phase:** Commerce  
**Requirement:** Explain free limits and premium value before checkout without hiding core play.  
**Acceptance:** Given an eligible user and valid starting state, when the "Trial and plan education" workflow is exercised, ChessLab shall explain free limits and premium value before checkout without hiding core play; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S33

### FR-009 - Modular home dashboard
**Domain:** Home & Personalization  
**Priority:** P1  
**Phase:** Growth  
**Requirement:** Allow home modules to be reordered, shown or hidden per user.  
**Acceptance:** Given an eligible user and valid starting state, when the "Modular home dashboard" workflow is exercised, ChessLab shall allow home modules to be reordered, shown or hidden per user; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S22

### FR-010 - Continue activity
**Domain:** Home & Personalization  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Surface active games, unfinished lessons, analysis drafts and branch conversations.  
**Acceptance:** Given an eligible user and valid starting state, when the "Continue activity" workflow is exercised, ChessLab shall surface active games, unfinished lessons, analysis drafts and branch conversations; verify that the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S20,S08

### FR-011 - Quick play launcher
**Domain:** Home & Personalization  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Start a default game from the home surface in one action.  
**Acceptance:** Given an eligible user and valid starting state, when the "Quick play launcher" workflow is exercised, ChessLab shall start a default game from the home surface in one action; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S19

### FR-012 - Daily learning card
**Domain:** Home & Personalization  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Offer a daily puzzle or lesson with streak credit and recovery state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Daily learning card" workflow is exercised, ChessLab shall offer a daily puzzle or lesson with streak credit and recovery state; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S10

### FR-013 - Progress pulse
**Domain:** Home & Personalization  
**Priority:** P1  
**Phase:** Insights  
**Requirement:** Summarize rating trends, accuracy, recent mistakes and recommended next action.  
**Acceptance:** Given an eligible user and valid starting state, when the "Progress pulse" workflow is exercised, ChessLab shall summarize rating trends, accuracy, recent mistakes and recommended next action; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S23,S24,S25

### FR-014 - Event discovery
**Domain:** Home & Personalization  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Show current and upcoming broadcasts or tournaments relevant to the user.  
**Acceptance:** Given an eligible user and valid starting state, when the "Event discovery" workflow is exercised, ChessLab shall show current and upcoming broadcasts or tournaments relevant to the user; verify that empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S26,S15

### FR-015 - Social inbox summary
**Domain:** Home & Personalization  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Aggregate friend requests, messages, club activity and notifications.  
**Acceptance:** Given an eligible user and valid starting state, when the "Social inbox summary" workflow is exercised, ChessLab shall aggregate friend requests, messages, club activity and notifications; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S28,S27

### FR-016 - Streaks and habits
**Domain:** Home & Personalization  
**Priority:** P2  
**Phase:** Growth  
**Requirement:** Track consecutive active days across play, puzzles, lessons and review.  
**Acceptance:** Given an eligible user and valid starting state, when the "Streaks and habits" workflow is exercised, ChessLab shall track consecutive active days across play, puzzles, lessons and review; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S10

### FR-017 - Time control presets
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Support standard Bullet, Blitz, Rapid and custom initial-plus-increment clocks.  
**Acceptance:** Given an eligible user and valid starting state, when the "Time control presets" workflow is exercised, ChessLab shall support standard Bullet, Blitz, Rapid and custom initial-plus-increment clocks; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19

### FR-018 - Rated or casual toggle
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Allow rated and unrated challenges with clear consequences.  
**Acceptance:** Given an eligible user and valid starting state, when the "Rated or casual toggle" workflow is exercised, ChessLab shall allow rated and unrated challenges with clear consequences; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19

### FR-019 - Rating range controls
**Domain:** Live Play  
**Priority:** P1  
**Phase:** Play  
**Requirement:** Set relative opponent rating bounds and warn about queue impact.  
**Acceptance:** Given an eligible user and valid starting state, when the "Rating range controls" workflow is exercised, ChessLab shall set relative opponent rating bounds and warn about queue impact; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19

### FR-020 - Fast matchmaking
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Search narrow first, expand safely, and respect blocks and abuse controls.  
**Acceptance:** Given an eligible user and valid starting state, when the "Fast matchmaking" workflow is exercised, ChessLab shall search narrow first, expand safely, and respect blocks and abuse controls; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19,S32

### FR-021 - Direct challenge
**Domain:** Live Play  
**Priority:** P1  
**Phase:** Play  
**Requirement:** Challenge a friend or named user with shareable acceptance state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Direct challenge" workflow is exercised, ChessLab shall challenge a friend or named user with shareable acceptance state; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S28

### FR-022 - Open challenge browser
**Domain:** Live Play  
**Priority:** P2  
**Phase:** Play  
**Requirement:** List and chart public seeks with filters and instant acceptance.  
**Acceptance:** Given an eligible user and valid starting state, when the "Open challenge browser" workflow is exercised, ChessLab shall list and chart public seeks with filters and instant acceptance; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19

### FR-023 - Real-time game workspace
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Render board, clocks, move list, player cards, status and game actions in sync.  
**Acceptance:** Given an eligible user and valid starting state, when the "Real-time game workspace" workflow is exercised, ChessLab shall render board, clocks, move list, player cards, status and game actions in sync; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19

### FR-024 - Move entry methods
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Support click-click, drag, keyboard notation where accessible, and promotion choice.  
**Acceptance:** Given an eligible user and valid starting state, when the "Move entry methods" workflow is exercised, ChessLab shall support click-click, drag, keyboard notation where accessible, and promotion choice; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S29

### FR-025 - Premoves and confirmations
**Domain:** Live Play  
**Priority:** P1  
**Phase:** Play  
**Requirement:** Offer premoves and optional move confirmation by game type and device.  
**Acceptance:** Given an eligible user and valid starting state, when the "Premoves and confirmations" workflow is exercised, ChessLab shall offer premoves and optional move confirmation by game type and device; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S29

### FR-026 - Draw, resign, abort and timeout
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Model all terminal states, permissions and rating consequences.  
**Acceptance:** Given an eligible user and valid starting state, when the "Draw, resign, abort and timeout" workflow is exercised, ChessLab shall model all terminal states, permissions and rating consequences; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S31

### FR-027 - Reconnect and clock authority
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Scale  
**Requirement:** Resume transient disconnects while preserving server-authoritative clocks.  
**Acceptance:** Given an eligible user and valid starting state, when the "Reconnect and clock authority" workflow is exercised, ChessLab shall resume transient disconnects while preserving server-authoritative clocks; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S19

### FR-028 - Focus mode
**Domain:** Live Play  
**Priority:** P1  
**Phase:** Play  
**Requirement:** Collapse distractions to board, clocks and essential actions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Focus mode" workflow is exercised, ChessLab shall collapse distractions to board, clocks and essential actions; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S29

### FR-029 - Post-game hub
**Domain:** Live Play  
**Priority:** P0  
**Phase:** Play  
**Requirement:** Offer rematch, review, analysis, share, report and next-game actions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Post-game hub" workflow is exercised, ChessLab shall offer rematch, review, analysis, share, report and next-game actions; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S05,S21,S31

### FR-030 - Days-per-move games
**Domain:** Daily & Correspondence  
**Priority:** P1  
**Phase:** Play  
**Requirement:** Support long-running games with per-move deadlines and multiple concurrent boards.  
**Acceptance:** Given an eligible user and valid starting state, when the "Days-per-move games" workflow is exercised, ChessLab shall support long-running games with per-move deadlines and multiple concurrent boards; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S17

### FR-031 - Daily challenge filters
**Domain:** Daily & Correspondence  
**Priority:** P2  
**Phase:** Play  
**Requirement:** Filter by move speed, minimum games, timeout history and membership.  
**Acceptance:** Given an eligible user and valid starting state, when the "Daily challenge filters" workflow is exercised, ChessLab shall filter by move speed, minimum games, timeout history and membership; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S17

### FR-032 - Vacation state
**Domain:** Daily & Correspondence  
**Priority:** P2  
**Phase:** Play  
**Requirement:** Pause eligible clocks according to policy and expose remaining allowance.  
**Acceptance:** Given an eligible user and valid starting state, when the "Vacation state" workflow is exercised, ChessLab shall pause eligible clocks according to policy and expose remaining allowance; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S17

### FR-033 - Conditional move trees
**Domain:** Daily & Correspondence  
**Priority:** P2  
**Phase:** Play  
**Requirement:** Let players pre-author multiple response lines while it is the opponent turn.  
**Acceptance:** Given an eligible user and valid starting state, when the "Conditional move trees" workflow is exercised, ChessLab shall let players pre-author multiple response lines while it is the opponent turn; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S17

### FR-034 - Allowed study workspace
**Domain:** Daily & Correspondence  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Permit non-engine self-analysis and opening reference only where policy allows.  
**Acceptance:** Given an eligible user and valid starting state, when the "Allowed study workspace" workflow is exercised, ChessLab shall permit non-engine self-analysis and opening reference only where policy allows; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S30,S31

### FR-035 - Daily game notifications
**Domain:** Daily & Correspondence  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Send configurable turn, low-time, invitation and result reminders.  
**Acceptance:** Given an eligible user and valid starting state, when the "Daily game notifications" workflow is exercised, ChessLab shall send configurable turn, low-time, invitation and result reminders; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S29

### FR-036 - Bot catalog
**Domain:** Bots & Guided Coach  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Browse opponents by level, style, theme and completion state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Bot catalog" workflow is exercised, ChessLab shall browse opponents by level, style, theme and completion state; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S03

### FR-037 - Bot profile
**Domain:** Bots & Guided Coach  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Show estimated strength, behavior description, optional assistance and rewards.  
**Acceptance:** Given an eligible user and valid starting state, when the "Bot profile" workflow is exercised, ChessLab shall show estimated strength, behavior description, optional assistance and rewards; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S03

### FR-038 - Adaptive opponent
**Domain:** Bots & Guided Coach  
**Priority:** P2  
**Phase:** Coach  
**Requirement:** Adjust challenge within bounded rules without misrepresenting calibrated human rating.  
**Acceptance:** Given an eligible user and valid starting state, when the "Adaptive opponent" workflow is exercised, ChessLab shall adjust challenge within bounded rules without misrepresenting calibrated human rating; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S03

### FR-039 - Fixed engine opponent
**Domain:** Bots & Guided Coach  
**Priority:** P0  
**Phase:** Coach  
**Requirement:** Expose deterministic strength settings and search limits for practice.  
**Acceptance:** Given an eligible user and valid starting state, when the "Fixed engine opponent" workflow is exercised, ChessLab shall expose deterministic strength settings and search limits for practice; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S03

### FR-040 - Coach setup
**Domain:** Bots & Guided Coach  
**Priority:** P0  
**Phase:** Coach  
**Requirement:** Choose strength, side, coach persona and assistance preferences before play.  
**Acceptance:** Given an eligible user and valid starting state, when the "Coach setup" workflow is exercised, ChessLab shall choose strength, side, coach persona and assistance preferences before play; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S04

### FR-041 - Move-by-move feedback
**Domain:** Bots & Guided Coach  
**Priority:** P0  
**Phase:** Coach  
**Requirement:** Explain move quality and strategic consequence after each move in guided games.  
**Acceptance:** Given an eligible user and valid starting state, when the "Move-by-move feedback" workflow is exercised, ChessLab shall explain move quality and strategic consequence after each move in guided games; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S04

### FR-042 - Hints and progressive reveal
**Domain:** Bots & Guided Coach  
**Priority:** P0  
**Phase:** Coach  
**Requirement:** Offer concept hint first, candidate region second, best move last.  
**Acceptance:** Given an eligible user and valid starting state, when the "Hints and progressive reveal" workflow is exercised, ChessLab shall offer concept hint first, candidate region second, best move last; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S04

### FR-043 - Undo and retry
**Domain:** Bots & Guided Coach  
**Priority:** P0  
**Phase:** Coach  
**Requirement:** Allow learner-safe reversal without affecting competitive ratings.  
**Acceptance:** Given an eligible user and valid starting state, when the "Undo and retry" workflow is exercised, ChessLab shall allow learner-safe reversal without affecting competitive ratings; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S04

### FR-044 - Threat and suggestion overlays
**Domain:** Bots & Guided Coach  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Render original visual arrows and highlights tied to verified board facts.  
**Acceptance:** Given an eligible user and valid starting state, when the "Threat and suggestion overlays" workflow is exercised, ChessLab shall render original visual arrows and highlights tied to verified board facts; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S04

### FR-045 - Resume guided games
**Domain:** Bots & Guided Coach  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Persist coach and bot sessions across navigation and devices.  
**Acceptance:** Given an eligible user and valid starting state, when the "Resume guided games" workflow is exercised, ChessLab shall persist coach and bot sessions across navigation and devices; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S04,S35

### FR-046 - Custom-position practice
**Domain:** Bots & Guided Coach  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Start bot or coach play from imported FEN, game node or constructed setup.  
**Acceptance:** Given an eligible user and valid starting state, when the "Custom-position practice" workflow is exercised, ChessLab shall start bot or coach play from imported FEN, game node or constructed setup; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S13

### FR-047 - Review generation
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Create a post-game analysis job with stable version, engine limits and progress state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Review generation" workflow is exercised, ChessLab shall create a post-game analysis job with stable version, engine limits and progress state; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S05,S07

### FR-048 - Review highlights
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Summarize accuracy, opening, result, advantage graph and decisive moments.  
**Acceptance:** Given an eligible user and valid starting state, when the "Review highlights" workflow is exercised, ChessLab shall summarize accuracy, opening, result, advantage graph and decisive moments; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S05

### FR-049 - Move classification
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Classify moves consistently, explain uncertainty and avoid proprietary glyph copying.  
**Acceptance:** Given an eligible user and valid starting state, when the "Move classification" workflow is exercised, ChessLab shall classify moves consistently, explain uncertainty and avoid proprietary glyph copying; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S05,S02

### FR-050 - Key-moment navigation
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Jump among critical moments while keeping board, graph and explanation synchronized.  
**Acceptance:** Given an eligible user and valid starting state, when the "Key-moment navigation" workflow is exercised, ChessLab shall jump among critical moments while keeping board, graph and explanation synchronized; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S05

### FR-051 - Retry from mistake
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Let the learner replay a critical position and compare the new result.  
**Acceptance:** Given an eligible user and valid starting state, when the "Retry from mistake" workflow is exercised, ChessLab shall let the learner replay a critical position and compare the new result; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S05

### FR-052 - Coach narration
**Domain:** Game Review & Analysis  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Provide concise written feedback, optional audio and selectable detail level.  
**Acceptance:** Given an eligible user and valid starting state, when the "Coach narration" workflow is exercised, ChessLab shall provide concise written feedback, optional audio and selectable detail level; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S05

### FR-053 - Self-analysis board
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Explore legal continuations manually with engine toggle, lines and evaluation.  
**Acceptance:** Given an eligible user and valid starting state, when the "Self-analysis board" workflow is exercised, ChessLab shall explore legal continuations manually with engine toggle, lines and evaluation; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S06

### FR-054 - Multi-line engine analysis
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Show bounded principal variations, depth, engine identity and score perspective.  
**Acceptance:** Given an eligible user and valid starting state, when the "Multi-line engine analysis" workflow is exercised, ChessLab shall show bounded principal variations, depth, engine identity and score perspective; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S06,S07

### FR-055 - Charts
**Domain:** Game Review & Analysis  
**Priority:** P1  
**Phase:** Insights  
**Requirement:** Plot score, time, best-move difference and learning themes against move index.  
**Acceptance:** Given an eligible user and valid starting state, when the "Charts" workflow is exercised, ChessLab shall plot score, time, best-move difference and learning themes against move index; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S06

### FR-056 - Annotations
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Attach comments, arrows, square highlights, symbols and variation lines to nodes.  
**Acceptance:** Given an eligible user and valid starting state, when the "Annotations" workflow is exercised, ChessLab shall attach comments, arrows, square highlights, symbols and variation lines to nodes; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S06,S21

### FR-057 - Cloud analysis tier
**Domain:** Game Review & Analysis  
**Priority:** P1  
**Phase:** Scale  
**Requirement:** Queue deeper server-side analysis with quotas, cancellation and cost controls.  
**Acceptance:** Given an eligible user and valid starting state, when the "Cloud analysis tier" workflow is exercised, ChessLab shall queue deeper server-side analysis with quotas, cancellation and cost controls; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S07

### FR-058 - Import PGN and FEN
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Validate untrusted input, preserve the current study on failure and record provenance.  
**Acceptance:** Given an eligible user and valid starting state, when the "Import PGN and FEN" workflow is exercised, ChessLab shall validate untrusted input, preserve the current study on failure and record provenance; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; malformed or oversized input is rejected without replacing the current game or study, and accepted input retains provenance.  
**Evidence:** S21

### FR-059 - Export annotated study
**Domain:** Game Review & Analysis  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Export PGN or native study with comments, branches, timestamps and engine metadata.  
**Acceptance:** Given an eligible user and valid starting state, when the "Export annotated study" workflow is exercised, ChessLab shall export PGN or native study with comments, branches, timestamps and engine metadata; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; private or revoked content is never exposed and the exported representation round-trips supported data.  
**Evidence:** S21

### FR-060 - Continue from position
**Domain:** Game Review & Analysis  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Launch legal practice or bot play from any completed-game or study node.  
**Acceptance:** Given an eligible user and valid starting state, when the "Continue from position" workflow is exercised, ChessLab shall launch legal practice or bot play from any completed-game or study node; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S06

### FR-061 - History-bearing node model
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Store board state plus rule-relevant history, not FEN alone.  
**Acceptance:** Given an eligible user and valid starting state, when the "History-bearing node model" workflow is exercised, ChessLab shall store board state plus rule-relevant history, not FEN alone; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S37

### FR-062 - Nested branch tree
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Create alternatives inside alternatives without altering the actual game line.  
**Acceptance:** Given an eligible user and valid starting state, when the "Nested branch tree" workflow is exercised, ChessLab shall create alternatives inside alternatives without altering the actual game line; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-063 - Stable return anchors
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Return from exploration to the exact original node and preserve every sibling branch.  
**Acceptance:** Given an eligible user and valid starting state, when the "Stable return anchors" workflow is exercised, ChessLab shall return from exploration to the exact original node and preserve every sibling branch; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-064 - Node-attached questions
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Bind each learner question and answer to a position, branch and evidence version.  
**Acceptance:** Given an eligible user and valid starting state, when the "Node-attached questions" workflow is exercised, ChessLab shall bind each learner question and answer to a position, branch and evidence version; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-065 - Ask why, what-if and compare
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Support causal questions, alternative replies and side-by-side branch comparison.  
**Acceptance:** Given an eligible user and valid starting state, when the "Ask why, what-if and compare" workflow is exercised, ChessLab shall support causal questions, alternative replies and side-by-side branch comparison; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-066 - Evidence panel
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Separate legal facts, engine estimates, demonstrated lines and uncertain explanations.  
**Acceptance:** Given an eligible user and valid starting state, when the "Evidence panel" workflow is exercised, ChessLab shall separate legal facts, engine estimates, demonstrated lines and uncertain explanations; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-067 - Board-text agreement
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P0  
**Phase:** Differentiator  
**Requirement:** Guarantee that arrows, highlighted pieces, material counts and prose reference one node.  
**Acceptance:** Given an eligible user and valid starting state, when the "Board-text agreement" workflow is exercised, ChessLab shall guarantee that arrows, highlighted pieces, material counts and prose reference one node; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-068 - Misunderstanding model
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P1  
**Phase:** Differentiator  
**Requirement:** Capture the learner prediction, expose the failing assumption and schedule a related retry.  
**Acceptance:** Given an eligible user and valid starting state, when the "Misunderstanding model" workflow is exercised, ChessLab shall capture the learner prediction, expose the failing assumption and schedule a related retry; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-069 - Teach-back check
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Ask the learner to explain the idea before revealing a polished summary.  
**Acceptance:** Given an eligible user and valid starting state, when the "Teach-back check" workflow is exercised, ChessLab shall ask the learner to explain the idea before revealing a polished summary; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-070 - Spaced branch retry
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P2  
**Phase:** Learning  
**Requirement:** Revisit prior misunderstandings using transformed but related positions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Spaced branch retry" workflow is exercised, ChessLab shall revisit prior misunderstandings using transformed but related positions; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-071 - Share and fork study
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P1  
**Phase:** Collaboration  
**Requirement:** Share a view-only or editable branch workspace with provenance and permissions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Share and fork study" workflow is exercised, ChessLab shall share a view-only or editable branch workspace with provenance and permissions; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; private or revoked content is never exposed and the exported representation round-trips supported data.  
**Evidence:** S08,S37

### FR-072 - Creator workspace
**Domain:** Branch-Native Conversational Tutor  
**Priority:** P2  
**Phase:** Collaboration  
**Requirement:** Let coaches package branches, questions and retries into reusable studies.  
**Acceptance:** Given an eligible user and valid starting state, when the "Creator workspace" workflow is exercised, ChessLab shall let coaches package branches, questions and retries into reusable studies; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S37

### FR-073 - Master opening database
**Domain:** Opening Explorer & Collections  
**Priority:** P1  
**Phase:** Analysis  
**Requirement:** Show move frequency, outcomes, opening names and notable games by position.  
**Acceptance:** Given an eligible user and valid starting state, when the "Master opening database" workflow is exercised, ChessLab shall show move frequency, outcomes, opening names and notable games by position; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution.  
**Evidence:** S09

### FR-074 - Personal opening explorer
**Domain:** Opening Explorer & Collections  
**Priority:** P1  
**Phase:** Insights  
**Requirement:** Filter the user game corpus by color, time class, date and continuation.  
**Acceptance:** Given an eligible user and valid starting state, when the "Personal opening explorer" workflow is exercised, ChessLab shall filter the user game corpus by color, time class, date and continuation; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S09,S23

### FR-075 - Opponent research boundary
**Domain:** Opening Explorer & Collections  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Allow completed public-game study while preventing live assistance.  
**Acceptance:** Given an eligible user and valid starting state, when the "Opponent research boundary" workflow is exercised, ChessLab shall allow completed public-game study while preventing live assistance; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S30,S31

### FR-076 - Collection library
**Domain:** Opening Explorer & Collections  
**Priority:** P1  
**Phase:** Collaboration  
**Requirement:** Organize games and studies into private, public or shared collections.  
**Acceptance:** Given an eligible user and valid starting state, when the "Collection library" workflow is exercised, ChessLab shall organize games and studies into private, public or shared collections; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S08

### FR-077 - Collection roles
**Domain:** Opening Explorer & Collections  
**Priority:** P1  
**Phase:** Collaboration  
**Requirement:** Support owner, editor and viewer permissions with audit history.  
**Acceptance:** Given an eligible user and valid starting state, when the "Collection roles" workflow is exercised, ChessLab shall support owner, editor and viewer permissions with audit history; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S08

### FR-078 - Community collections
**Domain:** Opening Explorer & Collections  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Discover, preview, bookmark and fork public study collections.  
**Acceptance:** Given an eligible user and valid starting state, when the "Community collections" workflow is exercised, ChessLab shall discover, preview, bookmark and fork public study collections; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S08

### FR-079 - Search and bulk actions
**Domain:** Opening Explorer & Collections  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Search games and studies, then move, tag, export or delete selected items.  
**Acceptance:** Given an eligible user and valid starting state, when the "Search and bulk actions" workflow is exercised, ChessLab shall search games and studies, then move, tag, export or delete selected items; verify that the displayed board, move history, score perspective, evidence version and explanation refer to the same immutable node; an ongoing human game is rejected before engine or coach execution; empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S08,S20

### FR-080 - Rated puzzle queue
**Domain:** Puzzles & Tactics  
**Priority:** P0  
**Phase:** Learning  
**Requirement:** Serve rating-appropriate legal puzzles and update puzzle rating after full solution.  
**Acceptance:** Given an eligible user and valid starting state, when the "Rated puzzle queue" workflow is exercised, ChessLab shall serve rating-appropriate legal puzzles and update puzzle rating after full solution; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-081 - Progressive puzzle feedback
**Domain:** Puzzles & Tactics  
**Priority:** P0  
**Phase:** Learning  
**Requirement:** Show correctness, opponent replies, explanation and retry without leaking early.  
**Acceptance:** Given an eligible user and valid starting state, when the "Progressive puzzle feedback" workflow is exercised, ChessLab shall show correctness, opponent replies, explanation and retry without leaking early; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-082 - Puzzle Rush
**Domain:** Puzzles & Tactics  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Run timed survival and fixed-duration modes with mistake limits and summaries.  
**Acceptance:** Given an eligible user and valid starting state, when the "Puzzle Rush" workflow is exercised, ChessLab shall run timed survival and fixed-duration modes with mistake limits and summaries; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-083 - Puzzle Battle
**Domain:** Puzzles & Tactics  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Match similar puzzle-battle ratings and synchronize score, timer and error state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Puzzle Battle" workflow is exercised, ChessLab shall match similar puzzle-battle ratings and synchronize score, timer and error state; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S11

### FR-084 - Daily puzzle
**Domain:** Puzzles & Tactics  
**Priority:** P1  
**Phase:** Growth  
**Requirement:** Publish one daily puzzle with local-day streak, discussion and share state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Daily puzzle" workflow is exercised, ChessLab shall publish one daily puzzle with local-day streak, discussion and share state; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-085 - Custom puzzle filters
**Domain:** Puzzles & Tactics  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Choose themes, rating band, failed-only and unrated learning mode.  
**Acceptance:** Given an eligible user and valid starting state, when the "Custom puzzle filters" workflow is exercised, ChessLab shall choose themes, rating band, failed-only and unrated learning mode; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-086 - Puzzle history
**Domain:** Puzzles & Tactics  
**Priority:** P1  
**Phase:** Insights  
**Requirement:** Review attempts, themes, accuracy, time and failed positions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Puzzle history" workflow is exercised, ChessLab shall review attempts, themes, accuracy, time and failed positions; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S10

### FR-087 - Hearts or recovery model
**Domain:** Puzzles & Tactics  
**Priority:** P2  
**Phase:** Learning  
**Requirement:** Allow limited errors in beginner-friendly modes without corrupting rated results.  
**Acceptance:** Given an eligible user and valid starting state, when the "Hearts or recovery model" workflow is exercised, ChessLab shall allow limited errors in beginner-friendly modes without corrupting rated results; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-088 - Puzzle taxonomy versioning
**Domain:** Puzzles & Tactics  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Version themes so classification changes do not rewrite historical analytics silently.  
**Acceptance:** Given an eligible user and valid starting state, when the "Puzzle taxonomy versioning" workflow is exercised, ChessLab shall version themes so classification changes do not rewrite historical analytics silently; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S10

### FR-089 - Structured learning path
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Sequence concepts by prerequisites, skill band and mastery checks.  
**Acceptance:** Given an eligible user and valid starting state, when the "Structured learning path" workflow is exercised, ChessLab shall sequence concepts by prerequisites, skill band and mastery checks; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S12

### FR-090 - Lesson library
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Browse and filter courses by level, topic, format and instructor.  
**Acceptance:** Given an eligible user and valid starting state, when the "Lesson library" workflow is exercised, ChessLab shall browse and filter courses by level, topic, format and instructor; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S12

### FR-091 - Interactive lesson player
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P0  
**Phase:** Learning  
**Requirement:** Combine explanation, board challenge, feedback, progress and resume.  
**Acceptance:** Given an eligible user and valid starting state, when the "Interactive lesson player" workflow is exercised, ChessLab shall combine explanation, board challenge, feedback, progress and resume; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S12

### FR-092 - Opening practice
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Select an opening and color, then practice required lines against a compliant bot.  
**Acceptance:** Given an eligible user and valid starting state, when the "Opening practice" workflow is exercised, ChessLab shall select an opening and color, then practice required lines against a compliant bot; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S13

### FR-093 - Master-game practice
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P2  
**Phase:** Learning  
**Requirement:** Enter key historical positions and compare learner choices with source games.  
**Acceptance:** Given an eligible user and valid starting state, when the "Master-game practice" workflow is exercised, ChessLab shall enter key historical positions and compare learner choices with source games; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S13

### FR-094 - Thematic drills
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Practice pawn structures, tactical motifs and strategic patterns repeatedly.  
**Acceptance:** Given an eligible user and valid starting state, when the "Thematic drills" workflow is exercised, ChessLab shall practice pawn structures, tactical motifs and strategic patterns repeatedly; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S13

### FR-095 - Custom-position training
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Paste FEN or choose a saved node and define the training objective.  
**Acceptance:** Given an eligible user and valid starting state, when the "Custom-position training" workflow is exercised, ChessLab shall paste FEN or choose a saved node and define the training objective; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S13

### FR-096 - Endgame curriculum
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Offer category, subtheme, challenge, practice and learn modes.  
**Acceptance:** Given an eligible user and valid starting state, when the "Endgame curriculum" workflow is exercised, ChessLab shall offer category, subtheme, challenge, practice and learn modes; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S14

### FR-097 - Board vision trainer
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P2  
**Phase:** Learning  
**Requirement:** Train coordinates and move visualization with timed scoring and orientation options.  
**Acceptance:** Given an eligible user and valid starting state, when the "Board vision trainer" workflow is exercised, ChessLab shall train coordinates and move visualization with timed scoring and orientation options; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S14

### FR-098 - Recommendation engine
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Insights  
**Requirement:** Recommend the next lesson or drill from demonstrated mistakes, not generic level alone.  
**Acceptance:** Given an eligible user and valid starting state, when the "Recommendation engine" workflow is exercised, ChessLab shall recommend the next lesson or drill from demonstrated mistakes, not generic level alone; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S05,S24

### FR-099 - Mastery and retry policy
**Domain:** Lessons, Practice & Curriculum  
**Priority:** P1  
**Phase:** Learning  
**Requirement:** Require successful transfer or teach-back before marking a concept mastered.  
**Acceptance:** Given an eligible user and valid starting state, when the "Mastery and retry policy" workflow is exercised, ChessLab shall require successful transfer or teach-back before marking a concept mastered; verify that wrong, partial, retry and completion paths award progress only under the declared mastery rule.  
**Evidence:** S37

### FR-100 - Public profile
**Domain:** Profile, Stats & Progress  
**Priority:** P1  
**Phase:** Community  
**Requirement:** Show identity, optional details, ratings, awards, clubs and recent public activity.  
**Acceptance:** Given an eligible user and valid starting state, when the "Public profile" workflow is exercised, ChessLab shall show identity, optional details, ratings, awards, clubs and recent public activity; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S29

### FR-101 - Rating dashboards
**Domain:** Profile, Stats & Progress  
**Priority:** P0  
**Phase:** Insights  
**Requirement:** Track separate ratings and histories by time control and game type.  
**Acceptance:** Given an eligible user and valid starting state, when the "Rating dashboards" workflow is exercised, ChessLab shall track separate ratings and histories by time control and game type; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S20

### FR-102 - Opening stats
**Domain:** Profile, Stats & Progress  
**Priority:** P1  
**Phase:** Insights  
**Requirement:** Show frequency, results and continuation trees with filters and mini-board.  
**Acceptance:** Given an eligible user and valid starting state, when the "Opening stats" workflow is exercised, ChessLab shall show frequency, results and continuation trees with filters and mini-board; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S23

### FR-103 - Advanced chess stats
**Domain:** Profile, Stats & Progress  
**Priority:** P2  
**Phase:** Insights  
**Requirement:** Measure opening, tactics, strategy and endgame strengths with explainable methodology.  
**Acceptance:** Given an eligible user and valid starting state, when the "Advanced chess stats" workflow is exercised, ChessLab shall measure opening, tactics, strategy and endgame strengths with explainable methodology; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S25

### FR-104 - Insights workspace
**Domain:** Profile, Stats & Progress  
**Priority:** P2  
**Phase:** Insights  
**Requirement:** Analyze patterns by time class, date range, result, accuracy and activity time.  
**Acceptance:** Given an eligible user and valid starting state, when the "Insights workspace" workflow is exercised, ChessLab shall analyze patterns by time class, date range, result, accuracy and activity time; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S24

### FR-105 - Achievement system
**Domain:** Profile, Stats & Progress  
**Priority:** P2  
**Phase:** Growth  
**Requirement:** Award verifiable milestones and show locked criteria without pay-to-win ratings.  
**Acceptance:** Given an eligible user and valid starting state, when the "Achievement system" workflow is exercised, ChessLab shall award verifiable milestones and show locked criteria without pay-to-win ratings; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S10

### FR-106 - Game archive
**Domain:** Profile, Stats & Progress  
**Priority:** P0  
**Phase:** Platform  
**Requirement:** Filter by game type, date, opponent, result and opening with stable pagination.  
**Acceptance:** Given an eligible user and valid starting state, when the "Game archive" workflow is exercised, ChessLab shall filter by game type, date, opponent, result and opening with stable pagination; verify that the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S20

### FR-107 - Bot and coach privacy
**Domain:** Profile, Stats & Progress  
**Priority:** P0  
**Phase:** Privacy  
**Requirement:** Keep guided-game history private by default and allow deletion.  
**Acceptance:** Given an eligible user and valid starting state, when the "Bot and coach privacy" workflow is exercised, ChessLab shall keep guided-game history private by default and allow deletion; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S03,S04

### FR-108 - Live chess channel
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Provide an integrated current broadcast with schedule and chat policy.  
**Acceptance:** Given an eligible user and valid starting state, when the "Live chess channel" workflow is exercised, ChessLab shall provide an integrated current broadcast with schedule and chat policy; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S26

### FR-109 - Event directory
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Community  
**Requirement:** List ongoing and upcoming tournaments, leagues and broadcasts.  
**Acceptance:** Given an eligible user and valid starting state, when the "Event directory" workflow is exercised, ChessLab shall list ongoing and upcoming tournaments, leagues and broadcasts; verify that empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S26

### FR-110 - Event broadcast board
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Synchronize board, clocks, standings, commentary, engine and video.  
**Acceptance:** Given an eligible user and valid starting state, when the "Event broadcast board" workflow is exercised, ChessLab shall synchronize board, clocks, standings, commentary, engine and video; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S26

### FR-111 - Streamer directory
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Community  
**Requirement:** List currently live creators and hand off to approved external platforms.  
**Acceptance:** Given an eligible user and valid starting state, when the "Streamer directory" workflow is exercised, ChessLab shall list currently live creators and hand off to approved external platforms; verify that empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S26

### FR-112 - Playing-now spectating
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Surface notable live games with delay and fair-play controls.  
**Acceptance:** Given an eligible user and valid starting state, when the "Playing-now spectating" workflow is exercised, ChessLab shall surface notable live games with delay and fair-play controls; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S26,S31

### FR-113 - Editorial hub
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Content  
**Requirement:** Publish news, recaps, instructional articles and author pages with moderation.  
**Acceptance:** Given an eligible user and valid starting state, when the "Editorial hub" workflow is exercised, ChessLab shall publish news, recaps, instructional articles and author pages with moderation; verify that success, validation failure, denied access, empty/loading state, persistence and analytics are covered on desktop and mobile.  
**Evidence:** S26

### FR-114 - Embeddable public views
**Domain:** Watch, Events & Content  
**Priority:** P2  
**Phase:** Platform  
**Requirement:** Generate safe embed codes for games, studies and events.  
**Acceptance:** Given an eligible user and valid starting state, when the "Embeddable public views" workflow is exercised, ChessLab shall generate safe embed codes for games, studies and events; verify that private or revoked content is never exposed and the exported representation round-trips supported data.  
**Evidence:** S21,S26

### FR-115 - Friends graph
**Domain:** Community & Social  
**Priority:** P1  
**Phase:** Community  
**Requirement:** Send, accept, decline, cancel and limit friend requests.  
**Acceptance:** Given an eligible user and valid starting state, when the "Friends graph" workflow is exercised, ChessLab shall send, accept, decline, cancel and limit friend requests; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S28

### FR-116 - Follow graph
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Follow creators or players independently of mutual friendship.  
**Acceptance:** Given an eligible user and valid starting state, when the "Follow graph" workflow is exercised, ChessLab shall follow creators or players independently of mutual friendship; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S28

### FR-117 - Persistent chat
**Domain:** Community & Social  
**Priority:** P1  
**Phase:** Community  
**Requirement:** Keep one-to-one and group chat available across navigation with unread state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Persistent chat" workflow is exercised, ChessLab shall keep one-to-one and group chat available across navigation with unread state; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S28

### FR-118 - In-game chat controls
**Domain:** Community & Social  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Allow everyone, request-only, friends-only or disabled chat policies.  
**Acceptance:** Given an eligible user and valid starting state, when the "In-game chat controls" workflow is exercised, ChessLab shall allow everyone, request-only, friends-only or disabled chat policies; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S32

### FR-119 - Club discovery
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Search and browse clubs by interest, location, activity and language.  
**Acceptance:** Given an eligible user and valid starting state, when the "Club discovery" workflow is exercised, ChessLab shall search and browse clubs by interest, location, activity and language; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery; empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S27

### FR-120 - Club membership workflow
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Support open, request-to-join and invitation-only membership.  
**Acceptance:** Given an eligible user and valid starting state, when the "Club membership workflow" workflow is exercised, ChessLab shall support open, request-to-join and invitation-only membership; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S27

### FR-121 - Club spaces
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Provide notes, forums, chat, matches, vote chess and events.  
**Acceptance:** Given an eligible user and valid starting state, when the "Club spaces" workflow is exercised, ChessLab shall provide notes, forums, chat, matches, vote chess and events; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S27

### FR-122 - Club roles and audit
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Trust  
**Requirement:** Model owner, super-admin, admin, coordinator and member permissions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Club roles and audit" workflow is exercised, ChessLab shall model owner, super-admin, admin, coordinator and member permissions; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S27

### FR-123 - Forums and comments
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Thread discussions with edits, reports, moderation and notification controls.  
**Acceptance:** Given an eligible user and valid starting state, when the "Forums and comments" workflow is exercised, ChessLab shall thread discussions with edits, reports, moderation and notification controls; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S27,S31

### FR-124 - User blogs
**Domain:** Community & Social  
**Priority:** P2  
**Phase:** Content  
**Requirement:** Let members publish moderated long-form posts and follow authors.  
**Acceptance:** Given an eligible user and valid starting state, when the "User blogs" workflow is exercised, ChessLab shall let members publish moderated long-form posts and follow authors; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S28

### FR-125 - Notifications center
**Domain:** Community & Social  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Aggregate social, game, learning, commerce and system notifications.  
**Acceptance:** Given an eligible user and valid starting state, when the "Notifications center" workflow is exercised, ChessLab shall aggregate social, game, learning, commerce and system notifications; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S29

### FR-126 - Arena tournaments
**Domain:** Tournaments & Variants  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Support continuous pairing, streak scoring, countdown and standings.  
**Acceptance:** Given an eligible user and valid starting state, when the "Arena tournaments" workflow is exercised, ChessLab shall support continuous pairing, streak scoring, countdown and standings; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S15

### FR-127 - Swiss tournaments
**Domain:** Tournaments & Variants  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Support scheduled rounds, pairings, tie-breaks and result correction workflow.  
**Acceptance:** Given an eligible user and valid starting state, when the "Swiss tournaments" workflow is exercised, ChessLab shall support scheduled rounds, pairings, tie-breaks and result correction workflow; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S15

### FR-128 - Daily tournaments
**Domain:** Tournaments & Variants  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Support group stages, simultaneous round-robin games and advancement.  
**Acceptance:** Given an eligible user and valid starting state, when the "Daily tournaments" workflow is exercised, ChessLab shall support group stages, simultaneous round-robin games and advancement; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S16

### FR-129 - Tournament creation
**Domain:** Tournaments & Variants  
**Priority:** P2  
**Phase:** Community  
**Requirement:** Configure format, time control, visibility, eligibility and participant caps.  
**Acceptance:** Given an eligible user and valid starting state, when the "Tournament creation" workflow is exercised, ChessLab shall configure format, time control, visibility, eligibility and participant caps; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S15,S16

### FR-130 - Tournament moderation
**Domain:** Tournaments & Variants  
**Priority:** P2  
**Phase:** Trust  
**Requirement:** Provide director controls, chat policy, removal, cancellation and audit logs.  
**Acceptance:** Given an eligible user and valid starting state, when the "Tournament moderation" workflow is exercised, ChessLab shall provide director controls, chat policy, removal, cancellation and audit logs; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect.  
**Evidence:** S15,S31

### FR-131 - Variant lobby
**Domain:** Tournaments & Variants  
**Priority:** P3  
**Phase:** Expansion  
**Requirement:** Browse variants with play, lobby, arenas, watch, leaders and archive tabs.  
**Acceptance:** Given an eligible user and valid starting state, when the "Variant lobby" workflow is exercised, ChessLab shall browse variants with play, lobby, arenas, watch, leaders and archive tabs; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect; the extension remains isolated from core play and is disabled until rights and operational readiness are approved.  
**Evidence:** S18

### FR-132 - Custom variant editor
**Domain:** Tournaments & Variants  
**Priority:** P3  
**Phase:** Expansion  
**Requirement:** Compose supported rule modules and validate starting positions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Custom variant editor" workflow is exercised, ChessLab shall compose supported rule modules and validate starting positions; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect; the extension remains isolated from core play and is disabled until rights and operational readiness are approved.  
**Evidence:** S18

### FR-133 - Variant-specific ratings
**Domain:** Tournaments & Variants  
**Priority:** P3  
**Phase:** Expansion  
**Requirement:** Keep ratings and archives separate per variant and time class.  
**Acceptance:** Given an eligible user and valid starting state, when the "Variant-specific ratings" workflow is exercised, ChessLab shall keep ratings and archives separate per variant and time class; verify that legal state, turn, clock or deadline, result and rating consequences are server-authoritative and consistent after reconnect; the extension remains isolated from core play and is disabled until rights and operational readiness are approved.  
**Evidence:** S18

### FR-134 - Board and piece themes
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Polish  
**Requirement:** Offer original or licensed themes, backgrounds, coordinates and animation choices.  
**Acceptance:** Given an eligible user and valid starting state, when the "Board and piece themes" workflow is exercised, ChessLab shall offer original or licensed themes, backgrounds, coordinates and animation choices; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29,S02

### FR-135 - Move and sound preferences
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Polish  
**Requirement:** Configure move method, legal markers, premoves, confirmations and sound themes.  
**Acceptance:** Given an eligible user and valid starting state, when the "Move and sound preferences" workflow is exercised, ChessLab shall configure move method, legal markers, premoves, confirmations and sound themes; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29

### FR-136 - Gameplay settings
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Centralize live, daily, bot, coach and puzzle behavior preferences.  
**Acceptance:** Given an eligible user and valid starting state, when the "Gameplay settings" workflow is exercised, ChessLab shall centralize live, daily, bot, coach and puzzle behavior preferences; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29

### FR-137 - Coach settings
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Coach  
**Requirement:** Choose persona, voice, appearance locations, autosave and feedback intensity.  
**Acceptance:** Given an eligible user and valid starting state, when the "Coach settings" workflow is exercised, ChessLab shall choose persona, voice, appearance locations, autosave and feedback intensity; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S04

### FR-138 - Notification routing
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Choose in-app, push and email delivery by notification category.  
**Acceptance:** Given an eligible user and valid starting state, when the "Notification routing" workflow is exercised, ChessLab shall choose in-app, push and email delivery by notification category; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px; delivery respects channel preferences, blocks, abuse controls and unread-state reconciliation.  
**Evidence:** S29

### FR-139 - Privacy controls
**Domain:** Settings, Accessibility & Devices  
**Priority:** P0  
**Phase:** Privacy  
**Requirement:** Control profile fields, friends visibility, challenges and contact permissions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Privacy controls" workflow is exercised, ChessLab shall control profile fields, friends visibility, challenges and contact permissions; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29,S32

### FR-140 - Localization
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Support interface language, content language, locale, notation and timezone.  
**Acceptance:** Given an eligible user and valid starting state, when the "Localization" workflow is exercised, ChessLab shall support interface language, content language, locale, notation and timezone; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29

### FR-141 - Keyboard operation
**Domain:** Settings, Accessibility & Devices  
**Priority:** P0  
**Phase:** Accessibility  
**Requirement:** Make all game, review and learning workflows operable without dragging.  
**Acceptance:** Given an eligible user and valid starting state, when the "Keyboard operation" workflow is exercised, ChessLab shall make all game, review and learning workflows operable without dragging; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29

### FR-142 - Screen-reader semantics
**Domain:** Settings, Accessibility & Devices  
**Priority:** P0  
**Phase:** Accessibility  
**Requirement:** Expose board state, move list, clocks, alerts and annotations semantically.  
**Acceptance:** Given an eligible user and valid starting state, when the "Screen-reader semantics" workflow is exercised, ChessLab shall expose board state, move list, clocks, alerts and annotations semantically; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29

### FR-143 - Reduced motion and contrast
**Domain:** Settings, Accessibility & Devices  
**Priority:** P0  
**Phase:** Accessibility  
**Requirement:** Respect OS preferences and provide accessible contrast modes.  
**Acceptance:** Given an eligible user and valid starting state, when the "Reduced motion and contrast" workflow is exercised, ChessLab shall respect OS preferences and provide accessible contrast modes; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S29

### FR-144 - Responsive web
**Domain:** Settings, Accessibility & Devices  
**Priority:** P0  
**Phase:** Platform  
**Requirement:** Preserve complete core workflows from 320 px mobile to wide desktop.  
**Acceptance:** Given an eligible user and valid starting state, when the "Responsive web" workflow is exercised, ChessLab shall preserve complete core workflows from 320 px mobile to wide desktop; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S35,S36

### FR-145 - Native-app parity matrix
**Domain:** Settings, Accessibility & Devices  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Document every web/mobile parity gap and degrade explicitly.  
**Acceptance:** Given an eligible user and valid starting state, when the "Native-app parity matrix" workflow is exercised, ChessLab shall document every web/mobile parity gap and degrade explicitly; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px.  
**Evidence:** S35,S36

### FR-146 - Offline drafts
**Domain:** Settings, Accessibility & Devices  
**Priority:** P2  
**Phase:** Platform  
**Requirement:** Allow local study notes and queued uploads without permitting offline competitive moves.  
**Acceptance:** Given an eligible user and valid starting state, when the "Offline drafts" workflow is exercised, ChessLab shall allow local study notes and queued uploads without permitting offline competitive moves; verify that the workflow is operable by keyboard and assistive technology, persists as scoped, and has no horizontal overflow at 320 px; the result survives reload and a stale concurrent write returns an explicit conflict instead of silent loss.  
**Evidence:** S35

### FR-147 - Fair Play Lock
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Disable engine, coach, recommendations and branch explanations for ongoing human games.  
**Acceptance:** Given an eligible user and valid starting state, when the "Fair Play Lock" workflow is exercised, ChessLab shall disable engine, coach, recommendations and branch explanations for ongoing human games; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S30,S31,S37

### FR-148 - Game-context policy engine
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Determine allowed tools from game type, status, rating and opponent class.  
**Acceptance:** Given an eligible user and valid starting state, when the "Game-context policy engine" workflow is exercised, ChessLab shall determine allowed tools from game type, status, rating and opponent class; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S30,S31

### FR-149 - Report workflow
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Report cheating, abuse or illegal content with category, evidence and block option.  
**Acceptance:** Given an eligible user and valid starting state, when the "Report workflow" workflow is exercised, ChessLab shall report cheating, abuse or illegal content with category, evidence and block option; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S31,S32

### FR-150 - Block graph enforcement
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Apply blocks to messaging, challenges, matchmaking, tournaments and content.  
**Acceptance:** Given an eligible user and valid starting state, when the "Block graph enforcement" workflow is exercised, ChessLab shall apply blocks to messaging, challenges, matchmaking, tournaments and content; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S32

### FR-151 - Safe mode
**Domain:** Trust, Safety & Fair Play  
**Priority:** P1  
**Phase:** Trust  
**Requirement:** Disable messages, chats and comments while preserving play and learning.  
**Acceptance:** Given an eligible user and valid starting state, when the "Safe mode" workflow is exercised, ChessLab shall disable messages, chats and comments while preserving play and learning; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S32

### FR-152 - Child safety controls
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Trust  
**Requirement:** Gate social access, parental consent and discovery based on age and jurisdiction.  
**Acceptance:** Given an eligible user and valid starting state, when the "Child safety controls" workflow is exercised, ChessLab shall gate social access, parental consent and discovery based on age and jurisdiction; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S32

### FR-153 - Moderation console
**Domain:** Trust, Safety & Fair Play  
**Priority:** P1  
**Phase:** Operations  
**Requirement:** Queue reports, preserve evidence, document actions and enforce least privilege.  
**Acceptance:** Given an eligible user and valid starting state, when the "Moderation console" workflow is exercised, ChessLab shall queue reports, preserve evidence, document actions and enforce least privilege; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S31

### FR-154 - Fair-play case handling
**Domain:** Trust, Safety & Fair Play  
**Priority:** P1  
**Phase:** Operations  
**Requirement:** Separate automated signals, human review, appeals and rating restoration.  
**Acceptance:** Given an eligible user and valid starting state, when the "Fair-play case handling" workflow is exercised, ChessLab shall separate automated signals, human review, appeals and rating restoration; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S31

### FR-155 - Prompt-injection boundary
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Security  
**Requirement:** Treat imported PGN, comments, chat and community content as untrusted data.  
**Acceptance:** Given an eligible user and valid starting state, when the "Prompt-injection boundary" workflow is exercised, ChessLab shall treat imported PGN, comments, chat and community content as untrusted data; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S37

### FR-156 - Anti-harassment controls
**Domain:** Trust, Safety & Fair Play  
**Priority:** P1  
**Phase:** Trust  
**Requirement:** Rate-limit invitations and messages, detect spam patterns and allow quiet defaults.  
**Acceptance:** Given an eligible user and valid starting state, when the "Anti-harassment controls" workflow is exercised, ChessLab shall rate-limit invitations and messages, detect spam patterns and allow quiet defaults; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S32

### FR-157 - Audit trail
**Domain:** Trust, Safety & Fair Play  
**Priority:** P0  
**Phase:** Security  
**Requirement:** Record sensitive admin, entitlement, moderation and analysis-policy decisions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Audit trail" workflow is exercised, ChessLab shall record sensitive admin, entitlement, moderation and analysis-policy decisions; verify that privacy, block, safe-mode, age and moderation rules are enforced before rendering or delivery.  
**Evidence:** S31

### FR-158 - Free core access
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P0  
**Phase:** Commerce  
**Requirement:** Keep unlimited basic human chess while limiting selected analysis and learning extras.  
**Acceptance:** Given an eligible user and valid starting state, when the "Free core access" workflow is exercised, ChessLab shall keep unlimited basic human chess while limiting selected analysis and learning extras; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33

### FR-159 - Tiered entitlement service
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P1  
**Phase:** Commerce  
**Requirement:** Resolve Gold, Platinum, Diamond and promotional entitlements server-side.  
**Acceptance:** Given an eligible user and valid starting state, when the "Tiered entitlement service" workflow is exercised, ChessLab shall resolve Gold, Platinum, Diamond and promotional entitlements server-side; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33

### FR-160 - Usage meters
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P1  
**Phase:** Commerce  
**Requirement:** Track review, coach, puzzle and cloud-analysis limits with reset and grace rules.  
**Acceptance:** Given an eligible user and valid starting state, when the "Usage meters" workflow is exercised, ChessLab shall track review, coach, puzzle and cloud-analysis limits with reset and grace rules; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33,S07,S10

### FR-161 - Plan comparison
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P1  
**Phase:** Commerce  
**Requirement:** Compare tiers by benefit, limit, renewal period and platform-specific billing.  
**Acceptance:** Given an eligible user and valid starting state, when the "Plan comparison" workflow is exercised, ChessLab shall compare tiers by benefit, limit, renewal period and platform-specific billing; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33

### FR-162 - Trial lifecycle
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P2  
**Phase:** Commerce  
**Requirement:** Support eligibility, reminders, conversion, cancellation and rollback.  
**Acceptance:** Given an eligible user and valid starting state, when the "Trial lifecycle" workflow is exercised, ChessLab shall support eligibility, reminders, conversion, cancellation and rollback; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33

### FR-163 - Upgrade proration
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P2  
**Phase:** Commerce  
**Requirement:** Calculate unused value or extended time according to payment channel.  
**Acceptance:** Given an eligible user and valid starting state, when the "Upgrade proration" workflow is exercised, ChessLab shall calculate unused value or extended time according to payment channel; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33

### FR-164 - Family plan
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P2  
**Phase:** Commerce  
**Requirement:** Support one payer, up to five invited members and independent accounts.  
**Acceptance:** Given an eligible user and valid starting state, when the "Family plan" workflow is exercised, ChessLab shall support one payer, up to five invited members and independent accounts; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S34

### FR-165 - Student verification
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P3  
**Phase:** Commerce  
**Requirement:** Apply country-specific discounts with eligibility and renewal checks.  
**Acceptance:** Given an eligible user and valid starting state, when the "Student verification" workflow is exercised, ChessLab shall apply country-specific discounts with eligibility and renewal checks; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events; the extension remains isolated from core play and is disabled until rights and operational readiness are approved.  
**Evidence:** S33

### FR-166 - Gift membership
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P3  
**Phase:** Commerce  
**Requirement:** Schedule delivery, recipient resolution and redemption with fraud controls.  
**Acceptance:** Given an eligible user and valid starting state, when the "Gift membership" workflow is exercised, ChessLab shall schedule delivery, recipient resolution and redemption with fraud controls; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events; the extension remains isolated from core play and is disabled until rights and operational readiness are approved.  
**Evidence:** S33

### FR-167 - Billing and receipts
**Domain:** Membership, Commerce & Entitlements  
**Priority:** P1  
**Phase:** Commerce  
**Requirement:** Expose invoices, payment status, renewal date and support-safe identifiers.  
**Acceptance:** Given an eligible user and valid starting state, when the "Billing and receipts" workflow is exercised, ChessLab shall expose invoices, payment status, renewal date and support-safe identifiers; verify that payment and entitlement transitions are idempotent, ledgered and recoverable after duplicate or delayed provider events.  
**Evidence:** S33

### FR-168 - Authoritative chess rules service
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Foundation  
**Requirement:** Validate legal moves, draw state, repetition and game termination server-side.  
**Acceptance:** Given an eligible user and valid starting state, when the "Authoritative chess rules service" workflow is exercised, ChessLab shall validate legal moves, draw state, repetition and game termination server-side; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S37

### FR-169 - Real-time game service
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Scale  
**Requirement:** Maintain rooms, clocks, move ordering, reconnection and event fan-out.  
**Acceptance:** Given an eligible user and valid starting state, when the "Real-time game service" workflow is exercised, ChessLab shall maintain rooms, clocks, move ordering, reconnection and event fan-out; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S19

### FR-170 - Analysis job service
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Analysis  
**Requirement:** Run bounded engine work asynchronously with cancellation, deduplication and versioning.  
**Acceptance:** Given an eligible user and valid starting state, when the "Analysis job service" workflow is exercised, ChessLab shall run bounded engine work asynchronously with cancellation, deduplication and versioning; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S07,S37

### FR-171 - Coach evidence pipeline
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Coach  
**Requirement:** Generate explanations only from legal state, engine output and deterministic facts.  
**Acceptance:** Given an eligible user and valid starting state, when the "Coach evidence pipeline" workflow is exercised, ChessLab shall generate explanations only from legal state, engine output and deterministic facts; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S37

### FR-172 - Content management
**Domain:** Platform, Data & Operations  
**Priority:** P1  
**Phase:** Operations  
**Requirement:** Version lessons, puzzles, articles, translations, prerequisites and publication state.  
**Acceptance:** Given an eligible user and valid starting state, when the "Content management" workflow is exercised, ChessLab shall version lessons, puzzles, articles, translations, prerequisites and publication state; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S10,S12

### FR-173 - Search platform
**Domain:** Platform, Data & Operations  
**Priority:** P1  
**Phase:** Scale  
**Requirement:** Index players, games, studies, clubs, events and content with permission filters.  
**Acceptance:** Given an eligible user and valid starting state, when the "Search platform" workflow is exercised, ChessLab shall index players, games, studies, clubs, events and content with permission filters; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game; empty, loading, no-result, permission-filtered and paginated states are covered.  
**Evidence:** S08,S20,S27

### FR-174 - Object and media storage
**Domain:** Platform, Data & Operations  
**Priority:** P1  
**Phase:** Platform  
**Requirement:** Store avatars, diagrams, exports and audio with scanning and lifecycle rules.  
**Acceptance:** Given an eligible user and valid starting state, when the "Object and media storage" workflow is exercised, ChessLab shall store avatars, diagrams, exports and audio with scanning and lifecycle rules; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S29

### FR-175 - Public API
**Domain:** Platform, Data & Operations  
**Priority:** P2  
**Phase:** Platform  
**Requirement:** Expose documented read-only public data with rate limits and privacy exclusions.  
**Acceptance:** Given an eligible user and valid starting state, when the "Public API" workflow is exercised, ChessLab shall expose documented read-only public data with rate limits and privacy exclusions; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S02

### FR-176 - Webhooks and integrations
**Domain:** Platform, Data & Operations  
**Priority:** P3  
**Phase:** Expansion  
**Requirement:** Publish approved game, study and event updates with signed delivery.  
**Acceptance:** Given an eligible user and valid starting state, when the "Webhooks and integrations" workflow is exercised, ChessLab shall publish approved game, study and event updates with signed delivery; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game; the extension remains isolated from core play and is disabled until rights and operational readiness are approved.  
**Evidence:** S02

### FR-177 - Experimentation system
**Domain:** Platform, Data & Operations  
**Priority:** P2  
**Phase:** Growth  
**Requirement:** Assign controlled UX and learning experiments with consent and guardrails.  
**Acceptance:** Given an eligible user and valid starting state, when the "Experimentation system" workflow is exercised, ChessLab shall assign controlled UX and learning experiments with consent and guardrails; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S24

### FR-178 - Observability
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Operations  
**Requirement:** Trace game moves, websocket health, engine jobs, coach errors and entitlement checks.  
**Acceptance:** Given an eligible user and valid starting state, when the "Observability" workflow is exercised, ChessLab shall trace game moves, websocket health, engine jobs, coach errors and entitlement checks; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S38

### FR-179 - Backup and recovery
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Operations  
**Requirement:** Back up accounts, games, studies and content with tested restoration targets.  
**Acceptance:** Given an eligible user and valid starting state, when the "Backup and recovery" workflow is exercised, ChessLab shall back up accounts, games, studies and content with tested restoration targets; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game.  
**Evidence:** S38

### FR-180 - Data export and deletion
**Domain:** Platform, Data & Operations  
**Priority:** P0  
**Phase:** Privacy  
**Requirement:** Support privacy access, portability, retention and deletion workflows.  
**Acceptance:** Given an eligible user and valid starting state, when the "Data export and deletion" workflow is exercised, ChessLab shall support privacy access, portability, retention and deletion workflows; verify that authorization, rate limits, audit records, observability and graceful failure are verified without degrading an active game; private or revoked content is never exposed and the exported representation round-trips supported data.  
**Evidence:** S29

## 8. Non-functional requirements

- **NFR-001 Availability (P0):** Core human play APIs target 99.95% monthly availability; learning and community surfaces degrade independently. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-002 Move latency (P0):** Within-region accepted moves should reach both players at p95 under 250 ms excluding client network delay. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-003 Clock authority (P0):** Server clocks are authoritative and resilient to client pause, backgrounding and reconnect. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-004 Analysis latency (P0):** Standard post-game review returns initial highlights within 10 seconds at p95, then streams deeper results. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-005 Engine isolation (P0):** Engine workers run with CPU, memory, time, process and input limits and cannot access user secrets. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-006 Data integrity (P0):** Games and study branches use optimistic revisions or event ordering to reject stale overwrites. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-007 Durability (P0):** Committed games and studies target zero acknowledged-write loss within the declared recovery architecture. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-008 Recovery (P0):** Target RPO is 5 minutes and RTO is 60 minutes for user content after a regional service loss. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-009 Accessibility (P0):** Core play, review and learning meet WCAG 2.2 AA, including non-drag operation and meaningful board narration. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-010 Responsive layout (P0):** Core flows work without horizontal document overflow from 320 px to 1920 px. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-011 Security (P0):** Follow OWASP ASVS-aligned controls for authentication, sessions, authorization, input validation and secrets. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-012 Privacy (P0):** Collect the minimum personal data and provide export, correction, deletion and retention controls. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-013 Child safety (P0):** Age-appropriate social defaults and consent requirements vary by jurisdiction and are policy-configurable. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-014 Fair-play enforcement (P0):** Every analysis or coach request evaluates the game-context policy before engine or model access. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-015 Model grounding (P0):** Coach claims about legality, material, threats and continuations require machine-verifiable evidence. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-016 Prompt safety (P0):** Imported or community text is never concatenated into privileged system instructions without isolation. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-017 Observability (P0):** Every move, analysis job, policy rejection and entitlement decision has traceable correlation IDs. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-018 Auditability (P0):** Sensitive admin actions are immutable, attributable, searchable and retained by policy. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-019 Localization (P1):** Dates, clocks, notation, numbers, language and content language are independently configurable. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-020 Cross-device continuity (P1):** Saved games, preferences, progress and studies converge across signed-in web and mobile clients. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-021 Offline resilience (P1):** Draft notes can persist locally, while competitive moves require confirmed server acceptance. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-022 Search authorization (P0):** Search results are permission-filtered before ranking and never reveal private collection metadata. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-023 Payment correctness (P0):** Entitlement changes are idempotent, ledgered and reconciled against payment-provider events. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-024 Rate limiting (P0):** Apply actor, IP, route and cost-based limits with accessibility-safe recovery messages. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-025 Abuse resistance (P0):** Challenge, message, invite, comment and API systems include spam and automation controls. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-026 Browser support (P1):** Support current and previous major versions of Chrome, Safari, Firefox and Edge for core flows. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-027 Mobile performance (P1):** Interactive home and board surfaces target LCP under 2.5 seconds on a representative mid-range Android device. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-028 Bundle discipline (P1):** Do not ship native engine binaries or model weights to clients unless an explicit offline product requires them. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-029 Content provenance (P0):** Lessons, puzzles, master games and generated explanations retain source, rights and version metadata. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-030 Experiment safety (P0):** Experiments cannot alter rating, fair-play enforcement, billing or child-safety outcomes without dedicated review. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-031 Deletion safety (P0):** Destructive actions require clear scope, confirmation and recoverability where policy permits. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-032 Graceful degradation (P0):** Failure of coach, analytics, chat or content services must not terminate an active legal game. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-033 Cost controls (P0):** Engine and model workloads expose quotas, queue depth, timeouts, cancellation and per-feature cost telemetry. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-034 Version compatibility (P1):** Clients negotiate API and study schema versions and preserve unknown fields during round trips. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.
- **NFR-035 Legal clean room (P0):** No Chess.com logos, proprietary assets, copied interaction text, move glyphs, sounds or confidential implementation are used. Acceptance: Measured in pre-production and production with named owner, dashboard, alert threshold and release gate.

## 9. Roles and permissions

- **Guest:** Browse public marketing, selected content and public studies; no persistent ratings or private social data.
- **Basic member:** Play human chess, limited learning and review, profile, friends, clubs and public content.
- **Premium member:** Entitled analysis, coaching, learning, insights and ad-free benefits according to plan.
- **Child or protected member:** Member capabilities with age-appropriate social restrictions and consent controls.
- **Club coordinator:** Create and operate approved club events and limited competition workflows.
- **Club admin:** Manage membership, content, roles and settings within one club.
- **Coach or creator:** Create shareable studies, lessons and branch-native teaching experiences.
- **Moderator:** Review community reports and apply scoped content or interaction actions.
- **Fair-play analyst:** Review game-integrity cases with evidence separation and appeal workflow.
- **Support agent:** Resolve account and billing cases without access to unnecessary private chess analysis.
- **Content editor:** Create and publish lessons, puzzles, news and translations through workflow approvals.
- **Platform admin:** Operate services and configuration through least privilege and audited elevation.

## 10. Core domain model

- **User:** Identity, age band, locale, consent, safety state and account status.
- **Profile:** Public and private display information, avatar, titles, flair and preferences.
- **Entitlement:** Plan, promotion, usage meter, renewal and feature authorization.
- **Game:** Players or bot, variant, rated state, clocks, result, termination and visibility.
- **MoveEvent:** Ordered legal move, server timestamp, clock snapshot and optional client metadata.
- **PositionNode:** Board state plus rule-relevant history and immutable parent relation.
- **Study:** Actual line, alternative branch graph, anchors, annotations, questions and permissions.
- **AnalysisJob:** Input version, engine, limits, status, output, provenance and cost.
- **EvidenceBundle:** Legal facts, material, threats, candidate lines, score perspective and confidence.
- **CoachTurn:** Node-bound learner message, response, evidence version and safety decision.
- **Puzzle:** Versioned position, legal solution graph, themes, rights and difficulty.
- **Lesson:** Versioned instructional content, prerequisites, interactions and mastery rules.
- **Collection:** Games and studies with owner, roles, visibility, tags and share links.
- **Rating:** Pool, value, uncertainty, history and correction events.
- **Tournament:** Format, schedule, eligibility, pairings, standings and moderation state.
- **Club:** Membership, roles, forums, matches, settings and audit log.
- **Conversation:** Participants, messages, moderation state and notification cursors.
- **Report:** Reporter, subject, category, evidence, status, decisions and appeal relation.
- **ContentItem:** News, blog, broadcast or course metadata with publication workflow.
- **Notification:** Type, actor, target, channel, delivery state and user preference snapshot.

## 11. Logical architecture

The recommended system is a modular platform with a server-authoritative real-time game service, independent analysis workers, a grounded coach orchestration layer, content and social services, centralized policy and entitlement checks, and permission-filtered search. Active game reliability must not depend on coach, analytics, community, content, or payment availability.

### 11.1 Service boundaries
- Identity, sessions, consent and profiles
- Entitlements, usage meters and billing reconciliation
- Matchmaking, challenge and tournament orchestration
- Real-time game rooms, clocks and legal move validation
- Game archive, PGN/FEN import and export
- Position graph, studies, collections and collaboration
- Engine job scheduler and isolated workers
- Evidence extraction and coach response orchestration
- Puzzle, lesson, practice and recommendation content
- Ratings, stats, insights and experimentation
- Clubs, messaging, forums, notifications and moderation
- Search, media, public API and integration gateway
- Audit, observability, backup, privacy export and deletion

## 12. Analytics event taxonomy

Events should identify actor, session, device, experiment, entitlement snapshot, game or study ID, position node, source surface, latency, outcome and policy result. Sensitive payloads should be minimized. Core events include onboarding_step_completed, matchmaking_started, game_move_accepted, game_reconnected, review_generated, key_moment_opened, branch_created, anchor_returned, coach_question_asked, evidence_revealed, teach_back_completed, retry_scheduled, puzzle_attempted, lesson_mastered, report_submitted, entitlement_changed and export_completed.

## 13. Phased delivery

### Phase A - Trustworthy core loop
Accounts, legal play against a fixed bot, completed-game import, review, nested study branches, node-attached questions, evidence-grounded explanations, save/restore, export, accessibility, and Fair Play Lock.

### Phase B - Human play platform
Real-time matchmaking, clocks, reconnect, post-game review, archive, profiles, settings, notifications and safety workflows.

### Phase C - Learning system
Puzzles, lessons, opening practice, endgames, misunderstanding model, teach-back, delayed retry, progress and recommendations.

### Phase D - Collaboration and community
Collections, sharing, creator studio, clubs, messaging, events, tournaments, broadcasts and public discovery.

### Phase E - Monetization and ecosystem
Entitlement tiers, cloud analysis, family plans, gifts, public API, integrations and advanced operational tooling.

## 14. Risk register

- **R-01 Legal and brand confusion - High:** Use a clean-room process, original brand and assets, source ledger, rights review and explicit non-affiliation.
- **R-02 Live assistance misuse - Critical:** Fair Play Lock based on authoritative game status; no overlays or external active-game capture.
- **R-03 Hallucinated chess explanations - Critical:** Ground all factual claims in rules, engine evidence and deterministic computations; reject unsupported claims.
- **R-04 Rating misrepresentation - High:** Do not market engine presets as calibrated human Elo without validation.
- **R-05 Real-time scale and clock disputes - High:** Server-authoritative clocks, event ordering, reconnect tests and regional load validation.
- **R-06 Child safety and harassment - Critical:** Age-aware defaults, consent, safe mode, blocking, reporting, moderation and auditability.
- **R-07 Engine and model cost explosion - High:** Bounded jobs, tiered quotas, caching, cancellation and per-feature cost dashboards.
- **R-08 Content rights leakage - High:** Provenance and licensing metadata for every lesson, puzzle, game and media asset.
- **R-09 Overbuilding parity before differentiation - High:** Ship a coherent play-review-branch loop first, then expand breadth by evidence.
- **R-10 Cross-device state conflicts - Medium:** Revisioned writes, merge-safe drafts, deterministic branch IDs and explicit conflict UI.
- **R-11 Privacy leakage through search or sharing - High:** Permission-filtered indices, unguessable links, revocation and access logs.
- **R-12 Learning claims without evidence - Medium:** Label hypotheses, run educator-reviewed studies and measure delayed transfer.

## 15. Source ledger

- **S01 Chess.com User Agreement**, Chess.com, 2026. AI access, copying, competitive-product and automated-access restrictions. https://www.chess.com/legal/user-agreement
- **S02 What is the PubAPI and how do I use it?**, Chess.com Help Center, 2026-04-20. Read-only public API, data boundaries, rate behavior, brand and IP warning. https://support.chess.com/en/articles/9650547-what-is-the-pubapi-and-how-do-i-use-it
- **S03 How can I play against the Chess.com bots?**, Chess.com Help Center, 2026-08. Bot roster, adaptive personalities, unrated games, Komodo-powered experience. https://support.chess.com/en/articles/8614091-how-can-i-play-against-the-chess-com-bots
- **S04 How do I play against the Coach?**, Chess.com Help Center, 2026-04-17. Live coaching flow, hints, undo, arrows, evaluation, autosave and limits. https://support.chess.com/en/articles/10877257-how-do-i-play-against-the-coach
- **S05 How does Game Review work?**, Chess.com Help Center, 2026-08-07. Highlights, coach feedback, key moves, retries, settings and review navigation. https://support.chess.com/en/articles/8584089-how-does-game-review-work
- **S06 How do I use Game Analysis?**, Chess.com Help Center, 2025-03-12. Self-analysis, engine lines, arrows, charts, annotations and saves. https://support.chess.com/en/articles/8583757-how-do-i-use-game-analysis
- **S07 What is Cloud Analysis and how do I use it?**, Chess.com Help Center, 2025-03-19. Server-side deeper analysis, membership gating and engine controls. https://support.chess.com/en/articles/8646880-what-is-cloud-analysis-and-how-do-i-use-it
- **S08 How do I use Game Collections?**, Chess.com Help Center, 2026-04-18. Collections, privacy, collaboration, community collections and bookmarks. https://support.chess.com/en/articles/13557248-how-do-i-use-game-collections
- **S09 What is the Game Explorer?**, Chess.com Help Center, 2025-07-30. Master database, personal games, move frequency, outcomes and notable games. https://support.chess.com/en/articles/8615183-what-is-the-game-explorer
- **S10 How do Puzzles work on Chess.com?**, Chess.com Help Center, 2026-09. Rated puzzles, Rush, Battle, Daily, Custom, limits and histories. https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com
- **S11 What is Puzzle Battle on Chess.com?**, Chess.com Help Center, 2025-06-24. Competitive tactics, matchmaking, timing, mistakes and scoring. https://support.chess.com/en/articles/8708930-what-is-puzzle-battle-on-chess-com
- **S12 How do Lessons work on Chess.com?**, Chess.com Help Center, 2026-07-13. Learning path, lesson library, interactive challenges and membership access. https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com
- **S13 What is Practice on Chess.com?**, Chess.com Help Center, 2026-07-11. Openings, master games, drills, custom positions and mobile differences. https://support.chess.com/en/articles/8724749-what-is-practice-on-chess-com
- **S14 How do I practice Endgames?**, Chess.com Help Center, 2025-11-13. Endgame categories, challenge, practice, learn and leaderboards. https://support.chess.com/en/articles/8708978-how-do-i-practice-endgames
- **S15 How do live tournaments work?**, Chess.com Help Center, 2025-09-04. Live tournament discovery, Arena, Swiss, schedule and lobby states. https://support.chess.com/en/articles/8608949-how-do-live-tournaments-work-where-can-i-join-one
- **S16 How do Daily Tournaments work on Chess.com?**, Chess.com Help Center, 2026-08. Turn-based groups, rounds, joining and progression. https://support.chess.com/en/articles/8609725-how-do-daily-tournaments-work-on-chess-com
- **S17 What is Daily Chess?**, Chess.com Help Center, 2025-12-02. Days-per-move play, concurrent games, ratings and assistance restrictions. https://support.chess.com/en/articles/8588171-what-is-daily-chess
- **S18 How do I play chess variants?**, Chess.com Help Center, 2025-09-04. Variants lobby, challenges, analysis, arenas, archive and web-only limits. https://support.chess.com/en/articles/8583983-how-do-i-play-chess-variants
- **S19 How does matchmaking work in Live Chess?**, Chess.com Help Center, 2025-04-04. Rating windows, search expansion and pairing factors. https://support.chess.com/en/articles/8639319-how-does-matchmaking-work-in-live-chess
- **S20 How do I view my own games?**, Chess.com Help Center, 2026-08. Game history, filters, bulk actions, archives and mobile differences. https://support.chess.com/en/articles/8598090-how-do-i-view-my-own-games
- **S21 How do I get a PGN of my game?**, Chess.com Help Center, 2026-02-10. Single and bulk export, timestamps, annotations and analysis. https://support.chess.com/en/articles/8705305-how-do-i-get-a-pgn-of-my-game
- **S22 How can I change my homepage?**, Chess.com Help Center, 2025-02-18. Dashboard customization and module visibility. https://support.chess.com/en/articles/8652316-how-can-i-change-my-homepage
- **S23 How can I see my opening stats?**, Chess.com Help Center, 2026-01-08. Opening performance, filters, continuations and mini-board. https://support.chess.com/en/articles/8705347-how-can-i-see-my-opening-stats
- **S24 What is Insights on Chess.com?**, Chess.com Help Center, 2026-01-27. Background analysis, filters, performance patterns and premium gating. https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com
- **S25 How do I use Advanced Stats?**, Chess.com Help Center, 2026-08. Phase ratings, strengths, weaknesses and brilliant-move archive. https://support.chess.com/en/articles/15451190-how-do-i-use-advanced-stats
- **S26 What is ChessTV?**, Chess.com Help Center, 2024-12-23. Integrated viewing, streamers, events, playing now and schedules. https://support.chess.com/en/articles/8709044-what-is-chesstv
- **S27 How do Chess.com clubs work?**, Chess.com Help Center, 2025-06-25. Clubs, forums, matches, vote chess, roles and administration. https://support.chess.com/en/articles/8718710-how-do-chess-com-clubs-work
- **S28 How do I open a chat window with my friend?**, Chess.com Help Center, 2026-07-23. Persistent chat windows, groups, blocking and navigation continuity. https://support.chess.com/en/articles/8614138-how-do-i-open-a-chat-window-with-my-friend
- **S29 How do I manage my settings?**, Chess.com Help Center, 2025-12-24. Board, gameplay, profile, membership, notifications and cross-surface settings. https://support.chess.com/en/articles/8615285-how-do-i-manage-my-settings
- **S30 What counts as cheating on Chess.com?**, Chess.com Help Center, 2025-07-23. Live, Daily, puzzle and bot assistance boundaries. https://support.chess.com/en/articles/8583921-what-counts-as-cheating-on-chess-com
- **S31 What do I need to know about Fair Play?**, Chess.com Help Center, 2026-07-08. Rules, common violations, reports and account actions. https://support.chess.com/en/articles/8568369-what-do-i-need-to-know-about-fair-play-on-chess-com
- **S32 What is safe mode on Chess.com?**, Chess.com Help Center, 2025-10-01. Disabling messages, chats and comments. https://support.chess.com/en/articles/8614033-what-is-safe-mode-on-chess-com
- **S33 Improve Your Chess with a Premium Membership**, Chess.com, 2026. Premium value proposition and major entitlements. https://www.chess.com/membership
- **S34 Friends and Family Plan FAQ**, Chess.com Help Center, 2026-09. Six-person Diamond family plan, roles and entitlements. https://support.chess.com/en/articles/10067907-friends-family-plan-faq
- **S35 Does Chess.com have an app?**, Chess.com Help Center, 2026-07-07. iOS, Android and direct Android distribution. https://support.chess.com/en/articles/9855741-does-chess-com-have-an-app
- **S36 How do I play variants on the Chess.com app?**, Chess.com Help Center, 2026-04-17. Web/mobile capability mismatch for variants. https://support.chess.com/en/articles/9836648-how-do-i-play-variants-on-the-chess-com-app
- **S37 ChessLab Product Context**, praxstack/ChessLab, 2026-09-07. Branch-native tutor vision, current build direction, domain vocabulary and open decisions. https://github.com/praxstack/ChessLab/blob/main/CONTEXT.md
- **S38 ChessLab Application Verification**, praxstack/ChessLab, 2026-09-07. Current implementation evidence, test results, corrected bugs and unverified gaps. https://github.com/praxstack/ChessLab/blob/main/docs/application-verification.md

## 16. Research limitations

This is a source-grounded clean-room capability map, not an extraction of Chess.com code, confidential architecture, internal algorithms, private account screens, or proprietary content. Exact pricing, entitlement limits, UI labels and feature availability can vary by country, account, experiment and platform. Every such value should be revalidated before implementation or launch. The prototype demonstrates product structure and interaction intent, not production chess correctness, security, scalability, or learning efficacy.