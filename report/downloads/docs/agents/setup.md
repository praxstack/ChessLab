# Project setup

Configured 2026-09-05 using existing local installations. "Mat pack" was interpreted as Matt Pocock's skills. "Unslop stack" uses Pstack Unslop and the separate Clay Unslop fork.

| Pack | Linked entries per host | Source |
| --- | ---: | --- |
| Matt Pocock | 22 | Canonical `~/.agents/skills/` entries, matched against the installed Matt plugin manifest |
| Writing | 2 | `unslop` and `clayunslop`, each retaining its own references and scripts |
| OpenSpec | 12 | Existing `openspec-*` skills; CLI 1.12.0 |
| Gstack | 54 | 53 skills plus runtime/router; separate Codex-generated and Claude-source variants |

Codex uses `.agents/skills/` with a `.codex/skills` compatibility mirror. Claude uses `.claude/skills/`; Cursor mirrors that directory. This creates 90 entries in each of the two host trees, plus two directory mirrors. All are symlinks and ignored by Git. Their full inventory and entrypoint hashes are tracked in `skills.local.json`.

Gstack naming differs by host: the Codex folder `gstack-review` declares `name: review`; Claude declares `name: gstack-review`. Read the installed entrypoint for the invocation name. The Codex runtime tree is deliberately smaller than the Claude pack to avoid discovering both generated and source variants. Duplicate connection aliases and OpenClaw wrappers were excluded.

Top-level skill names are unique. Gstack's runtime contains two aliases to already-linked skills, `office-hours` and `gstack-upgrade`. These resolve to the same source files; agent-loader deduplication has not been tested.

## Commands and boundaries

`just setup` validates installed entrypoint hashes, preflights destinations, and creates links. It refuses to replace an existing file, directory or different symlink. Re-running it is safe. `just check` checks links/hashes, validates all OpenSpec artifacts strictly, and runs Git's whitespace check. `just test` exercises link creation, repeat setup, conflict preservation and read-only check behavior.

`just e2e` deliberately exits 1 with an unavailable message because no application exists. Replace it with an actual browser test when the prototype is implemented. Do not count it as a passing product test.

OpenSpec was initialized with `openspec init --tools none --no-animation`, then linked to the existing canonical skills. This avoids copying or overwriting global skills. Run `OPENSPEC_TELEMETRY=0 openspec context --json` to verify ChessLab is the resolved root. The initial change is `explore-one-mistake`; it contains draft proposal, design, requirements and unchecked tasks. Main specifications remain empty until the change is implemented and accepted through the normal workflow.

Do not run `openspec init` or `openspec update` against linked skill directories to refresh them. Review updates in the canonical installation, review the changed entrypoints, then update this project's manifest hashes. The SHA-256 values attest only to `SKILL.md` entrypoints, not the full dependency trees or upstream Git commits. The installed Matt and Gstack snapshots lack usable source Git metadata.

On another machine, install the reviewed packs into that machine's canonical skill locations, including Gstack's host-specific generation and runtime. Adjust `skills.local.json` source paths if necessary, verify the contents, then run `just setup`. This project bootstrap does not download or reconstruct missing global packs. Home-relative source paths are expanded at runtime; the generated links themselves are machine-local.

Global configuration, Git hooks, telemetry preferences and existing skill sources were not changed. No plugin setup scripts, package upgrades, external issue tracker, remote repository or deployment were created. Agent discovery paths are verified on disk; command-menu discovery in freshly opened Codex, Claude and Cursor sessions has not been exercised.

## Verification recorded during setup

- Skill links resolve and all 144 manifest entrypoint hashes match, covering 180 per-host skill links.
- Setup helper self-check passes.
- Gstack's linked `browse --help` exits 0. No browser session was launched.
- Clay's linked `evals/check_commands.py` exits 0: five command files and seven synonym routes. Full behavioral/model evaluation was not run.
- OpenSpec strict validation passes for `explore-one-mistake`: one change passed, zero failed, four planning artifacts complete. All nine implementation tasks remain unchecked. This checks artifact structure, not working chess functionality.

Node 22.23.1, Bun 1.4.0 and Python 3.14.7 were observed locally. Application dependencies have not been selected or installed.
