import { defineConfig } from 'vite';
import { browserAppHosting } from './scripts/browser-app-hosting.mjs';
export default defineConfig({ root: 'web', build: { outDir: 'dist', emptyOutDir: true }, plugins: [browserAppHosting()] });
