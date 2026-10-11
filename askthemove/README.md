# AskTheMove project files

Everything made for AskTheMove outside the app code: the product review, business research, launch material and the demo videos. It was written in the AskTheMove Claude project between 8 and 11 October 2026 and copied here on 11 October 2026. Nothing in this folder is read by the app or the site.

## Demo videos

| Video | Length | File | Notes |
|---|---|---|---|
| Demo v2 (current) | 2:10, 1080p, narrated, 58 MB | [askthemove-demo-v2.mp4](launch/video/askthemove/askthemove-demo-v2.mp4) | [askthemove-demo-v2-NOTES.md](launch/video/askthemove/askthemove-demo-v2-NOTES.md), captions [askthemove-demo-v2.srt](launch/video/askthemove/askthemove-demo-v2.srt) |
| Demo v1 (8 Oct, outdated) | 58.8 s, silent, 9 MB | [askthemove-demo.mp4](launch/video/askthemove/askthemove-demo.mp4) | [EDIT-NOTES.md](launch/video/askthemove/EDIT-NOTES.md). Shows the old mirrored board and the "Mate sequence" label that #26 fixed |

- **v2 source:** [launch/video/askthemove/v2-project/](launch/video/askthemove/v2-project/) is the motion-video project (film, script, engine, pipeline). [recording/record.mjs](launch/video/askthemove/v2-project/recording/record.mjs) is the Playwright script that recorded the six clips from `main` at `fe3d7c9`; the `maya` account in it lives only in a throwaway local database. The six recordings are in [clips/](launch/video/askthemove/v2-project/clips/) and the voice and music in [audio/](launch/video/askthemove/v2-project/audio/). The 1.2 GB of JPEG frames under `source/footage/` are left out: from `v2-project/`, run `mkdir -p source/footage/01-import && ffmpeg -i clips/01-import.mp4 -q:v 2 source/footage/01-import/f%05d.jpg` for each clip, then follow the re-render steps in [NOTES.md](launch/video/askthemove/v2-project/NOTES.md).
- **v1 source:** [launch/video/askthemove/project/](launch/video/askthemove/project/) is the HyperFrames project. Its five raw recordings, their notes and contact sheets are in [footage/](launch/video/askthemove/footage/).

## Folders

| Folder | What is in it |
|---|---|
| [review/](review/) | The 9 October product review: [requirements](review/requirements.md), [design system and UX](review/design-system.md), [architecture](review/architecture.md), and 41 screenshots of our own app in [screens/](review/screens/) |
| [docs/](docs/) | Markdown exports of three Claude Docs: the [product review and plan](docs/askthemove-product-review-and-plan.md), the [Claude for Startups playbook](docs/claude-for-startups-playbook.md) and the [Kiro credits application](docs/kiro-startup-credits-application.md). Images and embedded charts were dropped by the export |
| [strategy/](strategy/) | [honest-verdict.md](strategy/honest-verdict.md): whether AskTheMove is a startup or a feature, and the academy-coach test |
| [credits/](credits/) | Startup credit and grant research, the Apply pack ([apply-pack.html](credits/apply-pack.html)), the [credits map](credits/credits-map.html), Claude in Chrome prompts and the [submission log](credits/submission-log.md) |
| [hosting/](hosting/) | Hosting research for a founder with no credit card, and the Chrome prompts for each route |
| [launch/](launch/) | The launch kit: [X and LinkedIn posts](launch/x-launch-kit.md), [before you buy](launch/before-you-buy.md), [what's left](launch/whats-left.md), [design research](launch/design-research.md) and Chrome prompts |
| [pages/](pages/) | Two published pages saved as HTML: the [launch checklist](pages/launch-checklist.html) (its ticks were kept in the artifact's own database, so the copy here opens empty) and the 8 October [launch plan](pages/launch-plan.html) |

The landing-page previews are not copied because they are the `site/` folder of this repository. The Praxmodoro video and its footage are in the Praxmodoro repository.

## Left out

- The live Apply pack page carries personal details in its status board, so it is not copied. `credits/apply-pack.html` is the blank-form version, which keeps typed answers only in the viewer's browser.
- The author byline was removed from the three exported docs.
