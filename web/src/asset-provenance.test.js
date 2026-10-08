import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';

// OA-001 and OA-002: the piece and icon folders hold exactly the files their provenance records
// list, each unmodified, with the licence the record names served beside them.
for (const folder of ['icons', 'pieces/cburnett']) test(`${folder} matches its provenance record`, () => {
  const directory = new URL(`../public/${folder}/`, import.meta.url);
  const record = JSON.parse(readFileSync(new URL('provenance.json', directory), 'utf8'));
  const files = readdirSync(directory, {recursive:true}).filter(name => name !== 'provenance.json' && statSync(new URL(name, directory)).isFile()).sort();
  assert.deepEqual(files, Object.keys(record.files).sort(), `${folder} holds exactly the recorded files`);
  for (const [name, hash] of Object.entries(record.files)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(name, directory))).digest('hex'), hash, `${folder}/${name} matches its recorded hash`);
  }
  assert.equal(record.modified, false);
  assert.ok(existsSync(new URL(`../public${record.licenseText}`, import.meta.url)), `${record.licenseText} is served`);
});
