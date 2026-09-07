# Research Methodology and Evidence Boundary

**Research cut:** 7 September 2026  
**Decision:** Define a clean-room ChessLab product that covers the publicly documented capability territory of a major online chess platform, while creating original UX, copy, assets, architecture and code.

## Scope

The study covers acquisition, home personalization, real-time and correspondence play, bots and guided coaching, post-game review, self-analysis, branch-native tutoring, openings and collections, puzzles, lessons and practice, profiles and statistics, content and broadcasts, community, tournaments and variants, settings and accessibility, trust and safety, commerce, APIs, data and operations.

It excludes private screens, unpublished experiments, confidential algorithms, source code extraction, direct automated crawling, proprietary media, exact visual replication, current price quoting, and assistance during ongoing human games.

## Evidence hierarchy

1. First-party legal terms and official product/help documentation.
2. User-owned ChessLab product context and verification records.
3. Inference only where required to translate a public capability into an implementable original requirement. Inferences are expressed as ChessLab requirements, not claims about the reference platform’s private implementation.

## Mapping method

Each public capability was normalized into one capability row, assigned a domain, source IDs, priority, delivery phase and prototype status, then translated one-to-one into a ChessLab functional requirement. Every functional requirement has a unique acceptance contract. Representative responsive screens were attached for design traceability. Cross-cutting quality, security, privacy, accessibility, reliability, fair-play and model-grounding controls were captured separately as non-functional requirements.

## Confidence and gaps

Confidence is high for the existence and user-facing purpose of features described in first-party documentation. Confidence is intentionally lower for private implementation details, algorithmic behavior, exact entitlements, regional availability, pricing, experiments and platform-specific deltas. Those items must be revalidated immediately before implementation or launch.

## Research stop rule

Discovery stopped after all 18 product domains had first-party support, every capability had at least one evidence ID, every functional requirement had a one-to-one traceability row, material legal/fair-play constraints were represented, and additional searches were producing narrower variants rather than changing the product topology.

## Artifact inventory

- 180 capability mappings
- 180 one-to-one traceability rows
- 209 responsive screens and states
- 215 total requirements, including 180 functional and 35 non-functional requirements
- 38 source records
- 18 product domains
