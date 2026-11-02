import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOCOLS,
  buildDailyPuzzle,
  evaluateShielding,
  findOptimalShieldSets,
  weightedValue,
  type DailyPuzzle,
} from '../src/shared/game';
import {
  KIND_LABELS,
  boardOrder,
  cascadeMessage,
  describeNode,
  moveFocus,
  placementMessage,
  refusalMessage,
  scoreMessage,
  tokensLeftText,
  type NavigationKey,
} from '../src/client/board-a11y';

// Every daily scenario under every protocol: walk days until all four titles appear.
function allPuzzles(): DailyPuzzle[] {
  const puzzles: DailyPuzzle[] = [];
  const titles = new Set<string>();
  for (let day = Date.UTC(2026, 6, 1); titles.size < 4; day += 86_400_000) {
    const iso = new Date(day).toISOString().slice(0, 10);
    const title = buildDailyPuzzle(iso).title;
    if (titles.has(title)) continue;
    titles.add(title);
    for (const protocol of PROTOCOLS)
      puzzles.push(buildDailyPuzzle(iso, protocol.id));
  }
  return puzzles;
}
const PUZZLES = allPuzzles();

test('every asset description names its type, value, dependencies and breaker rule', () => {
  assert.equal(PUZZLES.length, 12);
  for (const puzzle of PUZZLES)
    for (const node of puzzle.nodes) {
      const text = describeNode(puzzle, node, 'idle');
      assert.ok(
        text.startsWith(`${node.label}, ${KIND_LABELS[node.kind]}.`),
        text,
      );
      assert.match(text, new RegExp(`Value ${node.value}[.,]`));
      const weighted = weightedValue(puzzle, node);
      if (weighted !== node.value)
        assert.ok(text.includes(`${weighted} under today's protocol`));
      for (const edge of puzzle.edges) {
        const other = (id: string) =>
          puzzle.nodes.find((n) => n.id === id)!.label;
        if (edge.to === node.id)
          assert.ok(
            text.includes(other(edge.from)),
            `${text} names its parent`,
          );
        if (edge.from === node.id)
          assert.ok(text.includes(other(edge.to)), `${text} names its child`);
      }
      const hasChildren = puzzle.edges.some((edge) => edge.from === node.id);
      assert.equal(text.includes('Critical endpoint'), !hasChildren, text);
      assert.ok(
        text.includes(
          node.shieldCost === null
            ? 'Cannot hold a circuit breaker.'
            : `Circuit breaker cost ${node.shieldCost}.`,
        ),
      );
    }
  const puzzle = PUZZLES[0]!;
  const node = puzzle.nodes.find((n) => n.shieldCost !== null)!;
  assert.match(
    describeNode(puzzle, node, 'selected'),
    /Circuit breaker placed\.$/,
  );
  assert.match(
    describeNode(puzzle, node, 'failed'),
    /Failed in the cascade\.$/,
  );
  assert.match(
    describeNode(puzzle, node, 'saved'),
    /Saved from the cascade\.$/,
  );
});

test('Up and Down walk every asset once in reading order, and stop at both ends', () => {
  for (const puzzle of PUZZLES) {
    const order = boardOrder(puzzle).map((node) => node.id);
    assert.deepEqual(
      [...order].sort(),
      puzzle.nodes.map((node) => node.id).sort(),
    );
    let id = order[0]!;
    const seen = [id];
    for (let i = 1; i < order.length + 3; i++) {
      id = moveFocus(puzzle, id, 'ArrowDown');
      if (seen.at(-1) !== id) seen.push(id);
    }
    assert.deepEqual(seen, order);
    for (let i = order.length - 1; i > 0; i--)
      assert.equal(moveFocus(puzzle, order[i]!, 'ArrowUp'), order[i - 1]);
    assert.equal(moveFocus(puzzle, order[0]!, 'ArrowUp'), order[0]);
    assert.equal(moveFocus(puzzle, order[3]!, 'Home'), order[0]);
    assert.equal(moveFocus(puzzle, order[3]!, 'End'), order.at(-1));
  }
});

test('Left and Right jump to the nearest asset in the neighbouring canvas column', () => {
  for (const puzzle of PUZZLES) {
    const columns = [...new Set(puzzle.nodes.map((node) => node.x))].sort(
      (a, b) => a - b,
    );
    for (const node of puzzle.nodes)
      for (const key of ['ArrowLeft', 'ArrowRight'] as NavigationKey[]) {
        const target = puzzle.nodes.find(
          (n) => n.id === moveFocus(puzzle, node.id, key),
        )!;
        const want =
          columns[columns.indexOf(node.x) + (key === 'ArrowRight' ? 1 : -1)];
        if (want === undefined) {
          assert.equal(target.id, node.id, 'the edge column keeps focus');
          continue;
        }
        assert.equal(target.x, want);
        const best = Math.min(
          ...puzzle.nodes
            .filter((n) => n.x === want)
            .map((n) => Math.abs(n.y - node.y)),
        );
        assert.equal(Math.abs(target.y - node.y), best);
      }
  }
});

test('announcements report breakers, tokens, refusals, the cascade and the score', () => {
  const puzzle = buildDailyPuzzle('2026-07-14', 'protect-models');
  const byId = (id: string) => puzzle.nodes.find((node) => node.id === id)!;
  assert.equal(tokensLeftText(puzzle, []), '2 of 2 tokens left.');
  assert.equal(
    placementMessage(puzzle, byId('identity'), true, ['identity']),
    `Circuit breaker placed on ${byId('identity').label}. 1 of 2 tokens left.`,
  );
  assert.equal(
    placementMessage(puzzle, byId('identity'), false, []),
    `Circuit breaker removed from ${byId('identity').label}. 2 of 2 tokens left.`,
  );
  assert.match(
    refusalMessage(puzzle, byId('source'), []),
    /cannot hold a circuit breaker/,
  );
  assert.equal(
    refusalMessage(puzzle, byId('customer'), ['identity']),
    `Not enough tokens for ${byId('customer').label}, which costs 2. 1 of 2 tokens left. Remove a breaker first.`,
  );
  const selection = findOptimalShieldSets(puzzle)[0]!;
  const outcome = evaluateShielding(puzzle, selection);
  const cascade = cascadeMessage(puzzle, outcome);
  assert.ok(cascade.includes(`${outcome.failedIds.length} assets failed`));
  assert.ok(cascade.includes(`${outcome.containment}% of the blast contained`));
  for (const id of outcome.savedIds)
    assert.ok(cascade.includes(byId(id).label));
  const score = scoreMessage(outcome, outcome.score, 4);
  assert.ok(
    score.startsWith(
      `Optimal containment: ${outcome.score.toLocaleString('en-US')} points.`,
    ),
  );
  assert.ok(score.endsWith('4-day streak.'));
});
