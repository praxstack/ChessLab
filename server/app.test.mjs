import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { createApp } from './app.mjs';
import { lessons, puzzles } from './content.mjs';

async function fixture(options={}) {
 const temp=mkdtempSync(join(tmpdir(),'chesslab-test-'));
 const engineApi={engineStatus:async()=>({available:true,name:'test engine'}),analyze:async({moves})=>({bestmove:moves.length%2?'e7e5':'e2e4'}),...options.engineApi};
 let state=createApp({...options,databasePath:join(temp,'db.sqlite'),engineApi});
 let server=state.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 let base=`http://127.0.0.1:${server.address().port}`;
 const request=async(path,{method='GET',body,cookie,headers={}}={})=>{
  const response=await fetch(base+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:response.headers.get('content-type')?.includes('json')?await response.json():await response.text(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 return {request,get base(){return base;},get db(){return state.db;},register:async(username)=>request('/api/register',{method:'POST',body:{username,password:'test-password-123'}}),async restart(){await new Promise(resolve=>server.close(resolve));state.close();state=createApp({...options,databasePath:join(temp,'db.sqlite'),engineApi});server=state.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;},async close(){await new Promise(resolve=>server.close(resolve));state.close();rmSync(temp,{recursive:true,force:true});}};
}

test('accounts, legal game updates, isolation, revision checks and persistent sessions',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/games')).status,401);
  assert.equal((await f.request('/api/register',{method:'POST',body:{username:'bad',password:'short'}})).status,400);
  const alice=await f.register('alice');assert.equal(alice.status,201);const cookie=alice.cookie;
  const bob=await f.register('bob');assert.equal(bob.status,201);
  assert.equal((await f.register('ALICE')).status,409);
  const create=await f.request('/api/games',{method:'POST',body:{color:'w',level:2},cookie});assert.equal(create.status,201);const id=create.body.game.id;
  assert.equal((await f.request(`/api/games/${id}`,{cookie:bob.cookie})).status,404);
  const change=(suffix,body,c=cookie)=>f.request(`/api/games/${id}/${suffix}`,{method:'POST',body,cookie:c});
  assert.equal((await change('move',{move:'e2e5',revision:0})).status,400);
  assert.equal((await change('bot',{revision:0})).status,409);
  assert.equal((await change('move',{move:'e2e4',revision:0})).status,200);
  assert.equal((await change('move',{move:'d2d4',revision:0})).status,409);
  assert.equal((await change('move',{move:'d2d4',revision:1})).status,409);
  assert.equal((await change('move',{move:'e7e5',revision:1},bob.cookie)).status,404);
  const reply=await change('bot',{revision:1});assert.equal(reply.status,200);assert.deepEqual(reply.body.game.moves,['e2e4','e7e5']);
  assert.equal((await f.request('/api/games',{method:'POST',cookie,body:{color:'w'},headers:{Origin:'https://attacker.example'}})).status,403);
  assert.equal((await f.request('/api/games',{method:'POST',cookie,body:{color:'w'},headers:{Origin:f.base.replace('http:','https:')}})).status,403);
  assert.equal((await f.request('/api/games',{method:'POST',cookie,body:{color:'w'},headers:{Origin:f.base}})).status,201);
  assert.equal((await f.request('/api/games',{method:'POST',cookie,body:[]})).status,400);
  await f.restart();assert.equal((await f.request('/api/me',{cookie})).body.user.username,'alice');
  assert.deepEqual((await f.request(`/api/games/${id}`,{cookie})).body.game.moves,['e2e4','e7e5']);
  const end=await change('resign',{revision:2});assert.equal(end.body.game.result,'0-1');
  assert.equal((await change('move',{move:'g1f3',revision:3})).status,409);
  const exportGame=await f.request(`/api/games/${id}/pgn`,{cookie});assert.match(exportGame.body,/1\. e4 e5/);assert.match(exportGame.body,/\[Result "0-1"\]/);assert.match(exportGame.body,/\[White "alice"\]/);
  const imported=await f.request('/api/import',{method:'POST',cookie,body:{pgn:exportGame.body}});assert.equal(imported.status,201);assert.equal(imported.body.game.source,'import');assert.equal(imported.body.game.result,'0-1');
  assert.equal((await f.request(`/api/games/${imported.body.game.id}/move`,{method:'POST',cookie,body:{move:'g1f3',revision:0}})).status,409);
  const before=(await f.request('/api/games',{cookie})).body.games.length;
  assert.equal((await f.request('/api/import',{method:'POST',cookie,body:{pgn:'1. e4 e5 2. Qh9'}})).status,400);
  assert.equal((await f.request('/api/games',{cookie})).body.games.length,before);
  assert.equal((await f.request('/api/logout',{method:'POST',body:{},cookie})).status,200);
  assert.equal((await f.request('/api/games',{cookie})).status,401);
 } finally {await f.close();}
});

test('nested studies reject altered history, missing parents, loops, illegal moves and survive bot races',async()=>{
 let release,start;const started=new Promise(resolve=>{start=resolve;});
 const f=await fixture({engineApi:{analyze:()=>{start();return new Promise(resolve=>{release=resolve;});}}});
 try{
  const {cookie}=await f.register('learner');const game=(await f.request('/api/games',{method:'POST',body:{color:'w'},cookie})).body.game;
  const route=`/api/games/${game.id}`;
  await f.request(route+'/move',{method:'POST',cookie,body:{move:'e2e4',revision:0}});
  const botPromise=f.request(route+'/bot',{method:'POST',cookie,body:{revision:1}});await started;
  const study={version:1,branches:[{id:'a',parentId:null,anchorPly:0,moves:['d2d4','d7d5'],question:'What changes in the center?'},{id:'b',parentId:'a',anchorPly:1,moves:['d2d4','g8f6'],question:'What if the knight develops?'}],selectedBranchId:'b',anchorPly:1};
  assert.equal((await f.request(route+'/study',{method:'POST',cookie,body:{study,studyRevision:0}})).status,200);
  // Review requests mark assistance without racing the pending move or study revision.
  const row=JSON.parse(f.db.prepare('SELECT data FROM games WHERE id=?').get(game.id).data);row.reviewUsed=true;f.db.prepare('UPDATE games SET data=? WHERE id=?').run(JSON.stringify(row),game.id);
  release({bestmove:'e7e5'});const bot=await botPromise;assert.equal(bot.body.game.reviewUsed,true);assert.deepEqual(bot.body.game.study,study);
  await f.restart();assert.deepEqual((await f.request(route,{cookie})).body.game.study,study);
  for(const mutate of [s=>s.branches[0].moves=['e2e5'],s=>s.branches[1].parentId='missing',s=>s.branches[0].parentId='b',s=>{s.branches[1].moves=['e2e4'];},s=>s.selectedBranchId='absent']){
   const bad=structuredClone(study);mutate(bad);assert.equal((await f.request(route+'/study',{method:'POST',cookie,body:{study:bad,studyRevision:1}})).status,400);
   assert.deepEqual((await f.request(route,{cookie})).body.game.study,study);
  }
  assert.equal((await f.request(route+'/study',{method:'POST',cookie,body:{study,studyRevision:0}})).status,409);
  f.db.exec('PRAGMA query_only=ON');
  assert.equal((await f.request(route+'/study',{method:'POST',cookie,body:{study,studyRevision:1}})).status,500);
  f.db.exec('PRAGMA query_only=OFF');
  assert.deepEqual((await f.request(route,{cookie})).body.game.study,study);
 }finally{release?.({bestmove:'e7e5'});await f.close();}
});

test('Black games begin with engine turn and engine failure never fabricates a move',async()=>{
 const f=await fixture({engineApi:{analyze:async()=>{throw Object.assign(new Error('Stockfish is unavailable.'),{status:503});}}});
 try{const {cookie}=await f.register('blackplayer');const {body}=await f.request('/api/games',{method:'POST',cookie,body:{color:'b',level:5}});const route=`/api/games/${body.game.id}`;
 assert.equal((await f.request(route+'/move',{method:'POST',cookie,body:{move:'e7e5',revision:0}})).status,409);
 assert.equal((await f.request(route+'/bot',{method:'POST',cookie,body:{revision:0}})).status,503);
 const saved=(await f.request(route,{cookie})).body.game;assert.deepEqual(saved.moves,[]);assert.equal(saved.revision,0);
 }finally{await f.close();}
});

test('learning catalog hides answers, validates all authored positions, and persists only correct progress',async()=>{
 for(const lesson of lessons){new Chess(lesson.fen);assert.ok(lesson.answer>=0&&lesson.answer<lesson.choices.length);}
 for(const puzzle of puzzles){const c=new Chess(puzzle.fen);assert.equal(c.turn(),puzzle.side);for(const m of puzzle.solution)c.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});if(puzzle.theme==='Mate in one')assert.ok(c.isCheckmate(),puzzle.id);}
 const f=await fixture();try{const {cookie}=await f.register('student');const cat=await f.request('/api/learn');assert.equal(cat.body.lessons.length,6);assert.ok(!('answer' in cat.body.lessons[0]));assert.ok(!('solution' in cat.body.puzzles[0]));
 const lesson=lessons[0];let result=await f.request(`/api/lessons/${lesson.id}/answer`,{method:'POST',cookie,body:{choice:(lesson.answer+1)%3}});assert.equal(result.body.correct,false);assert.deepEqual(result.body.progress.lessons,[]);
 result=await f.request(`/api/lessons/${lesson.id}/answer`,{method:'POST',cookie,body:{choice:lesson.answer}});assert.equal(result.body.correct,true);
 result=await f.request('/api/puzzles/take-the-rook/answer',{method:'POST',cookie,body:{moves:['e1d1']}});assert.equal(result.body.correct,false);assert.deepEqual(result.body.progress.puzzles,[]);
 result=await f.request('/api/puzzles/knight-fork/answer',{method:'POST',cookie,body:{moves:['f5e7']}});assert.equal(result.body.reply,'g8f7');assert.equal(result.body.complete,false);
 result=await f.request('/api/puzzles/knight-fork/answer',{method:'POST',cookie,body:{moves:['f5e7','g8f7','e7d5']}});assert.equal(result.body.complete,true);
 for(const move of ['g6g7','g6g8','g6h6','g6h5']) {const mate=await f.request('/api/puzzles/queen-mate/answer',{method:'POST',cookie,body:{moves:[move]}});assert.equal(mate.body.complete,true,move);}
 await f.restart();const restored=await f.request('/api/me',{cookie});assert.deepEqual(restored.body.progress,{lessons:['safe-king'],puzzles:['knight-fork','queen-mate']});
 }finally{await f.close();}
});


