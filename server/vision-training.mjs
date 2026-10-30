import {visionBoard,visionPrompt,settleRound,roundSummary,roundOptions,createRound,checkRoundAction,answerRound} from '../shared/vision-training.js';
export {visionBoard,visionPrompt};
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function installVision(app,db,nowMs=Date.now){
 db.exec('CREATE TABLE IF NOT EXISTS vision_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS vision_owner ON vision_runs(user_id,created_at DESC);');
 const save=(userId,r)=>db.prepare('UPDATE vision_runs SET data=? WHERE id=? AND user_id=?').run(JSON.stringify(r),r.id,userId);
 function settle(userId,r,stamp){if(settleRound(r,stamp))save(userId,r);return r;}
 function latest(userId,stamp){const row=db.prepare('SELECT data FROM vision_runs WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(userId);return row?settle(userId,JSON.parse(row.data),stamp):null;}
 function response(userId,r,stamp,extra={}){
  const history=db.prepare('SELECT data FROM vision_runs WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 30').all(userId).map(({data})=>roundSummary(JSON.parse(data)));
  const bests=db.prepare("SELECT json_extract(data,'$.mode') AS mode,json_extract(data,'$.color') AS color,json_extract(data,'$.coordinates') AS coordinates,MAX(json_extract(data,'$.score')) AS score,COUNT(*) AS rounds FROM vision_runs WHERE user_id=? AND json_extract(data,'$.state')='complete' GROUP BY mode,color,coordinates").all(userId).map(row=>({...row,coordinates:!!row.coordinates}));
  return {round:r,history,bests,serverNow:stamp,...extra};
 }
 app.get('/api/vision',(req,res)=>{const stamp=nowMs();res.json(response(req.user.id,latest(req.user.id,stamp),stamp));});
 app.post('/api/vision/start',(req,res)=>{
  const options=roundOptions(req.body);
  const stamp=nowMs(),previous=latest(req.user.id,stamp);if(previous?.state==='active')return res.json(response(req.user.id,previous,stamp));
  const r=createRound(options,stamp);
  db.prepare('INSERT INTO vision_runs VALUES (?,?,?,?)').run(r.id,req.user.id,stamp,JSON.stringify(r));res.status(201).json(response(req.user.id,r,stamp));
 });
 app.post('/api/vision/:id',(req,res)=>{
  const row=db.prepare('SELECT data FROM vision_runs WHERE id=? AND user_id=?').get(req.params.id,req.user.id);if(!row)fail(404,'Vision round not found.');
  const r=JSON.parse(row.data),stamp=nowMs(),body=req.body;
  checkRoundAction(r,body);
  settle(req.user.id,r,stamp);
  if(r.state!=='active')return res.json(response(req.user.id,r,stamp,{correct:null,message:'This round has ended.'}));
  const {correct,message}=answerRound(r,body,stamp);
  save(req.user.id,r);res.json(response(req.user.id,r,stamp,{correct,message}));
 });
}
