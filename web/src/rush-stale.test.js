import test from 'node:test';
import assert from 'node:assert/strict';
import {isStaleRun} from './rush-stale.js';

test('rush: a first load with no run on either side is not stale and does not throw', () => {
  assert.equal(isStaleRun(null, null), false);
  assert.equal(isStaleRun(undefined, null), false);
  assert.equal(isStaleRun(null, {id: 'a', revision: 2}), false, 'the run just ended');
  assert.equal(isStaleRun({id: 'a', revision: 0}, null), false, 'the first run arrives');
});

test('rush: an older reply for the same run is stale, a newer or other one is not', () => {
  assert.equal(isStaleRun({id: 'a', revision: 1}, {id: 'a', revision: 2}), true);
  assert.equal(isStaleRun({id: 'a', revision: 2}, {id: 'a', revision: 2}), false);
  assert.equal(isStaleRun({id: 'a', revision: 3}, {id: 'a', revision: 2}), false);
  assert.equal(isStaleRun({id: 'b', revision: 0}, {id: 'a', revision: 2}), false);
});
