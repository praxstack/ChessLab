import { defineConfig } from 'vite';
import { browserAppHosting } from './scripts/browser-app-hosting.mjs';
export default defineConfig({
  root: 'web',
  base: process.env.VITE_BASE || '/',
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [browserAppHosting()],
  // The puzzle page's pens (site/public/assets/line.js) import the vendored chess.js, the same
  // published 1.4.0 build as the app's dependency (site tests check they match): bundle it once.
  resolve: { alias: [{ find: /^\.\/vendor\/chess\.js$/, replacement: 'chess.js' }] },
});
