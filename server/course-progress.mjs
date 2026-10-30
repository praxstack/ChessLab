import {lessonView,sessionSummary,startLesson,lessonStep} from '../shared/course-progress.js';
export function createCourseProgress({db,nowMs=Date.now}){
 db.exec('CREATE TABLE IF NOT EXISTS lesson_sessions(user_id TEXT NOT NULL REFERENCES users(id),lesson_id TEXT NOT NULL,updated_at INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id));');
 const read=(userId,id)=>{const row=db.prepare('SELECT data FROM lesson_sessions WHERE user_id=? AND lesson_id=?').get(userId,id);return row?JSON.parse(row.data):null;};
 const list=userId=>({completed:db.prepare("SELECT item_id FROM progress WHERE user_id=? AND kind='lesson'").all(userId).map(x=>x.item_id),sessions:db.prepare('SELECT data FROM lesson_sessions WHERE user_id=? ORDER BY updated_at DESC').all(userId).map(({data})=>sessionSummary(JSON.parse(data)))});
 const response=(userId,session)=>({session:lessonView(session),progress:list(userId)});
 function start(userId,id,body){
  const {session,fresh}=startLesson(id,read(userId,id),body,nowMs());
  if(fresh)db.prepare('INSERT INTO lesson_sessions VALUES (?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET updated_at=excluded.updated_at,data=excluded.data').run(userId,id,session.updatedAt,JSON.stringify(session));
  return response(userId,session);
 }
 function act(userId,id,body){
  const s=read(userId,id),{correct,message}=lessonStep(id,s,body,nowMs());
  db.exec('BEGIN IMMEDIATE');try{
   if(s.state==='complete')db.prepare('INSERT OR IGNORE INTO progress VALUES (?,?,?)').run(userId,'lesson',id);
   db.prepare('UPDATE lesson_sessions SET updated_at=?,data=? WHERE user_id=? AND lesson_id=?').run(s.updatedAt,JSON.stringify(s),userId,id);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {...response(userId,s),correct,message};
 }
 return {list,start,act};
}
