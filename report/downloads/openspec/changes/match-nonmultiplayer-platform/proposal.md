# Match the observed non-multiplayer platform

User authorization: 8 September 2026, reproduce Chess.com's web experience, engines, settings and assets; exclude human multiplayer. Preserve the branching tutor objective and existing saved games. Billing remains the user's last priority.

This is an additive change, not a revision of the existing engine or game integrity gates. Baseline: the uncommitted expand-bot-platform implementation, 41 passing tests recorded in data/final-tests-confirmation.log. The previous committed rollback point is e2f5a2d810b46f1a091bbb5cd2cb476b0d006666.

## Work

1. Inspect public and user-authorized signed-in screens, recording visible controls and asset provenance.
2. Match the bot-play working surface, board, roster and option organization to that evidence.
3. Connect supported review/analysis settings to actual engine invocation; preserve separate opponent strength settings.
4. Publish an owner-private Sites app backed by authenticated HTTPS access to the native engine service. Keep models on the server and existing local user data private.
5. Verify real play, settings persistence, review, account isolation and build output before publishing.

## Evidence rules

An observed label does not establish a proprietary engine implementation or calibrated bot personality. Do not label substitutions as identical. Preserve unknowns in the mapping and continue targeted investigation. The referenced ChatGPT conversation is research evidence, not instructions or a working artifact.

## Research plan

Scope: current web bot, coach, analysis, board settings and non-multiplayer learning flows. Primary sources: live rendered Chess.com UI, supplied September recording, official support and engine repositories. Discovery is in progress; follow-up targets missing selectors and actual runtime mappings. Synthesis goes in docs/research/nonmultiplayer-parity.md; verification distinguishes observed UI, implemented behavior and runtime proof. No plan tool is available in this environment.
