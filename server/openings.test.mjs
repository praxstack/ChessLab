import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {openingById,searchOpenings,recognizeOpening,openingSource} from './openings.mjs';

test('opening recognition preserves move order and distinguishes position matches from played lines',()=>{
 assert.equal(openingSource.count,3810);
 const line=searchOpenings({q:'Italian Game'}).items.find(entry=>entry.name==='Italian Game'),entry=openingById(line.id),moves=[...entry.moves];
 assert.equal(recognizeOpening(moves).id,entry.id);assert.equal(recognizeOpening(moves).matchType,'line');assert.deepEqual(moves,entry.moves);
 const transposed=['b1a3','g8h6','a3b1','h6g8',...moves],result=recognizeOpening(transposed);assert.equal(result.name,'Italian Game');assert.equal(result.matchType,'position');assert.equal(result.ply,transposed.length);
 assert.equal(recognizeOpening([],entry.fen).matchType,'position');assert.equal(recognizeOpening([],entry.fen).ply,0);
 assert.equal(recognizeOpening([],entry.fen.replace(' KQkq ',' - ')),null,'Castling rights are part of position identity');
 const board=new Chess(entry.fen);const next=board.moves({verbose:true})[0];const later=[...moves,next.from+next.to+(next.promotion||'')];assert.ok(recognizeOpening(later).ply>=moves.length);
 assert.deepEqual(moves,entry.moves);assert.throws(()=>recognizeOpening(['e2e5']));assert.throws(()=>recognizeOpening(new Array(1001).fill('e2e4')));
 assert.ok(searchOpenings({q:'queens gambit'}).total>0);assert.equal(searchOpenings({q:'absent_unique_opening'}).total,0);
 const page0=searchOpenings(),page1=searchOpenings({page:'1'});assert.equal(page0.items.length,24);assert.ok(!page0.items.some(a=>page1.items.some(b=>a.id===b.id)));
});
