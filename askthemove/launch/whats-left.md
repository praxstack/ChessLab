# What's left for Prax (2026-10-08)

Everything below needs your hands or your call. Nothing has been bought, deployed, signed up for or submitted.

## Needs you

1. **Open Praxmodoro on your Mac once** (from Finder or the Dock) after checking out [PR #62](https://github.com/praxstack/Praxmodoro/pull/62), and confirm the window and the menu bar item appear. All tests pass there, but nobody has seen the window on screen yet.
2. **Buy the domains and set up email**, in the order in [before-you-buy.md](before-you-buy.md). AskTheMove's domain is bought (askthemove.online, 2026-10-08); its site (PR #18) and video end card now say it, and prax@askthemove.online exists on Zoho. Praxmodoro's site and video say praxmodoro.com, which is not bought yet.
3. **Tell me which email you already have**, and whether it should replace `hello@<domain>` as the contact address on the sites.
4. **Review the privacy notice and terms** on both sites. They are templates marked "not yet reviewed".

## Your call

- **ChessLab git history.** PR #19 removes the Chess.com-derived art, but old commits (and about 262 MB of old screenshots in `docs/verification`) still contain it. Options: rewrite history and force-push, or make the repo private before sharing it.
- **Piece licence.** The new cburnett pieces are GPL-2.0-or-later. That fits an open-source repo; a closed-source app would need different pieces.
- **Rename the app.** The ChessLab app still says "ChessLab" on screen. The demo video masks it; renaming the UI to AskTheMove would let future footage go unedited.
- **Narration.** Both videos are silent with on-screen text. For a voice-over, either sign in to HeyGen (`npx hyperframes auth login`) or allow a local voice install (Kokoro).

## App issues spotted in the footage (not checked in code, not fixed)

- ChessLab's review puts a "!" badge (labelled "Mate sequence") on 5…Bxd1 in Légal's mate, though that move walks into mate. A "!" normally means a good move, so this looks wrong. The demo video patches the badge out.
- The same card says "Material: White 30, Black 37 (Black -1 points)", which contradicts itself.
- The import toast says "with comments and variations" even when the PGN has neither.

## Where everything is

See [README.md](README.md) for the sites, previews, videos and pull requests.
