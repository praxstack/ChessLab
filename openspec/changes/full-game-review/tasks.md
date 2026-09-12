## Pstack execution graph

Reference behavior → frozen game/study contracts → persisted review step → interactive report → real-engine browser recording → root review → PR.

- [x] Frame the complete report against the official reference and local source.
- [x] Compare one long blocking request with saved incremental steps; choose incremental steps to support pause/reload and avoid a job service.
- [x] Add failing checks for ownership, resume, stale state and game/study preservation.
- [x] Implement persisted native-engine report steps and honest summaries.
- [x] Build the evaluation graph, progress controls and key-move navigation.
- [x] Verify engine evidence, terminal positions and the complete user flow with video.
- [ ] Review and open a PR with explicit parity gaps.

Full platform parity remains unfinished after this change. The existing local-polish PR remains separately reviewable.
