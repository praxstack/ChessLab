# Security Review: ChessLab

## Scope

Bounded read-only security review of all 13 current server files: authentication, session, API ownership, engine command boundary and new native hosting guard/Worker proxy.

- Scan mode: scoped_path
- Target kind: git_worktree
- Target ID: target_sha256_2c443e999abc4a890dac890ae0d5c80d87d847a8e4cc1957a832c08a00c53e47
- Revision: e2f5a2d810b46f1a091bbb5cd2cb476b0d006666
- Snapshot digest: codex-security-snapshot/v1:sha256:9e3fd4e5fc1d8d70969b3338be78294191f70077cf07c6bae7288048447c89e5
- Inventory strategy: scoped_path
- Included paths: server
- Excluded paths: none
- Runtime or test status: Three isolated proof groups passed: temporary loopback in-memory native app; offline Worker fetch mocks; final hosted configuration/key/stream regressions. No live Sites deployment tested.
- Artifacts reviewed: server/app.mjs, server/engine.mjs, server/opponent-engines.mjs, server/bot-game.mjs, server/hosting.mjs, server/sites-worker.mjs, server/index.mjs, server/content.mjs, server/bot-profiles.json, server/app.test.mjs, server/engine.test.mjs, server/opponent-engines.test.mjs, server/bot-game.test.mjs

Limitations and exclusions:
- No independent baseline or architecture worker per explicit task allowance; sequential fallback used.
- TAC connector returned USER_NOT_LOGGED_IN; access grant status unavailable.
- Live platform private-access enforcement, actual deployment configuration and third-party native engine binary internals are outside this review.
- Excluded Sites platform and live deployment: No Sites calls or publishing authorized for this subtask; owner-private access enforcement is supplied deployment context, not proven by source review.
- Excluded Third-party native engine binary internals and model weights: Bounded review covers application inputs and process boundary, not engine binaries or model supply chain.
- Excluded Sites platform and live deployment: No Sites calls or publishing authorized for this subtask; owner-private access control is supplied deployment context.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | partial |
| Validation mode | Source-backed audit with bounded isolated executable proof. |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

ChessLab is a React client and Express API backed by local SQLite accounts, sessions, games and progress, with native Stockfish/Maia/Lc0 engines. Native startup binds 127.0.0.1 by default (server/index.mjs:20); the user-requested proposed hosted path is Sites Worker -\> HTTPS tunnel -\> separate loopback native process and database.

### Assets

- Account credentials and session tokens (server/app.mjs:60-61,106-110).
- Account-owned games, studies, PGN exports and progress (server/app.mjs:142-155,267-282).
- Native host process authority and bounded engine capacity (server/engine.mjs:48-80; server/opponent-engines.mjs:39-70,90-97).

### Trust Boundaries

- Browser -\> API: JSON-only mutations, exact Origin and Sec-Fetch-Site rejection, bounded 256 KiB JSON parser (server/app.mjs:77-91).
- Anonymous -\> account: scrypt password verification, random 32-byte hashed sessions, HttpOnly/SameSite=Strict and configurable Secure cookies (server/app.mjs:95-110,115-138).
- Account -\> stored object: prepared user-scoped reads/writes and revision checks (server/app.mjs:142-155,267-284).
- API input -\> native command: engine enum, bounded integer controls, validated legal UCI history and canonical FEN before shell:false spawn (server/engine.mjs:17-39,73-80,114-116,224-238; server/opponent-engines.mjs:63-70,94,180-201).
- Hosted Worker -\> native: configured shared-secret gate before all native handlers; incomplete/noncanonical hosted config fails startup, wrong/malformed keys reject with 403. Worker forwards only application session cookie, rejects cross-origin POSTs, bounds streamed bodies at 256 KiB and refuses redirects (server/hosting.mjs:3-11; server/app.mjs:67; server/sites-worker.mjs:6-39).

### Attacker Capabilities

- Unauthenticated HTTP caller can reach local native listener only with local network reachability; proposed tunnel requires backend secret.
- Authenticated ChessLab account can submit legal game/analysis/study inputs and guess other game IDs; it has no filesystem or environment configuration control.
- Cross-origin browser page may attempt authenticated mutations but does not control browser Origin/Sec-Fetch-Site headers or SameSite session policy.
- Proposed Sites owner-private boundary is supplied context; platform access enforcement is not proven by this source review.

### Security Objectives

- Preserve account isolation and session confidentiality.
- Reject untrusted cross-origin state changes and direct tunnel requests without the shared secret.
- Keep arbitrary input out of executable paths, shell execution and line-oriented native commands.
- Bound request bodies, native concurrency, queues and search durations.

### Assumptions

- No external URLs are visited and no publishing or persistent checkout mutation occurs during review.
- No independent baseline/architecture worker per explicit task allowance; the documented sequential fallback is used.
- PUBLIC_ORIGIN and COOKIE_SECURE=1 are operator-supplied hosted configuration; live deployment and Sites owner access enforcement are outside this source scan.
- Hosting guard and Worker modules were implemented by the task owner during the review. Final source and their corrected boundary behavior were re-read and tested; the scanner did not edit checkout files.

## Findings

### No findings

