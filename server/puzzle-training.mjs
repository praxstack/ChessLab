import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {createHash,randomInt,randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';
import {createRush} from './puzzle-rush.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const movePattern=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
const play=(chess,move)=>chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
export const localDay=milliseconds=>{const d=new Date(milliseconds);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const ratingUpdate=(rating,puzzleRating,won)=>Math.round(rating+32*((won?1:0)-1/(1+10**((puzzleRating-rating)/400))));
export function preparePuzzle(row){
 const moves=row.moves.split(' '),board=new Chess(row.fen);
 if(moves.length<2||moves.length>100||moves.length%2||moves.some(move=>!movePattern.test(move)))throw new Error('Invalid source solution.');
 const trigger=play(board,moves[0]),fen=board.fen(),side=board.turn();
 for(const move of moves.slice(1))play(board,move);
 return {id:row.id,initialFen:row.fen,fen,side,trigger:moves[0],triggerSan:trigger.san,solution:moves.slice(1),rating:row.rating,themes:row.themes.split(' '),gameUrl:row.game_url,openingTags:row.opening_tags};
}
function advancePuzzle(a,body){
  const board=new Chess(a.puzzle.fen);for(const move of a.moves)play(board,move);
  let correct=null,message;
  if(body.action==='move'){
   if(typeof body.move!=='string'||!movePattern.test(body.move))fail(400,'Submit one coordinate move.');
   let played;try{played=play(board,body.move);}catch{fail(400,'That move is not legal in this position.');}
   const alternateMate=board.isCheckmate();correct=body.move===a.puzzle.solution[a.moves.length]||alternateMate;
   if(correct){
    a.hint=null;a.moves.push(body.move);
    if(alternateMate||a.moves.length===a.puzzle.solution.length){a.state='solved';message=alternateMate?`${played.san} is checkmate.`:'You completed the verified source line.';}
    else {const reply=a.puzzle.solution[a.moves.length];play(board,reply);a.moves.push(reply);message='Correct. Find your continuation after the reply.';}
   }else{a.mistakes++;message='That is not the source solution. The position is unchanged; try again.';}
  }else if(body.action==='hint'){
   a.assisted=true;a.hint=a.puzzle.solution[a.moves.length].slice(0,2);message=`Look at the piece on ${a.hint}. This attempt now uses assistance.`;
  }else if(body.action==='reveal'){a.assisted=true;a.state='revealed';a.moves=[...a.puzzle.solution];message='Solution revealed. Play through it or analyze the position.';}
  else if(body.action==='skip'){a.state='skipped';message='Puzzle skipped. You can return to it from recent attempts.';}
  else fail(400,'Choose move, hint, reveal or skip.');
  return {correct,message};
}
export function createTrainer({db,cataloguePath,nowMs=Date.now,insertStudy}){
 const source=existsSync(cataloguePath)?new DatabaseSync(cataloguePath,{readOnly:true}):null;
 const metadata=source?JSON.parse(source.prepare("SELECT value FROM metadata WHERE key='catalogue'").get().value):null;
 db.exec(`CREATE TABLE IF NOT EXISTS puzzle_attempts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),state TEXT NOT NULL,updated_at INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS puzzle_attempt_owner ON puzzle_attempts(user_id,updated_at DESC);
 CREATE UNIQUE INDEX IF NOT EXISTS puzzle_one_active ON puzzle_attempts(user_id) WHERE state='active';
 CREATE TABLE IF NOT EXISTS puzzle_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),rating INTEGER NOT NULL,best INTEGER NOT NULL,rated_count INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS daily_puzzles(date TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS puzzle_seen ON puzzle_attempts(user_id,json_extract(data,'$.puzzle.id'));
 CREATE UNIQUE INDEX IF NOT EXISTS puzzle_daily_once ON puzzle_attempts(user_id,json_extract(data,'$.dailyDate')) WHERE json_extract(data,'$.mode')='daily';`);
 const catalogue=()=>metadata?{today:localDay(nowMs()),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,available:true,count:metadata.count,themes:metadata.themes,source:metadata.source,license:metadata.license,archiveSha256:metadata.archiveSha256}:{available:false,count:0,themes:{},message:'The local puzzle catalogue is not installed.'};
 const owned=(userId,id)=>{if(typeof id!=='string')fail(400,'Invalid attempt.');const row=db.prepare('SELECT data FROM puzzle_attempts WHERE id=? AND user_id=?').get(id,userId);if(!row)fail(404,'Puzzle attempt not found.');return JSON.parse(row.data);};
 const visible=attempt=>{if(!attempt)return null;const {solution,initialFen,...puzzle}=attempt.puzzle;return {...attempt,puzzle,...(attempt.state==='revealed'?{solution}: {})};};
 const store=(userId,attempt)=>{attempt.updatedAt=nowMs();db.prepare('UPDATE puzzle_attempts SET state=?,updated_at=?,data=? WHERE id=? AND user_id=?').run(attempt.state,attempt.updatedAt,JSON.stringify(attempt),attempt.id,userId);return visible(attempt);};
 const profile=userId=>db.prepare('SELECT rating,best,rated_count ratedCount FROM puzzle_profiles WHERE user_id=?').get(userId)||{rating:1500,best:1500,ratedCount:0};
 const dailyProgress=userId=>{
  const date=localDay(nowMs()),today=db.prepare("SELECT data FROM puzzle_attempts WHERE user_id=? AND json_extract(data,'$.mode')='daily' AND json_extract(data,'$.dailyDate')=?").get(userId,date);
  const completedDates=db.prepare("SELECT json_extract(data,'$.dailyDate') date FROM puzzle_attempts WHERE user_id=? AND json_extract(data,'$.mode')='daily' AND state='solved' ORDER BY date DESC").all(userId).map(row=>row.date);
  const days=new Set(completedDates);let cursor=new Date(date+'T12:00:00Z'),streak=0;
  if(!days.has(date))cursor.setUTCDate(cursor.getUTCDate()-1);
  while(days.has(cursor.toISOString().slice(0,10))){streak++;cursor.setUTCDate(cursor.getUTCDate()-1);}
  const attempt=today?JSON.parse(today.data):null;return {date,streak,completedDates,today:attempt?{id:attempt.id,state:attempt.state,assisted:attempt.assisted}:null};
 };
 const state=userId=>{
  const activeRush=rush.active(userId);
  const active=db.prepare("SELECT data FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId);
  const history=db.prepare("SELECT data FROM puzzle_attempts WHERE user_id=? AND state!='active' ORDER BY updated_at DESC,rowid DESC LIMIT 20").all(userId).map(row=>{const a=JSON.parse(row.data);return {id:a.id,mode:a.mode||'custom',ratingChange:a.ratingChange||null,dailyDate:a.dailyDate||null,puzzleId:a.puzzle.id,rating:a.puzzle.rating,themes:a.puzzle.themes,state:a.state,mistakes:a.mistakes,assisted:a.assisted,updatedAt:a.updatedAt};});
  const totals=db.prepare(`SELECT COUNT(*) attempts,COALESCE(SUM(state='solved'),0) solved,COALESCE(SUM(state='solved' AND json_extract(data,'$.mistakes')=0 AND json_extract(data,'$.assisted')=0),0) unassisted FROM puzzle_attempts WHERE user_id=? AND state!='active'`).get(userId);
  return {rush:activeRush?{id:activeRush.id}:null,attempt:active?visible(JSON.parse(active.data)):null,history,totals,profile:profile(userId),daily:dailyProgress(userId)};
 };
 const filters=body=>{
  const theme=body.theme??'',min=body.min??800,max=body.max??1800,failedOnly=body.failedOnly??false;
  if(typeof theme!=='string'||(theme!==''&&!Object.hasOwn(metadata?.themes||{},theme))||!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>5000||min>max||typeof failedOnly!=='boolean')fail(400,'Choose an available theme and a rating range between 0 and 5,000.');
  return {theme,min,max,failedOnly};
 };
 function selectPuzzle(theme,min,max,offset){
  const count=source.prepare('SELECT COUNT(*) count FROM pool WHERE theme=? AND rating BETWEEN ? AND ?').get(theme,min,max).count;
  if(!count)fail(404,'No local puzzles match these filters.');
  const selected=source.prepare('SELECT seq FROM pool WHERE theme=? AND rating BETWEEN ? AND ? LIMIT 1 OFFSET ?').get(theme,min,max,offset===undefined?randomInt(count):offset%count);
  try{return preparePuzzle(source.prepare('SELECT * FROM puzzles WHERE seq=?').get(selected.seq));}catch{fail(422,'This source puzzle has an invalid line. Choose another puzzle.');}
 }
 function start(userId,body){
  if(rush.active(userId))fail(409,'Finish your current Rush run first.');
  const mode=body.fromAttempt!==undefined?'custom':body.mode??'custom';if(!['custom','rated','daily'].includes(mode))fail(400,'Choose rated, daily or custom mode.');
  const date=localDay(nowMs());
  if(mode==='daily'){
   const existing=db.prepare("SELECT data FROM puzzle_attempts WHERE user_id=? AND json_extract(data,'$.mode')='daily' AND json_extract(data,'$.dailyDate')=?").get(userId,date);
   if(existing){const a=JSON.parse(existing.data);const active=db.prepare("SELECT id FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId);if(active&&active.id!==a.id)fail(409,'Finish, reveal or skip the current puzzle first.');return visible(a);}
  }
  if(db.prepare("SELECT id FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId))fail(409,'Finish, reveal or skip the current puzzle first.');
  let puzzle,difficulty=null;
  if(body.fromAttempt!==undefined)puzzle=owned(userId,body.fromAttempt).puzzle;
  else {
   if(!source)fail(503,'Install the local puzzle catalogue before starting training.');
   if(mode==='daily'){
    let pinned=db.prepare('SELECT data FROM daily_puzzles WHERE date=?').get(date);
    if(!pinned){
     const offset=createHash('sha256').update(date+metadata.archiveSha256).digest().readUInt32BE(0);
     puzzle=selectPuzzle('',1200,1800,offset);db.prepare('INSERT OR IGNORE INTO daily_puzzles VALUES (?,?)').run(date,JSON.stringify(puzzle));pinned=db.prepare('SELECT data FROM daily_puzzles WHERE date=?').get(date);
    }puzzle=JSON.parse(pinned.data);
   }else if(mode==='rated'){
    difficulty=body.difficulty??'standard';const bands={standard:[-450,-150],hard:[-250,50],extra:[-150,150]};if(typeof difficulty!=='string'||!Object.hasOwn(bands,difficulty))fail(400,'Choose Standard, Hard or Extra Hard difficulty.');
    const rating=profile(userId).rating,[low,high]=bands[difficulty];let min=Math.max(0,Math.min(5000,rating+low)),max=Math.max(min,Math.min(5000,rating+high));
    if(!source.prepare("SELECT 1 FROM pool WHERE theme='' AND rating BETWEEN ? AND ? LIMIT 1").get(min,max)){
     const below=source.prepare("SELECT rating FROM pool WHERE theme='' AND rating<=? ORDER BY rating DESC LIMIT 1").get(min),above=source.prepare("SELECT rating FROM pool WHERE theme='' AND rating>=? ORDER BY rating LIMIT 1").get(max);const nearest=[below,above].filter(Boolean).sort((a,b)=>Math.abs(a.rating-rating)-Math.abs(b.rating-rating))[0];if(!nearest)fail(404,'No rated puzzles are installed.');min=Math.max(0,nearest.rating-150);max=Math.min(5000,nearest.rating+150);
    }
    for(let tries=0;tries<8;tries++){const candidate=selectPuzzle('',min,max);if(!db.prepare("SELECT 1 FROM puzzle_attempts WHERE user_id=? AND json_extract(data,'$.puzzle.id')=? LIMIT 1").get(userId,candidate.id)){puzzle=candidate;break;}}
    if(!puzzle){const seen=db.prepare("SELECT DISTINCT json_extract(data,'$.puzzle.id') id FROM puzzle_attempts WHERE user_id=?").all(userId).map(row=>row.id);const row=source.prepare("SELECT puzzles.* FROM pool JOIN puzzles USING(seq) WHERE pool.theme='' AND pool.rating BETWEEN ? AND ? AND puzzles.id NOT IN (SELECT value FROM json_each(?)) LIMIT 1").get(min,max,JSON.stringify(seen));if(row)puzzle=preparePuzzle(row);}
    if(!puzzle)fail(404,'No unseen puzzle remains in this difficulty band. Choose another difficulty or custom practice.');
   }else{
    const {theme,min,max,failedOnly}=filters(body);
    if(failedOnly){
     const row=db.prepare(`SELECT data FROM puzzle_attempts WHERE user_id=? AND state!='active' AND (state!='solved' OR json_extract(data,'$.mistakes')>0 OR json_extract(data,'$.assisted')=1) AND json_extract(data,'$.puzzle.rating') BETWEEN ? AND ? AND (?='' OR EXISTS(SELECT 1 FROM json_each(json_extract(data,'$.puzzle.themes')) WHERE value=?)) ORDER BY RANDOM() LIMIT 1`).get(userId,min,max,theme,theme);
     if(!row)fail(404,'No previous mistakes match these filters.');puzzle=JSON.parse(row.data).puzzle;
    }else puzzle=selectPuzzle(theme,min,max);
   }
  }
  return insertAttempt(userId,puzzle,{mode,difficulty,dailyDate:mode==='daily'?date:null});
 }
 function insertAttempt(userId,puzzle,{mode='custom',difficulty=null,dailyDate=null}={}){
  if(db.prepare("SELECT id FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId))fail(409,'Finish, reveal or skip the current puzzle first.');
  const attempt={id:randomUUID(),mode,difficulty,dailyDate,ratingChange:null,puzzle,moves:[],revision:0,state:'active',mistakes:0,assisted:false,hint:null,createdAt:nowMs(),updatedAt:nowMs()};
  db.prepare('INSERT INTO puzzle_attempts VALUES (?,?,?,?,?)').run(attempt.id,userId,attempt.state,attempt.updatedAt,JSON.stringify(attempt));return visible(attempt);
 }
 function score(userId,a){
  if(a.mode!=='rated'||a.ratingChange||(a.state==='active'&&!a.mistakes&&!a.assisted))return;
  const previous=profile(userId),won=a.state==='solved'&&!a.mistakes&&!a.assisted,after=ratingUpdate(previous.rating,a.puzzle.rating,won);
  a.ratingChange={before:previous.rating,after,delta:after-previous.rating,result:won?'win':'loss',algorithm:'local-elo-32'};
  db.prepare('INSERT INTO puzzle_profiles VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET rating=excluded.rating,best=excluded.best,rated_count=excluded.rated_count').run(userId,after,Math.max(previous.best,after),previous.ratedCount+1);
 }
 function act(userId,id,body){
  const a=owned(userId,id);if(!Number.isInteger(body.revision)||body.revision!==a.revision)fail(409,'This attempt changed. Reload it before continuing.');
  if(a.state!=='active')fail(409,'This puzzle attempt is already finished.');
  const {correct,message}=advancePuzzle(a,body);
  a.revision++;let attempt;db.exec('BEGIN IMMEDIATE');try{score(userId,a);attempt=store(userId,a);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return {attempt,correct,message,profile:profile(userId),daily:dailyProgress(userId)};
 }
 function study(userId,id){const a=owned(userId,id);if(a.state==='active')fail(409,'Finish or reveal the puzzle before analysis.');return insertStudy(userId,{title:`Puzzle ${a.puzzle.id}`,source:'import',initialFen:a.puzzle.initialFen,moves:[a.puzzle.trigger,...(a.state==='solved'?a.moves:a.puzzle.solution)],headers:{White:'Puzzle White',Black:'Puzzle Black'},puzzleSource:{id:a.puzzle.id,url:a.puzzle.gameUrl,rating:a.puzzle.rating,themes:a.puzzle.themes}});}
 const rush=createRush({db,nowMs,advancePuzzle,insertPractice:insertAttempt,selectPuzzle:(min,seen)=>{
  if(!source)fail(503,'Install the local puzzle catalogue before starting Rush.');
  const lookup=source.prepare('SELECT seq FROM puzzles WHERE id=?'),excluded=JSON.stringify(seen.map(id=>lookup.get(id)?.seq).filter(Number.isInteger));
  const floor=source.prepare("SELECT rating FROM pool WHERE theme='' AND rating>=? AND seq NOT IN (SELECT value FROM json_each(?)) ORDER BY rating LIMIT 1").get(min,excluded)?.rating;
  if(floor===undefined)return null;
  const count=source.prepare("SELECT COUNT(*) count FROM pool WHERE theme='' AND rating BETWEEN ? AND ? AND seq NOT IN (SELECT value FROM json_each(?))").get(floor,Math.min(5000,floor+120),excluded).count;
  const selected=source.prepare("SELECT seq FROM pool WHERE theme='' AND rating BETWEEN ? AND ? AND seq NOT IN (SELECT value FROM json_each(?)) LIMIT 1 OFFSET ?").get(floor,Math.min(5000,floor+120),excluded,randomInt(count));
  const row=source.prepare('SELECT * FROM puzzles WHERE seq=?').get(selected.seq);
  try{return preparePuzzle(row);}catch{fail(422,'This source puzzle has an invalid line. Try starting again.');}
 }});
 return {rush,catalogue,state,start,act,study,get:(userId,id)=>visible(owned(userId,id)),close:()=>source?.close()};
}
