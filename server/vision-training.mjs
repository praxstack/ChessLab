import {randomInt,randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const squares=[...'abcdefgh'].flatMap(f=>[...'12345678'].map(r=>f+r));
const pick=values=>values[randomInt(values.length)];
export function visionBoard(prompt,orientation='w'){
 const board=new Chess();board.clear();
 if(prompt?.kind==='move'){
  board.load('8/8/8/8/8/8/8/8 '+orientation+' - - 0 1',{skipValidation:true});
  board.put({type:prompt.piece,color:orientation},prompt.from);
 }
 return board;
}
export function visionPrompt(mode,orientation,previous){
 if(mode==='coordinates'||mode==='mixed'&&randomInt(2)===0){const to=pick(squares.filter(s=>s!==previous?.to));return {kind:'square',text:to,to};}
 const piece=previous?.kind==='move'?previous.piece:pick([...'qrbnk']),from=previous?.kind==='move'?previous.to:pick(squares);
 const move=pick(visionBoard({kind:'move',piece,from},orientation).moves({verbose:true}));
 return {kind:'move',piece,from,to:move.to,text:move.san};
}
export function installVision(app,db,nowMs=Date.now){
 db.exec('CREATE TABLE IF NOT EXISTS vision_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS vision_owner ON vision_runs(user_id,created_at DESC);');
 const save=(userId,r)=>db.prepare('UPDATE vision_runs SET data=? WHERE id=? AND user_id=?').run(JSON.stringify(r),r.id,userId);
 function settle(userId,r,stamp){if(r?.state==='active'&&stamp>=r.endsAt){r.state='complete';r.revision++;save(userId,r);}return r;}
 function latest(userId,stamp){const row=db.prepare('SELECT data FROM vision_runs WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(userId);return row?settle(userId,JSON.parse(row.data),stamp):null;}
 function response(userId,r,stamp,extra={}){
  const history=db.prepare('SELECT data FROM vision_runs WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 30').all(userId).map(({data})=>{const {prompt,answers,...item}=JSON.parse(data);return item;});
  const bests=db.prepare("SELECT json_extract(data,'$.mode') AS mode,json_extract(data,'$.color') AS color,json_extract(data,'$.coordinates') AS coordinates,MAX(json_extract(data,'$.score')) AS score,COUNT(*) AS rounds FROM vision_runs WHERE user_id=? AND json_extract(data,'$.state')='complete' GROUP BY mode,color,coordinates").all(userId).map(row=>({...row,coordinates:!!row.coordinates}));
  return {round:r,history,bests,serverNow:stamp,...extra};
 }
 app.get('/api/vision',(req,res)=>{const stamp=nowMs();res.json(response(req.user.id,latest(req.user.id,stamp),stamp));});
 app.post('/api/vision/start',(req,res)=>{
  const {mode,color,coordinates}=req.body;
  if(!['coordinates','moves','mixed'].includes(mode)||!['w','b','random'].includes(color)||typeof coordinates!=='boolean')fail(400,'Choose a training mode, color and coordinate setting.');
  const stamp=nowMs(),previous=latest(req.user.id,stamp);if(previous?.state==='active')return res.json(response(req.user.id,previous,stamp));
  const orientation=color==='random'?pick(['w','b']):color;
  const r={id:randomUUID(),mode,color,coordinates,orientation,startsAt:stamp+3000,endsAt:stamp+33000,revision:0,state:'active',score:0,mistakes:0,prompt:visionPrompt(mode,orientation),answers:[]};
  db.prepare('INSERT INTO vision_runs VALUES (?,?,?,?)').run(r.id,req.user.id,stamp,JSON.stringify(r));res.status(201).json(response(req.user.id,r,stamp));
 });
 app.post('/api/vision/:id',(req,res)=>{
  const row=db.prepare('SELECT data FROM vision_runs WHERE id=? AND user_id=?').get(req.params.id,req.user.id);if(!row)fail(404,'Vision round not found.');
  const r=JSON.parse(row.data),stamp=nowMs(),body=req.body;
  if(!Number.isInteger(body.revision)||body.revision!==r.revision)fail(409,'This round changed. Reload the round before answering.');
  if(!['answer','quit'].includes(body.action))fail(400,'Choose answer or quit.');
  if(body.action==='answer'&&(typeof body.square!=='string'||!/^[a-h][1-8]$/.test(body.square)||r.prompt.kind==='move'&&(typeof body.from!=='string'||!/^[a-h][1-8]$/.test(body.from))))fail(400,'Choose a board square and the piece origin for a move.');
  settle(req.user.id,r,stamp);
  if(r.state!=='active')return res.json(response(req.user.id,r,stamp,{correct:null,message:'This round has ended.'}));
  if(body.action==='answer'&&stamp<r.startsAt)fail(409,'Wait for the countdown to finish.');
  let correct=null,message='Round ended early. It will not count toward your best.';
  if(body.action==='quit')r.state='quit';
  else{
   correct=body.square===r.prompt.to&&(r.prompt.kind==='square'||body.from===r.prompt.from);
   if(correct){r.score++;message='Correct: '+r.prompt.text;r.answers.push(r.prompt.text);r.prompt=visionPrompt(r.mode,r.orientation,r.prompt);}
   else{r.mistakes++;message='Not quite. Try the same prompt again.';}
  }
  r.revision++;save(req.user.id,r);res.json(response(req.user.id,r,stamp,{correct,message}));
 });
}