No reportable findings survived the canonical discovery, validation, and reportability gates.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Authentication and session lifecycle | not recorded | No issue found | In-memory fixture verified configured HTTPS Origin over loopback HTTP registers successfully, emits Secure/HttpOnly/SameSite=Strict cookies, and stores only token hashes. Logged-out and expired sessions return 401. Source: server/app.mjs:95-110,115-138. |
| Account-owned games, studies, exports and progress | not recorded | No issue found | Prepared user-scoped reads/writes and revision guards protect game/study/progress state. Ten executed cross-account read/export/move/bot/resign/undo/hint/assist/study/analyze requests returned 404 before engine work. Source: server/app.mjs:99-102,142-155,261-284. |
| Origin, CSRF and native-host exposure | not recorded | No issue found | Foreign Origin, spoofed X-Forwarded-Proto/Host and Sec-Fetch-Site cross-site requests were rejected. Native hosting guard precedes all API/static handlers. Missing/wrong backend keys reject API and non-API paths with403. Final five incomplete/noncanonical/non-HTTPS hosting config fixtures throw at startup; missing/wrong/multibyte keys return403 without throwing, valid key passes. Earlier HTTPS termination and partial-config guard issues were fixed by task owner during scan and independently revalidated. Source: server/app.mjs:67,77-91; server/hosting.mjs:3-11; server/index.mjs:20. |
| Native engine command and resource bounds | not recorded | No issue found | Six executed UCI/FEN/engine-ID/rating/style/search-limit abuse inputs return400 before spawn. Source uses catalog enum, bounded integers, validated legal UCI and canonical FEN, shell:false spawn, bounded active/queued processes and hard deadlines. Inspected supporting Maia2 UCI consumer uses enum-selected checkpoint plus python-chess move parsing. Source: server/engine.mjs:17-39,48-80,114-116,224-238; server/opponent-engines.mjs:39-70,94,180-201. |
| Worker credential forwarding and streamed body bounds | not recorded | No issue found | Offline fetch mock proves missing/foreign/cross-site Origin rejected before fetch, only chesslab_session forwarded, Sites cookie/client Authorization/forwarded-host omitted, secret and Origin derived from trusted server context, redirects refused with502, missing backend config503. Final endless16KiB stream fixture canceled on read17 after crossing256KiB, returned413, zero backend fetches. Source: server/sites-worker.mjs:6-39. |
| Authentication, sessions and account ownership | not recorded | No issue found | In-memory fixture: missing/wrong backend key rejected API and non-API paths with 403; fixed HTTPS origin over loopback HTTP registered successfully and emitted Secure/HttpOnly/SameSite=Strict cookie; database stores hash rather than token; 10 cross-account game/export/mutation/analyze requests returned 404 before engine work; logout and expiry returned 401. Controls: server/app.mjs:67,77-110,142-155,267-284. |
| Native engine command boundary | not recorded | No issue found | Six executed engine/FEN/UCI/control injection or bound-abuse inputs rejected with status 400 before process spawning. Source enum and integer validation, canonical legal FEN/history, shell:false spawn, bounded active/queued processes and deadlines hold the boundary: server/engine.mjs:17-39,48-80,114-116,224-238; server/opponent-engines.mjs:39-70,94,180-201. Maia2 supporting script consumes only enum-selected checkpoint and parsed UCI. |
| Worker request and credential forwarding | not recorded | No issue found | Offline fetch mock: missing/foreign/cross-site Origin rejected before fetch; only chesslab_session forwarded, never Sites cookie or client Authorization/forwarded-host; configured secret and derived fixed origin replace client values; oversized request returned 413 before forwarding; redirects returned 502 without following; missing backend config returned 503. Source: server/sites-worker.mjs:6-30. |
| Hosting configuration and early bounds | not recorded | Needs follow-up | Task owner is correcting malformed multibyte secret header handling and streaming request size enforcement. Reported PUBLIC_ORIGIN-only configuration currently disables shared-secret guard because secret is absent (server/hosting.mjs:4-6); owner has been asked to enforce both configuration fields together. |
| Authentication, account isolation and native command boundaries | not recorded | No issue found | Inspected the existing 11 server source/test/catalog files. Prepared user ownership, cryptographically random hashed sessions, legal history/FEN canonicalization, engine catalog allowlisting, bounded queues/timeouts and shell:false process spawning are present. PUBLIC_ORIGIN was added during review to resolve the initial HTTPS termination integration issue. Actual Sites enforcement and third-party native engine internals are outside this bounded source review. |

## Open Questions And Follow Up

- Does the final deployed Sites owner-private access policy cover the Worker API routes, with the native process launched using the configured secret, PUBLIC_ORIGIN, COOKIE_SECURE=1 and isolated hosted database?
  - Follow-up prompt: Deployment owner should verify the live access policy and native runtime configuration; no deployed-service testing was performed by this scan.
- Final hosting fixes pending from task owner; isolated boundary recheck required.
  - Follow-up prompt: Review deferred unit hosting-final-source-validation and close its stated proof gap. Paths: server/hosting.mjs, server/sites-worker.mjs.
- Hosting guard and Worker proxy are being completed by task owner; isolated proof pending.
  - Follow-up prompt: Review deferred unit hosting-new-modules and close its stated proof gap.
