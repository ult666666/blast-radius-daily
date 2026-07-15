import { randomUUID } from 'node:crypto';
import { redis } from '@devvit/web/server';
import type {
  CommunityStatus,
  LeaderboardEntry,
  ProtocolVote,
} from '../../shared/api';
import {
  PROTOCOLS,
  buildDailyPuzzle,
  isProtocolId,
  previousUtcDay,
  type ProtocolId,
  type ShieldOutcome,
} from '../../shared/game';

const DAILY_TTL_SECONDS = 60 * 60 * 24 * 8;
const PROFILE_TTL_SECONDS = 60 * 60 * 24 * 30;
const SHARE_LOCK_SECONDS = 60;
const COMMUNITY_GOAL = 25;

type PlayerProfile = {
  lastDay: string;
  streak: number;
};

export type ShareDraft = {
  username: string;
  postId: string;
  hubId: string;
  comment: string;
};

type StoredShareDraft = ShareDraft & {
  token: string;
};

export function leaderboardKey(day: string): string {
  return `br:${day}:scores`;
}

export function respondersKey(day: string): string {
  return `br:${day}:responders`;
}

export function runsKey(day: string): string {
  return `br:${day}:runs`;
}

export function voteKey(day: string): string {
  return `br:${day}:protocol-votes`;
}

export function voterKey(day: string): string {
  return `br:${day}:protocol-voters`;
}

export function sharesKey(day: string): string {
  return `br:${day}:shares`;
}

export function shareDraftsKey(day: string): string {
  return `br:${day}:share-drafts`;
}

function shareLockKey(day: string, username: string): string {
  return `br:${day}:share-lock:${username}`;
}

export function postHubKey(postId: string): string {
  return `br:post:${postId}:hub`;
}

function profileKey(username: string): string {
  return `br:profile:${username}`;
}

export async function setVerifiedPostHub(postId: string, hubId: string): Promise<void> {
  await redis.set(postHubKey(postId), hubId);
}

export async function getVerifiedPostHub(postId: string): Promise<string | undefined> {
  return await redis.get(postHubKey(postId));
}

export async function clearVerifiedPostHub(postId: string): Promise<void> {
  await redis.del(postHubKey(postId));
}

export async function createShareDraft(
  day: string,
  draft: ShareDraft
): Promise<string> {
  const drafts = shareDraftsKey(day);
  const token = randomUUID();
  const stored: StoredShareDraft = { ...draft, token };
  await redis.hSet(drafts, { [draft.username]: JSON.stringify(stored) });
  await redis.expire(drafts, DAILY_TTL_SECONDS);
  return token;
}

export async function getShareDraft(
  day: string,
  username: string,
  token: string
): Promise<ShareDraft | null> {
  const stored = await redis.hGet(shareDraftsKey(day), username);
  if (!stored) {
    return null;
  }
  try {
    const draft = JSON.parse(stored) as Partial<StoredShareDraft>;
    if (
      draft.username !== username ||
      draft.token !== token ||
      typeof draft.postId !== 'string' ||
      typeof draft.hubId !== 'string' ||
      typeof draft.comment !== 'string'
    ) {
      return null;
    }
    return draft as ShareDraft;
  } catch {
    return null;
  }
}

export async function deleteShareDraft(
  day: string,
  username: string,
  token: string
): Promise<void> {
  const drafts = shareDraftsKey(day);
  const stored = await redis.hGet(drafts, username);
  if (!stored) {
    return;
  }
  try {
    const draft = JSON.parse(stored) as Partial<StoredShareDraft>;
    if (draft.token === token) {
      await redis.hDel(drafts, [username]);
    }
  } catch {
    await redis.hDel(drafts, [username]);
  }
}

export async function acquireShareLock(
  day: string,
  username: string,
  token: string
): Promise<boolean> {
  const result = await redis.set(shareLockKey(day, username), token, {
    nx: true,
    expiration: new Date(Date.now() + SHARE_LOCK_SECONDS * 1000),
  });
  return result === 'OK';
}

export async function releaseShareLock(
  day: string,
  username: string,
  token: string
): Promise<void> {
  const key = shareLockKey(day, username);
  if ((await redis.get(key)) === token) {
    await redis.del(key);
  }
}

export async function hasShared(day: string, username: string): Promise<boolean> {
  return (await redis.zScore(sharesKey(day), username)) !== undefined;
}

export async function markSharePending(day: string, username: string): Promise<void> {
  await redis.zAdd(sharesKey(day), { member: username, score: Date.now() });
  await redis.expire(sharesKey(day), DAILY_TTL_SECONDS);
}

export async function clearSharePending(day: string, username: string): Promise<void> {
  await redis.zRem(sharesKey(day), [username]);
}

export async function getProtocolForDay(day: string): Promise<ProtocolId> {
  const votes = await getProtocolVotes(day);
  const highest = Math.max(...votes.map((vote) => vote.count));
  if (highest > 0) {
    const winner = votes.find((vote) => vote.count === highest);
    if (winner) {
      return winner.id;
    }
  }

  const defaults: ProtocolId[] = [
    'protect-dashboards',
    'protect-models',
    'protect-edges',
  ];
  const episode = buildDailyPuzzle(previousUtcDay(day)).episode;
  return defaults[episode % defaults.length] ?? 'protect-dashboards';
}

