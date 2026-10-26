# Portable offline gameplay

## Intent and current source

The existing local Vite preview can draw the real Phaser game with `?demo=1`, but it has no standalone build or full browser verification. Its demo adapter increments votes repeatedly, does not transfer a changed vote, and pretends a direct share call posted a comment. Make the existing game independently playable and reviewable without Reddit, credentials, a running server or network access. Routine implementation choices and shipping are delegated by the user's portfolio request.

## Builder's approach

Considered an HTTP mock server, a separate rewritten demo UI, and a self-contained build of the existing Phaser client. Choose the third: one generated HTML with bundled JavaScript/CSS and license notices. It can be opened from disk while offline and can be published as one explicitly inventoried page on the existing portfolio. This reuses the actual engine/scenes and avoids a parallel game or privileged API service.

## Required behavior

- `npm run build:demo` creates `dist-demo/blast-radius-demo.html` and a checksum/provenance manifest from the current source. The HTML contains all runtime code/styles, no fetched fonts/images/modules or external SDK. Include applicable project/bundled dependency notices. The normal Devvit build remains separate.
- The dedicated entry always uses synthetic in-memory state even without a query flag. Default fixture day is2026-07-14; a native date form loads another real Gregorian UTC day. Reject malformed/impossible dates rather than silently choosing a different incident. Reload resets demo state. No localStorage, cookies, account data or Reddit writes.
- A pure demo-state adapter reuses `buildDailyPuzzle` and `evaluateShielding`. Return independent snapshots. Count the synthetic player once; retain the best validated score on replays; voting is idempotent and moves one vote when changed; deletion removes that player's score/vote/streak/contribution while keeping explicitly fictional background fixtures. A new run after deletion starts at streak1. Score sharing always fails locally; no simulated successful post.
- Preserve the real pointer-driven Phaser selection, budget checks, failure cascade and result/replay/vote/two-step deletion controls. Add a concise DOM status/local-run summary for the offline host, driven by read-only scene events and state snapshots. This supports review and live status without adding alternate scoring controls. Show synthetic/in-memory/offline scope clearly. Desktop and landscape tablet remain the stated game support; do not invent narrow-phone accessibility claims.
- A complete actual browser journey opens the single HTML with the browser offline, uses real canvas pointer input, compares the result to the shared deterministic engine, changes votes, checks both deletion steps, replays and reloads. It proves no API/external request and no browser-storage mutation. Include at least two dates and a landscape viewport; collect screenshots and bounded failure evidence. Tests use Playwright's owned browser lifecycle/deadlines, not user listeners or a Devvit account.
- Run strict types/lint/unit tests, normal build, standalone build and real browser CI on Node22/24 as appropriate. Independent review, exact-head green checks and actual public verification precede publication. A portfolio followup can vendor the exact merged-source HTML with a source/digest lock and add its inventory/catalog link; it must preserve concurrent design and publication boundaries.

## Limits

This verifies offline gameplay and synthetic state, not Reddit Redis, moderation, installation, score-sharing approval or live community behavior. Do not login, playtest against Reddit, upload/publish a Devvit app, change permissions or create comments. Do not change production server semantics. All community figures and names remain visibly fictional.
