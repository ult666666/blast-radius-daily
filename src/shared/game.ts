export const PROTOCOLS = [
  {
    id: 'protect-dashboards',
    label: 'Protect dashboards',
    shortLabel: 'DASHBOARDS',
    description: 'Dashboard assets are worth 50% more tomorrow.',
  },
  {
    id: 'protect-models',
    label: 'Protect models',
    shortLabel: 'ML MODELS',
    description: 'Model assets are worth 50% more tomorrow.',
  },
  {
    id: 'protect-edges',
    label: 'Protect external edges',
    shortLabel: 'EDGES',
    description: 'Exports and alerts are worth 50% more tomorrow.',
  },
] as const;

export type ProtocolId = (typeof PROTOCOLS)[number]['id'];

export type AssetKind =
  | 'source'
  | 'transform'
  | 'mart'
  | 'dashboard'
  | 'model'
  | 'export'
  | 'alert';

export type AssetNode = {
  id: string;
  label: string;
  kind: AssetKind;
  value: number;
  x: number;
  y: number;
  shieldCost: number | null;
  detail: string;
};

export type LineageEdge = {
  from: string;
  to: string;
};

export type DailyPuzzle = {
  day: string;
  episode: number;
  title: string;
  system: string;
  change: string;
  briefing: string;
  sourceId: string;
  shieldBudget: number;
  protocol: ProtocolId;
  protocolLabel: string;
  nodes: AssetNode[];
  edges: LineageEdge[];
};

export type ShieldOutcome = {
  shieldIds: string[];
  shieldCost: number;
  failedIds: string[];
  savedIds: string[];
  failedCriticalIds: string[];
  savedCriticalIds: string[];
  containment: number;
  rawScore: number;
  maxRawScore: number;
  score: number;
  optimal: boolean;
};

type Scenario = {
  system: string;
  title: string;
  change: string;
  briefing: string;
  labels: Record<string, string>;
};

const SCENARIOS: Scenario[] = [
  {
    system: 'MARKETPLACE ORDERS',
    title: 'The Vanishing Tier',
    change: 'DROP COLUMN customer_tier',
    briefing:
      'A rushed warehouse migration is live in staging. Place two circuit breakers before the missing field cascades into customer-facing systems.',
    labels: {
      source: 'raw_orders',
      identity: 'identity_join',
      pricing: 'pricing_enrich',
      geo: 'geo_resolve',
      customer: 'customer_360',
      revenue: 'revenue_mart',
      operations: 'ops_mart',
      executive: 'exec_pulse',
      model: 'churn_model',
      external: 'finance_export',
      dashboard: 'delivery_board',
      alert: 'fraud_alert',
    },
  },
  {
    system: 'COMMUNITY SIGNALS',
    title: 'The Silent Vote',
    change: 'RENAME COLUMN vote_weight',
    briefing:
      'A signal contract changed without warning. Choose the two cuts that preserve the most community intelligence before deploy.',
    labels: {
      source: 'raw_votes',
      identity: 'member_stitch',
      pricing: 'signal_enrich',
      geo: 'locale_resolve',
      customer: 'community_360',
      revenue: 'engagement_mart',
      operations: 'safety_mart',
      executive: 'community_pulse',
      model: 'quality_ranker',
      external: 'partner_export',
      dashboard: 'moderator_board',
      alert: 'brigade_alert',
    },
  },
  {
    system: 'CREATOR ANALYTICS',
    title: 'Metric Meltdown',
    change: 'CAST watch_seconds AS TEXT',
    briefing:
      'A type change slipped through review. Spend two breaker tokens to contain the blast while keeping the highest-value creator tools alive.',
    labels: {
      source: 'raw_views',
      identity: 'viewer_stitch',
      pricing: 'revenue_enrich',
      geo: 'region_resolve',
      customer: 'audience_360',
      revenue: 'earnings_mart',
      operations: 'delivery_mart',
      executive: 'creator_pulse',
      model: 'next_hit_model',
      external: 'royalty_export',
      dashboard: 'studio_board',
      alert: 'quality_alert',
    },
  },
  {
    system: 'SUPPORT OPERATIONS',
    title: 'Priority Zero',
    change: 'DELETE FIELD urgency_score',
    briefing:
      'An upstream cleanup erased a critical feature. You have two circuit breakers and one chance to keep support operations online.',
    labels: {
      source: 'raw_tickets',
      identity: 'account_stitch',
      pricing: 'priority_enrich',
      geo: 'region_resolve',
      customer: 'account_360',
      revenue: 'sla_mart',
      operations: 'routing_mart',
      executive: 'support_pulse',
      model: 'escalation_model',
      external: 'vendor_export',
      dashboard: 'agent_board',
      alert: 'breach_alert',
    },
  },
];

