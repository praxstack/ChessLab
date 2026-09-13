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

function reviewEvidence({moves,initialFen,playedMove,movetime,threads}) {
 const before=new Chess(initialFen||undefined);for(const move of moves)before.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
 const turn=before.turn(),fen=before.fen(),best=before.moves({verbose:true})[0];
 const played=before.move({from:playedMove.slice(0,2),to:playedMove.slice(2,4),promotion:playedMove[4]});
 return {engine:'Stockfish fixture',fen,turn,bestmove:best.from+best.to,limits:{movetime,threads,lines:1,engineId:'stockfish19'},lines:[{move:best.from+best.to,moves:[best.from+best.to],san:[best.san],score:{type:'cp',value:30},depth:12}],explanation:'Verified test evidence',played:{move:playedMove,san:played.san,classification:before.isCheckmate()?'Checkmate':'Mistake',lossCp:before.isCheckmate()?null:200,afterScore:before.isCheckmate()?null:{type:'cp',value:turn==='w'?-170:230},explanation:'A test continuation.'}};
}

test('full game review preserves ownership, resumes from disk and never rewrites games or studies',async()=>{
 let calls=0,failNext=false;const f=await fixture({engineApi:{analyze:async input=>{if(failNext)throw Object.assign(new Error('Engine unavailable'),{status:503});calls++;return reviewEvidence(input);}}});
 try{
  const {cookie}=await f.register('reviewowner'),bob=await f.register('reviewother');
  const imported=await f.request('/api/import',{method:'POST',cookie,body:{pgn:'1. f3 e5 2. g4 Qh4# 0-1'}});let game=imported.body.game;const route=`/api/games/${game.id}/review`;
  const study={version:1,anchorPly:1,selectedBranchId:'review-study',branches:[{id:'review-study',parentId:null,anchorPly:1,moves:['f2f3','d7d5'],question:'Can Black play in the centre?'}]};
  assert.equal((await f.request(`/api/games/${game.id}/study`,{method:'POST',cookie,body:{study,studyRevision:0}})).status,200);game=(await f.request(`/api/games/${game.id}`,{cookie})).body.game;
  assert.equal((await f.request(route)).status,401);assert.equal((await f.request(route,{cookie:bob.cookie})).status,404);
  assert.equal((await f.request(route,{cookie})).body.review,null);
  const step=(after,extra={})=>f.request(route,{method:'POST',cookie,body:{revision:game.revision,after,movetime:50,threads:1,...extra}});
  assert.equal((await step(0,{revision:99})).status,409);assert.equal((await step(0,{movetime:90001})).status,400);assert.equal((await step(3)).status,409);
  let result=await step(0);assert.equal(result.status,200);assert.equal(result.body.review.entries.length,1);assert.equal(result.body.review.complete,false);
  const snapshot=structuredClone(result.body.review);await f.restart();
  assert.deepEqual((await f.request(route,{cookie})).body.review,snapshot);assert.equal(calls,1,'Loading a saved report does not search');
  assert.equal((await step(0)).status,409,'A duplicate cursor cannot skip or duplicate moves');
  failNext=true;assert.equal((await step(1)).status,503);assert.deepEqual((await f.request(route,{cookie})).body.review,snapshot,'Engine failure preserves the saved step');failNext=false;
  for(let after=1;after<4;after++){result=await step(after);assert.equal(result.status,200);}
  const report=result.body.review;assert.equal(report.complete,true);assert.equal(report.entries.length,4);assert.equal(report.players.w.moves,2);assert.equal(report.players.b.moves,2);assert.equal(report.players.w.averageLossCp,200);assert.equal(report.players.b.measuredMoves,1);assert.equal(report.entries[3].evaluation.type,'result');assert.equal(report.entries[3].evaluation.value,'0-1');
  assert.equal((await step(4)).status,200);assert.equal(calls,4,'Completed report is reused');
  assert.deepEqual((await f.request(`/api/games/${game.id}`,{cookie})).body.game,game,'Review preserves complete game and study state');
  const draw=await f.request('/api/import',{method:'POST',cookie,body:{pgn:'[SetUp "1"]\n[FEN "8/8/8/8/8/1k6/P7/7K b - - 0 1"]\n\n1... Kxa2 1/2-1/2'}});assert.equal(draw.status,201);
  const drawn=await f.request(`/api/games/${draw.body.game.id}/review`,{method:'POST',cookie,body:{revision:0,after:0,movetime:50,threads:1}});assert.equal(drawn.status,200);assert.deepEqual(drawn.body.review.entries[0].evaluation,{type:'cp',value:0});
  const live=await f.request('/api/games',{method:'POST',cookie,body:{color:'w',level:2}});
  assert.equal((await f.request(`/api/games/${live.body.game.id}/review`,{method:'POST',cookie,body:{revision:0,after:0,movetime:50,threads:1}})).status,409);
 }finally{await f.close();}
});

test('review rejects concurrent or stale engine results and preserves the last saved step on failure',async()=>{
 let release,start,failNext=false;const begun=new Promise(resolve=>start=resolve);
 const f=await fixture({engineApi:{analyze:input=>{if(failNext)throw Object.assign(new Error('Engine unavailable'),{status:503});start();return new Promise(resolve=>release=()=>resolve(reviewEvidence(input)));}}});
 try{
  const {cookie}=await f.register('reviewrace');const {body}=await f.request('/api/import',{method:'POST',cookie,body:{pgn:'1. e4 e5 2. Nf3 Nc6 *'}});const game=body.game,route=`/api/games/${game.id}/review`;
  const request={method:'POST',cookie,body:{revision:0,after:0,movetime:50,threads:1}};
  assert.equal((await f.request(route,{cookie})).status,200);
  const running=f.request(route,request);await begun;
  assert.equal((await f.request(route,request)).status,409);
  const changed={...game,moves:game.moves.slice(0,2),revision:1};f.db.prepare('UPDATE games SET data=?,revision=? WHERE id=?').run(JSON.stringify(changed),1,game.id);
  release();assert.equal((await running).status,409);assert.equal((await f.request(route,{cookie})).body.review,null);
  failNext=true;assert.equal((await f.request(route,{...request,body:{...request.body,revision:1}})).status,503);assert.equal((await f.request(route,{cookie})).body.review,null);
 }finally{release?.();await f.close();}
});


