## Update: 7 September 2026

The direction changed on 7 September 2026: build the familiar web platform first, with bot and coach play before human multiplayer and billing last. A local application now exists. See the [current application chapter](application.md) and [run guide](../application.md). The assessment and table below preserve the earlier research snapshot; they are not the current delivery state.

## Historical record

## The project in one sentence

ChessLab is a proposed chess tutor that lets a learner pause at any position, ask why a move fails, explore alternatives for both players, and return to the original game without losing the thread of the lesson.

The original problem is specific: an explanation can be correct and still leave the learner confused. A rook is worth five points, a knight three. Why save the knight? Because the complete exchange matters. The learner needs to see the recapture, test another response, and arrive at the reasoning themselves.

{{ORIGIN}}

## My honest verdict

**Build a small teaching prototype. Do not treat the research as validation of a startup.** I like the problem because the confusion is observable and chess gives us strong ways to check many claims. I am less convinced by the proposed breadth, the assumed market size, and the idea that combining familiar features automatically creates defensibility.

The most useful first outcome is a learner saying, and demonstrating, “I can now calculate that trade.” A polished explanation, a long conversation, and a growing variation tree do not establish that outcome.

The first experiment should cover completed-game import, one confusing move, a visible explanation, nested alternatives, comparison, and return. Adjustable AI games remain part of the original vision. They were deferred from the first proposed build, not removed from the product.

## What exists today

| Area | Observed state | What that means |
| --- | --- | --- |
| Research | Two supplied research texts, their source PDF, the original conversation and lesson images are preserved | A substantial reference library, not a validated business case |
| Repository | Git initialized on `main`; no commit or remote at the beginning of this report run | The first commit remains incomplete following the earlier signing failure |
| Skills | 22 Matt Pocock, two Unslop entries, 12 OpenSpec skills, and 54 Gstack entries per host | 90 entries per primary host tree, not 180 independent skills |
| Specifications | Four draft OpenSpec artifacts and nine unchecked tasks | Reviewable planning, not implemented behavior |
| Chess application | Local multi-engine bot platform, review and saved studies; see the current application chapter | Full vendor parity, learning results, revenue and retention remain unproven |
| This dossier | A local HTML reading site generated from the documents | A report about the proposed product, not the product itself |

## Three ways to read this dossier

- **For the founder:** read Product, Delivery, then Pricing. Those chapters separate the first useful build from the larger ambition.
- **For an investor:** read Investor memo, Market, then Delivery. Look for the gaps between the narrative and observable evidence.
- **For a contributor:** read Architecture and the complete OpenSpec documents in the library. Do not implement a research recommendation as though it were an approved requirement.

## How to read the evidence labels

**Verified locally** means files or commands were inspected in this project. **First-party claim** means an official provider page describes an offering; it does not establish hands-on quality. **Historical research** means a statement is preserved from the supplied documents. **Proposed** means a recommendation for discussion. **Not demonstrated** means the evidence needed for a claim does not exist in this record.

This distinction is deliberate. The research includes current-looking prices, market arithmetic, qualitative scores and an inconsistent chess example. The originals are retained in full so readers can examine the underlying claims rather than trust a polished summary.
