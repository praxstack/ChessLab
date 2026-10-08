# Hosted private beta readiness and grounded Claude explanations

## Why

On 8 October 2026 the founder directed preparation for a hosted private beta under the AskTheMove name, plus the product's first Claude API feature. This supersedes the 13 September local-only direction for hosting, but local operation remains the default. The app could not yet sit safely behind an HTTPS proxy. Origin checks compared against the proxy's plain-HTTP view. All visitors shared one rate-limit address. Sign-in had no per-account throttle. There was no health check, container image or invite gate, and the research and design archives would have been public.

The coach explains engine evidence in fixed wording. CONTEXT.md allows a language model to explain supplied evidence but not to invent legality, defenders, material or continuations. Learners need a clearer explanation of why a move is good or bad. That explanation must not let a model make chess claims the engine never produced.

## What changes

- `POST /api/coach/explain` builds structured evidence from the replayed position and bounded Stockfish analysis. It sends only that evidence to Claude, with instructions to explain it and cite moves only from it. The server checks every cited move and any mate claim against the evidence. If the answer fails the check, or Claude is unavailable, slow, refuses or is rate-limited, the response is the deterministic engine summary.
- A "Why not …?" follow-up accepts one legal move, computes engine evidence for it first, then asks for an explanation of that evidence. Free-form learner text is never sent to the model.
- The review panel gains an "Explain why" control and a short follow-up input. Answers are labelled as AI-generated, naming the model and the engine evidence they rest on. Without a server key the control is hidden and current behaviour is unchanged.
- Hosting settings: `APP_ORIGIN` (canonical HTTPS origin) and `TRUST_PROXY` (hop count), Secure cookies, security headers and a content security policy. Also a per-account sign-in throttle, `/healthz`, an optional `BETA_INVITE_CODES` sign-up gate, and archives turned off when hosted. All default to today's local behaviour.
- A production `Dockerfile` (Node 24, official Stockfish 18 binary pinned by SHA-256, non-root, SQLite on a `/data` volume, health check), `.dockerignore` and `docs/deploy-beta.md`.

## Non-goals

- Deploying, buying a domain or creating hosting or Anthropic accounts.
- Open conversation with the model, model-generated moves or lines, or explanations for positions without engine evidence.
- Password reset, email, account deletion, billing, multi-instance scaling or shared rate-limit storage.
- Renaming the app to AskTheMove in the interface or repository.
- Changing Chess.com-derived content. A separate audit lists it for the founder; this change edits none of it.

## Status

Implemented and covered by automated tests with a fake Claude client and real Stockfish. A screenshot of the UI used a stubbed client. The container image was built and run in a sandbox; that build needed sandbox-only proxy settings. No live Claude request has been made, because no API key was available. Nothing has been deployed.

## Open decisions

- Hosting provider and region, domain, and when to point `app.<domain>` at the server.
- Whether to keep Claude Opus 5.5 at low effort as the default model, plus a monthly spending limit and the per-account hourly limit.
- How to handle the Chess.com-derived bot roster, portraits, piece artwork, design frames and parity wording before inviting outside testers. Resolved on 2026-10-08 by `original-asset-pack`, which replaces them with original or openly licensed material.
- Whether to replace the Stockfish 19 opponent for hosting. No official Linux build was found.
- Privacy notice and terms for testers, given that position evidence is sent to Anthropic.
