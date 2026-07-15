import { Hono } from 'hono';
import type {
  OnCommentDeleteRequest,
  OnPostDeleteRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { createDailyPost } from '../core/post';
import {
  clearVerifiedPostHub,
  getVerifiedPostHub,
} from '../core/state';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createDailyPost();
    return c.json<TriggerResponse>({
      status: 'success',
      message: `Created Blast Radius Daily post ${post.id}`,
    });
  } catch (error) {
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create daily post',
      },
      400
    );
  }
});

triggers.post('/on-post-delete', async (c) => {
  const request = await c.req.json<OnPostDeleteRequest>();
  await clearVerifiedPostHub(request.postId);
  return c.json<TriggerResponse>({});
});

triggers.post('/on-comment-delete', async (c) => {
  const request = await c.req.json<OnCommentDeleteRequest>();
  const hubId = await getVerifiedPostHub(request.postId);
  if (hubId === request.commentId) {
    await clearVerifiedPostHub(request.postId);
  }
  return c.json<TriggerResponse>({});
});