export async function getProtocolVotes(day: string): Promise<ProtocolVote[]> {
  const counts = await Promise.all(
    PROTOCOLS.map(async (protocol) => ({
      id: protocol.id,
      count: Math.max(0, (await redis.zScore(voteKey(day), protocol.id)) ?? 0),
    }))
  );
  return counts;
}

export async function getSelectedProtocol(
  day: string,
  username: string
): Promise<ProtocolId | null> {
  const value = await redis.hGet(voterKey(day), username);
  return PROTOCOLS.some((protocol) => protocol.id === value)
    ? (value as ProtocolId)
    : null;
}

export async function recordProtocolVote(
  day: string,
  username: string,
  protocol: ProtocolId
): Promise<ProtocolVote[]> {
  const voters = voterKey(day);
  const votes = voteKey(day);
  const previous = await redis.hGet(voters, username);

  if (previous !== protocol) {
    if (isProtocolId(previous)) {
      await redis.zIncrBy(votes, previous, -1);
    }
    await redis.zIncrBy(votes, protocol, 1);
    await redis.hSet(voters, { [username]: protocol });
  }

  await Promise.all([
    redis.expire(voters, DAILY_TTL_SECONDS),
    redis.expire(votes, DAILY_TTL_SECONDS),
  ]);
  return await getProtocolVotes(day);
}

export async function getLeaderboard(day: string): Promise<LeaderboardEntry[]> {
  const entries = await redis.zRange(leaderboardKey(day), 0, 7);
  return entries.map((entry, index) => ({
    rank: index + 1,
    username: entry.member,
    score: Math.round(-entry.score),
  }));
}

export async function getBestScore(day: string, username: string): Promise<number | null> {
  const stored = await redis.zScore(leaderboardKey(day), username);
  return stored === undefined ? null : Math.round(-stored);
}

export async function getCommunityStatus(day: string): Promise<CommunityStatus> {
  const responders = await redis.zCard(respondersKey(day));
  return {
    responders,
    goal: COMMUNITY_GOAL,
    percent: Math.min(100, Math.round((responders / COMMUNITY_GOAL) * 100)),
  };
}

export async function getStreak(username: string): Promise<number> {
  const stored = await redis.get(profileKey(username));
  if (!stored) {
    return 0;
  }
  try {
    return (JSON.parse(stored) as PlayerProfile).streak;
  } catch {
    return 0;
  }
}

export async function saveRun(
  day: string,
  username: string,
  outcome: ShieldOutcome
): Promise<{ streak: number; bestScore: number }> {
  const scores = leaderboardKey(day);
  const responders = respondersKey(day);
  const previousScore = await getBestScore(day, username);
  const streak = await updateStreak(day, username);

  if (previousScore === null || outcome.score > previousScore) {
    await redis.zAdd(scores, { member: username, score: -outcome.score });
  }
  await redis.zAdd(responders, { member: username, score: Date.now() });
  await Promise.all([
    redis.expire(scores, DAILY_TTL_SECONDS),
    redis.expire(responders, DAILY_TTL_SECONDS),
  ]);

  return {
    streak,
    bestScore: Math.max(previousScore ?? 0, outcome.score),
  };
}

export async function purgeUserData(username: string, today: string): Promise<void> {
  const days = Array.from({ length: 11 }, (_, index) => offsetUtcDay(today, index - 9));
  await Promise.all(days.map((day) => purgeUserDay(day, username)));
  await redis.del(profileKey(username));
}

async function purgeUserDay(day: string, username: string): Promise<void> {
  const selectedProtocol = await redis.hGet(voterKey(day), username);
  const selectedVoteScore = isProtocolId(selectedProtocol)
    ? await redis.zScore(voteKey(day), selectedProtocol)
    : undefined;

  const operations: Array<Promise<unknown>> = [
    redis.zRem(leaderboardKey(day), [username]),
    redis.zRem(respondersKey(day), [username]),
    redis.zRem(sharesKey(day), [username]),
    redis.hDel(runsKey(day), [username]),
    redis.hDel(voterKey(day), [username]),
    redis.hDel(shareDraftsKey(day), [username]),
    redis.del(shareLockKey(day, username)),
  ];
  if (
    isProtocolId(selectedProtocol) &&
    selectedVoteScore !== undefined &&
    selectedVoteScore > 0
  ) {
    operations.push(redis.zIncrBy(voteKey(day), selectedProtocol, -1));
  }
  await Promise.all(operations);
}

function offsetUtcDay(day: string, offset: number): string {
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid UTC day');
  }
  return new Date(parsed + offset * 86_400_000).toISOString().slice(0, 10);
}

async function updateStreak(day: string, username: string): Promise<number> {
  const key = profileKey(username);
  const stored = await redis.get(key);
  let profile: PlayerProfile = { lastDay: day, streak: 1 };

  if (stored) {
    try {
      const previous = JSON.parse(stored) as PlayerProfile;
      if (previous.lastDay === day) {
        profile = previous;
      } else if (previous.lastDay === previousUtcDay(day)) {
        profile = { lastDay: day, streak: previous.streak + 1 };
      }
    } catch {
      profile = { lastDay: day, streak: 1 };
    }
  }

  await redis.set(key, JSON.stringify(profile));
  await redis.expire(key, PROFILE_TTL_SECONDS);
  return profile.streak;
}
