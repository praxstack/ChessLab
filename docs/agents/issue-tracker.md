# Issue tracker: local Markdown

Track local work under `.scratch/<feature>/issues/<NN>-<slug>.md`, with a `Status:` line and appended `## Comments`. Scratch tickets are machine-local and ignored by Git; durable requirements and implementation tasks belong in OpenSpec.

OpenSpec is the sole specification source. A Matt Pocock skill that expects `.scratch/<feature>/spec.md` should write a short pointer to `openspec/changes/<change>/proposal.md`, its `specs/`, and `tasks.md`. Do not maintain a competing specification in scratch. Main specs move to `openspec/specs/` only through the normal accepted-change workflow.

"Publish to the issue tracker" means write a local ticket, not create a remote issue. "Fetch the ticket" means read that file. Private repository publication does not change this local ticket workflow. Do not create remote issues or treat PRs as the request source unless the user changes that decision.

For Wayfinder, the map is `.scratch/<feature>/map.md`; children use the ticket paths above. Keep `Type:`, `Blocked by:`, and its `claimed`/`resolved` workflow where needed. Link resolved decisions into OpenSpec or `CONTEXT.md` as appropriate, with their actual approval status.
