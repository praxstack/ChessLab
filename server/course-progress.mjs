import {randomUUID} from 'node:crypto';
import {courseLessons} from './curriculum.mjs';
import {advancePuzzle} from './puzzle-training.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createCourseProgress({db,nowMs=Date.now}){
 db.exec('CREATE TABLE IF NOT EXISTS lesson_sessions(user_id TEXT NOT NULL REFERENCES users(id),lesson_id TEXT NOT NULL,updated_at INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id));');
 const lessonFor=id=>{const lesson=courseLessons.find(l=>l.id===id);if(!lesson)fail(404,'Lesson not found.');return lesson;};
 const read=(userId,id)=>{const row=db.prepare('SELECT data FROM lesson_sessions WHERE user_id=? AND lesson_id=?').get(userId,id);return row?JSON.parse(row.data):null;};
 const current=(lesson,step)=>({puzzle:lesson.challenges[step],moves:[],mistakes:0,assisted:false,hint:null,state:'active'});
 const visible=session=>{const {solution,explanation,...puzzle}=session.current.puzzle;return {...session,current:{...session.current,puzzle,...(session.current.state==='solved'?{explanation}:{})}};};
 const list=userId=>({completed:db.prepare("SELECT item_id FROM progress WHERE user_id=? AND kind='lesson'").all(userId).map(x=>x.item_id),sessions:db.prepare('SELECT data FROM lesson_sessions WHERE user_id=? ORDER BY updated_at DESC').all(userId).map(({data})=>{const s=JSON.parse(data);return {lessonId:s.lessonId,id:s.id,state:s.state,step:s.step,revision:s.revision};})});
 const response=(userId,session)=>({session:visible(session),progress:list(userId)});
 function start(userId,id,body){
  const lesson=lessonFor(id),previous=read(userId,id);if(body.restart!==undefined&&typeof body.restart!=='boolean')fail(400,'Invalid restart option.');
  if(previous&&!body.restart)return response(userId,previous);if(previous?.state==='active'&&body.restart)fail(409,'Finish the current lesson attempt before restarting.');
  const session={id:randomUUID(),lessonId:id,step:0,revision:0,state:'active',current:current(lesson,0),updatedAt:nowMs()};db.prepare('INSERT INTO lesson_sessions VALUES (?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET updated_at=excluded.updated_at,data=excluded.data').run(userId,id,session.updatedAt,JSON.stringify(session));return response(userId,session);
 }
 function act(userId,id,body){
  const lesson=lessonFor(id),s=read(userId,id);if(!s)fail(404,'Lesson attempt not found.');if(body.id!==s.id||!Number.isInteger(body.revision)||body.revision!==s.revision)fail(409,'This lesson changed. Reload it before continuing.');if(s.state==='complete')fail(409,'This lesson is already complete.');
  let correct=null,message;
  if(body.action==='next'){if(s.current.state!=='solved')fail(409,'Solve this challenge before continuing.');if(s.step>=lesson.challenges.length-1)fail(409,'No next challenge.');s.step++;s.current=current(lesson,s.step);message='Try the next position.';}
  else if(body.action==='move'){if(s.current.state!=='active')fail(409,'Continue to the next challenge.');({correct,message}=advancePuzzle(s.current,body));if(correct===false)message='That move does not follow this challenge. The position is unchanged; try again.';if(s.current.state==='solved'){message=lesson.challenges[s.step].explanation;if(s.step===lesson.challenges.length-1)s.state='complete';}}
  else fail(400,'Choose move or next.');
  s.revision++;s.updatedAt=nowMs();db.exec('BEGIN IMMEDIATE');try{
   if(s.state==='complete')db.prepare('INSERT OR IGNORE INTO progress VALUES (?,?,?)').run(userId,'lesson',id);
   db.prepare('UPDATE lesson_sessions SET updated_at=?,data=? WHERE user_id=? AND lesson_id=?').run(s.updatedAt,JSON.stringify(s),userId,id);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {...response(userId,s),correct,message};
 }
 return {list,start,act};
}
