import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'github-pages-helper',
        closeBundle() {
          try {
            const distPath = path.resolve(__dirname, 'dist');
            if (fs.existsSync(distPath)) {
              fs.writeFileSync(path.join(distPath, '.nojekyll'), '');
              const indexPath = path.join(distPath, 'index.html');
              if (fs.existsSync(indexPath)) {
                fs.copyFileSync(indexPath, path.join(distPath, '404.html'));
              }
            }
          } catch (e) {
            console.error('Failed to copy 404 or create .nojekyll:', e);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
