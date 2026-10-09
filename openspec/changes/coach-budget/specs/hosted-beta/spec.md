## Purpose

Allow one server instance to run safely behind an HTTPS reverse proxy for a small invited group, and remember which invite admitted each account.

## MODIFIED Requirements

### Requirement: HB-004 Invite-gated sign-up
When `BETA_INVITE_CODES` or `COACH_AI_INVITE_CODES` is set, new accounts SHALL require one code from either list, compared in constant time. A gated sign-up SHALL store a SHA-256 digest of the code used, never the code itself. Existing accounts SHALL sign in without a code, and accounts created before digests existed SHALL keep working. When neither list is set, sign-up SHALL behave as before and store no digest.

#### Scenario: Uninvited sign-up
- **WHEN** a visitor registers without a valid code on a gated server
- **THEN** registration is refused with an explanation and no account is created

#### Scenario: Coach code alone
- **WHEN** only `COACH_AI_INVITE_CODES` is set
- **THEN** sign-up requires one of those codes, and the new account stores that code's digest

#### Scenario: Database from before digests
- **WHEN** the server starts on a database whose accounts have no digest column
- **THEN** the column is added empty and those accounts sign in as before
