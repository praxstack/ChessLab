## 1. Baseline
- [x] 1.1 Record `npm ci`, `npm test`, `npm run build` and the browser smoke test before changes. Separate environment gaps (missing Stockfish 19, Lite, Maia, Leela, tablebases, puzzle catalogue) from product failures.
- [x] 1.2 Fix the sign-up username `pattern` attribute, which the browser rejected as an invalid regular expression under the `v` flag.

## 2. Grounded Claude explanations
- [x] 2.1 AI-001 Build structured evidence from replayed history and bounded engine analysis. Reuse the account's own panel evidence or saved review step. Refuse mismatched positions.
- [x] 2.2 AI-002 Verify cited moves and mate claims against the evidence; fall back to the deterministic summary on any failure.
- [x] 2.3 AI-003 Parse a why-not move, reject illegal moves, and compute its engine evidence before any model call.
- [x] 2.4 AI-004/AI-005 Use the pinned Anthropic SDK with timeout, concurrency cap, per-account hourly quota and reason-only logging. Test success, invented move, missing key, timeout, quota, API errors, refusal and truncation with a fake client, and evidence with real Stockfish.
- [x] 2.5 AI-006 Add "Explain why" and the why-not input to the review panel with AI-generated labelling. Hide them when no key is configured. Capture a desktop screenshot with a stubbed client.
- [ ] 2.6 AI-001 through AI-006 Make one live request with a real API key. Confirm the answer passes verification and the label names the model. Confirm the static instructions are cached (cache read tokens on a repeat request).

## 3. Hosting readiness
- [x] 3.1 HB-001/HB-002 Add `APP_ORIGIN`, `TRUST_PROXY`, Secure cookies, security headers and CSP with tests; keep local defaults unchanged.
- [x] 3.2 HB-003 Add a per-account sign-in throttle and test distributed guessing.
- [x] 3.3 HB-004 Add `BETA_INVITE_CODES` sign-up gating and the invite field; test gated, wrong-code and existing-account cases.
- [x] 3.4 HB-005 Add `/healthz`, the production `Dockerfile` and `.dockerignore`. Lint with hadolint, build and run as non-root, and check health, analysis and restart persistence on a volume (sandbox build used proxy-only additions).
- [x] 3.5 HB-006 Stop serving archives when hosted and hide their links.
- [x] 3.6 HB-007 Write `docs/deploy-beta.md` and update the settings documentation.
- [ ] 3.7 HB-001 Verify the proxy hop count and per-visitor limits on the chosen host.
- [ ] 3.8 HB-005/HB-007 Deploy to the chosen host, point `app.<domain>` at it, and rehearse backup and restore there.

## 4. Delivery
- [x] 4.1 Run the full test suite, production build, browser smoke test and strict OpenSpec validation; record environment-caused failures separately.
- [x] 4.2 Audit Chess.com-derived content for the founder without changing it.
