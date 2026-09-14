import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from './app.mjs';
import {endgames} from './endgames.mjs';
import {replay,analyze,engineStatus} from './engine.mjs';

test('Local endgame positions are legal, backed by native tablebase hits and preserve fifty-move history',async()=>{
 assert.equal(endgames.length,24);assert.equal(new Set(endgames.map(p=>p.id)).size,24);
 for(const p of endgames){const board=replay([],p.fen);assert.equal(board.isGameOver(),false,p.id);assert.ok(board.board().flat().filter(Boolean).length<=5);}
 assert.equal((await engineStatus()).tablebases,true,'Install the verified local tablebase set first.');
 for(const engineId of ['stockfish19','stockfish18','stockfish16']){
  const input={moves:[],initialFen:endgames.find(p=>p.id==='queen-rook').fen,engineId,movetime:100,lines:1};
  const result=await analyze(input);assert.ok(result.tablebaseHits>0,engineId+' must actually probe local tables');replay([result.bestmove],input.initialFen);
 }
 for(let i=0;i<12;i++){const result=await analyze({moves:['e2e4','d7d6','e4e5','b8d7'],movetime:83,skill:0,lines:1});assert.equal(result.lines[0].move,result.bestmove);assert.equal(result.lines.length,1);}
 const terminal=await analyze({moves:[],initialFen:'7k/8/8/3Q4/3K4/8/8/8 w - - 100 51',movetime:50});assert.equal(terminal.bestmove,null);assert.match(terminal.explanation,/fifty|50/i);
});

test('Endgame HTTP flow protects source, ownership, practice restart, result and existing progress across restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'endgame-test-')),options={databasePath:join(dir,'test.sqlite')};let state=createApp(options),server=state.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let base='http://127.0.0.1:'+server.address().port,cookie;
 const req=async(path,body,status=200,as=cookie)=>{const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(as?{cookie:as}:{})},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(r.status,status,path+' '+(r.status===status?'':await r.clone().text()));return r;};
 const json=async(path,body,status=200)=>(await req(path,body,status)).json();
 try{
  assert.equal((await json('/api/endgames')).items.length,24);await req('/api/endgame-attempts',undefined,401);await req('/api/endgames/queen-net/study',{},401);
  cookie=(await req('/api/register',{username:'endgame-owner',password:'synthetic-password'},201)).headers.get('set-cookie').split(';')[0];
  const other=(await req('/api/register',{username:'endgame-other',password:'synthetic-password'},201,null)).headers.get('set-cookie').split(';')[0];
  const protectedTables=['progress','puzzle_attempts','lesson_sessions','vision_runs','bot_results'],before=protectedTables.map(t=>state.db.prepare('SELECT * FROM '+t).all());
  await req('/api/endgames/missing/study',{},404);
  let source=(await json('/api/endgames/queen-net/study',{fen:'bad',endgameId:'bad',result:'1-0'},201)).game;assert.equal(source.endgameId,'queen-net');assert.equal(source.initialFen,endgames.find(p=>p.id==='queen-net').fen);assert.equal(source.result,null);
  const sourceBytes=JSON.stringify(source),sourcePath='/api/games/'+source.id;
  await req(sourcePath+'/practice',{revision:0,ply:0,color:'bad'},400);
  await req(sourcePath+'/practice',{revision:0,ply:0,color:'w'},404,other);
  let game=(await json(sourcePath+'/practice',{revision:0,ply:0,color:'w',level:5},201)).game;assert.equal(game.practice.endgameId,'queen-net');assert.equal(game.practice.startPly,0);assert.deepEqual(game.moves,[]);
  const path='/api/games/'+game.id;
  await req(path+'/undo',{revision:0},400);game=(await json(path+'/move',{revision:0,move:'g6g7'})).game;assert.equal(game.result,'1-0');assert.equal(game.crownsAwarded,0);
  await req(path+'/move',{revision:0,move:'g6g7'},409);
  let attempts=(await json('/api/endgame-attempts')).attempts;assert.equal(attempts.length,1);assert.equal(attempts[0].result,'1-0');assert.equal(attempts[0].moves,1);
  assert.deepEqual((await (await req('/api/endgame-attempts',undefined,200,other)).json()).attempts,[]);
  let retry=(await json(path+'/practice',{revision:game.revision,restart:true,color:'b',level:5},201)).game;assert.equal(retry.practice.endgameId,'queen-net');assert.equal(retry.initialFen,source.initialFen);assert.equal(retry.color,'b');assert.deepEqual(retry.moves,[]);
  retry=(await json('/api/games/'+retry.id+'/bot',{revision:0})).game;assert.equal(retry.result,'1-0');assert.equal(retry.moves.length,1);
  assert.equal(JSON.stringify((await json(sourcePath)).game),sourceBytes);
  const custom=(await json('/api/positions',{fen:source.initialFen,title:'Own position',endgameId:'queen-net'},201)).game;const generic=(await json('/api/games/'+custom.id+'/practice',{revision:0,ply:0,color:'w',endgameId:'queen-net'},201)).game;assert.equal(generic.practice.endgameId,undefined);
  const pawn=(await json('/api/endgames/promotion/study',{},201)).game,promotion=(await json('/api/games/'+pawn.id+'/practice',{revision:0,ply:0,color:'w'},201)).game;
  const promoted=(await json('/api/games/'+promotion.id+'/move',{revision:0,move:'g7g8r'})).game;assert.equal(replay(promoted.moves,promoted.initialFen).get('g8').type,'r');
  assert.deepEqual(protectedTables.map(t=>state.db.prepare('SELECT * FROM '+t).all()),before);
  attempts=(await json('/api/endgame-attempts')).attempts;
  await new Promise(r=>server.close(r));state.close();state=createApp(options);server=state.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
  assert.deepEqual((await json('/api/endgame-attempts')).attempts,attempts);assert.equal(JSON.stringify((await json(sourcePath)).game),sourceBytes);
 }finally{await new Promise(r=>server.close(r));state.close();rmSync(dir,{recursive:true,force:true});}
});
