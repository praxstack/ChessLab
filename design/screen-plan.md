# What the frames add to our design

The 17 Imagine concepts cover the broad journey. The recording now gives us a more concrete list of states within that journey. These are design recommendations; the existing OpenSpec proposal remains a draft and no application functionality was added in this run.

[Evidence and frames →](frame-study.html) · [Settings inventory →](settings-study.html) · [Original concepts →](index.html)

## One workspace, several focused states

| Screen or state | Evidence from the recording | Recommendation for ChessLab | Existing concept |
| --- | --- | --- | --- |
| Play with contextual coaching | 00:20–09:40: board, move history and changing coach card | Add a persistent question composer and a visible pause/explore state. Keep the actual game safe. | [Play and pause](05-play.html) |
| Learning preferences | 04:11 coach picker; 10:20 interface preferences | Separate explanation detail, tone and appearance from opponent difficulty. A sample explanation is more useful than an avatar grid in the first version. | [Choose opponent](03-game-setup.html), [Settings](16-accessibility.html) |
| Game finished | 09:50 result modal | Add an explicit completion state with Review this game, Pick a confusing move and New game. This needs its own state specification even if it reuses the play screen. | [Review](06-review.html) |
| Review preparation | 09:52–09:54 blank/loading transition | Preserve a recognizable game context, explain what is loading, allow cancellation and keep previous results identified as previous. | [Recovery](15-recovery.html) |
| Review overview | 10:00 accuracy, classifications, graph, Start Review | Lead with a small number of turning points. Keep whole-game metrics secondary and avoid implying learning from accuracy alone. | [Find turning point](06-review.html) |
| Focused move review | 11:24 onward: coach card, selected move, navigation | Pair the chosen move with the learner's expectation and a replayable explanation. Make the current side to move explicit. | [Question coach](01-conversation.html) |
| Alternative for either side | 12:49–13:26: indented line and Resume | Give the branch a name, an origin and questions of its own. Support another question inside the branch. | [Your idea](07-your-idea.html), [Opponent reply](08-opponent-reply.html) |
| Explanation updating | 13:06 and 13:14: placeholder coach card while exploring | Label the position being analyzed; cancel or ignore stale results when moving elsewhere. Keep legal exploration usable during the wait. | [Recovery](15-recovery.html) |
| Return to actual review | 13:26: original card and preserved alternative | Name the exact destination, restore it reliably and retain explored branches. This is a central acceptance condition. | [Return](10-return.html) |
| Compare two outcomes | No side-by-side comparison shown in the sampled recording | Keep this as our own proposal: same origin, synchronized stepping, material and threats explained for both lines. | [Compare](09-compare.html) |
| Skill evidence drawer | 14:27–15:00: skill categories and board-linked skill label | Attach each insight to an actual position and a related retry; distinguish an observed event from learned understanding. | [Notebook](11-notebook.html), [Practice](12-practice.html), [Progress](13-progress.html) |
| Board and analysis preferences | 10:14–10:51 settings | Split Board, Learning and Advanced analysis. Keep changes reversible and preserve the current study. | [Settings](16-accessibility.html) |

## Three corrections to the product story

**Variation support is already present.** Our claim cannot be merely “what if you played another move?” The stronger proposition is a question-driven exploration where the learner can challenge the explanation, change either side's reply, follow a nested question, compare evidence and return without losing context.

**A human-sounding coach is not proof of understanding.** The clip shows personas, comments and engine settings. It does not reveal how comments are generated. Our tutor should earn trust by matching its explanation to legal state and verifiable continuations, regardless of its tone.

**A skill counter is not a learning result.** The recording connects skill labels to gameplay, which is a useful navigation pattern. Our first learning test should ask whether the learner can explain and solve a related position later, rather than treating a displayed bar as mastery.

## The smallest useful next prototype

Use one completed game and one verified confusing position. Preserve the original move. Ask for the learner's prediction. Let them test a legal move for either player, ask a follow-up within that alternative, compare the consequence and return to the exact original node. Save the question and branch so the study survives a reload.

Within that narrow prototype, explicitly design idle, analyzing, evidence-ready, unsupported-question, invalid-import and save-failed states. The screenshots justify paying attention to these transitions; they do not require building every observed Chess.com feature.

## Unanswered by this recording

We still need separate evidence for import flows, AI difficulty selection, mobile interaction, keyboard and screen-reader behavior, durable saved studies, voice input, subscription value and willingness to pay. The recording ends during review, so it does not demonstrate the complete end of a study or what survives reopening. Those gaps should guide future testing, not be filled with invented observations.
