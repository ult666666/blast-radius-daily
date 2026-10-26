import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { offlinePhaserSource } from './scripts/phaser-demo';
export default defineConfig({
  plugins: [
    {
      name: 'offline-phaser-without-unused-video-polyfill',
      enforce: 'pre',
      async load(id) {
        if (id.replaceAll('\\', '/').endsWith('/phaser/dist/phaser.esm.js'))
          return offlinePhaserSource(await fs.readFile(id, 'utf8'));
      },
    },
  ],
  define: { 'import.meta.env.VITE_OFFLINE_DEMO': JSON.stringify('true') },
  build: {
    write: false,
    copyPublicDir: false,
    sourcemap: false,
    license: { fileName: 'licenses.txt' },
    lib: {
      entry: fileURLToPath(new URL('./src/client/demo.ts', import.meta.url)),
      name: 'BlastOfflineDemo',
      formats: ['iife'],
      fileName: 'demo',
      cssFileName: 'demo',
    },
    chunkSizeWarningLimit: 3000,
  },
});