test('disconnecting a review cancels its search and releases the game for resume',{timeout:10000},async()=>{
 let start,canceled,delay=true;const started=new Promise(resolve=>start=resolve),aborted=new Promise(resolve=>canceled=resolve);
 const f=await fixture({engineApi:{analyze:async(input,{signal})=>{if(delay){start();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{canceled();reject(Object.assign(new Error('Canceled'),{status:499}));},{once:true}));}return reviewEvidence(input);}}});
 try{
  const {cookie}=await f.register('reviewcancel');const {body}=await f.request('/api/import',{method:'POST',cookie,body:{pgn:'1. e4 e5 *'}});const route=`/api/games/${body.game.id}/review`,bodyText={revision:0,after:0,movetime:50,threads:1},controller=new AbortController();
  const running=fetch(f.base+route,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(bodyText),signal:controller.signal}).catch(error=>error);
  await started;controller.abort();await running;await aborted;
  assert.equal((await f.request(route,{cookie})).body.review,null);delay=false;
  assert.equal((await f.request(route,{method:'POST',cookie,body:bodyText})).body.review.entries.length,1);
 }finally{await f.close();}
});

test('position practice copies a saved branch, preserves its source and resets only new play',async()=>{
 const opponentApi={listOpponentEngines:async()=>[{id:'stockfish19',available:true}],chooseOpponentMove:async()=>({move:'b8c6',engine:'Stockfish fixture'})};
 const f=await fixture({opponentApi});try{
  const {cookie}=await f.register('practiceowner'),other=await f.register('practiceother');
  const imported=await f.request('/api/import',{method:'POST',cookie,body:{pgn:'1. e4 e5 2. Nf3 Nc6 *'}});const id=imported.body.game.id,route=`/api/games/${id}`;
  const study={version:1,anchorPly:2,selectedBranchId:'nested',branches:[{id:'first',parentId:null,anchorPly:2,moves:['e2e4','e7e5','d2d4'],question:'Try the centre'},{id:'nested',parentId:'first',anchorPly:3,moves:['e2e4','e7e5','d2d4','e5d4'],question:'Recapture?'}]};
  assert.equal((await f.request(route+'/study',{method:'POST',cookie,body:{study,studyRevision:0}})).status,200);
  const source=(await f.request(route,{cookie})).body.game;
  const body={revision:0,studyRevision:1,branchId:'nested',ply:4,botId:'martin',engineId:'stockfish19',rating:250,color:'w',timeControl:{initialSeconds:60,incrementSeconds:2}};
  const practice=(extra={},owner=cookie)=>f.request(route+'/practice',{method:'POST',cookie:owner,body:{...body,...extra}});
  assert.equal((await practice({},other.cookie)).status,404);assert.equal((await practice({revision:1})).status,409);assert.equal((await practice({studyRevision:0})).status,409);assert.equal((await practice({ply:5})).status,400);assert.equal((await practice({branchId:'absent'})).status,400);
  const created=await practice();assert.equal(created.status,201);const game=created.body.game,child=`/api/games/${game.id}`;
  assert.deepEqual(game.moves,study.branches[1].moves);assert.equal(game.initialFen,source.initialFen);assert.equal(game.practice.startPly,4);assert.equal(game.practice.sourceBranchId,'nested');assert.equal(game.practice.sourceGameId,id);assert.equal(game.clockHistory.length,1);
  assert.equal((await f.request(child+'/undo',{method:'POST',cookie,body:{revision:0}})).status,400);
  const moved=await f.request(child+'/move',{method:'POST',cookie,body:{move:'g1f3',revision:0}});assert.equal(moved.status,200);
  const replied=await f.request(child+'/bot',{method:'POST',cookie,body:{revision:1}});assert.equal(replied.status,200);
  const undone=await f.request(child+'/undo',{method:'POST',cookie,body:{revision:2}});assert.equal(undone.status,200);assert.deepEqual(undone.body.game.moves,game.moves);assert.equal(undone.body.game.clockHistory.length,1);assert.equal(undone.body.game.clock.whiteMs,60000);assert.equal(undone.body.game.clock.blackMs,60000);
  const restarted=await f.request(child+'/practice',{method:'POST',cookie,body:{...body,revision:3,restart:true}});assert.equal(restarted.status,201);assert.deepEqual(restarted.body.game.moves,game.moves);assert.deepEqual(restarted.body.game.practice,game.practice);assert.equal(restarted.body.game.undosUsed,0);
  assert.deepEqual((await f.request(route,{cookie})).body.game,source);
  await f.restart();assert.deepEqual((await f.request(child,{cookie})).body.game.practice,game.practice);
  const exported=await f.request(child+'/pgn',{cookie});const replayed=new Chess();replayed.loadPgn(exported.body);assert.equal(replayed.history().length,4);
 }finally{await f.close();}
});

