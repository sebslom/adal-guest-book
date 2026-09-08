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
        name: 'pdf-and-main-handler',
        buildStart() {
          try {
            const rootFiles = fs.readdirSync(__dirname);
            const publicDir = path.resolve(__dirname, 'public');
            const publicMainDir = path.resolve(__dirname, 'public', 'main');
            if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
            if (!fs.existsSync(publicMainDir)) fs.mkdirSync(publicMainDir, { recursive: true });

            for (const file of rootFiles) {
              if (file.endsWith('.pdf')) {
                fs.copyFileSync(path.resolve(__dirname, file), path.resolve(publicDir, file));
                fs.copyFileSync(path.resolve(__dirname, file), path.resolve(publicMainDir, file));
              }
            }
          } catch (e) {
            console.error('buildStart copy pdf error:', e);
          }
        },
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
            // Copy main/ folder and any root PDF into dist/ and dist/main/
            const distMain = path.resolve(__dirname, 'dist', 'main');
            if (!fs.existsSync(distMain)) fs.mkdirSync(distMain, { recursive: true });

            const rootFiles = fs.readdirSync(__dirname);
            for (const file of rootFiles) {
              if (file.endsWith('.pdf')) {
                fs.copyFileSync(path.resolve(__dirname, file), path.resolve(distPath, file));
                fs.copyFileSync(path.resolve(__dirname, file), path.resolve(distMain, file));
              }
            }

            const mainDir = path.resolve(__dirname, 'main');
            if (fs.existsSync(mainDir)) {
              const files = fs.readdirSync(mainDir);
              for (const f of files) {
                const srcPath = path.join(mainDir, f);
                if (fs.statSync(srcPath).isFile()) {
                  fs.copyFileSync(srcPath, path.join(distMain, f));
                }
              }
            }
          } catch (e) {
            console.error('Failed to copy 404 or PDF to dist:', e);
          }
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url) {
              const urlClean = req.url.split('?')[0];
              // Check if requesting main/ or a root PDF file directly
              const candidates: string[] = [];
              if (urlClean.startsWith('/main/') || urlClean.startsWith('./main/')) {
                const subPath = decodeURIComponent(urlClean.replace(/^\.?\/main\//, ''));
                candidates.push(path.resolve(__dirname, 'main', subPath));
                candidates.push(path.resolve(__dirname, subPath));
              } else if (urlClean.endsWith('.pdf')) {
                const subPath = decodeURIComponent(urlClean.replace(/^\.?\//, ''));
                candidates.push(path.resolve(__dirname, subPath));
                candidates.push(path.resolve(__dirname, 'main', subPath));
                candidates.push(path.resolve(__dirname, 'public', subPath));
              }

              for (const filePath of candidates) {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                  res.setHeader('Content-Type', 'application/pdf');
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
