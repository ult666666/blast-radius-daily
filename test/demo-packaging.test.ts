import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  offlinePhaserSource,
  retainedPhaserCredits,
} from '../scripts/phaser-demo';

test('pinned standalone Phaser keeps embedded notices and excludes unused video polyfill', async () => {
  const source = await fs.readFile(
    'node_modules/phaser/dist/phaser.esm.js',
    'utf8',
  );
  const runtime = offlinePhaserSource(source);
  assert.ok(source.includes('_rvfcpolyfillmap'));
  assert.ok(!runtime.includes('_rvfcpolyfillmap'));
  assert.ok(runtime.includes('requestVideoFrameCallback'));
  const credits = retainedPhaserCredits(source);
  for (const text of [
    'ISC License',
    'Mapbox',
    'Vladimir Agafonkin',
    'Stefan Hedman',
    'Angry Bytes',
    'mattdesl/klasse',
    'Minko Gechev',
    'Gavin Kistner',
    'Paul Bourke',
    'Niklas von Hertzen',
    'RoboWhale',
    'Stefan Gustavson',
    'Ian McEwan',
    'CodeAndWeb',
    'Photon Storm',
  ])
    assert.ok(credits.includes(text), `Missing embedded credit: ${text}`);
});
test('standalone dependency changes require a fresh notice and exclusion audit', () => {
  assert.throws(() => offlinePhaserSource('changed source'), /audit/i);
  assert.throws(() => retainedPhaserCredits('changed source'), /audit/i);
});
