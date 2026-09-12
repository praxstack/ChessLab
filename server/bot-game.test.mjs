import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupOptions,beginClock,settleClock,finishMoveClock,undoTurn,crownsFor,adaptiveRating,attackedPieces} from './bot-game.mjs';
const profile={id:'test',name:'Test',rating:900,style:'balanced',adaptive:true};
const make=(body={})=>({source:'bot',moves:[],result:null,...setupOptions({botId:'test',...body},[profile])});
test('bot options validate trust boundaries; rating adaptation and crown tiers are explicit',()=>{
 for(const body of [{rating:249},{rating:3201},{engineId:{}},{botId:'absent'},{assistance:{constructor:true}},{assistance:[]},{timeControl:{initialSeconds:0,incrementSeconds:1}},{timeControl:{initialSeconds:59,incrementSeconds:0}}])assert.throws(()=>make(body));
 const g=make({color:'random'});assert.ok(['w','b'].includes(g.color));g.color='w';g.result='1-0';assert.equal(crownsFor(g),3);g.hintsUsed=1;assert.equal(crownsFor(g),2);g.undosUsed=3;assert.equal(crownsFor(g),1);g.hintsUsed=0;g.undosUsed=0;g.assistance.evaluation=true;assert.equal(crownsFor(g),1);g.assistance.evaluation=false;g.reviewUsed=true;assert.equal(crownsFor(g),1);g.result='0-1';assert.equal(crownsFor(g),0);
 g.moves=['e2e4','d7d5','e4d5'];assert.equal(adaptiveRating(g),980);g.adaptive=false;assert.equal(adaptiveRating(g),900);
 assert.ok(attackedPieces({...make(),moves:['e2e4','d7d5']}).some(x=>x.from==='d5'&&x.to==='e4'));
});
test('clocks charge the active side once, add increments and stop at flag fall',()=>{
 const g=make({timeControl:{initialSeconds:60,incrementSeconds:2}});beginClock(g,1000);
 assert.equal(settleClock(g,4000),false);assert.equal(g.clock.whiteMs,57000);settleClock(g,4000);assert.equal(g.clock.whiteMs,57000);
 g.moves=['e2e4'];finishMoveClock(g,'w',4000);assert.equal(g.clock.whiteMs,59000);
 assert.equal(settleClock(g,65000),true);assert.equal(g.result,'1-0');assert.equal(g.clock.blackMs,0);assert.equal(g.clock.activeSince,null);
 const untimed=make();beginClock(untimed,0);assert.equal(settleClock(untimed,1e9),false);
});
test('undo restores a whole turn and protects branch history',()=>{
 const g=make({timeControl:{initialSeconds:60,incrementSeconds:0}});beginClock(g,1000);
 for(const [move,color,stamp] of [['e2e4','w',2000],['e7e5','b',3000]]){settleClock(g,stamp);g.moves.push(move);finishMoveClock(g,color,stamp);}
 const protectedGame=structuredClone(g);protectedGame.study={anchorPly:1,branches:[]};assert.throws(()=>undoTurn(protectedGame,5000));assert.equal(protectedGame.moves.length,2);
 undoTurn(g,5000);assert.deepEqual(g.moves,[]);assert.equal(g.undosUsed,1);assert.equal(g.clock.whiteMs,60000);assert.equal(g.clock.activeSince,5000);assert.throws(()=>undoTurn(g,5000));
});

test('threat arrows exclude illegal captures by pinned defenders',()=>{assert.ok(!attackedPieces({...make(),initialFen:'4k3/4b3/3Q4/8/8/8/8/4R2K w - - 0 1'}).some(m=>m.from==='e7'&&m.to==='d6'));});

test('every observed bot profile can start with its declared local target',()=>{
 const bots=JSON.parse(readFileSync(new URL('./bot-profiles.json',import.meta.url)));
 assert.equal(bots.length,166);assert.equal(new Set(bots.map(b=>b.id)).size,166);
 for(const bot of bots){const game=setupOptions({botId:bot.id},bots);assert.equal(game.rating,bot.rating);}
 const bot=bots.find(b=>b.category==='New to Chess');
 for(const rating of [100,125,150,175,200,225])assert.equal(setupOptions({botId:bot.id,rating},bots).rating,rating);
});

import {practiceSnapshot} from './bot-game.mjs';
import {replay} from './engine.mjs';
test('practice retains repetition history, blocks terminal starts and never awards roster crowns',()=>{
 const moves=['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6'],source={id:'source',title:'Repeated knights',moves,initialFen:null};
 const snapshot=practiceSnapshot(source,{ply:6});assert.deepEqual(snapshot.moves,moves);
 assert.equal(replay([...snapshot.moves,'f3g1','f6g8'],snapshot.initialFen).isThreefoldRepetition(),true);
 assert.equal(replay(['f3g1','f6g8'],replay(moves).fen()).isThreefoldRepetition(),false,'A bare FEN would lose the draw history');
 assert.throws(()=>practiceSnapshot({...source,moves:[...moves,'f3g1','f6g8']},{ply:8}),/already over/);
 const custom={...source,initialFen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 12',moves:['e7e5']};
 const customCopy=practiceSnapshot(custom,{ply:1});assert.equal(customCopy.initialFen,custom.initialFen);assert.equal(replay(customCopy.moves,customCopy.initialFen).fen(),replay(custom.moves,custom.initialFen).fen());
 const restarted=practiceSnapshot({...snapshot,moves:[...snapshot.moves,'f3g1']},{restart:true});assert.deepEqual(restarted.moves,snapshot.moves);assert.deepEqual(restarted.practice,snapshot.practice);
 const winner={...make(),result:'1-0',practice:snapshot.practice};assert.equal(crownsFor(winner),0);delete winner.practice;assert.equal(crownsFor(winner),3);
 const ended={...source,moves:['f2f3','e7e5','g2g4','d8h4']};assert.throws(()=>practiceSnapshot(ended,{ply:4}),/already over/);assert.equal(practiceSnapshot(ended,{ply:2}).moves.length,2);
});
