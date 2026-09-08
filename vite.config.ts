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
            // Copy main/ folder into dist/main/ if exists
            const mainDir = path.resolve(__dirname, 'main');
            const distMain = path.resolve(__dirname, 'dist', 'main');
            if (fs.existsSync(mainDir)) {
              if (!fs.existsSync(distMain)) fs.mkdirSync(distMain, { recursive: true });
              const files = fs.readdirSync(mainDir);
              for (const f of files) {
                const srcPath = path.join(mainDir, f);
                if (fs.statSync(srcPath).isFile()) {
                  fs.copyFileSync(srcPath, path.join(distMain, f));
                }
              }
            }
          } catch (e) {
            console.error('Failed to copy 404 or create .nojekyll or copy main folder:', e);
          }
        },
      },
      {
        name: 'serve-main-folder',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url) {
              const urlClean = req.url.split('?')[0];
              if (urlClean.startsWith('/main/') || urlClean.startsWith('./main/')) {
                const subPath = decodeURIComponent(urlClean.replace(/^\.?\/main\//, ''));
                const filePath = path.resolve(__dirname, 'main', subPath);
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                  res.setHeader('Content-Type', filePath.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
                  fs.createReadStream(filePath).pipe(res);
                  return;
                }
              }
            }
            next();
          });
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
