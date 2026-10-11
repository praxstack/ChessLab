# AskTheMove soft launch on X

Written 2026-10-08 for @0xPraxLannister. Post only after https://askthemove.online loads on your phone, so nobody lands on a dead link.

## 1. Profile

**Update, 9 October:** you now have a brand account, [@AskTheMove](https://x.com/AskTheMove), on the company email and number. Post the thread from @AskTheMove, then repost it from your own account, where your followers are. For @AskTheMove:

- **Name:** AskTheMove. **Photo:** the site's logo mark (`site/public/icon-512.png` in the repo).
- **Bio (147 of 160):** A chess coach that shows you why your move was a mistake. Stockfish finds the facts, Claude explains them in plain words. Free beta waitlist below.
- **Website:** `askthemove.online`, added only once the site loads.

On your own account, change "Building AskTheMove" to "Building @AskTheMove" in the bio below (160 of 160). Everything else in this section still applies to your own account.

Change only the bio, website and header. X takes the blue check away for a re-review when you change your display name, username or profile photo, so leave those alone.

**Bio (recommended, 159 of 160 characters):**

> Building AskTheMove ♟️: a chess coach that shows you why a move was a mistake. Built systems at Amazon scale. Logging agentic AI, system design, LLM inference.

**Shorter alternative (151 characters):**

> Building AskTheMove ♟️, a chess coach that explains why your move was a mistake. Stockfish finds it, Claude explains it. Built systems at Amazon scale.

**Website:** `askthemove.online`

**Location:** keep "Shahjahanpur, India".

**Email people should use:** `hello@askthemove.online` (public). Keep `prax@askthemove.online` for Anthropic, the Claude Console and Cloudflare.

**Optional:** if the handle @AskTheMove is free, claim it so nobody else takes it. Keep posting from your own account, because that's where your followers are.

## 2. Launch thread

X counts every link as 23 characters and each emoji as 2, and the counts below use that rule. Attach `launch/video/askthemove/askthemove-demo.mp4` (58.8 s, silent, 8.3 MiB) to post 1. It was recorded on the original-art build, so it shows no Chess.com art and no "ChessLab" name. People widely report that X shows posts with outside links to fewer people (X hasn't confirmed this), so the link goes in the last post and in your bio, not in post 1.

**Post 1 (with the video, 235 characters as X counts them)**

> I'm building AskTheMove ♟️
>
> A chess coach that shows you why your move was a mistake, in plain words and arrows on the board. Not just "Nf5 was best, +2.3".
>
> Stockfish finds the facts. Claude explains them.
>
> Here's a one-minute look 👇

**Post 2 (205)**

> Engines are brilliant and silent. They name the best move but never say what you missed, so the same mistake comes back next game.
>
> AskTheMove is for adult improvers, roughly 800 to 1600, who want the why.

**Post 3 (278)**

> How it stays honest: the coach only sees verified engine evidence (lines, mate distance, material, threats).
>
> Before you see an explanation, the server checks every move and "mate in N" it cites against that evidence. If anything doesn't match, you get the plain engine summary.

**Post 4 (215)**

> Working today: import your games, full Stockfish review, variations and study notes, and 43 original bots on a 22-level strength ladder.
>
> The Claude coach is being tested now. The waitlist decides who gets in first.

**Post 5 (145)**

> The beta is free. Join the waitlist: askthemove.online
>
> Questions or ideas: hello@askthemove.online, or just reply here. I read everything.

**One-post version (267), if you'd rather not do a thread**

> I'm building AskTheMove ♟️, a chess coach that shows you why your move was a mistake, not just the engine's best move.
>
> Stockfish finds the facts, Claude explains them, and each move it cites is checked against the engine.
>
> Free beta waitlist: askthemove.online

Every claim above matches the code: the evidence check is in PR #17 (merged), and the 43 bots and 22-level ladder are in PR #19. Post 4 says the coach "is being tested" because it has made no live Claude calls yet. Once Phase 4 is done (real calls on the Console), it's true to say "in private testing".

## 3. Order on launch day

1. Open https://askthemove.online on your phone and join the waitlist once yourself.
2. Update the bio, website and header.
3. Post the thread with the video, then pin post 1.
4. Stay around for the first hour and reply to everyone. Early replies help the post travel.
5. Over the next few days, share the video and link where adult improvers are: r/chessbeginners, the Lichess forum and chess Discords. Read each place's self-promotion rules first.
6. Before you apply, count the real sign-ups from the CSV and use the real number.

## 4. LinkedIn

Post the same day as X. Upload the demo video straight to LinkedIn rather than as a link, so it plays in the feed.

**Headline (add to the front of yours):** Founder, AskTheMove (a chess coach built on Stockfish and Claude)

**Post:**

> I'm building AskTheMove ♟️
>
> Chess engines are brilliant and silent. They tell you "Nf5 was best, +2.3", but not what you missed, so the same mistake comes back next game.
>
> AskTheMove is a chess coach for adult improvers, roughly 800 to 1600, that shows you why a move was a mistake, in plain words and arrows on the board.
>
> How it works:
> • Stockfish and a chess rules library produce verified evidence: engine lines, mate distance, material and threats.
> • Claude turns that evidence into a few plain sentences.
> • Before you see an explanation, the server checks every move and every "mate in N" it cites against that evidence. If anything doesn't match, you get the plain engine summary instead.
>
> Working today: game import, full Stockfish review, variations and study notes, and 43 original bots on a 22-level strength ladder. The Claude coach is being tested now.
>
> The beta is free. Join the waitlist at askthemove.online, and if you know someone learning chess, I'd love it if you passed this on.
>
> Questions or ideas: hello@askthemove.online
>
> #chess #buildinpublic #AI
