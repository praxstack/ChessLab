import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePosition} from '../shared/position.js';

test('position validation admits check and en passant while rejecting contradictory rule state',()=>{
 for(const fen of ['4k3/8/8/8/8/8/4r3/4K3 w - - 0 1','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 12','4k3/8/8/8/8/8/8/4K3 b - - 30 20'])assert.equal(validatePosition(fen).fen,fen);
 const enPassant=validatePosition('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 12');assert.ok(enPassant.chess.moves().includes('exd6'));
 for(const fen of ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 1 12','4k3/3p4/8/3pP3/8/8/8/4K3 w - d6 0 12','4k3/8/3n4/3pP3/8/8/8/4K3 w - d6 0 12','4k3/8/8/8/8/8/8/4K2R w KK - 0 1','4k3/8/8/8/8/8/8/4K2R w - - 0 1e3','4k3/8/8/8/8/8/8/4K2R w - - 0 10001'])assert.throws(()=>validatePosition(fen),undefined,fen);
});
