# Launch kit

The first landing-page drafts that used to be here were replaced by full sites that live in each product's repository.

| Product | Site code | Pull request | Clickable preview |
|---|---|---|---|
| AskTheMove | `site/` in praxstack/ChessLab, branch `claude/beta-waitlist-site` | https://github.com/praxstack/ChessLab/pull/18 | https://claude.ai/artifact/8GyzbZnUCpm8TASqLd6XnU |
| Praxmodoro | `site/` in praxstack/Praxmodoro, branch `claude/beta-waitlist-site` | https://github.com/praxstack/Praxmodoro/pull/61 | https://claude.ai/artifact/Xbr7zFHyC1FhgsrSanMS5R |

In the previews the waitlist form is simulated and saves nothing. The real form works once a site is deployed to Cloudflare Pages.

- What to do before buying the domains and mailboxes: [before-you-buy.md](before-you-buy.md)
- What still needs Prax (checks, decisions, app issues): [whats-left.md](whats-left.md)
- The full plan (registrar, email, application kit): https://claude.ai/artifact/Nc36qZHnnBuHpsXKpbYJVf

## Design direction

- **AskTheMove** is a chess coach's lesson notebook: graph paper, a book-diagram board, and a hand that draws arrows and writes notes. Light only, on purpose. See `site/DESIGN.md` in ChessLab.
- **Praxmodoro** is "a day, in quiet rooms": a slow breathing light, then one softly lit room per moment of a session, with real stills from the Mac beta. See `site/DESIGN.md` in Praxmodoro.

## Demo videos

Silent, 1920x1080, edited with HyperFrames from real footage. Each folder has the video, a poster, a contact sheet, `EDIT-NOTES.md`, the raw `footage/`, and the HyperFrames `project/` source.

| Product | Video | Length |
|---|---|---|
| AskTheMove | [video/askthemove/askthemove-demo.mp4](video/askthemove/askthemove-demo.mp4) | 58.8 s |
| Praxmodoro | [video/praxmodoro/praxmodoro-demo.mp4](video/praxmodoro/praxmodoro-demo.mp4) | 55.7 s |

The AskTheMove end card shows askthemove.online, the domain Prax bought on 2026-10-08 (re-rendered the same day). The Praxmodoro end card shows praxmodoro.com, which is not bought yet.

## Related app pull requests

- ChessLab #19 replaces the Chess.com-derived pieces, icons and bot portraits: https://github.com/praxstack/ChessLab/pull/19
- Praxmodoro #62 fixes the launch hang on macOS 27: https://github.com/praxstack/Praxmodoro/pull/62
