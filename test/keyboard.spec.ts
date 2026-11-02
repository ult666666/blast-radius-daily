import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildDailyPuzzle, evaluateShielding } from '../src/shared/game';
import { decodePng } from './png';

// Keyboard-only play: no test here moves or clicks the mouse. The offline demo runs from
// file:// with the network off; the local harness is the Devvit game page in demo mode.
const entry = pathToFileURL(
  path.resolve('dist-demo/blast-radius-demo.html'),
).href;
const harness = '/src/client/game.html?demo=1&day=2026-07-14';
const axeSource = await fs.readFile(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);
const puzzle = buildDailyPuzzle('2026-07-14', 'protect-models');
const label = (id: string) =>
  puzzle.nodes.find((node) => node.id === id)!.label;
const announcer = (page: Page) => page.locator('#blast-announcer');
const option = (page: Page, id: string) =>
  page.locator(`[role=option][data-node="${id}"]`);
const focusedNode = (page: Page) => page.locator('[role=option]:focus');

async function tabIntoMap(page: Page) {
  for (let i = 0; i < 12; i++) {
    if ((await focusedNode(page).count()) === 1) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Tab never reached the map');
}

/** Near-white pixels in a strip on the left edge of a node's focus ring. */
async function ringPixels(page: Page, id: string): Promise<number> {
  const node = puzzle.nodes.find((n) => n.id === id)!;
  const box = (await page.locator('canvas').boundingBox())!;
  const [scrollX, scrollY] = await page.evaluate(() => [
    window.scrollX,
    window.scrollY,
  ]);
  const scale = box.width / 1100;
  // Page coordinates, so the check needs no scrolling (and no mouse).
  const shot = await page.screenshot({
    fullPage: true,
    clip: {
      x: scrollX! + box.x + (node.x - 83) * scale,
      y: scrollY! + box.y + (node.y - 10) * scale,
      width: 12 * scale,
      height: 20 * scale,
    },
  });
  const { rgba } = decodePng(shot);
  let white = 0;
  for (let i = 0; i < rgba.length; i += 4)
    if (rgba[i]! >= 235 && rgba[i + 1]! >= 235 && rgba[i + 2]! >= 235) white++;
  return white;
}

// The Devvit game page keeps its existing pinch-zoom lock (see the README limits), so the
// meta-viewport rule is skipped there and only there.
async function axe(page: Page, skip: string[] = []) {
  await page.evaluate(axeSource);
  return page.evaluate(async (skip) => {
    const run = (
      window as unknown as {
        axe: {
          run: (
            c: Document,
            o: object,
          ) => Promise<{
            violations: Array<{
              id: string;
              nodes: Array<{ target: string[] }>;
            }>;
          }>;
        };
      }
    ).axe.run;
    const result = await run(document, {
      runOnly: {
        type: 'tag',
        values: [
          'wcag2a',
          'wcag2aa',
          'wcag21a',
          'wcag21aa',
          'wcag22aa',
          'best-practice',
        ],
      },
      rules: Object.fromEntries(skip.map((id) => [id, { enabled: false }])),
    });
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
  }, skip);
}

/** Place breakers on identity and pricing by keyboard, check refusals, focus and budget. */
async function placeTwoBreakers(page: Page) {
  await tabIntoMap(page);
  await expect(focusedNode(page)).toHaveAttribute('data-node', 'source');
  await page.keyboard.press('Space');
  await expect(announcer(page)).toHaveText(
    `${label('source')} cannot hold a circuit breaker.`,
  );
  await page.keyboard.press('ArrowRight');
  await expect(focusedNode(page)).toHaveAttribute('data-node', 'pricing');
  await page.keyboard.press('ArrowUp');
  await expect(focusedNode(page)).toHaveAttribute('data-node', 'identity');
  await page.keyboard.press('Space');
  await expect(option(page, 'identity')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(announcer(page)).toHaveText(
    `Circuit breaker placed on ${label('identity')}. 1 of 2 tokens left.`,
  );
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(announcer(page)).toHaveText(
    `Circuit breaker placed on ${label('pricing')}. 0 of 2 tokens left.`,
  );
  await page.keyboard.press('ArrowDown');
  await expect(focusedNode(page)).toHaveAttribute('data-node', 'geo');
  await page.keyboard.press('Space');
  await expect(announcer(page)).toHaveText(
    `Not enough tokens for ${label('geo')}, which costs 1. 0 of 2 tokens left. Remove a breaker first.`,
  );
  await expect(option(page, 'geo')).toHaveAttribute('aria-selected', 'false');
  await expect(option(page, 'pricing')).toContainText(
    'Circuit breaker placed.',
  );
}

test('keyboard only: a full offline incident, from the first Tab to a vote and a replay', async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  const requests: string[] = [],
    errors: string[] = [];
  page.on('request', (request) => {
    if (!/^(file:|data:|blob:)/.test(request.url()))
      requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(entry);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await expect(page.locator('#game-container')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await placeTwoBreakers(page);
  await expect(page.getByLabel('Local selected breakers')).toHaveText(
    'identity, pricing',
  );
  // The focus ring is drawn on the canvas and follows keyboard focus.
  await expect.poll(() => ringPixels(page, 'geo')).toBeGreaterThan(20);
  expect(await ringPixels(page, 'pricing')).toBe(0);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => ringPixels(page, 'pricing')).toBeGreaterThan(20);
  expect(await ringPixels(page, 'geo')).toBe(0);
  await page.keyboard.press('d');
  await expect(page.locator('#blast-a11y')).toHaveAttribute(
    'data-motion',
    'full',
  );
  await expect(announcer(page)).toContainText('Cascade complete');
  const expected = evaluateShielding(puzzle, ['identity', 'pricing']);
  await expect(announcer(page)).toContainText(
    `${expected.score.toLocaleString('en-US')} points.`,
  );
  await expect(page.getByLabel('Local score')).toHaveText(
    String(expected.score),
  );
  await expect(page.locator('#blast-a11y-title')).toBeFocused();
  await expect(page.locator('#blast-a11y')).toContainText(
    `Critical endpoints saved: ${expected.savedCriticalIds.length}.`,
  );
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText(
    'Protect dashboards: 7 votes',
  );
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Local vote')).toHaveText('protect-dashboards');
  await expect(page.locator(':focus')).toHaveAttribute('aria-pressed', 'true');
  await expect(announcer(page)).toHaveText(
    'Local vote recorded. No community data was changed.',
  );
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Replay the map');
  await page.keyboard.press('Enter');
  await expect(focusedNode(page)).toHaveAttribute('data-node', 'source');
  // No trap: Tab leaves the list for the Trigger button, then leaves the game.
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText(
    'Trigger the change. 2 of 2 tokens left.',
  );
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('#blast-a11y')),
  ).toBe(false);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(':focus')).toHaveText(
    'Trigger the change. 2 of 2 tokens left.',
  );
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('reduced motion: the cascade shows its end state at once and still announces the score', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.setOffline(true);
  const page = await context.newPage();
  await page.goto(entry);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await tabIntoMap(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('d');
  // No animation frame is needed: the final states are applied in the key handler.
  await expect(page.locator('#blast-a11y')).toHaveAttribute(
    'data-motion',
    'reduced',
  );
  expect(await option(page, 'pricing').textContent()).toContain(
    'Saved from the cascade.',
  );
  expect(await option(page, 'identity').textContent()).toContain(
    'Failed in the cascade.',
  );
  const expected = evaluateShielding(puzzle, ['pricing']);
  await expect(announcer(page)).toContainText(
    `${expected.score.toLocaleString('en-US')} points.`,
  );
  await expect(page.getByLabel('Local score')).toHaveText(
    String(expected.score),
  );
  await context.close();
});

test('reduced motion: the launch screen in the feed stops its pulsing status dot', async ({
  page,
}) => {
  await page.goto('/src/client/splash.html');
  const dot = page.locator('.status-dot');
  const animations = () =>
    dot.evaluate((element) => element.getAnimations().length);
  // Without a preference the dot pulses, so the check below can see an animation.
  expect(await animations()).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await animations()).toBe(0);
});

test('axe finds no violations on the offline board or result, and the local harness plays by keyboard', async ({
  page,
}) => {
  await page.goto(entry);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  expect(await axe(page)).toEqual([]);
  await tabIntoMap(page);
  await page.keyboard.press('d');
  await expect(
    page.locator('#blast-a11y[data-screen="result"]'),
  ).toBeAttached();
  expect(await axe(page)).toEqual([]);

  await page.goto(harness);
  await expect(page.locator('[role=listbox]')).toBeAttached({ timeout: 60000 });
  await placeTwoBreakers(page);
  expect(await axe(page, ['meta-viewport'])).toEqual([]);
  await page.keyboard.press('d');
  const expected = evaluateShielding(puzzle, ['identity', 'pricing']);
  await expect(announcer(page)).toContainText(
    `${expected.score.toLocaleString('en-US')} points.`,
  );
  await expect(page.locator('#blast-a11y-title')).toBeFocused();
  expect(await axe(page, ['meta-viewport'])).toEqual([]);
});