test('practice revalidates a changed source after engine readiness and marks live-source review assistance',async()=>{
 let ready,release;const entered=new Promise(resolve=>ready=resolve);let pause=true;
 const opponentApi={listOpponentEngines:async()=>{if(pause){ready();await new Promise(resolve=>release=resolve);}return [{id:'stockfish19',available:true}];}};
 const f=await fixture({opponentApi});try{
  const {cookie}=await f.register('practicefresh');const imported=await f.request('/api/import',{method:'POST',cookie,body:{pgn:'1. e4 e5 *'}}),source=imported.body.game,route=`/api/games/${source.id}`;
  const study={version:1,anchorPly:1,selectedBranchId:'a',branches:[{id:'a',parentId:null,anchorPly:1,moves:['e2e4','c7c5'],question:''}]};
  await f.request(route+'/study',{method:'POST',cookie,body:{study,studyRevision:0}});
  const pending=f.request(route+'/practice',{method:'POST',cookie,body:{revision:0,studyRevision:1,branchId:'a',ply:2,engineId:'stockfish19',rating:800}});
  await entered;await f.request(route+'/study',{method:'POST',cookie,body:{study:{...study,branches:[{...study.branches[0],moves:['e2e4','e7e6']}]},studyRevision:1}});pause=false;release();assert.equal((await pending).status,409);
  assert.equal((await f.request('/api/games',{cookie})).body.games.length,1);
  const live=await f.request('/api/games',{method:'POST',cookie,body:{color:'w',level:2}});const id=live.body.game.id;
  const practice=await f.request(`/api/games/${id}/practice`,{method:'POST',cookie,body:{revision:0,ply:0,engineId:'stockfish19',rating:800,color:'b'}});assert.equal(practice.status,201);assert.equal(practice.body.game.color,'b');
  assert.equal((await f.request(`/api/games/${id}`,{cookie})).body.game.reviewUsed,true);
 }finally{release?.();await f.close();}
});

