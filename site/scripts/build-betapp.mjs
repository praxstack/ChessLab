#!/usr/bin/env node
// Builds the browser app (web/, npm run build:app at the repo root) for askthemove.online/betapp/
// and puts it in public/betapp/, which `npm run deploy` uploads. The folder is not committed.
// The gate in functions/betapp/_middleware.js serves these files only to signed-in testers and
// sets their security headers from public/betapp/headers.json.
//
// VITE_COACH_URL, when set, is passed through, so the invite-code coach works here too.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(site, '..');
const built = join(repo, 'web', 'dist-betapp');
const target = join(site, 'public', 'betapp');

execFileSync('npx', ['vite', 'build', '--outDir', 'dist-betapp'], {
  cwd: repo,
  stdio: 'inherit',
  env: { ...process.env, VITE_BACKEND: 'local', VITE_BASE: '/betapp/' },
});
for (const file of ['headers.json', 'index.html', 'manifest.webmanifest']) {
  if (!existsSync(join(built, file))) throw new Error(`The app build has no ${file}; is VITE_BACKEND=local?`);
}
rmSync(target, { recursive: true, force: true });
// _headers only works at the site root; the gate sets these headers itself.
cpSync(built, target, { recursive: true, filter: (src) => !src.endsWith('_headers') });
console.log('wrote public/betapp/ (the app for askthemove.online/betapp/)');
