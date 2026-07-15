import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyPuzzle,
  buildShareComment,
  evaluateShielding,
  findOptimalShieldSets,
  isProtocolId,
  nextUtcDay,
  previousUtcDay,
} from '../src/shared/game';

test('daily puzzle generation is deterministic', () => {
  const first = buildDailyPuzzle('2026-07-14', 'protect-dashboards');
  const second = buildDailyPuzzle('2026-07-14', 'protect-dashboards');
  assert.deepEqual(first, second);
  assert.equal(first.nodes.length, 12);
  assert.equal(first.shieldBudget, 2);
});

test('UTC day helpers cross month boundaries', () => {
  assert.equal(previousUtcDay('2026-07-01'), '2026-06-30');
  assert.equal(nextUtcDay('2026-07-31'), '2026-08-01');
});

test('without circuit breakers every asset in the connected graph fails', () => {
  const puzzle = buildDailyPuzzle('2026-07-14');
  const outcome = evaluateShielding(puzzle, []);
  assert.equal(outcome.failedIds.length, puzzle.nodes.length);
  assert.equal(outcome.savedIds.length, 0);
  assert.equal(outcome.containment, 0);
});

test('the engine rejects unshieldable assets and overspending', () => {
  const puzzle = buildDailyPuzzle('2026-07-14');
  assert.throws(() => evaluateShielding(puzzle, ['source']), /cannot hold/);
  assert.throws(
    () => evaluateShielding(puzzle, ['identity', 'pricing', 'geo']),
    /budget exceeded/
  );
  assert.throws(() => evaluateShielding(puzzle, ['missing']), /Unknown asset/);
});

test('at least one legal optimal answer earns the optimization bonus', () => {
  const puzzle = buildDailyPuzzle('2026-07-14', 'protect-models');
  const optimalSets = findOptimalShieldSets(puzzle);
  assert.ok(optimalSets.length > 0);
  const firstOptimal = optimalSets[0];
  assert.ok(firstOptimal);
  const result = evaluateShielding(puzzle, firstOptimal);
  assert.equal(result.optimal, true);
  assert.equal(result.score, result.rawScore + 1000);
  assert.ok(result.savedCriticalIds.length > 0);
});

test('community protocols change the value of protected asset classes', () => {
  const day = '2026-07-14';
  const selection = ['identity'];
  const dashboardResult = evaluateShielding(
    buildDailyPuzzle(day, 'protect-dashboards'),
    selection
  );
  const modelResult = evaluateShielding(
    buildDailyPuzzle(day, 'protect-models'),
    selection
  );
  assert.notEqual(dashboardResult.rawScore, modelResult.rawScore);
});

test('share text is bounded, attributed, and describes the result', () => {
  const puzzle = buildDailyPuzzle('2026-07-14');
  const outcome = evaluateShielding(puzzle, ['identity', 'pricing']);
  const message = buildShareComment('example-user', puzzle, outcome, 3);
  assert.match(message, /u\/example-user/);
  assert.match(message, /3-day streak/);
  assert.match(message, /What would you have isolated\?/);
  assert.doesNotMatch(message, /\*\*/);
  assert.ok(message.length < 600);
});

test('protocol guard accepts only known values', () => {
  assert.equal(isProtocolId('protect-models'), true);
  assert.equal(isProtocolId('delete-production'), false);
  assert.equal(isProtocolId(null), false);
});
