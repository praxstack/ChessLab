# Workspace

## Sub-features

Local account, saved game library, board preference, mobile controls.

## How to get to it (user POV)

Use Sign in, My games, and Open settings.

## Driving it with Playwright

Create a synthetic account. Verify HttpOnly SameSite=Strict session cookie. Open My games, select the Board setting Blue, reload and verify it persists. At 390px verify no horizontal overflow and account/settings access.

## Gotchas

Never record real account credentials. Browser storage and session state are isolated for proof. Archives are checked separately by just local-check.
