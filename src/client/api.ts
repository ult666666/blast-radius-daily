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
import type { ProtocolId } from '../shared/game';
import { createDemoState, parseDemoDay } from './demo-state';

const demoMode =
  import.meta.env.VITE_OFFLINE_DEMO === 'true' ||
  new URLSearchParams(window.location.search).get('demo') === '1';
let demoState: ReturnType<typeof createDemoState> | null = null;
function localState() {
  return (demoState ??= createDemoState(
    parseDemoDay(new URLSearchParams(window.location.search).get('day')),
  ));
}
function changed() {
  window.dispatchEvent(new Event('blast-demo-state'));
}
export function getDemoSnapshot() {
  if (!demoMode)
    throw new Error('The local snapshot is available only in demo mode.');
  return localState().snapshot();
}
export function subscribeDemoState(listener: () => void): () => void {
  window.addEventListener('blast-demo-state', listener);
  return () => window.removeEventListener('blast-demo-state', listener);
}

export function isDemoMode(): boolean {
  return demoMode;
}

export async function getSession(): Promise<SessionResponse> {
  if (demoMode) {
    return localState().session();
  }
  return await apiRequest<SessionResponse>('/api/session');
}

export async function submitScore(shieldIds: string[]): Promise<ScoreResponse> {
  if (demoMode) {
    const result = localState().score(shieldIds);
    changed();
    return result;
  }
  return await apiRequest<ScoreResponse>('/api/score', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ shieldIds } satisfies ScoreRequest),
  });
}

export async function voteForProtocol(
  protocol: ProtocolId,
): Promise<VoteResponse> {
  if (demoMode) {
    const result = localState().vote(protocol);
    changed();
    return result;
  }
  return await apiRequest<VoteResponse>('/api/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocol } satisfies VoteRequest),
  });
}

export async function shareScore(token: string): Promise<ShareResponse> {
  if (demoMode) {
    throw new Error(
      'Score sharing is unavailable in the offline demo. Nothing was posted.',
    );
  }
  return await apiRequest<ShareResponse>('/api/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token } satisfies ShareRequest),
  });
}

export async function deleteGameData(): Promise<DeleteDataResponse> {
  if (demoMode) {
    const result = localState().deleteData();
    changed();
    return result;
  }
  return await apiRequest<DeleteDataResponse>('/api/data', {
    method: 'DELETE',
  });
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = (await response.json()) as T | ApiError;
  if (!response.ok || isApiError(body)) {
    throw new Error(
      isApiError(body) ? body.message : `Request failed: ${response.status}`,
    );
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
