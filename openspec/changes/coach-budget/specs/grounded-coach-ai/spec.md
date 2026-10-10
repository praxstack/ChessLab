## Purpose

Let a learner ask Claude to explain the engine evidence for one position, while the server's own key pays only for the accounts its owner chose and at most a fixed number of explanations each per day.

## MODIFIED Requirements

### Requirement: AI-005 Bounded cost and load
Each account SHALL have an hourly explanation quota. A daily explanation quota SHALL be counted per UTC day: on a hosted server per invite code, shared by every account created with that code, and on a local server per account. The daily count SHALL be stored in the server's database so that a restart does not reset it. The hourly quota SHALL be checked before the daily count, so a request refused for the hour does not spend one of the day's explanations, and a request refused for the day SHALL NOT spend the hourly quota. The server SHALL cap concurrent model requests, each request's time and output tokens, and the engine time used for fresh evidence. Exceeding either quota SHALL return the deterministic summary with a rate-limit reason naming the hour or the day rather than an error page.

#### Scenario: Quota reached
- **WHEN** an account exceeds its hourly explanation quota
- **THEN** further explanations that hour return the engine summary with a rate-limit notice, and other accounts are unaffected

#### Scenario: Daily cap reached
- **WHEN** an account has used its daily explanations, and the server then restarts
- **THEN** further explanations that UTC day return the engine summary with a daily-limit notice, and the account's first explanation after 00:00 UTC is answered by Claude

#### Scenario: Hourly refusal
- **WHEN** a request is refused by the hourly quota
- **THEN** the account's daily count is unchanged

#### Scenario: Daily refusal
- **WHEN** a request is refused by the daily quota
- **THEN** the account's hourly quota is unchanged

#### Scenario: Several accounts on one code
- **WHEN** two accounts on a hosted server were created with the same coach code
- **THEN** their explanations count against one daily quota, and accounts created with another code keep their own

## ADDED Requirements

### Requirement: AI-007 Owner key only for covered accounts
A server without a hosted origin SHALL treat every account as covered by its key. A hosted server SHALL treat an account as covered only when the invite code it signed up with is currently listed in `COACH_AI_INVITE_CODES`. The account SHALL store a digest of its invite code, never the code. The explanation control SHALL be shown only to covered accounts on a server with a key. An uncovered account's explanation request SHALL return the deterministic engine summary with a `not_covered` reason and MUST NOT reach the model, and the server SHALL keep no explanation evidence for that account.

#### Scenario: Friends-and-family account
- **WHEN** an account created with a `COACH_AI_INVITE_CODES` code asks for an explanation on a hosted server with a key
- **THEN** Claude explains the evidence and the account's quotas are spent

#### Scenario: Tester account
- **WHEN** an account created with a `BETA_INVITE_CODES` code, or with no code, uses the review panel on a hosted server
- **THEN** the explanation control is hidden, and a direct request returns the engine summary with `not_covered` without calling the model

#### Scenario: Code removed
- **WHEN** the owner removes a code from `COACH_AI_INVITE_CODES` and restarts the server
- **THEN** accounts created with that code are no longer covered, and they still sign in and see the engine summary