const EDGES: LineageEdge[] = [
  { from: 'source', to: 'identity' },
  { from: 'source', to: 'pricing' },
  { from: 'source', to: 'geo' },
  { from: 'identity', to: 'customer' },
  { from: 'identity', to: 'alert' },
  { from: 'pricing', to: 'revenue' },
  { from: 'pricing', to: 'operations' },
  { from: 'geo', to: 'operations' },
  { from: 'customer', to: 'executive' },
  { from: 'customer', to: 'model' },
  { from: 'revenue', to: 'executive' },
  { from: 'revenue', to: 'external' },
  { from: 'operations', to: 'dashboard' },
  { from: 'operations', to: 'alert' },
];

const NODE_BLUEPRINTS: Array<Omit<AssetNode, 'label'>> = [
  {
    id: 'source',
    kind: 'source',
    value: 1,
    x: 90,
    y: 350,
    shieldCost: null,
    detail: 'The incompatible schema change begins here.',
  },
  {
    id: 'identity',
    kind: 'transform',
    value: 2,
    x: 270,
    y: 190,
    shieldCost: 1,
    detail: 'Identity and account resolution branch.',
  },
  {
    id: 'pricing',
    kind: 'transform',
    value: 2,
    x: 270,
    y: 350,
    shieldCost: 1,
    detail: 'Business logic and feature enrichment branch.',
  },
  {
    id: 'geo',
    kind: 'transform',
    value: 1,
    x: 270,
    y: 510,
    shieldCost: 1,
    detail: 'Location normalization branch.',
  },
  {
    id: 'customer',
    kind: 'mart',
    value: 3,
    x: 475,
    y: 190,
    shieldCost: 2,
    detail: 'High-value customer or audience mart.',
  },
  {
    id: 'revenue',
    kind: 'mart',
    value: 3,
    x: 475,
    y: 350,
    shieldCost: 2,
    detail: 'Financial and performance mart.',
  },
  {
    id: 'operations',
    kind: 'mart',
    value: 2,
    x: 475,
    y: 510,
    shieldCost: 2,
    detail: 'Operational decision mart with two upstream paths.',
  },
  {
    id: 'executive',
    kind: 'dashboard',
    value: 5,
    x: 700,
    y: 105,
    shieldCost: null,
    detail: 'Executive-facing daily dashboard.',
  },
  {
    id: 'model',
    kind: 'model',
    value: 5,
    x: 700,
    y: 235,
    shieldCost: null,
    detail: 'Production machine-learning model.',
  },
  {
    id: 'external',
    kind: 'export',
    value: 4,
    x: 700,
    y: 365,
    shieldCost: null,
    detail: 'Contracted external data delivery.',
  },
  {
    id: 'dashboard',
    kind: 'dashboard',
    value: 3,
    x: 700,
    y: 495,
    shieldCost: null,
    detail: 'Operational dashboard used throughout the day.',
  },
  {
    id: 'alert',
    kind: 'alert',
    value: 4,
    x: 700,
    y: 625,
    shieldCost: null,
    detail: 'Time-sensitive alerting system.',
  },
];

const MS_PER_DAY = 86_400_000;
const FIRST_DAY = Date.UTC(2026, 5, 17);

export function isProtocolId(value: unknown): value is ProtocolId {
  return PROTOCOLS.some((protocol) => protocol.id === value);
}

export function currentUtcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function previousUtcDay(day: string): string {
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid UTC day');
  }
  return new Date(parsed - MS_PER_DAY).toISOString().slice(0, 10);
}

export function nextUtcDay(day: string): string {
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid UTC day');
  }
  return new Date(parsed + MS_PER_DAY).toISOString().slice(0, 10);
}

