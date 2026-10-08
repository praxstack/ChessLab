import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupOptions,resolveProfile,beginClock,settleClock,finishMoveClock,undoTurn,crownsFor,adaptiveRating,attackedPieces} from './bot-game.mjs';
import {strengthLadder,ladderLevel,engineControls} from '../shared/strength-ladder.js';
import {avatarSvg,avatarPath} from '../scripts/generate_bot_avatars.mjs';
const profile={id:'test',name:'Test',rating:900,style:'balanced',adaptive:true};
const make=(body={})=>({source:'bot',moves:[],result:null,...setupOptions({botId:'test',...body},[profile])});
test('bot options validate trust boundaries; rating adaptation and crown tiers are explicit',()=>{
 for(const body of [{rating:249},{rating:3201},{engineId:{}},{botId:42},{botId:'../absent'},{botId:''},{assistance:{constructor:true}},{assistance:[]},{timeControl:{initialSeconds:0,incrementSeconds:1}},{timeControl:{initialSeconds:59,incrementSeconds:0}}])assert.throws(()=>make(body));
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

test('the roster is original, sits on the strength ladder and draws its own portraits',()=>{
 const bots=JSON.parse(readFileSync(new URL('./bot-profiles.json',import.meta.url)));
 assert.equal(bots.length,43);assert.equal(new Set(bots.map(b=>b.id)).size,bots.length);assert.equal(new Set(bots.map(b=>b.name)).size,bots.length);
 assert.doesNotMatch(JSON.stringify(bots),/chess\.?com|chesscomfiles|country|https?:/i);
 for(const bot of bots){
  assert.deepEqual(Object.keys(bot).sort(),['adaptive','avatar','category','description','id','level','name','rating','style']);
  assert.equal(bot.level,ladderLevel(bot.rating),bot.id);assert.notEqual(bot.level,null,bot.id);
  assert.equal(bot.adaptive,bot.category==='Adaptive');assert.ok(['balanced','aggressive','solid'].includes(bot.style));
  assert.ok(bot.description.length>10&&bot.description.length<=100,bot.id);
  assert.equal(bot.avatar,`/bots/${bot.id}.svg`);
  const svg=readFileSync(new URL('../'+avatarPath(bot),import.meta.url),'utf8');
  assert.equal(svg,avatarSvg(bot),`${bot.id} portrait matches its generator`);assert.doesNotMatch(svg,/<script|href|url\(|on[a-z]+=/i);
  const game=setupOptions({botId:bot.id},bots);assert.equal(game.rating,bot.rating);assert.equal(game.botId,bot.id);assert.equal(game.chat[0],bot.description);
 }
 for(const level of strengthLadder)assert.ok(bots.some(b=>b.rating===level),`a bot plays at ${level}`);
 const bot=bots.find(b=>b.rating<250);
 for(const rating of [100,125,150,175,200,225])assert.equal(setupOptions({botId:bot.id,rating},bots).rating,rating);
 assert.throws(()=>setupOptions({botId:bots.find(b=>b.rating>=250).id,rating:200},bots));
});

test('every ladder level is a distinct engine setting',()=>{
 const controls=strengthLadder.map(engineControls);
 assert.equal(new Set(controls.map(c=>JSON.stringify(c))).size,strengthLadder.length);
 for(let i=1;i<controls.length;i++){assert.ok(controls[i].skill>=controls[i-1].skill);assert.ok(controls[i].sampledShare<=controls[i-1].sampledShare);assert.ok(controls[i].movetime>controls[i-1].movetime);}
 assert.deepEqual(engineControls(250),{skill:0,movetime:83,sampledShare:0.85});assert.equal(engineControls(1150).sampledShare,0);assert.equal(engineControls(2800).skill,20);
});

test('games that name a bot from an earlier roster still start',()=>{
 const bots=JSON.parse(readFileSync(new URL('./bot-profiles.json',import.meta.url)));
 const old=setupOptions({botId:'martin',rating:250},bots);assert.ok(bots.some(b=>b.id===old.botId));assert.equal(old.rating,250);assert.equal(bots.find(b=>b.id===old.botId).rating,250);
 assert.equal(setupOptions({botId:'retired-bot',rating:150},bots).rating,150,'first-moves ratings stay valid');
 assert.ok(bots.find(b=>b.id===setupOptions({botId:'retired-bot',rating:3200},bots).botId).rating===3200);
 assert.equal(resolveProfile('retired-bot',bots).rating,1050);assert.equal(resolveProfile('marlo',bots).id,'marlo');
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