test('custom positions validate before saving and retain FEN through analysis, branches, practice, export and reload',async()=>{
 const f=await fixture();try{
  const fen='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 12';
  assert.equal((await f.request('/api/positions',{method:'POST',body:{fen}})).status,401);
  const {cookie}=await f.register('positionowner'),other=await f.register('positionother');
  const invalid=['8/8/8/8/8/8/8/8 w - - 0 1','8/8/8/8/8/8/4k3/4K3 w - - 0 1','4k3/8/8/8/8/8/8/4K2R w KQ - 0 1','4k3/8/8/8/8/8/8/4K3 b - e3 0 1','4k3/8/8/8/8/8/8/4R1K1 w - - 0 1',fen.replace('0 12','0x 12')];
  for(const bad of invalid)assert.equal((await f.request('/api/positions',{method:'POST',cookie,body:{fen:bad}})).status,400,bad);
  assert.equal((await f.request('/api/games',{cookie})).body.games.length,0);
  const saved=await f.request('/api/positions',{method:'POST',cookie,body:{fen,title:'Black to move'}});assert.equal(saved.status,201);const game=saved.body.game,route=`/api/games/${game.id}`;
  assert.equal(game.initialFen,fen);assert.deepEqual(game.moves,[]);assert.equal(game.positionSetup,true);assert.equal((await f.request(route,{cookie:other.cookie})).status,404);
  const study={version:1,anchorPly:0,selectedBranchId:'line',branches:[{id:'line',parentId:null,anchorPly:0,moves:['e7e5'],question:'Black moves first'}]};
  assert.equal((await f.request(route+'/study',{method:'POST',cookie,body:{study,studyRevision:0}})).status,200);
  const practice=await f.request(route+'/practice',{method:'POST',cookie,body:{revision:0,ply:0,color:'b',level:2,timeControl:{initialSeconds:60,incrementSeconds:0}}});assert.equal(practice.status,201);assert.equal(practice.body.game.initialFen,fen);
  const played=await f.request(`/api/games/${practice.body.game.id}/move`,{method:'POST',cookie,body:{revision:0,move:'e7e5'}});assert.equal(played.status,200);
  const exported=await f.request(route+'/pgn',{cookie});assert.match(exported.body,/\[SetUp "1"\]/);assert.match(exported.body,/\[FEN /);
  const imported=await f.request('/api/import',{method:'POST',cookie,body:{pgn:exported.body}});assert.equal(imported.status,201);assert.equal(imported.body.game.initialFen,fen);assert.deepEqual(imported.body.game.moves,[]);
  const badPgn='[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R w KQ - 0 1"]\n\n*';
  assert.equal((await f.request('/api/import',{method:'POST',cookie,body:{pgn:badPgn}})).status,400);
  const terminal=await f.request('/api/positions',{method:'POST',cookie,body:{fen:'7k/6Q1/5K2/8/8/8/8/8 b - - 0 1'}});assert.equal(terminal.status,201);assert.equal(terminal.body.game.result,'1-0');
  await f.restart();const restored=(await f.request(route,{cookie})).body.game;assert.equal(restored.initialFen,fen);assert.deepEqual(restored.study,study);
 }finally{await f.close();}
});

test('opening catalogue is bounded and opening studies retain complete owned history for practice',async()=>{
 const f=await fixture();try{
  const list=await f.request('/api/openings?q=Italian%20Game&eco=C');assert.equal(list.status,200);assert.ok(list.body.total>0);assert.ok(list.body.items.length<=24);assert.ok(list.body.items.every(item=>item.eco.startsWith('C')));
  assert.equal((await f.request('/api/openings?page=-1')).status,400);assert.equal((await f.request('/api/openings?eco=Z')).status,400);assert.equal((await f.request('/api/openings?q=nonexistent_chess_name')).body.total,0);
  const id=list.body.items.find(item=>item.name==='Italian Game').id,detail=await f.request('/api/openings/'+id);assert.equal(detail.status,200);assert.ok(detail.body.opening.moves.length>=5);
  assert.equal((await f.request(`/api/openings/${id}/study`,{method:'POST',body:{}})).status,401);
  const {cookie}=await f.register('openingowner'),other=await f.register('openingother');
  const saved=await f.request(`/api/openings/${id}/study`,{method:'POST',cookie,body:{moves:['e2e3']}});assert.equal(saved.status,201);const game=saved.body.game,route=`/api/games/${game.id}`;
  assert.deepEqual(game.moves,detail.body.opening.moves);assert.equal(game.opening.id,id);assert.equal((await f.request(route,{cookie:other.cookie})).status,404);
  const practice=await f.request(route+'/practice',{method:'POST',cookie,body:{ply:2,revision:0,color:'w',level:2}});assert.equal(practice.status,201);assert.deepEqual(practice.body.game.moves,game.moves.slice(0,2));assert.deepEqual((await f.request(route,{cookie})).body.game.moves,game.moves);
  const found=await f.request('/api/openings/recognize',{method:'POST',cookie,body:{moves:game.moves}});assert.equal(found.status,200);assert.equal(found.body.opening.name,'Italian Game');assert.equal(found.body.opening.matchType,'line');
  assert.equal((await f.request('/api/openings/recognize',{method:'POST',cookie,body:{moves:['e2e5']}})).status,400);
  const live=(await f.request('/api/games',{method:'POST',cookie,body:{color:'w',level:2}})).body.game;
  assert.equal((await f.request('/api/openings/recognize',{method:'POST',cookie:other.cookie,body:{gameId:live.id,moves:[]}})).status,404);
  assert.equal((await f.request('/api/openings/recognize',{method:'POST',cookie,body:{gameId:live.id,moves:[]}})).status,200);assert.equal((await f.request(`/api/games/${live.id}`,{cookie})).body.game.reviewUsed,true);
  const exported=await f.request(route+'/pgn',{cookie});assert.match(exported.body,/\[Opening "Italian Game"\]/);assert.match(exported.body,/\[ECO "C50"\]/);
  await f.restart();assert.equal((await f.request(route,{cookie})).body.game.opening.id,id);
 }finally{await f.close();}
});

test('training attempts protect solutions, ownership, revisions, hints and history across restart',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync}=await import('node:fs');
 const temp=mkdtempSync(join(tmpdir(),'puzzle-source-')),sourcePath=join(temp,'catalogue.sqlite');const source=new DatabaseSync(sourcePath);
 const rows=JSON.parse(readFileSync(new URL('../references/puzzles/test-lines.json',import.meta.url),'utf8'));
 source.exec('CREATE TABLE puzzles(seq INTEGER PRIMARY KEY,id TEXT,fen TEXT,moves TEXT,rating INTEGER,themes TEXT,game_url TEXT,opening_tags TEXT);CREATE TABLE pool(theme TEXT,rating INTEGER,seq INTEGER);CREATE TABLE metadata(key TEXT,value TEXT);');
 const row=rows[0];source.prepare('INSERT INTO puzzles VALUES (?,?,?,?,?,?,?,?)').run(...Object.values(row));source.prepare('INSERT INTO pool VALUES (?,?,?)').run('mateIn2',row.rating,row.seq);source.prepare('INSERT INTO pool VALUES (?,?,?)').run('',row.rating,row.seq);source.prepare('INSERT INTO metadata VALUES (?,?)').run('catalogue',JSON.stringify({count:1,themes:{mateIn2:1},source:'https://database.lichess.org/#puzzles',license:'CC0-1.0'}));source.close();
 const f=await fixture({puzzleCataloguePath:sourcePath});try{
  assert.equal((await f.request('/api/training/catalog')).body.count,1);assert.equal((await f.request('/api/training')).status,401);
  const {cookie}=await f.register('trainer'),other=await f.register('outsider');
  const request=(path,body,c=cookie)=>f.request(path,{method:'POST',cookie:c,body});
  assert.equal((await request('/api/training/start',{theme:'unknown'})).status,400);
  const first=await request('/api/training/start',{theme:'mateIn2',min:1000,max:2000});assert.equal(first.status,201);let a=first.body.attempt;const route='/api/training/'+a.id;
  assert.equal(a.puzzle.id,row.id);assert.equal(a.puzzle.solution,undefined);assert.equal(a.solution,undefined);assert.equal(a.puzzle.initialFen,undefined);
  const sourceMoves=row.moves.split(' '),board=new Chess(row.fen);board.move({from:sourceMoves[0].slice(0,2),to:sourceMoves[0].slice(2,4)});assert.equal(a.puzzle.fen,board.fen());assert.equal(a.puzzle.side,board.turn());
  assert.equal((await request('/api/training/start',{})).status,409);assert.equal((await f.request(route,{cookie:other.cookie})).status,404);assert.equal((await request(route+'/action',{action:'reveal',revision:0},other.cookie)).status,404);
  const wrong=board.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')!==sourceMoves[1]);const wrongMove=wrong.from+wrong.to+(wrong.promotion||'');
  const missed=await request(route+'/action',{action:'move',move:wrongMove,revision:0});assert.equal(missed.status,200);assert.equal(missed.body.correct,false);a=missed.body.attempt;assert.equal(a.mistakes,1);assert.deepEqual(a.moves,[]);
  assert.equal((await request(route+'/action',{action:'move',move:sourceMoves[1],revision:0})).status,409);
  const hinted=await request(route+'/action',{action:'hint',revision:a.revision});a=hinted.body.attempt;assert.equal(a.assisted,true);assert.equal(a.hint,sourceMoves[1].slice(0,2));assert.equal(a.puzzle.solution,undefined);
  const correct=await request(route+'/action',{action:'move',move:sourceMoves[1],revision:a.revision});a=correct.body.attempt;assert.deepEqual(a.moves,sourceMoves.slice(1,3));assert.equal(a.hint,null);
  await f.restart();assert.deepEqual((await f.request('/api/training',{cookie})).body.attempt.moves,a.moves);
  const solved=await request(route+'/action',{action:'move',move:sourceMoves[3],revision:a.revision});a=solved.body.attempt;assert.equal(a.state,'solved');assert.equal((await request(route+'/action',{action:'move',move:sourceMoves[3],revision:a.revision})).status,409);
  let status=(await f.request('/api/training',{cookie})).body;assert.equal(status.totals.solved,1);assert.equal(status.totals.unassisted,0);assert.equal(status.history[0].puzzleId,row.id);
  const saved=await request(route+'/study',{});assert.equal(saved.status,201);assert.equal(saved.body.game.initialFen,row.fen);assert.deepEqual(saved.body.game.moves,sourceMoves);assert.equal(saved.body.game.result,'1-0');
  assert.equal((await f.request(`/api/games/${saved.body.game.id}`,{cookie:other.cookie})).status,404);
  const retry=await request('/api/training/start',{failedOnly:true,theme:'mateIn2',min:1000,max:2000});assert.equal(retry.status,201);a=retry.body.attempt;assert.equal(a.puzzle.id,row.id);assert.equal(a.assisted,false);
  const revealed=await request('/api/training/'+a.id+'/action',{action:'reveal',revision:0});assert.equal(revealed.body.attempt.state,'revealed');assert.deepEqual(revealed.body.attempt.solution,sourceMoves.slice(1));
  assert.equal((await request('/api/training/start',{fromAttempt:a.id},other.cookie)).status,404);
  status=(await f.request('/api/training',{cookie})).body;assert.equal(status.totals.attempts,2);assert.equal(status.totals.solved,1);
  assert.equal((await f.request('/api/rush')).status,401);
  let rush=(await request('/api/rush/start',{variant:'survival'})).body.run;assert.ok(rush.id);const rushRoute='/api/rush/'+rush.id;
  assert.equal((await f.request(rushRoute,{cookie:other.cookie})).status,404);assert.equal((await request(rushRoute+'/retry',{index:0},other.cookie)).status,404);
  const firstRushMove=await request(rushRoute+'/action',{action:'move',move:sourceMoves[1],revision:0});assert.equal(firstRushMove.status,200);rush=firstRushMove.body.run;assert.equal(rush.score,0);assert.equal(rush.items.length,0);assert.deepEqual(rush.current.moves,sourceMoves.slice(1,3));assert.equal(rush.current.puzzle.solution,undefined);
  await f.restart();assert.equal((await f.request('/api/training',{cookie})).body.rush.id,rush.id);assert.deepEqual((await f.request('/api/rush',{cookie})).body.run.current.moves,rush.current.moves);
  rush=(await request(rushRoute+'/action',{action:'move',move:sourceMoves[3],revision:rush.revision})).body.run;assert.equal(rush.score,1);assert.equal(rush.state,'finished');assert.equal(rush.reason,'catalogue');
  const rushRetry=await request(rushRoute+'/retry',{index:0});assert.equal(rushRetry.status,201);assert.equal(rushRetry.body.attempt.mode,'custom');assert.equal(rushRetry.body.attempt.puzzle.id,row.id);

 }finally{await f.close();rmSync(temp,{recursive:true,force:true});}
});


