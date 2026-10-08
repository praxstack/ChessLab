import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');

test('a page no longer in the build is reported by --check and removed by a build', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atm-build-'));
  try {
    for (const part of ['pages', 'public', 'scripts', 'site.config.json']) {
      cpSync(join(site, part), join(dir, part), { recursive: true });
    }
    symlinkSync(join(site, 'node_modules'), join(dir, 'node_modules'));
    const build = (...args) =>
      spawnSync(process.execPath, [join(dir, 'scripts/build.mjs'), ...args], { encoding: 'utf8' });

    assert.equal(build('--check').status, 0);

    mkdirSync(join(dir, 'public/old-terms'));
    writeFileSync(join(dir, 'public/old-terms/index.html'), '<!doctype html><title>Old terms</title>');
    const check = build('--check');
    assert.equal(check.status, 1);
    assert.match(check.stderr, /old-terms\/index\.html \(no longer generated\)/);

    assert.equal(build().status, 0);
    assert.ok(!existsSync(join(dir, 'public/old-terms/index.html')));
    assert.equal(build('--check').status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
