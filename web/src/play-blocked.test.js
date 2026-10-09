import test from 'node:test';
import assert from 'node:assert/strict';
import {compatibleEngine, playBlockedReason} from './play-blocked.js';

const sf19 = {id:'stockfish19', name:'Stockfish 19', available:false, reason:'Stockfish 19 is not configured on this server.'};
const sf18 = {id:'stockfish18', name:'Stockfish 18', available:true, chess960:true};
const maia = {id:'maia2', name:'Maia2 rapid', available:true, chess960:false};

test('Play names the selected engine, never the first one in the catalogue',()=>{
  assert.equal(playBlockedReason({engines:[sf19, sf18], engine:sf18, variant:'standard'}), null);
  assert.equal(playBlockedReason({engines:[sf19, sf18], engine:undefined, variant:'standard'}), 'Choose an opponent engine under Game options.');
  const broken = {...sf18, available:false, reason:'Stockfish 18 did not start.'};
  assert.equal(playBlockedReason({engines:[sf19, broken], engine:broken, variant:'standard'}), 'Play is unavailable. Stockfish 18 did not start.');
  assert.equal(playBlockedReason({engines:[sf19, broken], engine:undefined, variant:'standard'}), 'Play is unavailable. No opponent engine is installed on this server.');
});

test('Chess960 without a Chess960 engine says so',()=>{
  assert.equal(playBlockedReason({engines:[sf19, maia], engine:undefined, variant:'chess960'}), 'No installed engine plays Chess960. Choose Standard under Game options.');
  assert.equal(playBlockedReason({engines:[sf19, maia], engine:maia, variant:'chess960'}), 'Maia2 rapid plays standard chess only. Choose another engine under Game options.');
  assert.equal(compatibleEngine(maia, 'standard'), true);
  assert.equal(compatibleEngine(maia, 'chess960'), false);
});

test('a roster that failed to load adds no second message',()=>{
  assert.equal(playBlockedReason({engines:[], engine:undefined, variant:'standard'}), null);
});
