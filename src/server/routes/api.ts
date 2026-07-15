import { Hono, type Context } from 'hono';
import { context, reddit, settings } from '@devvit/web/server';
import type {
  ApiError,
  DeleteDataResponse,
  ScoreRequest,
  ScoreResponse,
  SessionResponse,
  ShareAvailability,
  ShareRequest,
  ShareResponse,
  VoteRequest,
  VoteResponse,
} from '../../shared/api';
import {
  buildDailyPuzzle,
  buildShareComment,
  currentUtcDay,
  evaluateShielding,
  isProtocolId,
  nextUtcDay,
} from '../../shared/game';
import {
  acquireShareLock,
  createShareDraft,
  deleteShareDraft,
  getBestScore,
  getCommunityStatus,
  getLeaderboard,
  getProtocolForDay,
  getProtocolVotes,
  getSelectedProtocol,
  getStreak,
  getShareDraft,
  getVerifiedPostHub,
  hasShared,
  markSharePending,
  purgeUserData,
  recordProtocolVote,
  releaseShareLock,
  saveRun,
} from '../core/state';

export const api = new Hono();

api.get('/session', async (c) => {
  try {
    const username = await requireUsername();
    const day = currentUtcDay();
    const tomorrow = nextUtcDay(day);
    const protocol = await getProtocolForDay(day);
    const [leaderboard, community, streak, bestScore, selectedProtocol, protocolVotes] =
      await Promise.all([
        getLeaderboard(day),
        getCommunityStatus(day),
        getStreak(username),
        getBestScore(day, username),
        getSelectedProtocol(tomorrow, username),
        getProtocolVotes(tomorrow),
      ]);

    return c.json<SessionResponse>({
      type: 'session',
      username,
      puzzle: buildDailyPuzzle(day, protocol),
      leaderboard,
      community,
      streak,
      bestScore,
      selectedProtocol,
      protocolVotes,
    });
  } catch (error) {
    return apiError(c, error);
  }
});

api.post('/score', async (c) => {
  try {
    const username = await requireUsername();
    const request = await c.req.json<ScoreRequest>();
    if (!Array.isArray(request.shieldIds) || request.shieldIds.some((id) => typeof id !== 'string')) {
      throw new Error('Invalid circuit breaker selection');
    }

    const day = currentUtcDay();
    const protocol = await getProtocolForDay(day);
    const puzzle = buildDailyPuzzle(day, protocol);
    const outcome = evaluateShielding(puzzle, request.shieldIds);
    const saved = await saveRun(day, username, outcome);
    const commentPreview = buildShareComment(username, puzzle, outcome, saved.streak);
    const share = await prepareShare(day, username, commentPreview);
    const [leaderboard, community] = await Promise.all([
      getLeaderboard(day),
      getCommunityStatus(day),
    ]);

    return c.json<ScoreResponse>({
      type: 'score',
      outcome,
      leaderboard,
      community,
      streak: saved.streak,
      bestScore: saved.bestScore,
      commentPreview,
      share,
    });
  } catch (error) {
    return apiError(c, error);
  }
});

api.post('/vote', async (c) => {
  try {
    const username = await requireUsername();
    const request = await c.req.json<VoteRequest>();
    if (!isProtocolId(request.protocol)) {
      throw new Error('Unknown community protocol');
    }
    const tomorrow = nextUtcDay(currentUtcDay());
    const protocolVotes = await recordProtocolVote(tomorrow, username, request.protocol);
    return c.json<VoteResponse>({
      type: 'vote',
      selectedProtocol: request.protocol,
      protocolVotes,
    });
  } catch (error) {
    return apiError(c, error);
  }
});

