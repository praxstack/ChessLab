import {Chess} from 'chess.js';
import {randomUUID} from './random.js';

// Puzzle attempt rules shared by the server (SQLite) and the browser app (IndexedDB).
// Storage and the puzzle catalogue stay with the caller.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const movePattern=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
const play=(chess,move)=>chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
export const localDay=milliseconds=>{const d=new Date(milliseconds);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const ratingUpdate=(rating,puzzleRating,won)=>Math.round(rating+32*((won?1:0)-1/(1+10**((puzzleRating-rating)/400))));
export const defaultPuzzleProfile=()=>({rating:1500,best:1500,ratedCount:0});
export const missingCatalogue=()=>({available:false,count:0,themes:{},message:'The local puzzle catalogue is not installed.'});
export function preparePuzzle(row){
 const moves=row.moves.split(' '),board=new Chess(row.fen);
 if(moves.length<2||moves.length>100||moves.length%2||moves.some(move=>!movePattern.test(move)))throw new Error('Invalid source solution.');
 const trigger=play(board,moves[0]),fen=board.fen(),side=board.turn();
 for(const move of moves.slice(1))play(board,move);
 return {id:row.id,initialFen:row.fen,fen,side,trigger:moves[0],triggerSan:trigger.san,solution:moves.slice(1),rating:row.rating,themes:row.themes.split(' '),gameUrl:row.game_url,openingTags:row.opening_tags};
}
export function advancePuzzle(a,body){
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
// The attempt as the learner sees it: the solution stays hidden until it is revealed.
export const visibleAttempt=attempt=>{if(!attempt)return null;const {solution,initialFen,...puzzle}=attempt.puzzle;return {...attempt,puzzle,...(attempt.state==='revealed'?{solution}: {})};};
export const newAttempt=(puzzle,{mode='custom',difficulty=null,dailyDate=null}={},stamp)=>({id:randomUUID(),mode,difficulty,dailyDate,ratingChange:null,puzzle,moves:[],revision:0,state:'active',mistakes:0,assisted:false,hint:null,createdAt:stamp,updatedAt:stamp});
export const attemptSummary=a=>({id:a.id,mode:a.mode||'custom',ratingChange:a.ratingChange||null,dailyDate:a.dailyDate||null,puzzleId:a.puzzle.id,rating:a.puzzle.rating,themes:a.puzzle.themes,state:a.state,mistakes:a.mistakes,assisted:a.assisted,updatedAt:a.updatedAt});
export const failedBefore=a=>a.state!=='active'&&(a.state!=='solved'||a.mistakes>0||a.assisted);
// Consecutive solved daily puzzles ending today, or yesterday when today is still open.
export function dailyStreak(date,completedDates){
 const days=new Set(completedDates);let cursor=new Date(date+'T12:00:00Z'),streak=0;
 if(!days.has(date))cursor.setUTCDate(cursor.getUTCDate()-1);
 while(days.has(cursor.toISOString().slice(0,10))){streak++;cursor.setUTCDate(cursor.getUTCDate()-1);}
 return streak;
}
// A rated attempt changes the rating once, when it is finished or first goes wrong. Returns the next profile or null.
export function scoreAttempt(previous,a){
 if(a.mode!=='rated'||a.ratingChange||(a.state==='active'&&!a.mistakes&&!a.assisted))return null;
 const won=a.state==='solved'&&!a.mistakes&&!a.assisted,after=ratingUpdate(previous.rating,a.puzzle.rating,won);
 a.ratingChange={before:previous.rating,after,delta:after-previous.rating,result:won?'win':'loss',algorithm:'local-elo-32'};
 return {rating:after,best:Math.max(previous.best,after),ratedCount:previous.ratedCount+1};
}
export function checkAttemptAction(a,body){
 if(!Number.isInteger(body.revision)||body.revision!==a.revision)fail(409,'This attempt changed. Reload it before continuing.');
 if(a.state!=='active')fail(409,'This puzzle attempt is already finished.');
}
export function attemptStudy(a){
 if(a.state==='active')fail(409,'Finish or reveal the puzzle before analysis.');
 return {title:`Puzzle ${a.puzzle.id}`,source:'import',initialFen:a.puzzle.initialFen,moves:[a.puzzle.trigger,...(a.state==='solved'?a.moves:a.puzzle.solution)],headers:{White:'Puzzle White',Black:'Puzzle Black'},puzzleSource:{id:a.puzzle.id,url:a.puzzle.gameUrl,rating:a.puzzle.rating,themes:a.puzzle.themes}};
}
export function trainingMode(body){
 const mode=body.fromAttempt!==undefined?'custom':body.mode??'custom';if(!['custom','rated','daily'].includes(mode))fail(400,'Choose rated, daily or custom mode.');
 return mode;
}
