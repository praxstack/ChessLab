import {randomUUID} from './random.js';
import {courseLessons} from './curriculum.js';
import {advancePuzzle} from './puzzle-training.js';

// Course lesson sessions: one challenge at a time, solved by moves. Storage is the caller's.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const lessonFor=id=>{const lesson=courseLessons.find(l=>l.id===id);if(!lesson)fail(404,'Lesson not found.');return lesson;};
const current=(lesson,step)=>({puzzle:lesson.challenges[step],moves:[],mistakes:0,assisted:false,hint:null,state:'active'});
export const lessonView=session=>{const {solution,explanation,...puzzle}=session.current.puzzle;return {...session,current:{...session.current,puzzle,...(session.current.state==='solved'?{explanation}:{})}};};
export const sessionSummary=s=>({lessonId:s.lessonId,id:s.id,state:s.state,step:s.step,revision:s.revision});
// Returns the saved session to resume, or a new session to save; restarting an active attempt is refused.
export function startLesson(id,previous,body,stamp){
 const lesson=lessonFor(id);if(body.restart!==undefined&&typeof body.restart!=='boolean')fail(400,'Invalid restart option.');
 if(previous&&!body.restart)return {session:previous,fresh:false};if(previous?.state==='active'&&body.restart)fail(409,'Finish the current lesson attempt before restarting.');
 return {session:{id:randomUUID(),lessonId:id,step:0,revision:0,state:'active',current:current(lesson,0),updatedAt:stamp},fresh:true};
}
// Applies one action to a saved session in place. The caller saves it and records completion when state is 'complete'.
export function lessonStep(id,s,body,stamp){
 const lesson=lessonFor(id);if(!s)fail(404,'Lesson attempt not found.');if(body.id!==s.id||!Number.isInteger(body.revision)||body.revision!==s.revision)fail(409,'This lesson changed. Reload it before continuing.');if(s.state==='complete')fail(409,'This lesson is already complete.');
 let correct=null,message;
 if(body.action==='next'){if(s.current.state!=='solved')fail(409,'Solve this challenge before continuing.');if(s.step>=lesson.challenges.length-1)fail(409,'No next challenge.');s.step++;s.current=current(lesson,s.step);message='Try the next position.';}
 else if(body.action==='move'){if(s.current.state!=='active')fail(409,'Continue to the next challenge.');({correct,message}=advancePuzzle(s.current,body));if(correct===false)message='That move does not follow this challenge. The position is unchanged; try again.';if(s.current.state==='solved'){message=lesson.challenges[s.step].explanation;if(s.step===lesson.challenges.length-1)s.state='complete';}}
 else fail(400,'Choose move or next.');
 s.revision++;s.updatedAt=stamp;
 return {correct,message};
}
