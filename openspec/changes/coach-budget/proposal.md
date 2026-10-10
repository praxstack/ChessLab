# Who the server's Claude key pays for

## Why

On 9 October 2026 Claude for Startups paused its API credits for new members, so every Claude explanation is now paid by the founder. The founder is on a Claude Max 20x plan, whose $200 of monthly API credits can run a Console key with no purchase. The founder set the rule the same day: their plan pays for nobody except themselves while developing, and friends and family they choose. Everyone else will later bring their own access.

`hosted-beta-readiness` lets every account on a server with a key ask Claude, limited only by an in-memory hourly quota that a restart clears. A hosted beta with ten testers could spend the whole month's credits on other people, and nothing records whose code admitted whom.

## What changes

- `COACH_AI_INVITE_CODES` names the invite codes whose accounts use the server's key. Each one also admits sign-up, so the invite gate turns on when only this list is set.
- At sign-up an account stores a SHA-256 digest of the invite code it used, never the code. Databases from before this change gain the column empty.
- A local server (no `APP_ORIGIN`) covers every account, as before. A hosted server covers only accounts whose stored digest matches a current `COACH_AI_INVITE_CODES` code. Removing a code and restarting stops covering the accounts that used it; they keep signing in and keep the engine summary.
- `/api/me` reports `coachAi` per account, and the review panel shows "Explain why" only when the server has a key and the account is covered. An uncovered account that calls the endpoint gets the engine summary with the reason `not_covered`, and the server keeps no explanation evidence for it.
- `COACH_AI_MAX_PER_DAY` (default 50) caps explanations per UTC day: per coach code on a hosted server, shared by every account created with that code, and per account on a local server. The count lives in SQLite, so a restart does not reset it. The hourly quota is checked first, so an hourly refusal never spends a daily explanation, and a daily refusal hands its hourly unit back. Over the cap the learner gets the engine summary with the reason `daily_limit`.
- `docs/deploy-beta.md` explains who the key pays for, per-person codes, and running the key on a Max plan's monthly API credits with auto-reload off and a workspace spend limit.

## Non-goals

- Bring-your-own-key, Sign in with ChatGPT or any other way for an uncovered account to reach a model.
- A total budget across accounts. The Console workspace spend limit is the total cap.
- An admin page for codes or usage. Codes are edited in the environment; usage can be read from the `coach_daily` table.
- Changing what an explanation contains or how it is verified.

## Status

Implemented with automated tests using a fake Claude client: hosted coverage by code, revocation by removing a code, the daily cap across a restart and a UTC day boundary, one cap shared by the accounts on a code, hourly-before-daily ordering and the hourly unit returned on a daily refusal, invite digests and the schema upgrade. No live Claude request has been made and nothing has been deployed.

## Open decisions

- Whether 50 explanations a day is the right default once real usage is visible.
- Whether the founder's own hosted account should be covered by a dedicated code or by a separate owner setting.
- When bring-your-own-key replaces `not_covered` for everyone else.