test('guided curriculum API protects answers, ownership and all-challenge completion across restart',async()=>{
 const f=await fixture();try{
  const publicLessons=await f.request('/api/curriculum');assert.equal(publicLessons.status,200);assert.equal(publicLessons.body.courses.length,4);assert.equal(publicLessons.body.lessons.length,12);assert.equal(publicLessons.body.lessons[0].challenges[0].solution,undefined);
  assert.equal((await f.request('/api/lesson-progress')).status,401);const alice=await f.register('course_alice'),bob=await f.register('course_bob'),route='/api/course-lessons/rook-lines';
  const post=(suffix,body,cookie=alice.cookie)=>f.request(route+suffix,{method:'POST',body,cookie});let result=await post('/start',{});assert.equal(result.status,201);let session=result.body.session;assert.equal(session.current.puzzle.solution,undefined);
  assert.equal((await post('/action',{id:session.id,revision:0,action:'move',move:'a1a7'},bob.cookie)).status,404);assert.equal((await f.request('/api/lessons/rook-lines/answer',{method:'POST',cookie:alice.cookie,body:{choice:0}})).status,404);
  result=await post('/action',{id:session.id,revision:0,action:'move',move:'a1a2'});assert.equal(result.body.correct,false);session=result.body.session;assert.deepEqual(session.current.moves,[]);assert.deepEqual(result.body.progress.completed,[]);
  result=await post('/action',{id:session.id,revision:session.revision,action:'move',move:'a1a7'});session=result.body.session;assert.deepEqual(result.body.progress.completed,[]);
  session=(await post('/action',{id:session.id,revision:session.revision,action:'next'})).body.session;await f.restart();assert.equal((await post('/start',{})).body.session.step,1);
  result=await post('/action',{id:session.id,revision:session.revision,action:'move',move:'h8h2'});assert.equal(result.body.session.state,'complete');assert.deepEqual(result.body.progress.completed,['rook-lines']);assert.deepEqual((await f.request('/api/me',{cookie:alice.cookie})).body.progress.lessons,['rook-lines']);assert.deepEqual((await f.request('/api/lesson-progress',{cookie:bob.cookie})).body.completed,[]);
 }finally{await f.close();}
});