test('selected engine, authoritative timeout, crowns and account isolation survive restart',async()=>{
 let stamp=1000,release,started;const waiting=new Promise(r=>started=r),calls=[];
 const opponentApi={listOpponentEngines:async()=>[{id:'maia3',available:true},{id:'missing',available:false,reason:'Not installed'}],chooseOpponentMove:async input=>{calls.push(input);started();return new Promise(r=>release=r);}};
 const f=await fixture({opponentApi,nowMs:()=>stamp});try{
  const {cookie}=await f.register('timedplayer');const second=await f.register('otherplayer');
  const create=body=>f.request('/api/games',{method:'POST',cookie,body});
  assert.equal((await create({engineId:'missing'})).status,503);assert.equal((await create({engineId:'invented'})).status,400);
  const created=await create({botId:'martin',engineId:'maia3',rating:250,color:'w',timeControl:{initialSeconds:60,incrementSeconds:2}});assert.equal(created.status,201);let game=created.body.game;const route='/api/games/'+game.id;
  stamp=5000;game=(await f.request(route+'/move',{method:'POST',cookie,body:{revision:0,move:'e2e4'}})).body.game;assert.equal(game.clock.whiteMs,58000);assert.equal(game.clock.blackMs,60000);
  const pending=f.request(route+'/bot',{method:'POST',cookie,body:{revision:1}});await waiting;assert.equal(calls[0].engineId,'maia3');assert.deepEqual(calls[0].moves,['e2e4']);assert.equal(calls[0].rating,250);
  stamp=66000;release({move:'e7e5',engineId:'maia3',engine:'Maia3'});const finished=await pending;assert.equal(finished.status,200);assert.equal(finished.body.game.result,'1-0');assert.deepEqual(finished.body.game.moves,['e2e4']);assert.equal(finished.body.game.crownsAwarded,3);
  assert.equal((await f.request(route+'/bot',{method:'POST',cookie,body:{revision:1}})).status,409);
  await f.restart();assert.equal((await f.request('/api/me',{cookie})).body.progress.bots.martin,3);assert.equal((await f.request('/api/me',{cookie:second.cookie})).body.progress.bots,undefined);
  assert.equal((await f.request(route,{cookie})).body.game.clock.activeSince,null);assert.equal((await f.request(route,{cookie:second.cookie})).status,404);
 }finally{release?.({move:'e7e5'});await f.close();}
});

