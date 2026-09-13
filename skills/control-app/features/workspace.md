# Workspace

## Sub-features

Local account, saved game library and collections, board preference, mobile controls.

## How to get to it (user POV)

Use Sign in, My games, and Open settings.

## Driving it with Playwright

Create a synthetic account. Verify HttpOnly SameSite=Strict session cookie. Open My games, select the Board setting Blue, reload and verify it persists. At 390px verify no horizontal overflow and account/settings access.

## Gotchas

Never record real account credentials. Browser storage and session state are isolated for proof. Archives are checked separately by just local-check.

## Collections

Create a named collection, add two saved games, and put the same games in a second collection. Edit details, search, sort and remove one membership. Reload to verify persistence. At 390px cancel deletion, then confirm it; verify every game and nested branch survives and the second collection still opens its game. Empty and no-match states should remain actionable. The account/HTTP check separately proves ownership, stale revision rejection and rollback on failed membership storage.
