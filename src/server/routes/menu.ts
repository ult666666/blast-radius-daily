import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { createDailyPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createDailyPost();
    return c.json<UiResponse>({
      navigateTo: post.url,
    });
  } catch (error) {
    return c.json<UiResponse>(
      {
        showToast: error instanceof Error ? error.message : 'Failed to create the daily post',
      },
      400
    );
  }
});
