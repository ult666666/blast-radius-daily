import type {
  DeleteDataResponse,
  ScoreResponse,
  SessionResponse,
  VoteResponse,
} from '../shared/api';
import {
  PROTOCOLS,
  buildDailyPuzzle,
  buildShareComment,
  evaluateShielding,
  isProtocolId,
  type ProtocolId,
  type ShieldOutcome,
} from '../shared/game';

export const DEFAULT_DEMO_DAY = '2026-07-14';
export function parseDemoDay(value: string | null | undefined): string {
  if (value === null || value === undefined) return DEFAULT_DEMO_DAY;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000') ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      'Choose a real date in YYYY-MM-DD format (years 0001–9999).',
    );
  }
  return value;
}

export type DemoSnapshot = {
  session: SessionResponse;
  lastOutcome: ShieldOutcome | null;
  deleted: boolean;
};
function fixture(day: string): SessionResponse {
  return {
    type: 'session',
    username: 'demo-responder',
    puzzle: buildDailyPuzzle(day, 'protect-models'),
    leaderboard: [
      { rank: 1, username: 'graph_goblin', score: 5725 },
      { rank: 2, username: 'null-pointer', score: 5400 },
      { rank: 3, username: 'schemaqueen', score: 4875 },
      { rank: 4, username: 'tableflip42', score: 3900 },
    ],
    community: { responders: 18, goal: 25, percent: 72 },
    streak: 3,
    bestScore: null,
    selectedProtocol: null,
    protocolVotes: PROTOCOLS.map((item, index) => ({
      id: item.id,
      count: [7, 11, 5][index] ?? 0,
    })),
  };
}

export function createDemoState(requestedDay: string) {
  const day = parseDemoDay(requestedDay);
  const background = fixture(day);
  let session = structuredClone(background);
  let lastOutcome: ShieldOutcome | null = null;
  let deleted = false;
  return {
    session: (): SessionResponse => structuredClone(session),
    snapshot: (): DemoSnapshot =>
      structuredClone({ session, lastOutcome, deleted }),
    score(shieldIds: string[]): ScoreResponse {
      if (
        !Array.isArray(shieldIds) ||
        shieldIds.some((id) => typeof id !== 'string')
      )
        throw new Error('Invalid circuit breaker selection');
      const outcome = evaluateShielding(session.puzzle, shieldIds);
      const bestScore = Math.max(session.bestScore ?? 0, outcome.score);
      const streak =
        session.bestScore === null ? session.streak + 1 : session.streak;
      const leaderboard = [
        ...background.leaderboard,
        { rank: 0, username: session.username, score: bestScore },
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      const community = { responders: 19, goal: 25, percent: 76 };
      session = { ...session, bestScore, streak, leaderboard, community };
      lastOutcome = outcome;
      deleted = false;
      return structuredClone({
        type: 'score',
        outcome,
        leaderboard,
        community,
        streak,
        bestScore,
        commentPreview: buildShareComment(
          session.username,
          session.puzzle,
          outcome,
          streak,
        ),
        share: {
          status: 'disabled',
          token: null,
          message:
            'Offline demo: score comments are unavailable. Nothing is posted.',
        },
      });
    },
    vote(protocol: ProtocolId): VoteResponse {
      if (!isProtocolId(protocol))
        throw new Error('Unknown community protocol');
      if (session.bestScore === null)
        throw new Error('Finish a local run before voting.');
      const protocolVotes = background.protocolVotes.map((vote) => ({
        ...vote,
        count: vote.count + Number(vote.id === protocol),
      }));
      session = { ...session, selectedProtocol: protocol, protocolVotes };
      return structuredClone({
        type: 'vote',
        selectedProtocol: protocol,
        protocolVotes,
      });
    },
    deleteData(): DeleteDataResponse {
      session = { ...structuredClone(background), streak: 0 };
      lastOutcome = null;
      deleted = true;
      return { type: 'delete-data', status: 'deleted' };
    },
  };
}
