import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, readdirSync, mkdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

function safeCopyPublicDir(): import('vite').Plugin {
  return {
    name: 'safe-copy-public-dir',
    closeBundle() {
      const publicDir = resolve(__dirname, 'public');
      const outDir = resolve(__dirname, 'dist');
      function copyDir(src: string, dest: string) {
        try { mkdirSync(dest, { recursive: true }); } catch {}
        let entries: string[] = [];
        try { entries = readdirSync(src); } catch { return; }
        for (const entry of entries) {
          const srcPath = join(src, entry);
          const destPath = join(dest, entry);
          try {
            const stat = statSync(srcPath);
            if (stat.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          } catch {
            // skip inaccessible files
          }
        }
      }
      copyDir(publicDir, outDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), safeCopyPublicDir()],
  build: {
    copyPublicDir: false,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
