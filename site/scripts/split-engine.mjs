#!/usr/bin/env node
// Cuts an engine file that is too big for Cloudflare Pages (25 MiB a file)
// into parts under 24 MiB, and writes a manifest with each part's size and
// the SHA-256 of each part and of the whole file, which the page checks.
//
//   node scripts/split-engine.mjs <file.wasm> [--out <dir>] [--max <bytes>]
//
// Writes <dir>/<file>.part0 … partN and <dir>/<file>.parts.json (dir defaults
// to public/assets/engine). Copy the numbers it prints into
// public/assets/engine-catalog.js; test/engine-catalog.test.js checks they match.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_PART_BYTES, manifestFor, partName, splitBytes } from '../public/assets/engine-parts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const out = flag('--out') || join(root, 'public/assets/engine');
const max = Number(flag('--max')) || MAX_PART_BYTES;
const input = args[0];
if (!input) {
  console.error('usage: node scripts/split-engine.mjs <file.wasm> [--out <dir>] [--max <bytes>]');
  process.exit(2);
}

const bytes = new Uint8Array(readFileSync(input));
const file = basename(input);
const parts = splitBytes(bytes, max);
const sha256 = createHash('sha256').update(bytes).digest('hex');

mkdirSync(out, { recursive: true });
// Old parts of the same file go first, so a smaller split leaves no stray part behind.
for (const name of readdirSync(out)) {
  if (name.startsWith(`${file}.part`)) unlinkSync(join(out, name));
}
parts.forEach((part, i) => writeFileSync(join(out, partName(file, i)), part));
const hash = (b) => createHash('sha256').update(b).digest('hex');
const manifest = manifestFor({ file, bytes: bytes.length, sha256, parts: parts.map((p) => ({ bytes: p.length, sha256: hash(p) })) });
writeFileSync(join(out, `${file}.parts.json`), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`${file}: ${bytes.length} bytes in ${parts.length} parts (max ${max})`);
for (const p of manifest.parts) console.log(`  ${p.file}  ${p.bytes}  ${p.sha256}`);
console.log(`  sha256 ${sha256}`);
