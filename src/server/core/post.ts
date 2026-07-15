import { context, reddit } from '@devvit/web/server';
import { buildDailyPuzzle, currentUtcDay } from '../../shared/game';
import { getProtocolForDay, setVerifiedPostHub } from './state';

export async function createDailyPost() {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('A subreddit is required to create the daily post');
  }

  const day = currentUtcDay();
  const protocol = await getProtocolForDay(day);
  const puzzle = buildDailyPuzzle(day, protocol);
  const post = await reddit.submitCustomPost({
    subredditName,
    title: `Blast Radius Daily #${puzzle.episode}: ${puzzle.title}`,
    entry: 'default',
  });

  try {
    const hub = await reddit.submitComment({
      id: post.id,
      runAs: 'APP',
      text: [
        `## 🛡️ Daily incident command — ${puzzle.day}`,
        `Everyone gets the same **${puzzle.system}** dependency map today. Play first, then compare containment plans below.`,
        'Score sharing is optional and always happens through a separate, clearly labeled button.',
      ].join('\n\n'),
    });
    await hub.distinguish(true);
    const verifiedHub = await reddit.getCommentById(hub.id);
    if (!verifiedHub.isStickied() || verifiedHub.postId !== post.id) {
      throw new Error('The command comment could not be verified as sticky');
    }
    await setVerifiedPostHub(post.id, hub.id);
  } catch (error) {
    console.warn(`Score sharing disabled: ${String(error)}`);
  }

  return post;
}
