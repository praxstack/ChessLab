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


import {mergePolledGame, clockText, rematchOptions} from './chess-state.js';
test('clock polling cannot replace a newer game or its study, and clocks count only the active side', () => {
  const current={id:'a',revision:4,study:{draft:true},studyRevision:2};
  assert.equal(mergePolledGame(current,{id:'a',revision:3}),current);
  assert.equal(mergePolledGame(current,{id:'b',revision:5}),current);
  assert.deepEqual(mergePolledGame(current,{id:'a',revision:5,study:{old:true},studyRevision:0}).study,current.study);
  const game={moves:[],timeControl:{initialSeconds:60},clock:{whiteMs:60000,blackMs:60000,activeSince:1000}};
  assert.equal(clockText(game,'w',2500),'0:59');
  assert.equal(clockText(game,'b',2500),'1:00');
  assert.equal(clockText({...game,result:'1-0'},'w',2500),'1:00');
});

test('rematch preserves legacy strength semantics and exact modern game options', () => {
  const fallback={rating:250,timeControl:{initialSeconds:0,incrementSeconds:0},assistance:{chat:true}};
  assert.deepEqual(rematchOptions({color:'b',level:4},fallback),{color:'b',level:4});
  assert.deepEqual(rematchOptions({color:'w',level:5,legacyStrength:true,engineId:'stockfish19',rating:2600},fallback),{color:'w',level:5});
  const modern={botId:null,engineId:'maia3',rating:1500,color:'w',timeControl:{initialSeconds:600,incrementSeconds:5},assistance:{chat:false}};
  assert.deepEqual(rematchOptions(modern,fallback),modern);
});

test('Black-first custom positions display the clock of the actual side to move',()=>{
 const game={initialFen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 12',moves:[],timeControl:{initialSeconds:60},clock:{whiteMs:60000,blackMs:60000,activeSince:1000}};
 assert.equal(clockText(game,'b',2500),'0:59');assert.equal(clockText(game,'w',2500),'1:00');
 assert.equal(clockText({...game,moves:['e7e5']},'w',2500),'0:59');
});
