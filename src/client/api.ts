import type {
  ApiError,
  DeleteDataResponse,
  ScoreRequest,
  ScoreResponse,
  SessionResponse,
  ShareRequest,
  ShareResponse,
  VoteRequest,
  VoteResponse,
} from '../shared/api';
import {
  PROTOCOLS,
  buildDailyPuzzle,
  buildShareComment,
  currentUtcDay,
  evaluateShielding,
  type ProtocolId,
} from '../shared/game';

const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
let demoSession: SessionResponse | null = null;

export function isDemoMode(): boolean {
  return demoMode;
}

export async function getSession(): Promise<SessionResponse> {
  if (demoMode) {
    return getDemoSession();
  }
  return await apiRequest<SessionResponse>('/api/session');
}

export async function submitScore(shieldIds: string[]): Promise<ScoreResponse> {
  if (demoMode) {
    const session = getDemoSession();
    const outcome = evaluateShielding(session.puzzle, shieldIds);
    const bestScore = Math.max(session.bestScore ?? 0, outcome.score);
    const username = session.username;
    const existing = session.leaderboard.filter((entry) => entry.username !== username);
    const leaderboard = [
      ...existing,
      { rank: 0, username, score: bestScore },
    ]
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const responders = Math.max(session.community.responders, 19);
    const community = {
      responders,
      goal: 25,
      percent: Math.round((responders / 25) * 100),
    };
    demoSession = { ...session, bestScore, leaderboard, community, streak: 4 };
    return {
      type: 'score',
      outcome,
      leaderboard,
      community,
      streak: 4,
      bestScore,
      commentPreview: buildShareComment(username, session.puzzle, outcome, 4),
      share: {
        status: 'disabled',
        token: null,
        message: 'Score comments stay off until Reddit approves this app version.',
      },
    };
  }
  return await apiRequest<ScoreResponse>('/api/score', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ shieldIds } satisfies ScoreRequest),
  });
}

export async function voteForProtocol(protocol: ProtocolId): Promise<VoteResponse> {
  if (demoMode) {
    const session = getDemoSession();
    const protocolVotes = session.protocolVotes.map((vote) => ({
      ...vote,
      count: vote.id === protocol ? vote.count + 1 : vote.count,
    }));
    demoSession = { ...session, selectedProtocol: protocol, protocolVotes };
    return { type: 'vote', selectedProtocol: protocol, protocolVotes };
  }
  return await apiRequest<VoteResponse>('/api/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocol } satisfies VoteRequest),
  });
}

export async function shareScore(token: string): Promise<ShareResponse> {
  if (demoMode) {
    return { type: 'share', status: 'posted', commentId: 't1_demo' };
  }
  return await apiRequest<ShareResponse>('/api/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token } satisfies ShareRequest),
  });
}

export async function deleteGameData(): Promise<DeleteDataResponse> {
  if (demoMode) {
    demoSession = null;
    return { type: 'delete-data', status: 'deleted' };
  }
  return await apiRequest<DeleteDataResponse>('/api/data', { method: 'DELETE' });
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = (await response.json()) as T | ApiError;
  if (!response.ok || isApiError(body)) {
    throw new Error(isApiError(body) ? body.message : `Request failed: ${response.status}`);
  }
  return body;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'error' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function getDemoSession(): SessionResponse {
  if (demoSession) {
    return demoSession;
  }
  const params = new URLSearchParams(window.location.search);
  const requestedDay = params.get('day');
  const day = requestedDay?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? requestedDay
    : currentUtcDay();
  const protocol: ProtocolId = 'protect-models';
  demoSession = {
    type: 'session',
    username: 'charles-builds',
    puzzle: buildDailyPuzzle(day, protocol),
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
  return demoSession;
}
