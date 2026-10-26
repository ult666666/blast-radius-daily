import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
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
