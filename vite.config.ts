import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function buildMetadataPlugin(): Plugin {
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  };
  const commit = process.env.COMMIT_REF
    || process.env.GITHUB_SHA
    || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const metadata = JSON.stringify({
    name: packageJson.name,
    version: packageJson.version,
    commit,
    builtAt: new Date().toISOString(),
  }, null, 2);

  return {
    name: 'hubora-build-metadata',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-meta.json', source: metadata });
    },
  };
}

export default defineConfig(() => ({
    plugins: [
      react(), 
      tailwindcss(),
      buildMetadataPlugin(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        devOptions: { enabled: process.env.VITE_ENABLE_PWA === 'true' },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Hubora',
          short_name: 'Hubora',
          description: 'Seu hub pessoal de cultura pop para descobrir, escolher, acompanhar, ler e assistir.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'browser'],
          start_url: '/',
          icons: [
            { src: '/icons/hubora-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/hubora-512.png', sizes: '512x512', type: 'image/png' }
          ],
          shortcuts: [
            { name: 'Continuar', short_name: 'Continuar', url: '/library?status=consuming', icons: [{ src: '/icons/hubora-192.png', sizes: '192x192' }] },
            { name: 'Radar', short_name: 'Radar', url: '/radar', icons: [{ src: '/icons/hubora-192.png', sizes: '192x192' }] },
            { name: 'Escolha de hoje', short_name: 'Escolha', url: '/?quickPick=1', icons: [{ src: '/icons/hubora-192.png', sizes: '192x192' }] }
          ],
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
              files: [{ name: 'media', accept: ['image/*', '.png', '.jpg', '.jpeg', '.webp'] }]
            }
          }
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
            'vendor-cloud': ['@supabase/supabase-js'],
            'vendor-storage': ['dexie', 'idb', 'idb-keyval'],
            'vendor-query': [
              '@tanstack/react-query',
              '@tanstack/react-query-persist-client',
              '@tanstack/query-async-storage-persister',
              '@tanstack/query-sync-storage-persister',
            ],
            'vendor-content': ['react-markdown', 'remark-gfm'],
            'vendor-ui': ['motion', 'lucide-react'],
            'vendor-graph': ['cytoscape'],
            'vendor-utils': ['date-fns', 'zod'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  }));
