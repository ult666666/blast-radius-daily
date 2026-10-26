import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState, parseDemoDay } from "../src/client/demo-state";
import { evaluateShielding } from "../src/shared/game";

test("demo dates use a stable default and validate real Gregorian days", () => {
  assert.equal(parseDemoDay(null), "2026-07-14");
  assert.equal(parseDemoDay(undefined), "2026-07-14");
  for (const day of ["2024-02-29", "2000-02-29", "0001-01-01", "9999-12-31"]) {
    assert.equal(parseDemoDay(day), day);
  }
  for (const day of [
    "",
    "today",
    "2026-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-13-01",
    "0000-01-01",
    "2026-7-14",
  ]) {
    assert.throws(() => parseDemoDay(day), /date/i);
  }
});
test("separate demo states have deterministic puzzles and independent sessions", () => {
  const first = createDemoState("2026-07-14");
  const second = createDemoState("2026-07-14");
  assert.deepEqual(first.snapshot(), second.snapshot());
  first.score(["identity", "pricing"]);
  assert.equal(second.session().bestScore, null);
  assert.equal(second.session().community.responders, 18);
});
test("score is computed by the real engine and a responder is counted once across replays", () => {
  const demo = createDemoState("2026-07-14");
  const before = demo.session();
  const expected = evaluateShielding(before.puzzle, ["identity", "pricing"]);
  const first = demo.score(["identity", "pricing"]);
  assert.deepEqual(first.outcome, expected);
  assert.equal(first.community.responders, before.community.responders + 1);
  assert.equal(first.streak, before.streak + 1);
  assert.equal(first.share.status, "disabled");
  assert.equal(first.share.token, null);
  const replay = demo.score([]);
  assert.equal(replay.outcome.score, 0);
  assert.equal(replay.bestScore, first.bestScore);
  assert.equal(replay.community.responders, first.community.responders);
  assert.equal(replay.streak, first.streak);
  assert.equal(
    replay.leaderboard.filter((entry) => entry.username === before.username)
      .length,
    1,
  );
});
test("invalid selections leave every demo field unchanged", () => {
  const demo = createDemoState("2026-07-14");
  const before = demo.snapshot();
  for (const selection of [
    ["source"],
    ["missing"],
    ["identity", "pricing", "geo"],
  ]) {
    assert.throws(() => demo.score(selection));
    assert.deepEqual(demo.snapshot(), before);
  }
});
test("same vote is idempotent and changing it transfers exactly one vote", () => {
  const demo = createDemoState("2026-07-14");
  assert.throws(() => demo.vote("protect-models"), /run/i);
  demo.score([]);
  const initial = demo.session().protocolVotes;
  const first = demo.vote("protect-models");
  assert.equal(
    first.protocolVotes.find((v) => v.id === "protect-models")?.count,
    12,
  );
  assert.deepEqual(demo.vote("protect-models"), first);
  const moved = demo.vote("protect-dashboards");
  assert.equal(
    moved.protocolVotes.find((v) => v.id === "protect-models")?.count,
    11,
  );
  assert.equal(
    moved.protocolVotes.find((v) => v.id === "protect-dashboards")?.count,
    8,
  );
  assert.equal(
    moved.protocolVotes.reduce((sum, v) => sum + v.count, 0),
    initial.reduce((sum, v) => sum + v.count, 0) + 1,
  );
  const before = demo.snapshot();
  assert.throws(() => demo.vote("not-a-protocol" as never), /protocol/i);
  assert.deepEqual(demo.snapshot(), before);
});
test("deletion removes only the synthetic player contribution and a new run starts at one", () => {
  const demo = createDemoState("2026-07-14");
  const fixture = demo.session();
  demo.score(["identity", "pricing"]);
  demo.vote("protect-edges");
  assert.deepEqual(demo.deleteData(), {
    type: "delete-data",
    status: "deleted",
  });
  const cleared = demo.snapshot();
  assert.equal(cleared.deleted, true);
  assert.equal(cleared.lastOutcome, null);
  assert.equal(cleared.session.bestScore, null);
  assert.equal(cleared.session.streak, 0);
  assert.equal(cleared.session.selectedProtocol, null);
  assert.deepEqual(cleared.session.protocolVotes, fixture.protocolVotes);
  assert.deepEqual(cleared.session.leaderboard, fixture.leaderboard);
  assert.deepEqual(cleared.session.community, fixture.community);
  assert.equal(demo.session().streak, 0);
  demo.deleteData();
  assert.deepEqual(demo.snapshot(), cleared);
  const next = demo.score([]);
  assert.equal(next.streak, 1);
  assert.equal(next.community.responders, 19);
});
test("returned sessions, results and snapshots cannot mutate the owned state", () => {
  const demo = createDemoState("2026-07-14");
  const session = demo.session();
  session.puzzle.nodes.length = 0;
  session.leaderboard[0]!.score = -99;
  session.community.responders = 999;
  assert.equal(demo.session().puzzle.nodes.length, 12);
  assert.equal(demo.session().community.responders, 18);
  const result = demo.score(["identity"]);
  result.outcome.savedIds.length = 0;
  const snapshot = demo.snapshot();
  assert.ok(snapshot.lastOutcome!.savedIds.length > 0);
  snapshot.session.protocolVotes[0]!.count = 999;
  assert.equal(demo.session().protocolVotes[0]!.count, 7);
});
