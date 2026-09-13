import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {randomInt,randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const movePattern=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
const play=(chess,move)=>chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
export function preparePuzzle(row){
 const moves=row.moves.split(' '),board=new Chess(row.fen);
 if(moves.length<2||moves.length>100||moves.length%2||moves.some(move=>!movePattern.test(move)))throw new Error('Invalid source solution.');
 const trigger=play(board,moves[0]),fen=board.fen(),side=board.turn();
 for(const move of moves.slice(1))play(board,move);
 return {id:row.id,initialFen:row.fen,fen,side,trigger:moves[0],triggerSan:trigger.san,solution:moves.slice(1),rating:row.rating,themes:row.themes.split(' '),gameUrl:row.game_url,openingTags:row.opening_tags};
}
export function createTrainer({db,cataloguePath,nowMs=Date.now,insertStudy}){
 const source=existsSync(cataloguePath)?new DatabaseSync(cataloguePath,{readOnly:true}):null;
 const metadata=source?JSON.parse(source.prepare("SELECT value FROM metadata WHERE key='catalogue'").get().value):null;
 db.exec(`CREATE TABLE IF NOT EXISTS puzzle_attempts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),state TEXT NOT NULL,updated_at INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS puzzle_attempt_owner ON puzzle_attempts(user_id,updated_at DESC);
 CREATE UNIQUE INDEX IF NOT EXISTS puzzle_one_active ON puzzle_attempts(user_id) WHERE state='active';`);
 const catalogue=()=>metadata?{available:true,count:metadata.count,themes:metadata.themes,source:metadata.source,license:metadata.license,archiveSha256:metadata.archiveSha256}:{available:false,count:0,themes:{},message:'The local puzzle catalogue is not installed.'};
 const owned=(userId,id)=>{if(typeof id!=='string')fail(400,'Invalid attempt.');const row=db.prepare('SELECT data FROM puzzle_attempts WHERE id=? AND user_id=?').get(id,userId);if(!row)fail(404,'Puzzle attempt not found.');return JSON.parse(row.data);};
 const visible=attempt=>{if(!attempt)return null;const {solution,initialFen,...puzzle}=attempt.puzzle;return {...attempt,puzzle,...(attempt.state==='revealed'?{solution}: {})};};
 const store=(userId,attempt)=>{attempt.updatedAt=nowMs();db.prepare('UPDATE puzzle_attempts SET state=?,updated_at=?,data=? WHERE id=? AND user_id=?').run(attempt.state,attempt.updatedAt,JSON.stringify(attempt),attempt.id,userId);return visible(attempt);};
 const state=userId=>{
  const active=db.prepare("SELECT data FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId);
  const history=db.prepare("SELECT data FROM puzzle_attempts WHERE user_id=? AND state!='active' ORDER BY updated_at DESC,rowid DESC LIMIT 20").all(userId).map(row=>{const a=JSON.parse(row.data);return {id:a.id,puzzleId:a.puzzle.id,rating:a.puzzle.rating,themes:a.puzzle.themes,state:a.state,mistakes:a.mistakes,assisted:a.assisted,updatedAt:a.updatedAt};});
  const totals=db.prepare(`SELECT COUNT(*) attempts,COALESCE(SUM(state='solved'),0) solved,COALESCE(SUM(state='solved' AND json_extract(data,'$.mistakes')=0 AND json_extract(data,'$.assisted')=0),0) unassisted FROM puzzle_attempts WHERE user_id=? AND state!='active'`).get(userId);
  return {attempt:active?visible(JSON.parse(active.data)):null,history,totals};
 };
 const filters=body=>{
  const theme=body.theme??'',min=body.min??800,max=body.max??1800,failedOnly=body.failedOnly??false;
  if(typeof theme!=='string'||(theme!==''&&!Object.hasOwn(metadata?.themes||{},theme))||!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>5000||min>max||typeof failedOnly!=='boolean')fail(400,'Choose an available theme and a rating range between 0 and 5,000.');
  return {theme,min,max,failedOnly};
 };
 function start(userId,body){
  if(db.prepare("SELECT id FROM puzzle_attempts WHERE user_id=? AND state='active'").get(userId))fail(409,'Finish, reveal or skip the current puzzle first.');
  let puzzle;
  if(body.fromAttempt!==undefined){puzzle=owned(userId,body.fromAttempt).puzzle;}
  else {
   if(!source)fail(503,'Install the local puzzle catalogue before starting training.');
   const {theme,min,max,failedOnly}=filters(body);
   if(failedOnly){
    const row=db.prepare(`SELECT data FROM puzzle_attempts WHERE user_id=? AND state!='active' AND (state!='solved' OR json_extract(data,'$.mistakes')>0 OR json_extract(data,'$.assisted')=1) AND json_extract(data,'$.puzzle.rating') BETWEEN ? AND ? AND (?='' OR EXISTS(SELECT 1 FROM json_each(json_extract(data,'$.puzzle.themes')) WHERE value=?)) ORDER BY RANDOM() LIMIT 1`).get(userId,min,max,theme,theme);
    if(!row)fail(404,'No previous mistakes match these filters.');puzzle=JSON.parse(row.data).puzzle;
   }else{
    const count=source.prepare('SELECT COUNT(*) count FROM pool WHERE theme=? AND rating BETWEEN ? AND ?').get(theme,min,max).count;
    if(!count)fail(404,'No local puzzles match these filters.');
    const selected=source.prepare('SELECT seq FROM pool WHERE theme=? AND rating BETWEEN ? AND ? LIMIT 1 OFFSET ?').get(theme,min,max,randomInt(count));
    try{puzzle=preparePuzzle(source.prepare('SELECT * FROM puzzles WHERE seq=?').get(selected.seq));}catch{fail(422,'This source puzzle has an invalid line. Choose another puzzle.');}
   }
  }
  const attempt={id:randomUUID(),puzzle,moves:[],revision:0,state:'active',mistakes:0,assisted:false,hint:null,createdAt:nowMs(),updatedAt:nowMs()};
  db.prepare('INSERT INTO puzzle_attempts VALUES (?,?,?,?,?)').run(attempt.id,userId,attempt.state,attempt.updatedAt,JSON.stringify(attempt));return visible(attempt);
 }
 function act(userId,id,body){
  const a=owned(userId,id);if(!Number.isInteger(body.revision)||body.revision!==a.revision)fail(409,'This attempt changed. Reload it before continuing.');
  if(a.state!=='active')fail(409,'This puzzle attempt is already finished.');
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
  a.revision++;return {attempt:store(userId,a),correct,message};
 }
 function study(userId,id){const a=owned(userId,id);if(a.state==='active')fail(409,'Finish or reveal the puzzle before analysis.');return insertStudy(userId,{title:`Puzzle ${a.puzzle.id}`,source:'import',initialFen:a.puzzle.initialFen,moves:[a.puzzle.trigger,...(a.state==='solved'?a.moves:a.puzzle.solution)],headers:{White:'Puzzle White',Black:'Puzzle Black'},puzzleSource:{id:a.puzzle.id,url:a.puzzle.gameUrl,rating:a.puzzle.rating,themes:a.puzzle.themes}});}
 return {catalogue,state,start,act,study,get:(userId,id)=>visible(owned(userId,id)),close:()=>source?.close()};
}