api.post('/share', async (c) => {
  try {
    if (!(await isScoreSharingApproved())) {
      throw new Error('Score sharing is disabled until Reddit approves this app version');
    }
    const username = await requireUsername();
    const { postId } = context;
    if (!postId) {
      throw new Error('Open the game from its Reddit post to share a score');
    }
    const request = await c.req.json<ShareRequest>();
    if (
      typeof request.token !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(request.token)
    ) {
      throw new Error('The approved score-share draft is invalid');
    }
    const day = currentUtcDay();
    if (await hasShared(day, username)) {
      return c.json<ShareResponse>({
        type: 'share',
        status: 'already-posted',
        commentId: null,
      });
    }

    const draft = await getShareDraft(day, username, request.token);
    if (
      !draft ||
      draft.username !== username ||
      draft.postId !== postId ||
      !isCommentId(draft.hubId)
    ) {
      throw new Error('This score-share draft is missing, expired, or belongs to another run');
    }
    if (!(await acquireShareLock(day, username, request.token))) {
      if (await hasShared(day, username)) {
        return c.json<ShareResponse>({
          type: 'share',
          status: 'already-posted',
          commentId: null,
        });
      }
      throw new Error('A score-share request is already in progress');
    }

    let shareAttemptRecorded = false;
    try {
      if (await hasShared(day, username)) {
        return c.json<ShareResponse>({
          type: 'share',
          status: 'already-posted',
          commentId: null,
        });
      }
      const hub = await reddit.getCommentById(draft.hubId);
      if (!hub.isStickied() || hub.postId !== postId) {
        throw new Error('Score sharing requires the verified sticky command comment');
      }

      await markSharePending(day, username);
      shareAttemptRecorded = true;
      const comment = await reddit.submitComment({
        id: draft.hubId,
        runAs: 'USER',
        text: draft.comment,
      });
      try {
        await deleteShareDraft(day, username, request.token);
      } catch (error) {
        console.warn(`Could not remove a used score-share draft: ${String(error)}`);
      }
      return c.json<ShareResponse>({
        type: 'share',
        status: 'posted',
        commentId: comment.id,
      });
    } catch (error) {
      // Once Reddit submission begins, retain the marker to prevent an ambiguous
      // network failure from producing a duplicate comment on retry.
      if (!shareAttemptRecorded) {
        await releaseShareLock(day, username, request.token);
      }
      throw error;
    }
  } catch (error) {
    return apiError(c, error);
  }
});

api.delete('/data', async (c) => {
  try {
    const username = await requireUsername();
    await purgeUserData(username, currentUtcDay());
    return c.json<DeleteDataResponse>({ type: 'delete-data', status: 'deleted' });
  } catch (error) {
    return apiError(c, error);
  }
});

async function prepareShare(
  day: string,
  username: string,
  comment: string
): Promise<ShareAvailability> {
  if (!(await isScoreSharingApproved())) {
    return {
      status: 'disabled',
      token: null,
      message: 'Score comments stay off until Reddit approves this app version.',
    };
  }
  const { postId } = context;
  if (!postId) {
    return {
      status: 'disabled',
      token: null,
      message: 'Score comments are unavailable outside the original Reddit post.',
    };
  }
  const hubId = await getVerifiedPostHub(postId);
  if (!hubId || !isCommentId(hubId)) {
    return {
      status: 'disabled',
      token: null,
      message: 'Score comments require a verified sticky command comment.',
    };
  }
  const token = await createShareDraft(day, { username, postId, hubId, comment });
  return {
    status: 'ready',
    token,
    message: 'Pressing the button posts exactly the text above, once, as your account.',
  };
}

async function isScoreSharingApproved(): Promise<boolean> {
  try {
    return (await settings.get<boolean>('score_sharing_approved')) === true;
  } catch (error) {
    console.warn(`Could not read score-sharing approval setting: ${String(error)}`);
    return false;
  }
}

async function requireUsername(): Promise<string> {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    throw new Error('Sign in to Reddit to play today’s incident');
  }
  return username;
}

function apiError(c: Context, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error(message);
  return c.json<ApiError>({ status: 'error', message }, 400);
}

function isCommentId(value: string): value is `t1_${string}` {
  return value.startsWith('t1_');
}
