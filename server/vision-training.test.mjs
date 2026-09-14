import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {attacks} from 'chessops/attacks';
import {SquareSet} from 'chessops/squareSet';
import {createApp} from './app.mjs';
import {visionBoard,visionPrompt} from './vision-training.mjs';
const roles={q:'queen',r:'rook',b:'bishop',n:'knight',k:'king'};
test('Every lone-piece exercise matches an independent movement implementation in both orientations',()=>{
 for(const orientation of ['w','b'])for(const piece of Object.keys(roles))for(let square=0;square<64;square++){
  const from='abcdefgh'[square%8]+(1+Math.floor(square/8)),board=visionBoard({kind:'move',piece,from},orientation);
  const expected=[...attacks({role:roles[piece],color:orientation==='w'?'white':'black'},square,SquareSet.fromSquare(square))].map(s=>'abcdefgh'[s%8]+(1+Math.floor(s/8))).sort();
  assert.deepEqual(board.moves({verbose:true}).map(m=>m.to).sort(),expected,orientation+piece+from);
 }
 for(const mode of ['coordinates','moves','mixed'])for(const orientation of ['w','b']){let previous;for(let i=0;i<100;i++){const p=visionPrompt(mode,orientation,previous);assert.match(p.to,/^[a-h][1-8]$/);if(p.kind==='move'){const moves=visionBoard(p,orientation).moves({verbose:true});assert.ok(moves.some(m=>m.to===p.to&&m.san===p.text));if(previous?.kind==='move')assert.equal(p.from,previous.to);}else{assert.equal(p.text,p.to);assert.notEqual(p.to,previous?.to);}previous=p;}}
});
test('Vision API owns clocks, scores, revisions, history and restart without modifying existing game or puzzle records',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vision-test-'));let stamp=200000;
 const options={databasePath:join(dir,'test.sqlite'),nowMs:()=>stamp};let state=createApp(options),server=state.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let base='http://127.0.0.1:'+server.address().port,cookie;
 const request=async(path,body,status=200,as=cookie)=>{const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(as?{cookie:as}:{})},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(res.status,status,path+' '+(res.status===status?'':await res.clone().text()));return res;};
 const json=async(path,body,status=200)=>(await request(path,body,status)).json();
 try{
  await request('/api/vision',undefined,401,null);await request('/api/vision/start',{},401,null);
  cookie=(await request('/api/register',{username:'vision-owner',password:'synthetic-password'},201)).headers.get('set-cookie').split(';')[0];
  const other=(await request('/api/register',{username:'vision-other',password:'synthetic-password'},201,null)).headers.get('set-cookie').split(';')[0];
  assert.equal((await json('/api/vision')).round,null);
  for(const body of [{},{mode:'other',color:'w',coordinates:true},{mode:'moves',color:'red',coordinates:true},{mode:'moves',color:'w',coordinates:'false'}])await request('/api/vision/start',body,400);
  const untouched=()=>['games','game_reviews','progress','puzzle_profiles','puzzle_attempts','puzzle_runs','daily_puzzles','lesson_sessions'].map(t=>state.db.prepare('SELECT * FROM '+t).all());const before=untouched();
  let r=(await json('/api/vision/start',{mode:'coordinates',color:'b',coordinates:false},201)).round;const route='/api/vision/'+r.id;
  assert.equal(r.startsAt,stamp+3000);assert.equal(r.endsAt,stamp+33000);assert.equal(r.orientation,'b');
  assert.equal((await json('/api/vision/start',{mode:'moves',color:'w',coordinates:true})).round.id,r.id);
  await request(route,{revision:0,action:'answer',square:r.prompt.to},409);
  await request(route,{revision:0,action:'answer',square:r.prompt.to},404,other);
  assert.equal((await (await request('/api/vision',undefined,200,other)).json()).history.length,0);
  stamp=r.startsAt;
  for(const payload of [{revision:'0',action:'answer',square:r.prompt.to},{revision:0,action:'unknown'},{revision:0,action:'answer',square:'z9'}])await request(route,payload,payload.revision==='0'?409:400);
  const originalPrompt=r.prompt;
  r=(await json(route,{revision:r.revision,action:'answer',square:r.prompt.to==='a1'?'a2':'a1',score:9999,endsAt:9999999})).round;
  assert.equal(r.score,0);assert.equal(r.mistakes,1);assert.deepEqual(r.prompt,originalPrompt);assert.equal(r.endsAt,233000);
  const payload={revision:r.revision,action:'answer',square:r.prompt.to};r=(await json(route,payload)).round;assert.equal(r.score,1);await request(route,payload,409);
  const duplicate={revision:r.revision,action:'answer',square:r.prompt.to};const responses=await Promise.all([fetch(base+route,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(duplicate)}),fetch(base+route,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(duplicate)})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  r=(await json('/api/vision')).round;assert.equal(r.score,2);
  await new Promise(r=>server.close(r));state.close();state=createApp(options);server=state.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
  assert.deepEqual((await json('/api/vision')).round,r);
  stamp=r.endsAt;const ended=await json(route,{revision:r.revision,action:'answer',square:r.prompt.to});assert.equal(ended.round.score,2);assert.equal(ended.round.state,'complete');assert.equal(ended.bests[0].score,2);assert.equal(ended.bests[0].coordinates,false);
  let move=(await json('/api/vision/start',{mode:'moves',color:'random',coordinates:true},201)).round;stamp=move.startsAt;const moveRoute='/api/vision/'+move.id;
  await request(moveRoute,{revision:0,action:'answer',square:move.prompt.to},400);
  const p=move.prompt;move=(await json(moveRoute,{revision:0,action:'answer',from:p.from==='a1'?'a2':'a1',square:p.to})).round;assert.equal(move.score,0);assert.deepEqual(move.prompt,p);
  move=(await json(moveRoute,{revision:move.revision,action:'answer',from:p.from,square:p.to})).round;assert.equal(move.score,1);
  const quit=await json(moveRoute,{revision:move.revision,action:'quit'});assert.equal(quit.round.state,'quit');assert.equal(quit.bests.length,1);assert.equal(quit.history.length,2);
  stamp+=40000;assert.equal((await json('/api/vision')).round.state,'quit');
  for(const mode of ['coordinates','moves','mixed'])for(const color of ['w','b','random'])for(const coordinates of [true,false]){r=(await json('/api/vision/start',{mode,color,coordinates},201)).round;stamp=r.endsAt;assert.equal((await json('/api/vision')).round.state,'complete');}
  const final=await json('/api/vision');assert.equal(final.bests.length,18);assert.equal(final.history.length,20);assert.deepEqual(untouched(),before);
 }finally{await new Promise(r=>server.close(r));state.close();rmSync(dir,{recursive:true,force:true});}
});
