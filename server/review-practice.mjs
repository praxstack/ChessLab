import {replay} from './engine.mjs';
import {positionKey} from './game-review.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const freshQuestion=()=>({outcome:'active',attempts:0,hints:0,feedback:null});
export function beginPractice(game,report,side){
 if(!['w','b','both'].includes(side))fail(400,'Choose White, Black or both sides.');
 if(game.source==='bot'&&!game.result||!report?.complete||report.positionKey!==positionKey(game))fail(409,'Finish the game and its whole-game review before practicing.');
 const questions=report.entries.filter(e=>(side==='both'||e.color===side)&&['Inaccuracy','Mistake','Blunder','Mate sequence'].includes(e.classification)&&e.analysis.bestmove!==game.moves[e.ply-1]).map(e=>{
  const board=replay(game.moves.slice(0,e.ply-1),game.initialFen),move=e.analysis.bestmove,line=e.analysis.lines[0];
  if(!report.engine||e.analysis.fen!==board.fen()||!line||line.move!==move)fail(503,'This saved review does not contain usable practice evidence.');
  replay([...game.moves.slice(0,e.ply-1),move],game.initialFen);
  return {ply:e.ply,color:e.color,number:e.number,originalSan:e.san,classification:e.classification,move,line,engine:report.engine,limits:report.limits};
 });
 return {gameId:game.id,sourceKey:positionKey(game),reportSignature:report.signature,side,questions,index:0,revision:0,results:[],current:freshQuestion(),complete:!questions.length};
}
export function practiceView(p,game){
 if(!p)return null;
 const q=p.questions[p.index],c=p.current,results=[...p.results,...(!p.complete&&c.outcome!=='active'?[{...c,ply:q.ply}]:[])];
 const summary={total:p.questions.length,finished:results.length,unassisted:results.filter(r=>r.outcome==='solved'&&r.attempts===1&&r.hints===0).length,learned:results.filter(r=>r.outcome==='solved'&&(r.attempts!==1||r.hints>0)).length,revealed:results.filter(r=>r.outcome==='revealed').length,skipped:results.filter(r=>r.outcome==='skipped').length};
 let current=null;
 if(q&&!p.complete){
  const prefix=game.moves.slice(0,q.ply-1),shown=c.feedback?.move||null,board=replay(shown?[...prefix,shown]:prefix,game.initialFen),root=replay(prefix,game.initialFen);
  const answer=c.outcome==='solved'||c.outcome==='revealed'?{move:q.move,line:q.line,engine:q.engine,limits:q.limits}:null;
  const hint=c.hints?{square:q.move.slice(0,2),piece:root.get(q.move.slice(0,2)).type,...(c.hints>1?{move:q.move}:{})}:null;
  current={ply:q.ply,color:q.color,number:q.number,originalSan:q.originalSan,classification:q.classification,fen:board.fen(),rootFen:root.fen(),lastMove:shown?[shown.slice(0,2),shown.slice(2,4)]:null,outcome:c.outcome,attempts:c.attempts,hints:c.hints,hint,feedback:c.feedback,answer};
 }
 return {gameId:p.gameId,side:p.side,index:p.index,revision:p.revision,complete:p.complete,current,summary,results:p.results.map(({ply,outcome,attempts,hints})=>({ply,outcome,attempts,hints}))};
}
export async function advancePractice(value,game,action,analyze){
 if(!action||!['move','hint','retry','reveal','skip','next'].includes(action.type))fail(400,'Choose a valid practice action.');
 if(value.sourceKey!==positionKey(game))fail(409,'This game history changed. Start a new practice from its current review.');
 if(value.complete)fail(409,'This practice is complete. Start again to retry it.');
 const p=structuredClone(value),q=p.questions[p.index],c=p.current,prefix=game.moves.slice(0,q.ply-1),board=replay(prefix,game.initialFen);
 if(action.type==='next'){
  if(c.outcome==='active')fail(409,'Finish, reveal or skip this position first.');
  p.results.push({...c,ply:q.ply});p.index++;p.complete=p.index===p.questions.length;p.current=freshQuestion();
 }else{
  if(c.outcome!=='active')fail(409,'Continue to the next position.');
  if(action.type==='retry')c.feedback=null;
  else if(action.type==='hint'){c.hints=Math.min(2,c.hints+1);c.feedback=null;}
  else if(action.type==='skip'){c.outcome='skipped';c.feedback=null;}
  else if(action.type==='reveal'){c.outcome='revealed';c.feedback={kind:'revealed',move:q.move,engine:q.engine,limits:q.limits,score:q.line.score,text:'The saved engine recommendation is shown. No unassisted credit is awarded.'};}
  else{
   if(c.feedback)fail(409,'Choose Try again before making another attempt.');
   if(c.attempts>=200)fail(409,'This position has reached 200 attempts. Reveal or skip it to continue.');
   const move=action.move;if(typeof move!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))fail(400,'Choose a legal move, including the promotion piece when needed.');
   const after=replay([...prefix,move],game.initialFen),san=after.history().at(-1);let feedback;
   if(move===q.move)feedback={kind:'recommended',move,san,engine:q.engine,limits:q.limits,score:q.line.score,text:'You found the saved engine recommendation.'};
   else{
    const limits={...q.limits,movetime:Math.min(q.limits.movetime,2000)};
    const evidence=await analyze({...limits,moves:prefix,initialFen:game.initialFen,playedMove:move});
    if(!evidence||evidence.fen!==board.fen()||!evidence.engine||evidence.played?.move!==move||!evidence.played.classification||!evidence.limits)fail(503,'The engine returned no matching move evidence. Your practice is unchanged.');
    const a=evidence.played,mate=a.afterScore?.type==='mate'&&Number.isInteger(a.afterScore.value)&&a.afterScore.value!==0?a.afterScore:null,strong=a.classification==='Best'&&evidence.bestmove===move||a.classification==='Checkmate'&&after.isCheckmate()||a.classification==='Good'&&Number.isFinite(a.lossCp)&&a.lossCp>=0&&a.lossCp<50;
    feedback={kind:strong?'alternative':'retry',move,san,engine:evidence.engine,limits:evidence.limits,score:a.afterScore,classification:a.classification,lossCp:a.lossCp,text:strong?'A strong alternative at this search limit.':a.lossCp==null?(mate?`The search finds mate in ${Math.abs(mate.value)} for ${mate.value>0?'White':'Black'}. There is no centipawn comparison.`:'This mate line has no numerical comparison. Try the saved recommendation or reveal it.'):'Keep looking for a stronger move.',explanation:a.explanation};
   }
   c.attempts++;c.feedback=feedback;if(feedback.kind!=='retry')c.outcome='solved';
  }
 }
 p.revision++;return p;
}
export function installReviewPractice(app,db,{owned,savedReview,analyze,limit}){
 db.exec('CREATE TABLE IF NOT EXISTS review_practice (game_id TEXT PRIMARY KEY REFERENCES games(id), data TEXT NOT NULL)');
 const read=game=>{const row=db.prepare('SELECT data FROM review_practice WHERE game_id=?').get(game.id);return row?{raw:row.data,value:JSON.parse(row.data)}:null;};
 const save=(game,next,old)=>{const saved=db.prepare('INSERT INTO review_practice VALUES (?,?) ON CONFLICT(game_id) DO UPDATE SET data=excluded.data WHERE review_practice.data=?').run(game.id,JSON.stringify(next),old?.raw??null);if(!saved.changes)fail(409,'Practice changed in another tab. Reload its saved progress.');};
 app.get('/api/games/:id/practice-review',(req,res)=>{const game=owned(req),stored=read(game);if(stored&&stored.value.sourceKey!==positionKey(game))return res.json({practice:null,stale:true,revision:stored.value.revision});res.json({practice:practiceView(stored?.value,game)});});
 app.post('/api/games/:id/practice-review/start',(req,res)=>{
  const game=owned(req),stored=read(game);if(stored&&(!Number.isInteger(req.body.revision)||req.body.revision!==stored.value.revision))fail(409,'Reload the saved practice before starting again.');
  const next=beginPractice(game,savedReview(game),req.body.side);if(stored)next.revision=stored.value.revision+1;save(game,next,stored);res.status(201).json({practice:practiceView(next,game)});
 });
 app.post('/api/games/:id/practice-review/action',async(req,res)=>{
  const game=owned(req),stored=read(game);if(!stored)fail(404,'Start practice from a completed game review.');if(!Number.isInteger(req.body.revision)||stored.value.revision!==req.body.revision)fail(409,'Practice changed in another tab. Reload its saved progress.');
  limit(`review-practice:${req.user.id}`,1500,3600000);const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};res.on('close',abort);
  try{const next=await advancePractice(stored.value,game,req.body,input=>analyze(input,{signal:controller.signal}));if(controller.signal.aborted)fail(499,'Practice paused. Your previous progress is saved.');const fresh=owned(req);if(positionKey(fresh)!==positionKey(game))fail(409,'The game history changed during this attempt. Reload it.');save(game,next,stored);res.json({practice:practiceView(next,game)});}finally{res.off('close',abort);}
 });
}
