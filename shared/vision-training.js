import {Chess} from 'chess.js';
import {randomInt,randomUUID} from './random.js';

// Board vision rounds: name squares or play a piece's move against a 30-second clock. Storage is the caller's.
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
// Ends a round whose clock ran out. Returns true when the round changed and needs saving.
export function settleRound(r,stamp){if(r?.state==='active'&&stamp>=r.endsAt){r.state='complete';r.revision++;return true;}return false;}
export const roundSummary=data=>{const {prompt,answers,...item}=data;return item;};
// Best score per mode, color and coordinate setting over completed rounds, as the server's GROUP BY reports it.
export function roundBests(rounds){
 const groups=new Map();
 for(const r of rounds){if(r.state!=='complete')continue;const key=JSON.stringify([r.mode,r.color,r.coordinates]);const row=groups.get(key);if(row){row.score=Math.max(row.score,r.score);row.rounds++;}else groups.set(key,{mode:r.mode,color:r.color,coordinates:!!r.coordinates,score:r.score,rounds:1});}
 return [...groups.values()];
}
export function roundOptions(body){
 const {mode,color,coordinates}=body;
 if(!['coordinates','moves','mixed'].includes(mode)||!['w','b','random'].includes(color)||typeof coordinates!=='boolean')fail(400,'Choose a training mode, color and coordinate setting.');
 return {mode,color,coordinates};
}
export function createRound({mode,color,coordinates},stamp){
 const orientation=color==='random'?pick(['w','b']):color;
 return {id:randomUUID(),mode,color,coordinates,orientation,startsAt:stamp+3000,endsAt:stamp+33000,revision:0,state:'active',score:0,mistakes:0,prompt:visionPrompt(mode,orientation),answers:[]};
}
export function checkRoundAction(r,body){
 if(!Number.isInteger(body.revision)||body.revision!==r.revision)fail(409,'This round changed. Reload the round before answering.');
 if(!['answer','quit'].includes(body.action))fail(400,'Choose answer or quit.');
 if(body.action==='answer'&&(typeof body.square!=='string'||!/^[a-h][1-8]$/.test(body.square)||r.prompt.kind==='move'&&(typeof body.from!=='string'||!/^[a-h][1-8]$/.test(body.from))))fail(400,'Choose a board square and the piece origin for a move.');
}
// One answer or quit on an active round, applied in place.
export function answerRound(r,body,stamp){
 if(body.action==='answer'&&stamp<r.startsAt)fail(409,'Wait for the countdown to finish.');
 let correct=null,message='Round ended early. It will not count toward your best.';
 if(body.action==='quit')r.state='quit';
 else{
  correct=body.square===r.prompt.to&&(r.prompt.kind==='square'||body.from===r.prompt.from);
  if(correct){r.score++;message='Correct: '+r.prompt.text;r.answers.push(r.prompt.text);r.prompt=visionPrompt(r.mode,r.orientation,r.prompt);}
  else{r.mistakes++;message='Not quite. Try the same prompt again.';}
 }
 r.revision++;
 return {correct,message};
}
