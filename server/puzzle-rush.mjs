import {emptyRushBests,expireRush,visibleRun,rushHistoryRow,rushNextRequest,rushItem,rushVariant,newRun,startClock,checkRushAction,rushStep,retryItem} from '../shared/puzzle-rush.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createRush({db,nowMs,selectPuzzle,advancePuzzle,insertPractice}){
 db.exec(`CREATE TABLE IF NOT EXISTS puzzle_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),state TEXT NOT NULL,updated_at INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS rush_one_active ON puzzle_runs(user_id) WHERE state='active';
 CREATE INDEX IF NOT EXISTS rush_owner ON puzzle_runs(user_id,updated_at DESC);`);
 const owned=(userId,id)=>{if(typeof id!=='string')fail(400,'Invalid run.');const row=db.prepare('SELECT data FROM puzzle_runs WHERE user_id=? AND id=?').get(userId,id);if(!row)fail(404,'Rush run not found.');return JSON.parse(row.data);};
 const store=(userId,run)=>db.prepare('UPDATE puzzle_runs SET state=?,updated_at=?,data=? WHERE user_id=? AND id=?').run(run.state,nowMs(),JSON.stringify(run),userId,run.id);
 const expire=(userId,run)=>{if(expireRush(run,nowMs()))store(userId,run);return run;};
 const active=userId=>{const row=db.prepare("SELECT data FROM puzzle_runs WHERE user_id=? AND state='active'").get(userId);const run=row?expire(userId,JSON.parse(row.data)):null;return run?.state==='active'?run:null;};
 const response=(userId,run)=>{
  const history=db.prepare("SELECT data FROM puzzle_runs WHERE user_id=? AND state!='active' ORDER BY updated_at DESC,rowid DESC LIMIT 20").all(userId).map(({data})=>rushHistoryRow(JSON.parse(data)));
  const bests=emptyRushBests();for(const row of db.prepare("SELECT json_extract(data,'$.variant') variant,MAX(json_extract(data,'$.score')) score FROM puzzle_runs WHERE user_id=? AND state!='active' GROUP BY variant").all(userId))bests[row.variant]=row.score;
  return {run:visibleRun(run),serverNow:nowMs(),history,bests};
 };
 const next=run=>{const {min,seen}=rushNextRequest(run);return rushItem(selectPuzzle(min,seen));};
 function start(userId,body){
  const variant=rushVariant(body);
  if(active(userId))fail(409,'Finish your current Rush run first.');
  if(db.prepare("SELECT id FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId))fail(409,'Finish, reveal or skip the current puzzle first.');
  const run=newRun(variant,nowMs());
  run.current=next(run);if(!run.current)fail(404,'No local Rush puzzles are available.');
  startClock(run,nowMs());
  db.prepare('INSERT INTO puzzle_runs VALUES (?,?,?,?,?)').run(run.id,userId,run.state,run.startedAt,JSON.stringify(run));return response(userId,run);
 }
 function act(userId,id,body){
  let run=owned(userId,id);checkRushAction(run,body);
  if(run.deadline!==null&&nowMs()>=run.deadline)return response(userId,expire(userId,run));
  let result;db.exec('BEGIN IMMEDIATE');try{
   result=rushStep(run,body,{advancePuzzle,next,stamp:nowMs});
   store(userId,run);db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return {...response(userId,run),correct:result.correct,message:result.message};
 }
 function retry(userId,id,index){
  const run=expire(userId,owned(userId,id)),puzzle=retryItem(run,index);
  if(active(userId))fail(409,'Finish your current Rush run first.');
  return insertPractice(userId,puzzle);
 }
 return {start,act,retry,active,state:userId=>response(userId,active(userId)),get:(userId,id)=>response(userId,expire(userId,owned(userId,id)))};
}