test('collections isolate accounts, reject stale or partial edits and preserve games through restart and deletion',async()=>{
 const f=await fixture();try{
  assert.equal((await f.request('/api/collections')).status,401);
  const alice=await f.register('collector'),bob=await f.register('outsider'),cookie=alice.cookie;
  const post=(path,body,c=cookie)=>f.request(path,{method:'POST',body,cookie:c});
  const a=(await post('/api/import',{pgn:'[White "Archive"]\n[Black "Study"]\n\n1. e4 e5 2. Nf3 *'})).body.game;
  const b=(await post('/api/games',{color:'w'})).body.game;
  const foreign=(await post('/api/games',{color:'w'},bob.cookie)).body.game;
  const study={version:1,branches:[{id:'branch-a',parentId:null,anchorPly:0,moves:['d2d4'],question:'Another center?'}],selectedBranchId:'branch-a',anchorPly:0};
  await post(`/api/games/${a.id}/study`,{study,studyRevision:0});
  const original=(await f.request(`/api/games/${a.id}`,{cookie})).body.game;
  assert.equal((await post('/api/collections',{name:'  '})).status,400);
  assert.equal((await post('/api/collections',{name:'x'.repeat(81)})).status,400);
  let created=await post('/api/collections',{name:'  Opening ideas  ',description:'Lines to revisit'});assert.equal(created.status,201);
  let c=created.body.collection;assert.equal(c.name,'Opening ideas');assert.deepEqual(c.gameIds,[]);
  const other=(await post('/api/collections',{name:'Favorites'})).body.collection;
  assert.equal((await post('/api/collections',{name:'opening ideas'})).status,409);
  assert.deepEqual((await f.request('/api/collections',{cookie:bob.cookie})).body.collections,[]);
  const route=`/api/collections/${c.id}`;
  assert.equal((await post(route,{revision:0,name:'Stolen'},bob.cookie)).status,404);
  assert.equal((await post(route+'/games',{revision:0,gameIds:[a.id,foreign.id],present:true})).status,404);
  c=(await f.request('/api/collections',{cookie})).body.collections.find(x=>x.id===c.id);assert.equal(c.revision,0);assert.deepEqual(c.gameIds,[]);
  assert.equal((await post(route+'/games',{revision:0,gameIds:[a.id],present:'yes'})).status,400);
  c=(await post(route+'/games',{revision:0,gameIds:[a.id,b.id,a.id],present:true})).body.collection;assert.equal(c.gameIds.length,2);assert.equal(c.revision,1);
  assert.equal((await post(route+'/games',{revision:0,gameIds:[a.id],present:false})).status,409);
  assert.equal((await post(route,{revision:1,name:'Favorites'})).status,409);
  assert.equal((await f.request('/api/collections',{cookie})).body.collections.find(x=>x.id===c.id).revision,1);
  c=(await post(route,{revision:1,name:'My openings',description:'Saved lines'})).body.collection;assert.equal(c.revision,2);
  await post(`/api/collections/${other.id}/games`,{revision:0,gameIds:[a.id],present:true});
  f.db.exec("CREATE TRIGGER refuse_collection_change BEFORE UPDATE ON game_collections BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  assert.equal((await post(route+'/games',{revision:2,gameIds:[a.id],present:false})).status,500);
  f.db.exec('DROP TRIGGER refuse_collection_change');
  c=(await f.request('/api/collections',{cookie})).body.collections.find(x=>x.id===c.id);assert.equal(c.revision,2);assert.equal(c.gameIds.length,2);
  c=(await post(route+'/games',{revision:2,gameIds:[a.id],present:false})).body.collection;assert.deepEqual(c.gameIds,[b.id]);
  await f.restart();let all=(await f.request('/api/collections',{cookie})).body.collections;
  assert.equal(all.find(x=>x.id===c.id).name,'My openings');assert.deepEqual(all.find(x=>x.id===other.id).gameIds,[a.id]);
  assert.deepEqual((await f.request(`/api/games/${a.id}`,{cookie})).body.game,original);
  assert.equal((await post(route+'/delete',{revision:3},bob.cookie)).status,404);
  assert.equal((await post(route+'/delete',{revision:2})).status,409);
  assert.equal((await post(route+'/delete',{revision:3})).status,200);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_games WHERE collection_id=?').get(c.id).n,0);
  assert.equal((await f.request('/api/games',{cookie})).body.games.length,2);
  assert.deepEqual((await f.request(`/api/games/${a.id}`,{cookie})).body.game,original);
 }finally{await f.close();}
});

test('annotated imports, node comments and portable study copies preserve original games and reject bad trees',async()=>{
 const f=await fixture();try{
  const {cookie}=await f.register('annotator'),bob=await f.register('different');
  const post=(path,body,c=cookie)=>f.request(path,{method:'POST',cookie:c,body});
  const pgn='[White "Student"]\n[Black "Coach"]\n\n1. e4 {Central space} e5 (1... c5 $1 2. Nf3 (2. Nc3 {A different knight})) 2. Nf3 *';
  const imported=await post('/api/import',{pgn});assert.equal(imported.status,201);const g=imported.body.game,id=g.id;assert.equal(g.study.branches.length,2);
  const study=structuredClone(g.study);study.selectedBranchId=study.branches[1].id;study.annotations.push({branchId:study.branches[0].id,ply:1,comment:'At this exact branch root {keep me}',nags:[]});
  const saved=await post(`/api/games/${id}/study`,{study,studyRevision:0});assert.equal(saved.status,200);
  assert.equal((await post(`/api/games/${id}/study`,{study,studyRevision:0})).status,409);
  const portable=(await f.request(`/api/games/${id}/study-file`,{cookie})).body;
  assert.equal((await f.request(`/api/games/${id}/study-file`,{cookie:bob.cookie})).status,404);
  const copied=await post('/api/import-study',portable);assert.equal(copied.status,201);assert.notEqual(copied.body.game.id,id);assert.deepEqual(copied.body.game.study,study);
  const exported=(await f.request(`/api/games/${id}/pgn`,{cookie})).body;assert.match(exported,/Nc3/);assert.match(exported,/Central space/);assert.equal((await post('/api/import',{pgn:exported})).status,201);
  const count=(await f.request('/api/games',{cookie})).body.games.length;
  assert.equal((await post('/api/import',{pgn:'1. e4 (1. d5) e5 *'})).status,400);
  portable.game.study.annotations[0].ply=999;assert.equal((await post('/api/import-study',portable)).status,400);assert.equal((await f.request('/api/games',{cookie})).body.games.length,count);
  await f.restart();assert.deepEqual((await f.request(`/api/games/${id}`,{cookie})).body.game.study,study);
  assert.deepEqual((await f.request(`/api/games/${id}`,{cookie})).body.game.moves,g.moves);
 }finally{await f.close();}
});

test('undo cannot remove an annotated original-game position',async()=>{
 const f=await fixture();try{const {cookie}=await f.register('notekeeper');const post=(path,body)=>f.request(path,{method:'POST',cookie,body});const g=(await post('/api/games',{color:'w',level:2})).body.game;
 const route=`/api/games/${g.id}`;await post(route+'/move',{move:'e2e4',revision:0});await post(route+'/bot',{revision:1});
 const study={version:1,branches:[],selectedBranchId:null,anchorPly:0,annotations:[{branchId:null,ply:2,comment:'Keep this decision',nags:[5]}]};assert.equal((await post(route+'/study',{study,studyRevision:0})).status,200);assert.equal((await post(route+'/undo',{revision:2})).status,400);assert.deepEqual((await f.request(route,{cookie})).body.game.moves,['e2e4','e7e5']);
 }finally{await f.close();}
});


test('board drawings persist at exact study nodes, travel in PGN and reject invalid or foreign writes',async()=>{
 const f=await fixture();try{
  const {cookie}=await f.register('drawer'),other=await f.register('outsider');const post=(path,body,c=cookie)=>f.request(path,{method:'POST',cookie:c,body});
  const g=(await post('/api/import',{pgn:'1. e4 {Center [%cal Ge2e4]} e5 (1... c5 {[%csl Bc5]}) *'})).body.game,route=`/api/games/${g.id}`,study=structuredClone(g.study);
  study.annotations[0].comment='A changed note keeps its arrow.';study.annotations.push({branchId:study.branches[0].id,ply:1,comment:'Before c5',nags:[],marks:[{from:'b8',to:'c6',color:'Y'}]});
  assert.equal((await post(route+'/study',{study,studyRevision:0},other.cookie)).status,404);assert.equal((await post(route+'/study',{study,studyRevision:0})).status,200);
  const invalid=structuredClone(study);invalid.annotations[0].marks[0].color='purple';assert.equal((await post(route+'/study',{study:invalid,studyRevision:1})).status,400);
  const portable=(await f.request(route+'/study-file',{cookie})).body;assert.deepEqual(portable.game.study,study);const copied=await post('/api/import-study',portable);assert.equal(copied.status,201);assert.deepEqual(copied.body.game.study,study);
  const pgn=(await f.request(route+'/pgn',{cookie})).body;assert.match(pgn,/\[%cal Ge2e4\]/);assert.match(pgn,/\[%cal Yb8c6\]/);assert.match(pgn,/\[%csl Bc5\]/);const reimported=await post('/api/import',{pgn});assert.equal(reimported.status,201);assert.equal(reimported.body.game.study.annotations.reduce((n,a)=>n+(a.marks?.length||0),0),3);
  const count=(await f.request('/api/games',{cookie})).body.games.length;assert.equal((await post('/api/import',{pgn:'1. e4 {[%cal Ra1a9]} *'})).status,400);assert.equal((await f.request('/api/games',{cookie})).body.games.length,count);
  await f.restart();const stored=(await f.request(route,{cookie})).body.game;assert.deepEqual(stored.study,study);assert.deepEqual(stored.moves,g.moves);
 }finally{await f.close();}
});

test('review practice protects ownership, restarts, stale revisions, concurrent engine results and source games',async()=>{
 let waitForAttempt=false,entered,release;let enteredPromise;
 const analyze=async input=>{
  const board=new Chess(input.initialFen||undefined);for(const u of input.moves)board.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
  const moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')),best=moves.find(m=>m!==input.playedMove)||moves[0],after=new Chess(board.fen());after.move({from:input.playedMove.slice(0,2),to:input.playedMove.slice(2,4),promotion:input.playedMove[4]});
  if(waitForAttempt){entered();await new Promise(resolve=>{release=resolve;});}
  return {fen:board.fen(),engine:'test native protocol',bestmove:best,lines:[{move:best,moves:[best],score:{type:'cp',value:100}}],limits:{movetime:input.movetime,threads:input.threads,lines:1,engineId:'stockfish19'},played:{move:input.playedMove,san:after.history().at(-1),classification:'Blunder',lossCp:400,afterScore:{type:'cp',value:-300},explanation:'Synthetic move evidence.'}};
 };
 const f=await fixture({engineApi:{analyze}});try{
  const {cookie}=await f.register('reviewlearner'),other=await f.register('reviewoutsider'),post=(path,body,c=cookie)=>f.request(path,{method:'POST',cookie:c,body});
  const g=(await post('/api/import',{pgn:'1. f3 e5 2. g4 Qh4#'})).body.game,route=`/api/games/${g.id}`,practiceRoute=route+'/practice-review';
  assert.equal((await f.request(practiceRoute)).status,401);assert.equal((await post(practiceRoute+'/start',{side:'w'})).status,409);
  let report;for(let i=0;i<g.moves.length;i++){const reviewed=await post(route+'/review',{revision:0,after:i,movetime:50,threads:1});assert.equal(reviewed.status,200);report=reviewed.body.review;}
  assert.equal((await post(practiceRoute+'/start',{side:'w'},other.cookie)).status,404);let p=(await post(practiceRoute+'/start',{side:'w'})).body.practice;assert.equal(p.summary.total,2);assert.equal(p.current.answer,null);assert.equal((await f.request(practiceRoute,{cookie:other.cookie})).status,404);
  const initialRevision=p.revision;p=(await post(practiceRoute+'/action',{type:'hint',revision:p.revision})).body.practice;assert.equal(p.current.hints,1);assert.equal((await post(practiceRoute+'/action',{type:'reveal',revision:initialRevision})).status,409);
  await f.restart();assert.deepEqual((await f.request(practiceRoute,{cookie})).body.practice,p);
  const recommendation=report.entries.find(e=>e.ply===p.current.ply).analysis.bestmove;
  p=(await post(practiceRoute+'/action',{type:'move',move:recommendation,revision:p.revision})).body.practice;assert.equal(p.current.outcome,'solved');p=(await post(practiceRoute+'/action',{type:'next',revision:p.revision})).body.practice;assert.equal(p.index,1);
  const legal=new Chess(p.current.fen).moves({verbose:true}),best=report.entries.find(e=>e.ply===p.current.ply).analysis.bestmove,wrong=legal.map(m=>m.from+m.to+(m.promotion||'')).find(m=>m!==best);
  waitForAttempt=true;enteredPromise=new Promise(resolve=>{entered=resolve;});const pending=post(practiceRoute+'/action',{type:'move',move:wrong,revision:p.revision});await enteredPromise;
  p=(await post(practiceRoute+'/action',{type:'hint',revision:p.revision})).body.practice;waitForAttempt=false;release();assert.equal((await pending).status,409);assert.deepEqual((await f.request(practiceRoute,{cookie})).body.practice,p);
  p=(await post(practiceRoute+'/action',{type:'reveal',revision:p.revision})).body.practice;p=(await post(practiceRoute+'/action',{type:'next',revision:p.revision})).body.practice;assert.equal(p.complete,true);assert.deepEqual(p.summary,{total:2,finished:2,unassisted:0,learned:1,revealed:1,skipped:0});assert.equal((await post(practiceRoute+'/start',{side:'b',revision:initialRevision})).status,409);
  p=(await post(practiceRoute+'/start',{side:'b',revision:p.revision})).body.practice;assert.equal(p.side,'b');assert.equal(p.current.color,'b');const unchanged=(await f.request(route,{cookie})).body.game;assert.deepEqual(unchanged.moves,g.moves);assert.deepEqual(unchanged.study,g.study);
  const changed={...unchanged,moves:['e2e4']};f.db.prepare('UPDATE games SET data=? WHERE id=?').run(JSON.stringify(changed),g.id);assert.equal((await post(practiceRoute+'/action',{type:'skip',revision:p.revision})).status,409);const stale=(await f.request(practiceRoute,{cookie})).body;assert.equal(stale.stale,true);assert.equal(stale.revision,p.revision);
 }finally{release?.();await f.close();}
});

test('opening explorer exposes corpus separately from private completed games and creates isolated study copies',async()=>{
 const f=await fixture({explorerCataloguePath:'/nonexistent/explorer.sqlite'});try{
  assert.equal((await f.request('/api/explorer')).body.available,false);
  assert.equal((await f.request('/api/explorer?source=mine')).status,401);
  assert.equal((await f.request('/api/explorer?fen=bad')).status,400);
  const alice=await f.register('explorer_alice'),bob=await f.register('explorer_bob');
  const pgn='[White "Local White"]\n[Black "Local Black"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0';
  const imported=(await f.request('/api/import',{method:'POST',body:{pgn},cookie:alice.cookie})).body.game;
  const result=await f.request('/api/explorer?source=mine',{cookie:alice.cookie});assert.equal(result.status,200);assert.equal(result.body.total,1);assert.equal(result.body.moves[0].san,'e4');
  assert.equal((await f.request('/api/explorer?source=mine',{cookie:bob.cookie})).body.total,0);
  assert.equal((await f.request(`/api/explorer/games/${imported.id}?source=mine`,{cookie:bob.cookie})).status,404);
  const example=(await f.request(`/api/explorer/games/${imported.id}?source=mine`,{cookie:alice.cookie})).body.game;
  const copy=(await f.request('/api/import',{method:'POST',body:{pgn:example.pgn},cookie:alice.cookie})).body.game;
  assert.notEqual(copy.id,imported.id);assert.deepEqual(copy.moves,imported.moves);assert.deepEqual((await f.request(`/api/games/${imported.id}`,{cookie:alice.cookie})).body.game,imported);
  const bot=(await f.request('/api/games',{method:'POST',body:{color:'w'},cookie:alice.cookie})).body.game;await f.request(`/api/games/${bot.id}/move`,{method:'POST',body:{move:'d2d4',revision:0},cookie:alice.cookie});await f.request(`/api/games/${bot.id}/resign`,{method:'POST',body:{revision:1},cookie:alice.cookie});
  const ownBot=(await f.request(`/api/explorer/games/${bot.id}?source=mine`,{cookie:alice.cookie})).body.game;assert.equal(ownBot.headers.White,'explorer_alice');assert.ok(ownBot.headers.Black);assert.match(ownBot.pgn,/d4/);
  await f.restart();assert.equal((await f.request('/api/explorer?source=mine',{cookie:alice.cookie})).body.total,3);
 }finally{await f.close();}
});
