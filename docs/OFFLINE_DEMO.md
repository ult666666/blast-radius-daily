# Offline gameplay workflow

Use Node 22.12 or newer. `npm ci --ignore-scripts && npm run build:demo` produces one self-contained `dist-demo/blast-radius-demo.html`. Open it from disk; there is no development server, fixed port, account or network dependency. The normal `npm run build` still produces the separate Devvit deployment bundles.

The build also writes `dist-demo/manifest.json`: SHA-256, byte length, source commit, Git dirty status and synthetic-demo scope. A source ZIP without its own Git checkout is marked `unversioned` with unknown dirty status. Build outputs are generated files; rebuilding replaces them. Existing symlinked output files/directories are refused. JavaScript and CSS are embedded as data URLs to preserve arbitrary bundled text without HTML closing-tag ambiguity. The file includes the BSD project license, Vite's package notices, full EventEmitter/Matter notices, retained copyright/license/source-credit comments from the pinned Phaser prebundle, and supplementary upstream notices in `docs/licenses/phaser-upstream-notices.json`. The collector checks the exact Phaser distribution SHA-256, so upgrades require a fresh audit. The standalone build excludes only its unused requestVideoFrame polyfill (webpack module63595); production bundles are unchanged. The demo does not use video. Source-specific license declarations are retained, including ISC/BSD terms; these are not all relabeled MIT. Its content policy blocks connections and external runtime assets.

## Try a complete incident

1. Start on the July14,2026 fixture or choose a real UTC date with **Load day**.
2. Click two `◆` candidates within the real game's two-token budget. Click again to remove a breaker.
3. Trigger the change and watch the existing Phaser failure cascade. The shared deterministic engine computes the result; the offline host does not accept an arbitrary numeric score.
4. Review the result and the native **This local run** summary. Replay can improve your best score without creating extra responders or increasing the fixture streak again.
5. Vote for a protocol, repeat the same vote, then switch it. One local vote moves between the three fictional background totals.
6. Press the privacy control once to arm it; a second press deletes your local contribution. The background fictional players remain. Replay starts with no personal score/vote/streak; completing a new run gives streak1.
7. Reload to reset the entire sample. No localStorage, cookies or account-linked storage are written. A copy of this HTML remains playable offline.

The game canvas retains its existing pointer controls and 1100×720 composition, aimed at desktop and landscape tablets. The host date selector and live summary are native HTML. It does not claim a narrow portrait-phone layout.

## Play by keyboard or screen reader

Press Tab until focus reaches the map. Up and Down move through the assets in reading order, Left and Right jump between columns, and Space or Enter places or removes a breaker; a white ring on the canvas shows the focused asset. Press D (or Tab to **Trigger the change**) to deploy. On the result screen focus moves to the score heading, and Tab reaches the votes, **Replay the map** and the privacy control. A visually hidden list mirrors every asset and button for screen readers, and a live region announces breakers, tokens left, the cascade result and the score. With reduced motion requested by the system, the cascade appears at once instead of animating.

## Verify it

```bash
npx playwright install chromium --only-shell
npm run verify
npm run test:demo
```

On a fresh Linux machine, install system dependencies with `npx playwright install --with-deps chromium --only-shell`. Playwright owns the temporary browser context, a90-second per-test deadline,15-second condition assertions and a 360-second global browser deadline. These bounds allow for Phaser animation progress on software-rendered hosted runners; CI bounds the full job separately. The offline journeys open `file://` while the browser is offline and check real pointer selection, budget rejection, cascade/result, exact shared-engine outcome, best-score replay, idempotent/transferred votes, both deletion steps, post-deletion replay, reload, a second day and landscape scaling. A canary storage value stays intact, no extra storage keys/cookies appear, and no external/API requests occur.

`test/keyboard.spec.ts` plays without the mouse. Offline, it tabs into the map, moves with the arrow keys, places and refuses breakers, checks each announcement, reads the canvas pixels to confirm the focus ring follows focus, deploys with D, checks the announced score against the shared engine, votes and replays by keyboard, and confirms that Tab leaves the game. A second run with reduced motion checks that the final cascade state appears in the same key press. The third test scans the board and result screens with axe-core (pinned 4.14.0, WCAG 2.0 to 2.2 A and AA rules plus best practices) and plays the Devvit game page in demo mode through the local Vite preview, which Playwright starts on 127.0.0.1 port 4175 (or `BLAST_PREVIEW_PORT`) for this test only.

`.demo-results/results.json` records test outcomes. Selected-board, cascade, result/vote and deleted screenshots are attached; failures retain screenshots, context and traces. The CI `offline-gameplay` artifact includes these plus the exact HTML and manifest. Unit tests separately exercise impossible dates, invalid selections/protocols, independent state/snapshot ownership and deletion semantics.

This is a demonstration of real gameplay with synthetic in-memory state. Reddit context, Redis expiry/ranking, moderator installation, comment approval and live community behavior still require separate Devvit verification. No Reddit login, upload, publication, comments or permission changes are part of this workflow.
