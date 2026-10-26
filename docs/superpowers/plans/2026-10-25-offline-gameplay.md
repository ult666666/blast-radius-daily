# Offline Gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the real Blast game as one self-contained offline HTML.

**Architecture:** A pure synthetic state adapter feeds the existing API facade and Phaser scenes. A dedicated host adds day selection/read-only run status; Vite bundles its runtime into one inline HTML with notices and provenance. Playwright verifies disk-loaded offline gameplay; a later exact-source portfolio integration publishes that same file.

**Tech Stack:** Existing TypeScript/Phaser/Vite/Node22+, pinned Playwright for browser tests.

**Spec:** `docs/superpowers/specs/2026-10-25-offline-gameplay.md`

## Global Constraints

- Reuse real engine/scenes; no production server semantic changes, Reddit calls, comments, credentials or permission expansion.
- Default fixture2026-07-14; real Gregorian dates only; all state synthetic/in-memory and reload resets.
- One self-contained HTML, complete notices and exact source/checksum manifest; normal Devvit build preserved.
- Browser lifecycle/deadlines owned by Playwright; preserve unrelated listeners/storage.
- Publish only reviewed green exact heads and verify actual public artifacts.

## Review Focus

- Duplicate/changed votes and repeated runs must not inflate fictional counts (Task1).
- Snapshot mutation and invalid runtime inputs must not corrupt state (Task1).
- Deletion must remove only the synthetic player's contribution and remain deleted across replay until a new run (Tasks1–2).
- Dedicated entry must stay offline without `demo=1`, including source built from disk without a server (Tasks2–3).
- Inlining must preserve executable code, CSS and license notices safely, with no hidden network dependencies (Tasks2–3).

### Task1: Correct synthetic state

**Files:** Create `src/client/demo-state.ts`, `test/demo-state.test.ts`; modify `src/client/api.ts`.

**Interfaces:** `createDemoState(day)` exposes `session()`, `score(shieldIds)`, `vote(protocol)`, `deleteData()`, `snapshot()`; `parseDemoDay(value)` validates/defaults. Snapshot contains session, lastOutcome and deleted. Facade preserves existing endpoint types while routing demo calls to this adapter; sharing throws.

- [ ] Write failing tests for deterministic valid/default/impossible days, score/best/responders/streak, idempotent/transferred votes, deletion and isolated snapshots; observe RED.
- [ ] Implement the adapter, preserve production API branches, and observe GREEN; commit.

### Task2: Standalone host and build

**Files:** Create `src/client/demo.ts`, `demo.css`, `demo-events.ts`, `demo.html`, `vite-env.d.ts`, `scripts/build-demo.ts`, `vite.demo.config.ts`; modify scenes/package/type configuration/ignore/docs.

**Interfaces:** `reportDemoView({phase,selectedIds?,message?})` emits read-only host status. `getDemoSnapshot()` and `subscribeDemoState(listener)` in facade supply independent state. Build outputs one HTML plus manifest (source commit/dirty flag/SHA-256), with scoped CSP and inline notices.

- [ ] Add focused packaging/date/adapter regressions before implementation; observe RED where new behavior is required.
- [ ] Implement dedicated always-demo entry, native date form/status summary and read-only scene notifications. Bundle into one HTML without network resources; preserve original scene gameplay/production server.
- [ ] Run types/lint/unit/normal build/standalone output checks; commit implementation and operator guide.

### Task3: Real offline journey and shipping

**Files:** Create Playwright config and `test/demo.spec.ts`; update CI/package/docs.

**Interfaces:** `npm run test:demo` builds standalone output then runs bounded real Chromium tests from `file://` with browser offline. Tests use canvas coordinates transformed from the real deterministic puzzle and semantic host status; no test-only gameplay commands.

- [ ] Write browser journey assertions before host integration is complete; observe missing build/entry RED, then complete the real journey.
- [ ] Verify selection/budget/cascade/exact result/replay/vote/change/deletion/reload, a second date and landscape viewport, no network/storage effects; retain screenshots/traces.
- [ ] Run all required checks, independent whole-branch review and repairs, exact-head CI; attach/merge PR and verify public source.
- [ ] Integrate the exact merged standalone HTML and digest/source lock into current portfolio main, preserving inventory/design; review/check/merge and verify actual public gameplay plus versioned checkpoint.

## Pre-flight

Task1 snapshots feed Task2 status; Task2 standalone HTML feeds Task3 real browser tests. These interfaces agree. Existing isolated task clone is clean at2ceb21f; baseline8 tests/types/lint/normal build pass. No open PR overlaps this milestone. User delegated routine design/execution; native implementation with a fresh independent final reviewer is appropriate.
