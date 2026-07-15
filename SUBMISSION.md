# Devpost submission packet

## Project name

Blast Radius Daily

## Tagline

Contain one shared data disaster a day—then let the subreddit decide tomorrow's rules.

## Primary category

The Best Experience That Will Keep People Coming Back

## Sub-challenges addressed

- Best Use of Phaser
- Best Use of Retention Mechanics
- Best Use of User Contributions

## Short description

Blast Radius Daily is a native Reddit community game where everyone receives the same schema-change incident each day. Players place two circuit breakers on an animated data-lineage graph, trigger the deploy, and compete to save the most valuable downstream systems. Daily ranks, streaks, a shared containment meter, and a community vote that changes tomorrow's scoring turn a one-minute optimization puzzle into a recurring subreddit ritual.

## Inspiration

A tiny upstream data change can silently break a dashboard, a model, and a customer-facing alert at the same time. That hidden dependency chain already feels like a strategy game. We turned it into one: trace the blast, spend a deliberately scarce defense budget, and compare your containment plan with the whole community.

Reddit is the ideal home because the best part is not a private high score. It is seeing the same incident, arguing about the best cut in the comments, watching a community response goal fill, and voting on the constraints everyone will face tomorrow.

## What it does

Every UTC day produces one deterministic incident with:

- a breaking schema change;
- a directed graph of sources, transforms, marts, dashboards, models, alerts, and exports;
- two circuit-breaker tokens;
- a community-selected priority protocol that changes asset values.

Players tap eligible nodes, trigger the change, and watch Phaser animate failure pulses along every unprotected lineage edge. The shared scoring engine calculates saved assets, critical endpoints, containment percentage, and whether the chosen cut is mathematically optimal.

The server independently rebuilds the puzzle and recalculates every score. Validated personal bests populate a daily Redis leaderboard. One play per person fills the community containment meter, consecutive days build a streak, and a structured vote determines whether dashboards, ML models, or external edges receive a 50% value boost tomorrow.

The live community contribution is a structured protocol vote that changes the next day's scoring. A separate score-comment path is implemented fail-closed: it remains disabled unless Reddit approves user actions for the current app version, the developer enables the approval setting, and the app verifies a sticky command comment. When enabled, a one-time server token guarantees the posted text matches the full preview exactly.

## How we built it

- **Reddit Devvit Web** provides the native inline launch screen, expanded game entry point, custom posts, Reddit context, and free hosting.
- **Phaser 4** draws the responsive dependency graph, interactive breaker nodes, deployment pulses, failure states, transitions, and results interface entirely from code.
- **Hono on the Devvit server** exposes a small typed API for sessions, validated scoring, protocol votes, and explicit score sharing.
- **Devvit Redis** stores per-subreddit daily leaderboards, responder totals, protocol votes, short-lived exact-text share drafts, and at-most-30-day streak state.
- **TypeScript** shares the deterministic graph and scoring engine between client and server.

The app has no external service, paid API, tracking tool, or third-party dataset. All visual assets are original and programmatically rendered.

## Phaser innovation

The lineage graph is not a static background. It is the game board. Phaser renders directed dependencies, turns each transform into a tactile decision surface, and animates the deploy as moving failure signals. Nodes change state only as the simulated cascade reaches them; protected branches resolve to green after the red wave finishes. The same engine supports different daily labels, criticality rules, graph outcomes, and community protocols without loading an authored level asset.

## Retention hook

The game creates five reasons to return:

1. a new shared incident every UTC day;
2. a daily personal-best leaderboard;
3. a consecutive-day streak;
4. a subreddit-wide containment goal;
5. yesterday's community vote changes today's scoring rules.

## User contributions

Every responder contributes to the community containment meter and chooses one of three safe protocols for the next day. The winning choice materially changes the next puzzle by adding 50% value to dashboards, models, or external edges. The review-gated score-comment mechanism adds no free-form input and cannot post unless its exact visible draft, verified sticky destination, and approval setting all pass server checks.

## Challenges

The biggest challenge was making a graph puzzle strategically meaningful in under a minute. If every branch had one parent, the obvious move would always be to shield the first two nodes. We added converging paths, different breaker costs, terminal values, and a daily asset-class modifier. A cut can save one branch but still leave a shared dashboard exposed through another path.

The second challenge was making social features feel native and safe. Structured protocol votes create real user influence without collecting arbitrary text. Because unapproved Devvit user actions can fall back to the app account, score sharing ships disabled and can be enabled only after approval; even then it is manual, previewed in full, token-bound, and routed under a verified sticky command comment.

## Accomplishments

- A polished custom launch experience and full Phaser game created within the hackathon period.
- Deterministic daily content with multiple original incident themes.
- Server-authoritative graph simulation and scoring.
- A community mechanic that changes future gameplay rather than decorating it.
- No external infrastructure, secrets, paid services, or copied media.
- Strict TypeScript, lint, tests, and a production Devvit build in one verification command.

## What we learned

Reddit's installation-scoped Redis is a strong fit for community games: the natural boundary of the data is the subreddit itself. Devvit Web's inline/expanded entry-point split also encouraged a better product shape—a lightweight feed-native invitation and a focused full-screen interaction—rather than squeezing one interface into both contexts.

## What's next

- Add more graph topologies and limited-time community incidents.
- Let moderators select thematic label packs for their subreddit.
- Add an accessible reduced-motion mode, optional sound design, and a dedicated narrow portrait-phone layout.
- Introduce cooperative multi-day “incident seasons” where each day's containment affects the next map.
- Use Devvit analytics to tune the one-minute flow after real community testing.

## Submission links — fill after account-bound deployment

- App listing: `https://developers.reddit.com/apps/APP_SLUG`
- Public demo subreddit: `https://www.reddit.com/r/SUBREDDIT/`
- Demo post: `https://www.reddit.com/r/SUBREDDIT/comments/POST_ID/`
- Public repository: `https://github.com/ult666666/blast-radius-daily`
- Optional public video under 60 seconds: `VIDEO_URL`

## Submission requirement audit

- [x] New game created during the hackathon submission period.
- [x] Built on Reddit's current Devvit Web platform.
- [x] Uses Phaser as the main game renderer and interaction engine.
- [x] Detailed root `README.md` explains the game, deployment, operation, data, and user actions.
- [x] Text description is prepared above.
- [x] Original visual treatment and synthetic puzzle data; no unlicensed third-party media.
- [x] Free to play; no payment, external account, or outside service.
- [x] Score sharing fails closed until Reddit approves the current app version.
- [x] Player-facing two-step deletion removes app-stored game data immediately; all remaining user-linked state expires within 30 days.
- [ ] App uploaded so the unique Developer Platform app link exists.
- [ ] App installed in a public test subreddit with fewer than 200 members.
- [ ] Public demo post created and confirmed playable on desktop and landscape touch devices; portrait remains explicitly unsupported.
- [x] Repository pushed publicly.
- [ ] Optional sub-60-second demo video recorded and uploaded publicly.
- [ ] Devpost form completed and submitted before July 15, 2026 at 6:00 p.m. PDT.
