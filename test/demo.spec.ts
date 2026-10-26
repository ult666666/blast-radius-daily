import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildDailyPuzzle, evaluateShielding } from '../src/shared/game';

const entry = pathToFileURL(
  path.resolve('dist-demo/blast-radius-demo.html'),
).href;
test('standalone artifact includes its licenses, self-contained resources and matching digest', async () => {
  const html = await fs.readFile('dist-demo/blast-radius-demo.html', 'utf8');
  const manifest = JSON.parse(
    await fs.readFile('dist-demo/manifest.json', 'utf8'),
  ) as { sha256: string; bytes: number };
  expect(createHash('sha256').update(html).digest('hex')).toBe(manifest.sha256);
  expect(Buffer.byteLength(html)).toBe(manifest.bytes);
  expect(html).toContain('BSD 3-Clause License');
  expect(html).toContain('The MIT License (MIT)');
  expect(html).toContain('Phaser Studio Inc.');
  for (const author of [
    'Mapbox',
    'Vladimir Agafonkin',
    'Arnout Kazemier',
    'Liam Brummitt',
    'Stefan Hedman',
    'Angry Bytes',
    'Matt DesLauriers',
  ])
    expect(html).toContain(author);
  expect(html).toContain('ISC License');
  const runtime = Buffer.from(
    html.match(/src="data:text\/javascript;base64,([^"]+)"/)![1]!,
    'base64',
  ).toString();
  expect(runtime).not.toContain('_rvfcpolyfillmap');
  expect(html).toContain("connect-src 'none'");
  expect(html).not.toMatch(
    /(?:src|href)="(?:\.\/|\/src|https?:).*?(?:\.js|\.css)/,
  );
});
async function clickCanvas(page: Page, x: number, y: number) {
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Game canvas missing');
  await page.mouse.click(
    box.x + (x * box.width) / 1100,
    box.y + (y * box.height) / 720,
  );
}
test('offline canvas journey uses the real engine, transfers votes and deletes local state', async ({
  page,
  context,
}, info) => {
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
  await page.evaluate(() => localStorage.setItem('unrelated-canary', 'keep'));
  const puzzle = buildDailyPuzzle('2026-07-14', 'protect-models');
  for (const id of ['identity', 'pricing']) {
    const node = puzzle.nodes.find((n) => n.id === id)!;
    await clickCanvas(page, node.x, node.y);
  }
  await expect(page.getByLabel('Local selected breakers')).toHaveText(
    'identity, pricing',
  );
  const overBudget = puzzle.nodes.find((n) => n.id === 'geo')!;
  await clickCanvas(page, overBudget.x, overBudget.y);
  await expect(page.getByLabel('Local selected breakers')).toHaveText(
    'identity, pricing',
  );
  await info.attach('selected-board', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await clickCanvas(page, 941, 653);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Tracing');
  await info.attach('cascade', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Result ready');
  const expected = evaluateShielding(puzzle, ['identity', 'pricing']);
  await expect(page.getByLabel('Local score')).toHaveText(
    String(expected.score),
  );
  await expect(page.getByLabel('Local responders')).toHaveText(
    '19 / 25 (synthetic)',
  );
  await clickCanvas(page, 884, 493);
  await expect(page.getByLabel('Local vote')).toHaveText('protect-dashboards');
  await clickCanvas(page, 884, 493);
  await expect(page.getByLabel('Synthetic vote totals')).toHaveText('8, 11, 5');
  await clickCanvas(page, 884, 544);
  await expect(page.getByLabel('Synthetic vote totals')).toHaveText('7, 12, 5');
  await info.attach('result-and-vote', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await clickCanvas(page, 215, 650); // Locked score comment never submits anything.
  await clickCanvas(page, 510, 650);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await clickCanvas(page, 941, 653);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Result ready');
  await expect(page.getByLabel('Local score')).toHaveText('0');
  await expect(page.getByLabel('Local best score')).toHaveText(
    String(expected.score),
  );
  await expect(page.getByLabel('Local responders')).toHaveText(
    '19 / 25 (synthetic)',
  );
  await clickCanvas(page, 884, 681);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Confirm deletion');
  await expect(page.getByLabel('Local best score')).toHaveText(
    String(expected.score),
  );
  await clickCanvas(page, 884, 681);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Local game data deleted');
  await expect(page.getByLabel('Local best score')).toHaveText('None');
  await expect(page.getByLabel('Local streak')).toHaveText('0');
  await expect(page.getByLabel('Local vote')).toHaveText('None');
  await expect(page.getByLabel('Local responders')).toHaveText(
    '18 / 25 (synthetic)',
  );
  await info.attach('deleted', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await clickCanvas(page, 510, 650);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await expect(page.getByLabel('Local best score')).toHaveText('None');
  await expect(page.getByLabel('Local streak')).toHaveText('0');
  const freshNode = puzzle.nodes.find((node) => node.id === 'identity')!;
  await clickCanvas(page, freshNode.x, freshNode.y);
  await expect(page.getByLabel('Local selected breakers')).toHaveText(
    'identity',
  );
  await clickCanvas(page, 941, 653);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Tracing');
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Result ready');
  await expect(page.getByLabel('Local best score')).toHaveText(
    String(evaluateShielding(puzzle, ['identity']).score),
  );
  await expect(page.getByLabel('Local streak')).toHaveText('1');
  await page.reload();
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await expect(page.getByLabel('Local streak')).toHaveText('3');
  expect(
    await page.evaluate(() => localStorage.getItem('unrelated-canary')),
  ).toBe('keep');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    'unrelated-canary',
  ]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});
test('native day selection works offline in a landscape viewport', async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(entry);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await page.getByLabel('Incident day (UTC)').fill('2026-07-15');
  await page.getByRole('button', { name: 'Load day' }).click();
  await expect(page.getByLabel('Local incident day')).toHaveText('2026-07-15');
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Map ready');
  await clickCanvas(page, 941, 653);
  await expect(
    page.getByRole('status', { name: 'Local game status' }),
  ).toContainText('Result ready');
  await expect(page.getByLabel('Local score')).toHaveText('0');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
