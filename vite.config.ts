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
    // Enable source maps for production debugging if needed
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
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
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('axios')) {
              return 'axios-vendor';
            }
            return 'vendor';
          }
        }
      }
    },
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2015'
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': '2026.4'
  }
});
