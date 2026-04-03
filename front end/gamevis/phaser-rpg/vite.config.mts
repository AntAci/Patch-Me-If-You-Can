import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

const backendTarget = process.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:3847';
const backendWsTarget = backendTarget.replace(/^http/i, 'ws');

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [createHtmlPlugin()],
  server: {
    proxy: {
      '/api': backendTarget,
      '/cursor': backendTarget,
      '/ws': {
        target: backendWsTarget,
        ws: true,
      },
    },
  },
});
