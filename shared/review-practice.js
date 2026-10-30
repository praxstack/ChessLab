// Practice the flagged moves of a reviewed game. Pure rules over saved values; storage is the caller's.
import {replay} from './replay.js';
import {positionKey} from './game-review.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const freshQuestion=()=>({outcome:'active',attempts:0,hints:0,feedback:null});
export function beginPractice(game,report,side){
 if(!['w','b','both'].includes(side))fail(400,'Choose White, Black or both sides.');
 if(game.source==='bot'&&!game.result||!report?.complete||report.positionKey!==positionKey(game))fail(409,'Finish the game and its whole-game review before practicing.');
 const questions=report.entries.filter(e=>(side==='both'||e.color===side)&&['Inaccuracy','Mistake','Blunder','Mate sequence'].includes(e.classification)&&e.analysis.bestmove!==game.moves[e.ply-1]).map(e=>{
  const board=replay(game.moves.slice(0,e.ply-1),game.initialFen,game.variant),move=e.analysis.bestmove,line=e.analysis.lines.find(line=>line.move===move);
  if(!report.engine||e.analysis.fen!==board.fen()||!line||line.move!==move)fail(503,'This saved review does not contain usable practice evidence.');
  replay([...game.moves.slice(0,e.ply-1),move],game.initialFen,game.variant);
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
  const prefix=game.moves.slice(0,q.ply-1),shown=c.feedback?.move||null,board=replay(shown?[...prefix,shown]:prefix,game.initialFen,game.variant),root=replay(prefix,game.initialFen,game.variant);
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
 const p=structuredClone(value),q=p.questions[p.index],c=p.current,prefix=game.moves.slice(0,q.ply-1),board=replay(prefix,game.initialFen,game.variant);
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
   const after=replay([...prefix,move],game.initialFen,game.variant),san=after.history().at(-1);let feedback;
   if(move===q.move)feedback={kind:'recommended',move,san,engine:q.engine,limits:q.limits,score:q.line.score,text:'You found the saved engine recommendation.'};
   else{
    const limits={...q.limits,movetime:Math.min(q.limits.movetime,2000)};
    const evidence=await analyze({...limits,moves:prefix,initialFen:game.initialFen,variant:game.variant,playedMove:move});
    if(!evidence||evidence.fen!==board.fen()||!evidence.engine||evidence.played?.move!==move||!evidence.played.classification||!evidence.limits)fail(503,'The engine returned no matching move evidence. Your practice is unchanged.');
    const a=evidence.played,mate=a.afterScore?.type==='mate'&&Number.isInteger(a.afterScore.value)&&a.afterScore.value!==0?a.afterScore:null,strong=a.classification==='Best'&&evidence.bestmove===move||a.classification==='Checkmate'&&after.isCheckmate()||a.classification==='Good'&&(Number.isFinite(a.lossCp)&&a.lossCp>=0&&a.lossCp<50||mate!=null&&(mate.value>0)===(board.turn()==='w'));
    feedback={kind:strong?'alternative':'retry',move,san,engine:evidence.engine,limits:evidence.limits,score:a.afterScore,classification:a.classification,lossCp:a.lossCp,text:strong?'A strong alternative at this search limit.':a.lossCp==null?(mate?`The search finds mate in ${Math.abs(mate.value)} for ${mate.value>0?'White':'Black'}. There is no centipawn comparison.`:'This mate line has no numerical comparison. Try the saved recommendation or reveal it.'):'Keep looking for a stronger move.',explanation:a.explanation};
   }
   c.attempts++;c.feedback=feedback;if(feedback.kind!=='retry')c.outcome='solved';
  }
 }
 p.revision++;return p;
}
