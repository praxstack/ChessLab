import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createChess,chess960Fen,copyChess} from '../shared/chess.js';

test('all 960 starts, castling transitions and seeded games agree with independent python-chess',()=>{
 const python=process.env.CHESSLAB_ORACLE_PYTHON||new URL('../data/explorer/.venv/bin/python',import.meta.url).pathname;
 const cases=JSON.parse(execFileSync(python,['scripts/chess960_oracle.py'],{maxBuffer:40_000_000}));
 let transitions=0,castles=0;
 for(const item of cases){
  const board=createChess(item.fen,'chess960');
  if(item.label.startsWith('start:'))assert.equal(chess960Fen(Number(item.label.split(':')[1])),item.fen,item.label);
  assert.equal(board.fen(),item.fen,item.label);
  const actual=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')).sort();
  assert.deepEqual(actual,item.moves.map(m=>m[0]).sort(),item.label);
  for(const [uci,san,fen] of item.moves){
   const copy=copyChess(board),move=copy.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
   assert.equal(move.san,san,`${item.label} ${uci}`);assert.equal(copy.fen(),fen,`${item.label} ${uci}`);
   assert.equal(copyChess(board).move(san).san,san);transitions++;if(move.castle)castles++;
  }
 }
 assert.ok(castles>1000);console.log(`Chess960 oracle: ${cases.length} positions, ${transitions} transitions, ${castles} castlings.`);
});

test('Chess960 validation, repetition and Standard compatibility',()=>{
 for(const number of [-1,960,'42',null,1.2])assert.throws(()=>chess960Fen(number));
 for(const variant of [null,'atomic',{},'Chess960'])assert.throws(()=>createChess(chess960Fen(518),variant));
 for(const fen of ['8/8/8/8/8/8/8/8 w - - 0 1','4k3/8/8/8/8/8/8/R4KR1 w HH - 0 1','4k3/8/8/8/8/8/8/R4KR1 w H - 0 1','4k3/8/8/8/8/8/8/R4KR1 w GA e3 0 1'])assert.throws(()=>createChess(fen,'chess960'));
 const board=createChess(chess960Fen(518),'chess960');
 for(const move of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])board.move(move);
 assert.equal(board.isThreefoldRepetition(),true);assert.equal(copyChess(board).isThreefoldRepetition(),false);
 assert.equal(createChess().moves().length,20);assert.equal(createChess().fen().split(' ')[2],'KQkq');
 const castle=createChess('4k3/8/8/8/8/8/8/R4K1R w HA - 0 1','chess960');
 assert.equal(castle.move('Kg1').san,'Kg1','ordinary king move remains distinct from castling');
 const late=createChess('4k3/8/8/8/8/8/8/R4K1R b HA - 0 9999','chess960');late.move('Kd7');
 assert.equal(late.fen().split(' ')[5],'10000');assert.equal(copyChess(late).fen(),late.fen());
});

import {after} from 'node:test';
import {analyze,closeEngine,replay} from './engine.mjs';
import {chooseOpponentMove,closeOpponentEngines} from './opponent-engines.mjs';
import {attackedPieces} from './bot-game.mjs';
after(()=>{closeOpponentEngines();closeEngine();});
test('Chess960 threat view handles check without accepting an illegal game position',()=>{
 assert.ok(attackedPieces({moves:[],initialFen:'4kr2/8/8/8/8/8/8/R4K1R w HA - 0 1',variant:'chess960',color:'w'}).some(m=>m.from==='f8'&&m.to==='f1'));
 assert.ok(!attackedPieces({moves:[],initialFen:'4k3/4b3/3Q4/8/8/8/8/4R2K w - - 0 1',variant:'chess960',color:'w'}).some(m=>m.from==='e7'&&m.to==='d6'));
 assert.ok(attackedPieces({moves:[],initialFen:'4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 1',variant:'chess960',color:'w'}).some(m=>m.from==='e4'&&m.to==='d3'));
 assert.throws(()=>createChess('4kr2/8/8/8/8/8/8/R4K1R b HA - 0 1','chess960'));
});
test('installed engines analyze Chess960 castling and continue its complete UCI history',async()=>{
 const initialFen='4k3/8/8/8/8/8/8/R4K1R w HA - 0 1',variant='chess960';
 for(const engineId of ['stockfish19','stockfish18','stockfish16','stockfish18-lite']){
  const result=await analyze({moves:[],initialFen,variant,engineId,movetime:120,lines:3,playedMove:'f1h1'});
  assert.equal(result.played.san,'O-O');assert.equal(result.fen,initialFen);assert.equal(result.lines[0].move,result.bestmove);
  for(const line of result.lines)replay(line.moves,initialFen,variant);
  assert.ok(result.played.afterScore||result.played.classification==='Mate sequence');
 }
 for(const engineId of ['stockfish19','stockfish18','stockfish16','stockfish18-lite','lc0']){
  const result=await chooseOpponentMove({moves:['f1h1'],initialFen,variant,engineId,movetime:100,rating:1500});
  const board=replay(['f1h1',result.move],initialFen,variant);assert.equal(board.get('g1').type,'k');assert.equal(board.get('f1').type,'r');
 }
 await assert.rejects(chooseOpponentMove({moves:[],initialFen,variant,engineId:'maia3'}),{status:400});
});
