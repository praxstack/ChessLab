// A move after which the search loses its mate, or finds one for the opponent, is a blunder, never a good move.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeMove} from './move-grade.mjs';
import {analyze, engineStatus} from './engine.mjs';

const cp = value => ({type:'cp', value}), mate = value => ({type:'mate', value});

test('centipawn losses keep their thresholds',()=>{
  assert.equal(gradeMove({beforeScore:cp(40), afterScore:cp(-300), turn:'w', played:'g1f3', best:'e2e4'}).classification, 'Blunder');
  assert.equal(gradeMove({beforeScore:cp(-20), afterScore:cp(140), turn:'b', played:'a7a6', best:'e7e5'}).classification, 'Mistake');
  assert.equal(gradeMove({beforeScore:cp(30), afterScore:cp(-30), turn:'w', played:'a2a3', best:'e2e4'}).classification, 'Inaccuracy');
  const good = gradeMove({beforeScore:cp(30), afterScore:cp(10), turn:'w', played:'d2d4', best:'e2e4'});
  assert.deepEqual(good, {classification:'Good', lossCp:20, lossText:'Estimated loss: 20 centipawns for White.'});
});

test('missing a mate in one is a blunder, even when it stays winning',()=>{
  const result = gradeMove({beforeScore:mate(1), afterScore:cp(-900), turn:'w', played:'h5g6', best:'h5f7'});
  assert.equal(result.classification, 'Blunder');
  assert.equal(result.lossCp, null);
  assert.equal(result.lossText, 'Before this move the search found mate in 1 for White; after it, none.');
  assert.equal(gradeMove({beforeScore:mate(-3), afterScore:cp(-500), turn:'b', played:'a7a6', best:'d8h4'}).lossText, 'Before this move the search found mate in 3 for Black; after it, none.');
  // Stalemating with a mate in hand throws the win away too.
  const stalemate = gradeMove({beforeScore:mate(2), afterScore:cp(0), turn:'w', played:'d1d7', best:'d1d8'});
  assert.deepEqual(stalemate, {classification:'Blunder', lossCp:null, lossText:'Before this move the search found mate in 2 for White; after it, none.'});
  assert.equal(gradeMove({beforeScore:mate(1), afterScore:mate(-2), turn:'w', played:'a2a3', best:'h5f7'}).lossText, 'Before this move the search found mate in 1 for White; after it, mate in 2 for Black.');
});

test('walking into a mate is a blunder',()=>{
  const result = gradeMove({beforeScore:cp(-150), afterScore:mate(2), turn:'b', played:'e8d8', best:'d7d6'});
  assert.equal(result.classification, 'Blunder');
  assert.equal(result.lossText, 'After this move the search finds mate in 2 for White.');
});

test('keeping, finding or shortening a mate, or being mated either way, is not a blunder',()=>{
  const kept = gradeMove({beforeScore:mate(2), afterScore:mate(3), turn:'w', played:'d1h5', best:'f3f7'});
  assert.deepEqual(kept, {classification:'Good', lossCp:null, lossText:'After this move the search finds mate in 3 for White.'});
  assert.equal(gradeMove({beforeScore:cp(600), afterScore:mate(4), turn:'w', played:'c1g5', best:'d1d8'}).classification, 'Good');
  assert.equal(gradeMove({beforeScore:mate(5), afterScore:mate(1), turn:'w', played:'c1g5', best:'d1d8'}).classification, 'Good');
  const lost = gradeMove({beforeScore:mate(3), afterScore:mate(2), turn:'b', played:'g8h8', best:'g8f8'});
  assert.deepEqual(lost, {classification:'Good', lossCp:null, lossText:'After this move the search finds mate in 2 for White.'});
  assert.equal(gradeMove({beforeScore:mate(-4), afterScore:cp(-50), turn:'w', played:'g1h1', best:'g1f1'}).lossText, 'Before this move the search found mate in 4 for Black; after it, none.');
});

test('a missing score is not graded as a lost mate',()=>{
  assert.deepEqual(gradeMove({beforeScore:cp(20), afterScore:null, turn:'b', played:'a7a6', best:'e7e5'}), {classification:'Good', lossCp:null, lossText:'The engine gave no score to compare, so no loss is estimated.'});
  assert.equal(gradeMove({beforeScore:mate(2), afterScore:null, turn:'w', played:'a2a3', best:'d1h5'}).classification, 'Good');
});

test('the engine move is Best without a blunder sentence, and a mating move is Checkmate',()=>{
  assert.equal(gradeMove({beforeScore:mate(2), afterScore:mate(1), turn:'w', played:'f3f7', best:'f3f7'}).classification, 'Best');
  // The searches before and after a move can disagree about a mate at short time limits.
  const lostAtDepth = gradeMove({beforeScore:mate(2), afterScore:cp(900), turn:'w', played:'f3f7', best:'f3f7'});
  assert.equal(lostAtDepth.classification, 'Best');
  assert.doesNotMatch(lostAtDepth.lossText, /gives|allows|forced/);
  const matedAtDepth = gradeMove({beforeScore:cp(40), afterScore:mate(-3), turn:'w', played:'e2e4', best:'e2e4'});
  assert.deepEqual(matedAtDepth, {classification:'Best', lossCp:null, lossText:'After this move the search finds mate in 3 for Black.'});
  const mated = gradeMove({beforeScore:mate(1), afterScore:null, turn:'w', played:'h5f7', best:'h5f7', checkmate:true});
  assert.deepEqual(mated, {classification:'Checkmate', lossCp:null, lossText:'The game is over, so no loss is estimated.'});
});

test('no move is graded with the old Mate sequence label or called forced',()=>{
  const scores = [cp(0), cp(500), cp(-500), mate(1), mate(-1), mate(4), mate(-4), null];
  for (const beforeScore of scores) for (const afterScore of scores) for (const turn of ['w','b']) for (const best of ['a2a3','e2e4']) {
    const {classification, lossText} = gradeMove({beforeScore, afterScore, turn, played:'a2a3', best});
    assert.notEqual(classification, 'Mate sequence');
    assert.doesNotMatch(lossText, /forced/);
  }
});

test('the engine grades a missed mate and an allowed mate as blunders',async t=>{
  if (!(await engineStatus()).available) return t.skip('Stockfish is not installed on this machine.');
  // 1. e4 e5 2. Qh5 Nf6 3. Bc4 Nxe4: 4. Qxf7# is mate, and 4. Qg6 misses it.
  const trap = ['e2e4','e7e5','d1h5','g8f6','f1c4','f6e4'];
  const missed = (await analyze({moves:trap, playedMove:'h5g6', movetime:500})).played;
  assert.equal(missed.classification, 'Blunder');
  assert.match(missed.explanation, /Before this move the search found mate in 1 for White; after it, /);
  const mated = (await analyze({moves:trap, playedMove:'h5f7', movetime:500})).played;
  assert.equal(mated.classification, 'Checkmate');
  // Legal's trap: 5...Bxd1 wins the queen but allows 6. Bxf7+ Ke7 7. Nd5#.
  const legal = (await analyze({moves:['e2e4','e7e5','g1f3','d7d6','f1c4','c8g4','b1c3','g7g6','f3e5'], playedMove:'g4d1', movetime:500})).played;
  assert.equal(legal.classification, 'Blunder');
  assert.match(legal.explanation, /After this move the search finds mate in 2 for White\.$/);
});
