import {randomUUID} from 'node:crypto';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createRush({db,nowMs,selectPuzzle,advancePuzzle,insertPractice}){
 db.exec(`CREATE TABLE IF NOT EXISTS puzzle_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),state TEXT NOT NULL,updated_at INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS rush_one_active ON puzzle_runs(user_id) WHERE state='active';
 CREATE INDEX IF NOT EXISTS rush_owner ON puzzle_runs(user_id,updated_at DESC);`);
 const owned=(userId,id)=>{if(typeof id!=='string')fail(400,'Invalid run.');const row=db.prepare('SELECT data FROM puzzle_runs WHERE user_id=? AND id=?').get(userId,id);if(!row)fail(404,'Rush run not found.');return JSON.parse(row.data);};
 const store=(userId,run)=>db.prepare('UPDATE puzzle_runs SET state=?,updated_at=?,data=? WHERE user_id=? AND id=?').run(run.state,nowMs(),JSON.stringify(run),userId,run.id);
 const record=(run,result)=>{run.current.state=result;run.items.push({...run.current,result});};
 const finish=(run,reason,time)=>{if(run.current.state==='active')record(run,reason==='time'?'timeout':'unfinished');run.state='finished';run.reason=reason;run.endedAt=time;};
 const expire=(userId,run)=>{if(run.state==='active'&&run.deadline!==null&&nowMs()>=run.deadline){finish(run,'time',run.deadline);run.revision++;store(userId,run);}return run;};
 const active=userId=>{const row=db.prepare("SELECT data FROM puzzle_runs WHERE user_id=? AND state='active'").get(userId);const run=row?expire(userId,JSON.parse(row.data)):null;return run?.state==='active'?run:null;};
 const visible=run=>{
  if(!run)return null;
  const {solution,initialFen,...puzzle}=run.current.puzzle;
  return {...run,current:{...run.current,puzzle},items:run.items.map((item,index)=>({index,puzzleId:item.puzzle.id,rating:item.puzzle.rating,result:item.result}))};
 };
 const response=(userId,run)=>{
  const history=db.prepare("SELECT data FROM puzzle_runs WHERE user_id=? AND state!='active' ORDER BY updated_at DESC,rowid DESC LIMIT 20").all(userId).map(({data})=>{const r=JSON.parse(data);return {id:r.id,variant:r.variant,score:r.score,mistakes:r.mistakes,reason:r.reason,endedAt:r.endedAt};});
  const bests={'3min':0,'5min':0,survival:0};for(const row of db.prepare("SELECT json_extract(data,'$.variant') variant,MAX(json_extract(data,'$.score')) score FROM puzzle_runs WHERE user_id=? AND state!='active' GROUP BY variant").all(userId))bests[row.variant]=row.score;
  return {run:visible(run),serverNow:nowMs(),history,bests};
 };
 const next=run=>{
  const puzzle=selectPuzzle(Math.min(5000,Math.max(400+run.items.length*75,run.current?.puzzle.rating||0)),run.items.map(item=>item.puzzle.id));
  return puzzle?{puzzle,moves:[],state:'active',mistakes:0,assisted:false,hint:null}:null;
 };
 function start(userId,body){
  const durations={'3min':180000,'5min':300000,survival:null},variant=body.variant??'3min';if(typeof variant!=='string'||!Object.hasOwn(durations,variant))fail(400,'Choose a three-minute, five-minute or Survival mode.');
  if(active(userId))fail(409,'Finish your current Rush run first.');
  if(db.prepare("SELECT id FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId))fail(409,'Finish, reveal or skip the current puzzle first.');
  const run={id:randomUUID(),variant,revision:0,state:'active',score:0,mistakes:0,startedAt:nowMs(),deadline:null,endedAt:null,reason:null,items:[],current:null};
  run.current=next(run);if(!run.current)fail(404,'No local Rush puzzles are available.');
  run.startedAt=nowMs();run.deadline=durations[variant]===null?null:run.startedAt+durations[variant];
  db.prepare('INSERT INTO puzzle_runs VALUES (?,?,?,?,?)').run(run.id,userId,run.state,run.startedAt,JSON.stringify(run));return response(userId,run);
 }
 function act(userId,id,body){
  let run=owned(userId,id);if(!Number.isInteger(body.revision)||run.revision!==body.revision)fail(409,'This run changed. Reload it before continuing.');
  if(run.state!=='active')fail(409,'This Rush run is already finished.');
  if(run.deadline!==null&&nowMs()>=run.deadline)return response(userId,expire(userId,run));
  if(!['move','skip','end'].includes(body.action))fail(400,'Choose move, skip or end. Hints and solutions are available after the run.');
  let message,correct=null;db.exec('BEGIN IMMEDIATE');try{
   if(body.action==='end'){finish(run,'ended',nowMs());message='Run ended. Review the puzzles at your own pace.';}
   else {
    if(body.action==='skip'){record(run,'failed');run.mistakes++;message='Puzzle skipped. One life used.';}
    else {const result=advancePuzzle(run.current,body);correct=result.correct;message=result.message;if(!correct){record(run,'failed');run.mistakes++;message='That puzzle was missed. Keep going.';}else if(run.current.state==='solved'){record(run,'solved');run.score++;message='Puzzle solved. On to the next challenge.';}}
    if(run.mistakes===3)finish(run,'mistakes',nowMs());
    else if(run.current.state!=='active'){const candidate=next(run);if(candidate)run.current=candidate;else finish(run,'catalogue',nowMs());}
   }
   run.revision++;store(userId,run);db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return {...response(userId,run),correct,message};
 }
 function retry(userId,id,index){
  const run=expire(userId,owned(userId,id));if(run.state==='active')fail(409,'Finish your Rush run before retrying a puzzle.');
  if(!Number.isInteger(index)||index<0||index>=run.items.length)fail(400,'Choose a puzzle from this run.');
  if(active(userId))fail(409,'Finish your current Rush run first.');
  return insertPractice(userId,run.items[index].puzzle);
 }
 return {start,act,retry,active,state:userId=>response(userId,active(userId)),get:(userId,id)=>response(userId,expire(userId,owned(userId,id)))};
}
