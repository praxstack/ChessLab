import {randomUUID} from './random.js';

// Puzzle Rush rules shared by the server and the browser app. Storage and puzzle selection are the caller's.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const rushDurations={'3min':180000,'5min':300000,survival:null};
export const emptyRushBests=()=>({'3min':0,'5min':0,survival:0});
export const recordRush=(run,result)=>{run.current.state=result;run.items.push({...run.current,result});};
export const finishRush=(run,reason,time)=>{if(run.current.state==='active')recordRush(run,reason==='time'?'timeout':'unfinished');run.state='finished';run.reason=reason;run.endedAt=time;};
// Ends a run whose clock ran out. Returns true when the run changed and needs saving.
export function expireRush(run,stamp){
 if(run.state==='active'&&run.deadline!==null&&stamp>=run.deadline){finishRush(run,'time',run.deadline);run.revision++;return true;}
 return false;
}
export const visibleRun=run=>{
 if(!run)return null;
 const {solution,initialFen,...puzzle}=run.current.puzzle;
 return {...run,current:{...run.current,puzzle},items:run.items.map((item,index)=>({index,puzzleId:item.puzzle.id,rating:item.puzzle.rating,result:item.result}))};
};
export const rushHistoryRow=r=>({id:r.id,variant:r.variant,score:r.score,mistakes:r.mistakes,reason:r.reason,endedAt:r.endedAt});
// The next puzzle's minimum rating and the puzzle ids the run has already used.
export const rushNextRequest=run=>({min:Math.min(5000,Math.max(400+run.items.length*75,run.current?.puzzle.rating||0)),seen:run.items.map(item=>item.puzzle.id)});
export const rushItem=puzzle=>puzzle?{puzzle,moves:[],state:'active',mistakes:0,assisted:false,hint:null}:null;
export function rushVariant(body){
 const variant=body.variant??'3min';if(typeof variant!=='string'||!Object.hasOwn(rushDurations,variant))fail(400,'Choose a three-minute, five-minute or Survival mode.');
 return variant;
}
export const newRun=(variant,stamp)=>({id:randomUUID(),variant,revision:0,state:'active',score:0,mistakes:0,startedAt:stamp,deadline:null,endedAt:null,reason:null,items:[],current:null});
export const startClock=(run,stamp)=>{run.startedAt=stamp;run.deadline=rushDurations[run.variant]===null?null:run.startedAt+rushDurations[run.variant];};
export function checkRushAction(run,body){
 if(!Number.isInteger(body.revision)||run.revision!==body.revision)fail(409,'This run changed. Reload it before continuing.');
 if(run.state!=='active')fail(409,'This Rush run is already finished.');
}
// One learner action on an active run whose clock has not run out. next() supplies the following puzzle or null.
export function rushStep(run,body,{advancePuzzle,next,stamp}){
 if(!['move','skip','end'].includes(body.action))fail(400,'Choose move, skip or end. Hints and solutions are available after the run.');
 let message,correct=null;
 if(body.action==='end'){finishRush(run,'ended',stamp());message='Run ended. Review the puzzles at your own pace.';}
 else {
  if(body.action==='skip'){recordRush(run,'failed');run.mistakes++;message='Puzzle skipped. One life used.';}
  else {const result=advancePuzzle(run.current,body);correct=result.correct;message=result.message;if(!correct){recordRush(run,'failed');run.mistakes++;message='That puzzle was missed. Keep going.';}else if(run.current.state==='solved'){recordRush(run,'solved');run.score++;message='Puzzle solved. On to the next challenge.';}}
  if(run.mistakes===3)finishRush(run,'mistakes',stamp());
  else if(run.current.state!=='active'){const candidate=next(run);if(candidate)run.current=candidate;else finishRush(run,'catalogue',stamp());}
 }
 run.revision++;
 return {message,correct};
}
export function retryItem(run,index){
 if(run.state==='active')fail(409,'Finish your Rush run before retrying a puzzle.');
 if(!Number.isInteger(index)||index<0||index>=run.items.length)fail(400,'Choose a puzzle from this run.');
 return run.items[index].puzzle;
}
