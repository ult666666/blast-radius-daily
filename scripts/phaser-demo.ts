import { createHash } from 'node:crypto';

// The prebundle contains dependencies invisible to Vite's package collector.
// Updating Phaser requires reviewing these notices and the excluded module.
const PHASER_ESM_SHA256 =
  'df50bc49e7856363b625fdf4f2c4e2e577cfc1644690c026c3610c594aff372f';
function audited(source: string): void {
  if (createHash('sha256').update(source).digest('hex') !== PHASER_ESM_SHA256)
    throw new Error(
      'Phaser source changed: audit bundled notices and video exclusion',
    );
}

export function offlinePhaserSource(source: string): string {
  audited(source);
  // Video is unused by this game. Exclude only this pinned webpack module:
  // its upstream attribution has different licensing from Phaser's MIT header.
  const start = source.indexOf('/***/ 63595\n() {\n');
  const end = source.indexOf('\n\n/***/ },', start);
  if (start < 0 || end < 0)
    throw new Error('Phaser video module changed: audit exclusion');
  return source.slice(0, start) + '/***/ 63595\n() {\n' + source.slice(end);
}

export function retainedPhaserCredits(source: string): string {
  audited(source);
  // Keep complete copyright/license/author/source-reference blocks, not just
  // matching lines; some contain full BSD/ISC terms. Preserve every standalone
  // line comment too, including the source credits inside embedded components.
  const blocks = (source.match(/\/\*[\s\S]*?\*\//g) || []).filter((block) =>
    /copyright|licen[cs]e|https?:\/\/|@author|taken from|based on|adapted from/i.test(
      block,
    ),
  );
  const lines = source.match(/^\s*\/\/.*$/gm) || [];
  return [...new Set([...blocks, ...lines])].join('\n\n');
}
