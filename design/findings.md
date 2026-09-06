# What the recording changes

The useful distinction is now more precise: **ChessLab must make explanations answerable and testable.** The recording already shows Chess.com offering explanations, alternate lines and ways back to the game. Our design should make your follow-up question, the tested variation and its explanation stay together.

## What was actually processed

The original recording remains untouched. FFmpeg produced a full-length viewing copy: **666,959,711 bytes → 14,991,991 bytes**, a **97.75% reduction**. Resolution changed from 3840 × 2486 to 1600 × 1036; frame rate changed from 60 to 12 fps; AAC audio was retained as one encoded audio stream; references to multiple voices do not mean separate audio tracks. This is a viewing copy, not a lossless archive. Small text and fast cursor motion may lose detail. The original should be used for disputed fine details.

Antigravity's Gemini attempt was denied by a pre-tool hook before video ingestion. It returned generic text, which is preserved separately and excluded from the video findings. The next route succeeded: **Gemini's web app accepted the MP4, displayed its 15:20 duration, and returned a video-specific analysis.** The observed mode was Flash Extended. Its exact backend model and internal sampling strategy were not exposed, so this is not a verified use of the API's agentic processing mode.

The first Gemini response arrived before the next inspection, within roughly two minutes of submission. That is an observed upper bound for this run, not a benchmark. It misread the opening move and coach label and mixed observation with invented example lines. I requested a correction and checked selected frames myself. Its audio summary is model-derived; I did not independently transcribe all speech or certify exact quotations.

## The important moments

The timestamps below are exact seek points in the compressed recording. Gemini's broader timeline is available separately and should be treated as approximate until individually checked.

| Seek point | Visible evidence | Design implication |
| --- | --- | --- |
| 01:00 | Play Coach, board, move list and coach message bubbles. The coach explains a bishop retreat and pawn defense. | Put an actual question composer alongside the explanation. |
| 12:44 | Game Review marks Bg5 as an inaccuracy, shows an arrow toward b4, and offers Explain, Best and Next. | A learner needs to challenge the reason, not just reveal another arrow. |
| 13:00 | A b4 variation appears indented within the move list. | Alternate-line exploration already exists; make the connection between a question and its variation explicit. |
| 13:27 | The move list displays a longer continuation under b4, while the review remains visible. | Preserve the line and let the learner ask about a different reply within it. |

No free-form coach input is visible in these checked screens. That is a scoped observation about this recording, not proof that every Chess.com surface or future feature lacks it. The video does not establish whether coach wording comes from templates, a language model, or another system.

## About the post you shared

Google documents Gemini video understanding across visual and audio streams. Its current documentation describes both fixed-rate processing and agentic video navigation for supported models. That supports trying Gemini for this workflow. It does **not** establish that Gemini is the only capable AI, that every 30-minute video is fully understood in seconds, or that this team's reported twofold editing improvement generalizes. Our own run found useful observations and concrete errors. [Google's video documentation](https://ai.google.dev/gemini-api/docs/video-understanding?hl=en)

## The full design scope

The 17 mockups cover starting, choosing AI difficulty, importing a game, playing and pausing, reviewing, asking questions, testing your move, testing the opponent's reply, comparing lines, returning, saving and reopening, practice, reflection, mobile voice/text, recovery, accessibility and pricing. Pricing is an exploratory concept, not an available plan. The existing blue visual direction is preserved.

The signature interaction is a **visible conversation attached to a visible branch**. The learner should always know: Which position am I discussing? Whose reply am I changing? Where did this alternative begin? How do I get back?

## Honest design review

Grok Imagine produces actual concept images here. They can communicate layout, hierarchy, mood and the intended journey. Generated text, board geometry, coordinates and pieces can still be wrong. None of the generated positions is engine-certified, and the images are not a playable prototype or accessibility proof.

The first image included stray palette codes and literal decorative forks. I excluded it from the main set and tightened the next prompts. A focused second pass replaced an empty practice board, inconsistent accessibility copy and invented pricing claims. The replacement practice image still puts the kings adjacent to each other, an illegal position; its page explicitly flags this. Further image generation is not the right way to validate chess. Subsequent images require implementation-time typesetting and legal board rendering. The next product step is a real, small interaction for one verified position: question → alternate reply → nested follow-up → compare → return. The wider scenarios show where it could grow; they do not authorize or demonstrate that whole build.

Voice, practice scheduling, progress metrics, pricing and online services remain design explorations. The original game must remain preserved, replies must obey turn order, and the tutor must distinguish a demonstrated line from a forced outcome.

## Delivery checks

The gallery check passed: 23 HTML pages, 335 local links, exactly 17 scenario cards, image provenance and hashes, and full-duration video with audio. Browser checks covered all 23 pages at the existing 1280-pixel width, search, scenario navigation and video metadata. Mobile and screen-reader testing were not performed in this run.

The repository setup self-test passed. `just check` stopped because the globally linked `gstack-cso` skill has changed since its recorded setup hash. The skill manifest was not refreshed to conceal that drift; this is separate from the gallery checks and remains unresolved. No chess application test or release is claimed.

## Follow-up: direct frame study

The next pass examined 150 exact-time frames across the full recording, including every second of the settings sequence. Read the [annotated study](frame-study.html), [26-control settings inventory](settings-study.html), [screen recommendations](screen-plan.html), and [frame atlas](frame-atlas.html). This direct visual inspection is separate from Gemini's earlier report. The 23-page check above records the earlier delivery; the expanded gallery now contains 27 pages.
