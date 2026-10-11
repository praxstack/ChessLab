# AskTheMove: the honest verdict (9 Oct 2026)

Reading used for "agentic browse": money spent on AI and agent tooling (Claude API, cloud sessions, agents building the product), plus your own hours.

## The verdict in one paragraph

As it stands, AskTheMove is **not a startup, it is a feature**, and that feature already shipped at every incumbent this year. "Stockfish supplies the facts, an LLM explains them" is now the default architecture of the category, and Magnus Carlsen's company presented the exact same pipeline (plus Maia and tactic detectors, which we don't have) at AI Engineer Europe 2026. Do not put more money into it in its current shape. Keep it only if you pivot the *who* and the *distribution*, not the tech, and give that a short, kill-or-continue test before writing more code.

## What the incumbents ship today (checked 9 Oct 2026)

| Who | What they ship | Since | Price | Source |
|---|---|---|---|---|
| Chess.com | LLM coaches in Game Review, Puzzles, Lessons, Play Coach, with celebrity voices (Magnus, Hikaru, Levy, Botez) via ElevenLabs; team reviews LLM output | 4 Nov 2025 | Free: 1 review/day. Unlimited move explanations: Diamond only (~$12.50/mo yearly) | [GamesBeat](https://gamesbeat.com/chess-com-will-let-you-choose-your-ai-coach-based-on-celebrity-voices/), [Chessvia, 7 Sep 2026](https://www.chessvia.ai/blog/chess-com-game-review-free) |
| Take Take Take (Magnus Carlsen's company) | Post-game AI review: Stockfish + Maia (human-likeness) + tactic/positional detectors, LLM writes commentary in ~3 s; Claude Code agent improves prompts from downvotes | Talk at AI Engineer Europe 2026; article updated 22 Aug 2026 | App, free | [AI Engineer talk](https://ai.engineer/talks/building-a-chess-coach), [StartupHub](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/building-an-ai-chess-coach-take-take-take) |
| Duolingo Chess | Free beginner course to ~1500, Oscar coach bot, PvP, and since 11 Aug 2026 a narrated Game Review explaining each mistake | Course free since Jun 2025 | Free inside Duolingo | [Chessdrive](https://chessdrive.io/blog/duolingo-chess-what-it-teaches-and-where-it-stops), [Technobaboy](https://www.technobaboy.com/2026/02/17/duolingo-brings-chess-pvp-mode-to-android/) |
| Lichess | Free Stockfish analysis, puzzles, studies; no natural-language coach (by design, non-profit) | n/a | Free | [Improve my Chess, 29 Apr 2026](https://www.improvemychess.co/learn/best-ai-chess-coaches-2026) |
| DecodeChess | Stockfish translated into plain-English reasoning | years | 1 game/day free; $8.25/mo | [Chessvia](https://www.chessvia.ai/blog/best-ai-chess-coach) |
| Aimchess | Cross-game weakness dashboard, drills from your games | years | $7.99/mo | same |
| Noctie | Human-like bot to train against | years | €8-14/mo | same |
| Indie LLM coaches | Chessvia, Improve my Chess, Chessiro, 99chess, Chessigma, LearnChess, open-source Stockfish 18 + LLM trainers on GitHub | 2025-2026 | Free to ~$19/mo | [Chessvia](https://www.chessvia.ai/blog/best-ai-chess-coach), [GitHub Iamsdt/chess](https://github.com/Iamsdt/chess), [Chessiro](https://chessiro.com/blog/best-ai-chess-coach) |

CheckmateX's April 2026 survey: around late 2024 "every chess platform released an AI coach feature", and "the gap between what's promised and what's delivered is still significant" ([CheckmateX](https://checkmatex.app/blog/ai-chess-coach-apps-2026-are-they-worth-it)). Note: several sources above are written by competitors marketing themselves; I used them only for facts I could cross-check (pricing, dates, feature names).

## Your question, answered directly

**"Can Chess.com, Lichess, Duolingo easily get this?"** They already have it. Chess.com shipped LLM coaches 11 months ago, Duolingo shipped AI game review two months ago, Magnus's team has a better pipeline than ours. Lichess won't, but Lichess is free and is where the people who'd pay $5 for explanations go to get engine lines for nothing.

**Do we have a moat today?** No. Everything we have is replicable in a weekend by anyone with Stockfish and an API key, and dozens of people already did. Our current advantages (good review UX, grading that doesn't lie about "forced" mate, the hand-drawn brand) are quality, not moat.

**Is it worth more money?** Not in its current shape. You're a solo, bootstrapped founder paying ~2-4 cents per explanation out of pocket, competing with free (Lichess, Duolingo, Take Take Take) and bundled (Chess.com). A generic "AI explains your chess game" app for global players is the most crowded square on the map.

## Where a moat could actually come from (for a solo founder)

Moats here won't be technology. They come from **who you serve and how you reach them**. Ranked by how realistic they are for you:

1. **Serve the coach, not the player (best bet).** Every competitor sells to individual players. Nobody owns the chess *academy's* workflow: a coach with 30 kids who needs each student's weekly games reviewed, homework puzzles built from that student's own mistakes, and a progress note for parents. That's a B2B copilot. Moat = workflow lock-in (student history lives in your tool), coach relationships, and word of mouth between academies. India is the right place: chess exploded after Gukesh, and academies are everywhere. Risk to check first: fees are low (one Chennai club charges "a little over $10 a month" per kid, [NPR via WAMC, Jun 2025](https://www.wamc.org/2025-06-08/india-and-its-kids-are-out-to-conquer-the-world-of-chess)), so the price per seat must be small and the value obvious.
2. **Language.** About 10% of Indians speak English fluently, and a Tamil chess YouTuber has 80k+ followers precisely because materials are in English (same NPR piece). Explanations in Tamil, Hindi, Telugu, Malayalam are something Chess.com does poorly and LLMs do cheaply. Alone it's a feature; combined with #1 it's a wedge.
3. **The tutor loop (predict, explain the gap, retry a related position).** This is the part the 9 Oct review said is not built. It's a real learning-science difference, but it is copyable; it's a reason to choose you, not a moat.
4. **Proprietary data.** Only becomes a moat at scale (thousands of students' mistake patterns per age/rating). Comes for free if #1 works; not something to chase directly.

Not a moat: better prompts, Claude vs Gemini, nicer board, more features. Take Take Take beats us on all of those with a funded team.

## What I'd do (recommendation)

- **Stop spending on product code now.** No new features, no paid AI tooling beyond what's already sunk. Keep the waitlist up; it's nearly free.
- **Run a 3-week validation with a kill rule.** Talk to 10-15 chess academy coaches in India (start with Chennai, Bangalore, Hyderabad, plus online coaches on YouTube/Instagram). Show them the existing review screen with a mock "student report" and "homework from your mistakes". Ask what they use today and whether they'd pay.
  - **Continue** if at least 3 coaches agree to put real students on it, and at least 1 will pay anything (even ₹500/month).
  - **Stop** (or keep it as a portfolio piece) if nobody commits. That's a perfectly good outcome: you'll have spent weeks, not months.
- **If continuing,** rebuild the pitch around "AskTheMove for coaches" and only then build the tutor loop and regional language explanations, in that order.
- **Claude for Startups** only matters after the continue signal; credits are paused anyway.

## What would change my mind

- A cohort of individual players who come back weekly without being asked (retention, not signups). If the waitlist converts and people return on their own, the consumer play is less dead than I think.
- A coach or academy chain saying "I'd pay for this today." One such conversation is worth more than any feature.