test('hints, assistance and undo retain legal history and protect saved studies',async()=>{
 const calls=[];const f=await fixture({engineApi:{analyze:async input=>{calls.push(input);return {bestmove:input.moves.length===2?'g1f3':'e2e4',explanation:'Develop your pieces.'};}}});
 try{const {cookie}=await f.register('helpplayer');let game=(await f.request('/api/games',{method:'POST',cookie,body:{assistance:{evaluation:true,feedback:true,threats:true}}})).body.game;const route='/api/games/'+game.id;
 const change=(suffix,body)=>f.request(route+'/'+suffix,{method:'POST',cookie,body});
 const hinted=await change('hint',{revision:0});assert.equal(hinted.status,200);assert.equal(hinted.body.san,'e4');assert.equal(hinted.body.game.hintsUsed,1);assert.equal(hinted.body.game.revision,1);
 assert.equal((await change('move',{revision:0,move:'e2e4'})).status,409);
 game=(await change('move',{revision:1,move:'e2e4'})).body.game;
 // Seed a legal opponent reply to inspect assistance independently of the opponent engine fixture.
 game.moves.push('e7e5');game.revision++;f.db.prepare('UPDATE games SET revision=?,data=? WHERE id=?').run(game.revision,JSON.stringify(game),game.id);
 const review=await f.request('/api/analyze',{method:'POST',cookie,body:{gameId:game.id,moves:game.moves}});assert.equal(review.status,200);assert.equal((await f.request(route,{cookie})).body.game.reviewUsed,true);
 const assist=await change('assist',{revision:3});assert.equal(assist.status,200);assert.ok(assist.body.analysis);assert.ok(assist.body.feedback);assert.equal(calls.at(-1).playedMove,'e2e4');assert.equal(assist.body.game.hintsUsed,1);
 const study={version:1,branches:[{id:'b',parentId:null,anchorPly:1,moves:['e2e4','c7c5'],question:'Sicilian?'}],selectedBranchId:'b',anchorPly:1};
 assert.equal((await change('study',{studyRevision:0,study})).status,200);assert.equal((await change('undo',{revision:3})).status,400);
 assert.deepEqual((await f.request(route,{cookie})).body.game.moves,['e2e4','e7e5']);
 assert.equal((await change('study',{studyRevision:1,study:{version:1,branches:[],selectedBranchId:null,anchorPly:0}})).status,200);
 const undone=await change('undo',{revision:3});assert.equal(undone.status,200);assert.deepEqual(undone.body.game.moves,[]);assert.equal(undone.body.game.undosUsed,1);assert.equal(undone.body.game.hintsUsed,1);assert.equal(undone.body.game.studyRevision,2);
 }finally{await f.close();}
});

test('a timeout saved during an engine request rejects the late reply without overwriting the result',async()=>{
 let stamp=1000,release,started;const wait=new Promise(r=>started=r);
 const opponentApi={listOpponentEngines:async()=>[{id:'maia2',available:true}],chooseOpponentMove:async()=>{started();return new Promise(r=>release=r);}};
 const f=await fixture({opponentApi,nowMs:()=>stamp});try{
  const {cookie}=await f.register('raceplayer');const game=(await f.request('/api/games',{method:'POST',cookie,body:{engineId:'maia2',color:'b',timeControl:{initialSeconds:60,incrementSeconds:0}}})).body.game;const route='/api/games/'+game.id;
  const pending=f.request(route+'/bot',{method:'POST',cookie,body:{revision:0}});await wait;
  stamp=62000;const timed=await f.request(route,{cookie});assert.equal(timed.body.game.result,'0-1');assert.equal(timed.body.game.revision,1);
  release({move:'e2e4',engine:'Maia2',engineId:'maia2'});assert.equal((await pending).status,409);
  const saved=(await f.request(route,{cookie})).body.game;assert.equal(saved.result,'0-1');assert.deepEqual(saved.moves,[]);
 }finally{release?.({move:'e2e4'});await f.close();}
});