export function buildDailyPuzzle(
  day: string,
  protocol: ProtocolId = 'protect-dashboards'
): DailyPuzzle {
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid UTC day');
  }

  const scenarioIndex = Math.abs(hashString(day)) % SCENARIOS.length;
  const scenario = SCENARIOS[scenarioIndex];
  if (!scenario) {
    throw new Error('Daily scenario unavailable');
  }

  const protocolDefinition = PROTOCOLS.find((item) => item.id === protocol);
  if (!protocolDefinition) {
    throw new Error('Invalid community protocol');
  }

  const episode = Math.max(1, Math.floor((parsed - FIRST_DAY) / MS_PER_DAY) + 1);
  const nodes = NODE_BLUEPRINTS.map((node) => ({
    ...node,
    label: scenario.labels[node.id] ?? node.id,
  }));

  return {
    day,
    episode,
    title: scenario.title,
    system: scenario.system,
    change: scenario.change,
    briefing: scenario.briefing,
    sourceId: 'source',
    shieldBudget: 2,
    protocol,
    protocolLabel: protocolDefinition.label,
    nodes,
    edges: EDGES.map((edge) => ({ ...edge })),
  };
}

export function evaluateShielding(
  puzzle: DailyPuzzle,
  requestedShieldIds: readonly string[]
): ShieldOutcome {
  const shieldIds = [...new Set(requestedShieldIds)];
  validatePuzzle(puzzle);
  validateShieldSelection(puzzle, shieldIds);

  const baselineFailed = propagateFailure(puzzle, new Set<string>());
  const failed = propagateFailure(puzzle, new Set(shieldIds));
  const saved = [...baselineFailed].filter((id) => !failed.has(id));
  const terminalIds = getTerminalIds(puzzle);
  const failedCriticalIds = terminalIds.filter((id) => failed.has(id));
  const savedCriticalIds = terminalIds.filter(
    (id) => baselineFailed.has(id) && !failed.has(id)
  );
  const rawScore = rawScoreFor(puzzle, saved);
  const maxRawScore = maximumRawScore(puzzle);
  const optimal = rawScore === maxRawScore;
  const totalAtRisk = [...baselineFailed]
    .filter((id) => id !== puzzle.sourceId)
    .reduce((total, id) => total + weightedValue(puzzle, getNode(puzzle, id)), 0);
  const totalSaved = saved.reduce(
    (total, id) => total + weightedValue(puzzle, getNode(puzzle, id)),
    0
  );

  return {
    shieldIds,
    shieldCost: shieldIds.reduce(
      (total, id) => total + (getNode(puzzle, id).shieldCost ?? 0),
      0
    ),
    failedIds: [...failed],
    savedIds: saved,
    failedCriticalIds,
    savedCriticalIds,
    containment: totalAtRisk === 0 ? 100 : Math.round((totalSaved / totalAtRisk) * 100),
    rawScore,
    maxRawScore,
    score: rawScore + (optimal ? 1000 : 0),
    optimal,
  };
}

export function findOptimalShieldSets(puzzle: DailyPuzzle): string[][] {
  validatePuzzle(puzzle);
  const candidates = puzzle.nodes.filter((node) => node.shieldCost !== null);
  const selections: string[][] = [];
  enumerateSelections(candidates, puzzle.shieldBudget, 0, [], 0, selections);
  const scored = selections.map((selection) => ({
    selection,
    score: rawScoreFor(
      puzzle,
      [...propagateFailure(puzzle, new Set<string>())].filter(
        (id) => !propagateFailure(puzzle, new Set(selection)).has(id)
      )
    ),
  }));
  const maximum = Math.max(...scored.map((item) => item.score));
  return scored
    .filter((item) => item.score === maximum)
    .map((item) => item.selection);
}

