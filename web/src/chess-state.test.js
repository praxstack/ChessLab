import test from 'node:test';
import assert from 'node:assert/strict';
import {replay,parseMove,emptyStudy,addBranch,moveRows,rootAnchor,studyLimitError} from './chess-state.js';

test('SAN and UCI preserve legal state; illegal moves fail', () => {
  assert.equal(parseMove(replay(), 'e4'), 'e2e4');
  assert.equal(parseMove(replay(), 'g1f3'), 'g1f3');
  assert.throws(() => parseMove(replay(), 'e2e5'));
  assert.equal(replay(['e2e4','e7e5']).turn(), 'w');
  assert.equal(moveRows(['e2e4','e7e5'])[1].san, 'e5');
});
test('nested exploration retains full history and exact mainline anchor', () => {
  const original = ['e2e4','e7e5','g1f3'];
  const first = addBranch(emptyStudy(), original, 2, null, 'a');
  const nested = addBranch(first, [...first.branches[0].moves,'f1c4'], 3, 'a', 'b');
  assert.equal(nested.anchorPly, 2);
  assert.equal(nested.branches[1].parentId, 'a');
  assert.deepEqual(nested.branches[1].moves, ['e2e4','e7e5','f1c4']);
  assert.deepEqual(original,['e2e4','e7e5','g1f3']);
  assert.equal(replay(nested.branches[1].moves).turn(), 'b');
});
test('promotion requires explicit piece and supports underpromotion', () => {
  const chess = replay([], '7k/P7/8/8/8/8/8/7K w - - 0 1');
  assert.equal(parseMove(chess, 'a7a8n'), 'a7a8n');
  assert.throws(() => parseMove(chess, 'a7a8'));
});

test('return anchor follows a selected branch root, including older roots', () => {
  const branches = [
    {id:'old',parentId:null,anchorPly:2,moves:[]},
    {id:'nested',parentId:'old',anchorPly:4,moves:[]},
    {id:'new',parentId:null,anchorPly:6,moves:[]}
  ];
  assert.equal(rootAnchor(branches[1],branches), 2);
  assert.equal(rootAnchor(branches[2],branches), 6);
});

test('study limits accept their boundaries and reject additions without changing histories', () => {
  const branch = count => ({moves:Array(count).fill('e2e4')});
  const forty = Array.from({length:40}, () => branch(0));
  assert.equal(studyLimitError(forty), null);
  assert.match(studyLimitError([...forty,branch(0)]), /40 variations/);
  assert.equal(studyLimitError([branch(1000)]), null);
  assert.match(studyLimitError([branch(1001)]), /1,000 moves/);
  const full = Array.from({length:5}, () => branch(1000));
  assert.equal(studyLimitError(full), null);
  assert.match(studyLimitError([...full,branch(1)]), /5,000 stored moves/);
  assert.equal(full.length, 5);
  assert.equal(full[0].moves.length, 1000);
});
