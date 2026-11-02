import {
  weightedValue,
  type AssetKind,
  type AssetNode,
  type DailyPuzzle,
  type ShieldOutcome,
} from '../shared/game';

// Text and keyboard rules for the accessible mirror of the canvas board. Everything here
// is pure, so the same wording is unit-tested and shown to screen readers.

export type NodeStatus = 'idle' | 'selected' | 'failed' | 'saved';
export type NavigationKey =
  'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

export const KIND_LABELS: Record<AssetKind, string> = {
  source: 'source table',
  transform: 'transform',
  mart: 'data mart',
  dashboard: 'dashboard',
  model: 'machine-learning model',
  export: 'external export',
  alert: 'alert',
};

/** Reading order: the canvas columns from left to right, each from top to bottom. */
export function boardOrder(puzzle: DailyPuzzle): AssetNode[] {
  return [...puzzle.nodes].sort((a, b) => a.x - b.x || a.y - b.y);
}

/**
 * Up and Down follow the reading order, so every asset is one key press from the next.
 * Left and Right jump to the nearest asset in the neighbouring column, as on the canvas.
 * Home and End go to the first and last asset. Moves past an end stay where they are.
 */
export function moveFocus(
  puzzle: DailyPuzzle,
  currentId: string,
  key: NavigationKey,
): string {
  const order = boardOrder(puzzle);
  const index = order.findIndex((node) => node.id === currentId);
  const current = order[index];
  if (!current) return order[0]?.id ?? currentId;
  if (key === 'Home') return order[0]!.id;
  if (key === 'End') return order.at(-1)!.id;
  if (key === 'ArrowUp') return order[Math.max(0, index - 1)]!.id;
  if (key === 'ArrowDown')
    return order[Math.min(order.length - 1, index + 1)]!.id;
  const columns = [...new Set(order.map((node) => node.x))];
  const column = columns.indexOf(current.x) + (key === 'ArrowRight' ? 1 : -1);
  const candidates = order.filter((node) => node.x === columns[column]);
  if (candidates.length === 0) return current.id;
  return candidates.reduce((best, node) =>
    Math.abs(node.y - current.y) < Math.abs(best.y - current.y) ? node : best,
  ).id;
}

const list = (labels: string[]): string =>
  labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
const number = (value: number): string => value.toLocaleString('en-US');

/** Everything the canvas shows for one asset, as one sentence group. */
export function describeNode(
  puzzle: DailyPuzzle,
  node: AssetNode,
  status: NodeStatus,
): string {
  const labels = new Map(puzzle.nodes.map((item) => [item.id, item.label]));
  const upstream = puzzle.edges
    .filter((e) => e.to === node.id)
    .map((e) => labels.get(e.from)!);
  const downstream = puzzle.edges
    .filter((e) => e.from === node.id)
    .map((e) => labels.get(e.to)!);
  const weighted = weightedValue(puzzle, node);
  const parts = [
    `${node.label}, ${KIND_LABELS[node.kind]}.`,
    weighted === node.value
      ? `Value ${node.value}.`
      : `Value ${node.value}, ${weighted} under today's protocol.`,
    node.id === puzzle.sourceId
      ? 'The breaking change starts here.'
      : upstream.length
        ? `Depends on ${list(upstream)}.`
        : 'No upstream assets.',
    downstream.length
      ? `Feeds ${list(downstream)}.`
      : 'Critical endpoint: nothing depends on it.',
    node.shieldCost === null
      ? 'Cannot hold a circuit breaker.'
      : `Circuit breaker cost ${node.shieldCost}.`,
  ];
  if (status === 'selected') parts.push('Circuit breaker placed.');
  if (status === 'failed') parts.push('Failed in the cascade.');
  if (status === 'saved') parts.push('Saved from the cascade.');
  return parts.join(' ');
}

export function tokensUsed(
  puzzle: DailyPuzzle,
  selectedIds: Iterable<string>,
): number {
  const costs = new Map(
    puzzle.nodes.map((node) => [node.id, node.shieldCost ?? 0]),
  );
  return [...selectedIds].reduce(
    (total, id) => total + (costs.get(id) ?? 0),
    0,
  );
}

export function tokensLeftText(
  puzzle: DailyPuzzle,
  selectedIds: Iterable<string>,
): string {
  const left = puzzle.shieldBudget - tokensUsed(puzzle, selectedIds);
  return `${left} of ${puzzle.shieldBudget} ${puzzle.shieldBudget === 1 ? 'token' : 'tokens'} left.`;
}

export function placementMessage(
  puzzle: DailyPuzzle,
  node: AssetNode,
  placed: boolean,
  selectedIds: Iterable<string>,
): string {
  return `${placed ? 'Circuit breaker placed on' : 'Circuit breaker removed from'} ${node.label}. ${tokensLeftText(puzzle, selectedIds)}`;
}

export function refusalMessage(
  puzzle: DailyPuzzle,
  node: AssetNode,
  selectedIds: Iterable<string>,
): string {
  return node.shieldCost === null
    ? `${node.label} cannot hold a circuit breaker.`
    : `Not enough tokens for ${node.label}, which costs ${node.shieldCost}. ${tokensLeftText(puzzle, selectedIds)} Remove a breaker first.`;
}

export function cascadeMessage(
  puzzle: DailyPuzzle,
  outcome: ShieldOutcome,
): string {
  const labels = new Map(puzzle.nodes.map((node) => [node.id, node.label]));
  const failed = outcome.failedIds.length;
  const saved = outcome.savedIds.map((id) => labels.get(id) ?? id);
  return (
    `Cascade complete. ${failed} ${failed === 1 ? 'asset' : 'assets'} failed and ` +
    `${saved.length} ${saved.length === 1 ? 'was' : 'were'} saved${saved.length ? `: ${list(saved)}` : ''}. ` +
    `${outcome.containment}% of the blast contained.`
  );
}

export function scoreMessage(
  outcome: ShieldOutcome,
  bestScore: number,
  streak: number,
): string {
  return (
    `${outcome.optimal ? 'Optimal containment' : 'Incident report'}: ${number(outcome.score)} points. ` +
    `${outcome.savedCriticalIds.length} critical ${outcome.savedCriticalIds.length === 1 ? 'endpoint' : 'endpoints'} saved, ` +
    `${outcome.containment}% of the blast contained. Personal best ${number(bestScore)}. ` +
    `${streak}-day streak.`
  );
}