export function buildShareComment(
  username: string,
  puzzle: DailyPuzzle,
  outcome: ShieldOutcome,
  streak: number
): string {
  const status = outcome.optimal ? 'OPTIMAL CONTAINMENT' : 'INCIDENT CONTAINED';
  const handles = outcome.shieldIds
    .map((id) => getNode(puzzle, id).label)
    .join(' + ');
  return [
    `🛡️ ${status} — u/${username} scored ${outcome.score.toLocaleString('en-US')} on Blast Radius Daily #${puzzle.episode}.`,
    `Saved ${outcome.savedCriticalIds.length} critical endpoints with ${handles || 'no circuit breakers'} · ${outcome.containment}% blast contained · ${streak}-day streak.`,
    'What would you have isolated?',
  ].join('\n\n');
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

function getNode(puzzle: DailyPuzzle, id: string): AssetNode {
  const node = puzzle.nodes.find((candidate) => candidate.id === id);
  if (!node) {
    throw new Error(`Unknown asset: ${id}`);
  }
  return node;
}

function getTerminalIds(puzzle: DailyPuzzle): string[] {
  const parents = new Set(puzzle.edges.map((edge) => edge.from));
  return puzzle.nodes.filter((node) => !parents.has(node.id)).map((node) => node.id);
}

function validatePuzzle(puzzle: DailyPuzzle): void {
  const ids = new Set(puzzle.nodes.map((node) => node.id));
  if (ids.size !== puzzle.nodes.length) {
    throw new Error('Puzzle contains duplicate asset IDs');
  }
  if (!ids.has(puzzle.sourceId)) {
    throw new Error('Puzzle source does not exist');
  }
  for (const edge of puzzle.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error('Puzzle edge references an unknown asset');
    }
  }
}

function validateShieldSelection(puzzle: DailyPuzzle, shieldIds: string[]): void {
  let cost = 0;
  for (const id of shieldIds) {
    const node = getNode(puzzle, id);
    if (node.shieldCost === null) {
      throw new Error(`${node.label} cannot hold a circuit breaker`);
    }
    cost += node.shieldCost;
  }
  if (cost > puzzle.shieldBudget) {
    throw new Error('Circuit breaker budget exceeded');
  }
}

function propagateFailure(puzzle: DailyPuzzle, shields: Set<string>): Set<string> {
  const failed = new Set<string>([puzzle.sourceId]);
  const queue = [puzzle.sourceId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    for (const edge of puzzle.edges) {
      if (edge.from !== current || shields.has(edge.to) || failed.has(edge.to)) {
        continue;
      }
      failed.add(edge.to);
      queue.push(edge.to);
    }
  }

  return failed;
}

function weightedValue(puzzle: DailyPuzzle, node: AssetNode): number {
  if (puzzle.protocol === 'protect-dashboards' && node.kind === 'dashboard') {
    return node.value * 1.5;
  }
  if (puzzle.protocol === 'protect-models' && node.kind === 'model') {
    return node.value * 1.5;
  }
  if (
    puzzle.protocol === 'protect-edges' &&
    (node.kind === 'export' || node.kind === 'alert')
  ) {
    return node.value * 1.5;
  }
  return node.value;
}

function rawScoreFor(puzzle: DailyPuzzle, savedIds: string[]): number {
  const terminalIds = new Set(getTerminalIds(puzzle));
  const weighted = savedIds.reduce(
    (total, id) => total + weightedValue(puzzle, getNode(puzzle, id)) * 100,
    0
  );
  const criticalBonus = savedIds.reduce(
    (total, id) => total + (terminalIds.has(id) ? 125 : 0),
    0
  );
  return Math.round(weighted + criticalBonus);
}

function maximumRawScore(puzzle: DailyPuzzle): number {
  const candidates = puzzle.nodes.filter((node) => node.shieldCost !== null);
  const selections: string[][] = [];
  enumerateSelections(candidates, puzzle.shieldBudget, 0, [], 0, selections);
  const baseline = propagateFailure(puzzle, new Set<string>());

  return Math.max(
    ...selections.map((selection) => {
      const failed = propagateFailure(puzzle, new Set(selection));
      const saved = [...baseline].filter((id) => !failed.has(id));
      return rawScoreFor(puzzle, saved);
    })
  );
}

function enumerateSelections(
  candidates: AssetNode[],
  budget: number,
  index: number,
  current: string[],
  currentCost: number,
  output: string[][]
): void {
  if (index >= candidates.length) {
    output.push([...current]);
    return;
  }

  enumerateSelections(candidates, budget, index + 1, current, currentCost, output);
  const candidate = candidates[index];
  if (!candidate || candidate.shieldCost === null) {
    return;
  }
  const nextCost = currentCost + candidate.shieldCost;
  if (nextCost <= budget) {
    current.push(candidate.id);
    enumerateSelections(candidates, budget, index + 1, current, nextCost, output);
    current.pop();
  }
}
