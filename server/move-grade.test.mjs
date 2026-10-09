// A move that throws away a forced mate, or walks into one, is a blunder, never a good move.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeMove} from './move-grade.mjs';

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
  assert.equal(result.lossText, 'White had a forced mate in 1, and this move gives it up.');
  assert.equal(gradeMove({beforeScore:mate(-3), afterScore:cp(-500), turn:'b', played:'a7a6', best:'d8h4'}).lossText, 'Black had a forced mate in 3, and this move gives it up.');
});

test('walking into a forced mate is a blunder',()=>{
  const result = gradeMove({beforeScore:cp(-150), afterScore:mate(2), turn:'b', played:'e8d8', best:'d7d6'});
  assert.equal(result.classification, 'Blunder');
  assert.equal(result.lossText, 'This move allows a forced mate in 2 for White.');
});

test('keeping a mate, or being mated either way, is not a blunder',()=>{
  const kept = gradeMove({beforeScore:mate(2), afterScore:mate(3), turn:'w', played:'d1h5', best:'f3f7'});
  assert.equal(kept.classification, 'Good');
  assert.equal(kept.lossText, 'White still has a forced mate in 3.');
  const lost = gradeMove({beforeScore:mate(3), afterScore:mate(2), turn:'b', played:'g8h8', best:'g8f8'});
  assert.equal(lost.classification, 'Good');
  assert.equal(lost.lossText, 'White still has a forced mate in 2.');
  assert.equal(gradeMove({beforeScore:cp(600), afterScore:mate(4), turn:'w', played:'c1g5', best:'d1d8'}).lossText, 'White now has a forced mate in 4.');
  assert.equal(gradeMove({beforeScore:cp(20), afterScore:null, turn:'b', played:'a7a6', best:'e7e5'}).lossText, 'The engine gave no score to compare, so no loss is estimated.');
  assert.equal(gradeMove({beforeScore:mate(2), afterScore:null, turn:'w', played:'a2a3', best:'d1h5'}).classification, 'Good');
});

test('the engine move is Best and a mating move is Checkmate',()=>{
  assert.equal(gradeMove({beforeScore:mate(2), afterScore:mate(1), turn:'w', played:'f3f7', best:'f3f7'}).classification, 'Best');
  const mated = gradeMove({beforeScore:mate(1), afterScore:null, turn:'w', played:'h5f7', best:'h5f7', checkmate:true});
  assert.deepEqual(mated, {classification:'Checkmate', lossCp:null, lossText:'The game is over, so no loss is estimated.'});
});

test('no move is graded with the old Mate sequence label',()=>{
  const scores = [cp(0), cp(500), cp(-500), mate(1), mate(-1), mate(4), mate(-4), null];
  for (const beforeScore of scores) for (const afterScore of scores) for (const turn of ['w','b'])
    assert.notEqual(gradeMove({beforeScore, afterScore, turn, played:'a2a3', best:'e2e4'}).classification, 'Mate sequence');
});
