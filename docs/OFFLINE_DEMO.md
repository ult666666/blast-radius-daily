# Offline gameplay workflow

Use Node 22.12 or newer. `npm ci --ignore-scripts && npm run build:demo` produces one self-contained `dist-demo/blast-radius-demo.html`. Open it from disk; there is no development server, fixed port, account or network dependency. The normal `npm run build` still produces the separate Devvit deployment bundles.

The build also writes `dist-demo/manifest.json`: SHA-256, byte length, source commit, Git dirty status and synthetic-demo scope. A source ZIP without its own Git checkout is marked `unversioned` with unknown dirty status. Build outputs are generated files; rebuilding replaces them. Existing symlinked output files/directories are refused. JavaScript and CSS are embedded as data URLs to preserve arbitrary bundled text without HTML closing-tag ambiguity. The file includes the BSD project license and Vite's collected bundled-dependency notices. Its content policy blocks connections and external runtime assets.

## Try a complete incident

1. Start on the July14,2026 fixture or choose a real UTC date with **Load day**.
2. Click two `◆` candidates within the real game's two-token budget. Click again to remove a breaker.
3. Trigger the change and watch the existing Phaser failure cascade. The shared deterministic engine computes the result; the offline host does not accept an arbitrary numeric score.
4. Review the result and the native **This local run** summary. Replay can improve your best score without creating extra responders or increasing the fixture streak again.
5. Vote for a protocol, repeat the same vote, then switch it. One local vote moves between the three fictional background totals.
6. Press the privacy control once to arm it; a second press deletes your local contribution. The background fictional players remain. Replay starts with no personal score/vote/streak; completing a new run gives streak1.
7. Reload to reset the entire sample. No localStorage, cookies or account-linked storage are written. A copy of this HTML remains playable offline.

The game canvas retains its existing pointer controls and 1100×720 composition, aimed at desktop and landscape tablets. The host date selector and live summary are native HTML. This does not claim keyboard-only canvas gameplay or a narrow portrait-phone layout.

## Verify it

```bash
npx playwright install chromium --only-shell
npm run verify
npm run test:demo
```

On a fresh Linux machine, install system dependencies with `npx playwright install --with-deps chromium --only-shell`. Playwright owns the temporary browser context, a45-second per-test deadline and120-second global browser deadline; CI bounds the full job separately. No listener or server is started by the browser workflow. It opens `file://` while the browser is offline and checks real pointer selection, budget rejection, cascade/result, exact shared-engine outcome, best-score replay, idempotent/transferred votes, both deletion steps, post-deletion replay, reload, a second day and landscape scaling. A canary storage value stays intact, no extra storage keys/cookies appear, and no external/API requests occur.

`.demo-results/results.json` records test outcomes. Selected-board, cascade, result/vote and deleted screenshots are attached; failures retain screenshots, context and traces. The CI `offline-gameplay` artifact includes these plus the exact HTML and manifest. Unit tests separately exercise impossible dates, invalid selections/protocols, independent state/snapshot ownership and deletion semantics.

This is a demonstration of real gameplay with synthetic in-memory state. Reddit context, Redis expiry/ranking, moderator installation, comment approval and live community behavior still require separate Devvit verification. No Reddit login, upload, publication, comments or permission changes are part of this workflow.
