import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: null, // Manually register the service worker
      manifest: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      includeAssets: ['manifest.json', 'logos/*.{png,ico,svg,jpg,gif,webp}']
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api']
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        app: './index.html',
        'service-worker': './src/service-worker.ts'
      },
      output: {
        entryFileNames: (asset) => {
          if (asset.name === 'service-worker') {
            return '[name].js';
          }

          return 'assets/js/[name]-[hash].js'
        }
      }
    }
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': '2026.1'
  }
});
