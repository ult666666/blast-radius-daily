import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { build } from 'vite';
import config from '../vite.demo.config';

const root = fileURLToPath(new URL('../', import.meta.url));
const results = await build({ ...config, configFile: false, root });
const bundles = Array.isArray(results) ? results : [results];
const output = bundles.flatMap((bundle) =>
  'output' in bundle ? bundle.output : [],
);
const chunks = output.filter((item) => item.type === 'chunk');
if (
  chunks.length !== 1 ||
  chunks[0]!.imports.length ||
  chunks[0]!.dynamicImports.length
)
  throw new Error(
    'Standalone demo must have one self-contained runtime bundle',
  );
const assetText = (name: string) => {
  const asset = output.find(
    (item) => item.type === 'asset' && item.fileName === name,
  );
  if (!asset || asset.type !== 'asset')
    throw new Error(`Missing bundled ${name}`);
  return typeof asset.source === 'string'
    ? asset.source
    : Buffer.from(asset.source).toString('utf8');
};
let sourceCommit = 'unversioned',
  sourceDirty: boolean | null = null;
try {
  const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  if ((await fs.realpath(gitRoot)) !== (await fs.realpath(root)))
    throw new Error('Source directory is not this Git repository root');
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  sourceDirty =
    execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
      cwd: root,
      encoding: 'utf8',
    }).trim().length > 0;
} catch {
  /* A source ZIP can build too; it does not claim Git provenance. */
}
const css = assetText('demo.css');
const licenses =
  (await fs.readFile(path.join(root, 'LICENSE'), 'utf8')) +
  '\n\nBundled dependencies\n\n' +
  assetText('licenses.txt');
const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const template = await fs.readFile(
  path.join(root, 'src/client/demo.html'),
  'utf8',
);
const html = template
  .replaceAll('{{SOURCE_COMMIT}}', escape(sourceCommit))
  .replace(
    '<!-- DEMO_STYLE -->',
    `<link rel="stylesheet" href="data:text/css;base64,${Buffer.from(css).toString('base64')}">`,
  )
  .replace(
    '<!-- DEMO_SCRIPT -->',
    `<script defer src="data:text/javascript;base64,${Buffer.from(chunks[0]!.code).toString('base64')}"></script>`,
  )
  .replace('<!-- DEMO_LICENSES -->', escape(licenses));
const destination = path.join(root, 'dist-demo');
await fs.mkdir(destination, { recursive: true });
const filename = 'blast-radius-demo.html';
if ((await fs.lstat(destination)).isSymbolicLink())
  throw new Error('Refusing a symlinked demo output');
async function writeArtifact(name: string, text: string) {
  const targetPath = path.join(destination, name);
  if ((await fs.lstat(targetPath).catch(() => null))?.isSymbolicLink())
    throw new Error('Refusing a symlinked demo output');
  const temporaryPath = path.join(destination, `.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporaryPath, text, { flag: 'wx' });
    await fs.rename(temporaryPath, targetPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}
await writeArtifact(filename, html);
const manifest = {
  schemaVersion: 1,
  sourceCommit,
  sourceDirty,
  filename,
  sha256: createHash('sha256').update(html).digest('hex'),
  bytes: Buffer.byteLength(html),
  scope: 'synthetic-in-memory-offline-gameplay',
};
await writeArtifact('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest));
