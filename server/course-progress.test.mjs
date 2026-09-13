import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {Chess} from 'chess.js';
import {courseLessons,courses,curriculumCatalog} from './curriculum.mjs';import {createCourseProgress} from './course-progress.mjs';
const play=(board,move)=>board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
test('curriculum has unique lessons, legal complete challenge lines and grounded promotion examples',()=>{
 assert.equal(courseLessons.length,12);assert.equal(courses.length,4);assert.equal(new Set(courseLessons.map(x=>x.id)).size,12);assert.equal(courseLessons.reduce((sum,l)=>sum+l.challenges.length,0),24);
 for(const lesson of courseLessons){assert.ok(courses.some(c=>c.id===lesson.courseId));assert.ok(lesson.body.length>=2);for(const challenge of lesson.challenges){const board=new Chess(challenge.fen);assert.ok(challenge.solution.length%2===1);for(const move of challenge.solution)assert.ok(play(board,move));if(challenge.checkmate)assert.ok(board.isCheckmate());assert.ok(!board.isStalemate());}}
 for(const lesson of curriculumCatalog().lessons)for(const challenge of lesson.challenges)assert.equal(challenge.solution,undefined);
 const promotion=courseLessons.find(l=>l.id==='promotion-plan').challenges[1];const queen=new Chess(promotion.fen);play(queen,'c7c8q');assert.ok(queen.isStalemate());const rook=new Chess(promotion.fen);play(rook,'c7c8r');assert.ok(!rook.isStalemate());
});
test('lesson progress requires every challenge, survives reinstantiation and rejects stale identities',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES ('alice'),('bob');CREATE TABLE progress(user_id TEXT,kind TEXT,item_id TEXT,PRIMARY KEY(user_id,kind,item_id));");let service=createCourseProgress({db}),lesson=courseLessons[0];
 try{let session=service.start('alice',lesson.id,{}).session;assert.equal(session.step,0);assert.equal(service.list('alice').completed.length,0);assert.equal(service.list('bob').sessions.length,0);
  const act=(action,move)=>{session=service.act('alice',lesson.id,{id:session.id,revision:session.revision,action,move}).session;};
  assert.throws(()=>act('next'),/Solve/);assert.throws(()=>act('move','a1a9'),/coordinate/);assert.throws(()=>service.act('bob',lesson.id,{id:session.id,revision:0,action:'next'}),/not found/);
  act('move',lesson.challenges[0].solution[0]);assert.equal(session.current.state,'solved');assert.equal(session.state,'active');assert.equal(service.list('alice').completed.length,0);act('next');assert.equal(session.step,1);
  service=createCourseProgress({db});assert.equal(service.start('alice',lesson.id,{}).session.step,1);const old=session.id;
  for(const move of lesson.challenges[1].solution.filter((_,i)=>i%2===0))act('move',move);assert.equal(session.state,'complete');assert.deepEqual(service.list('alice').completed,[lesson.id]);
  assert.throws(()=>act('move',lesson.challenges[1].solution[0]),/complete/);session=service.start('alice',lesson.id,{restart:true}).session;assert.notEqual(session.id,old);assert.deepEqual(service.list('alice').completed,[lesson.id]);
  assert.throws(()=>service.act('alice',lesson.id,{id:old,revision:0,action:'move',move:lesson.challenges[0].solution[0]}),/changed/);
 }finally{db.close();}
});
test('multi-move lesson credit and failed-save rollback preserve accepted progress',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES ('alice');CREATE TABLE progress(user_id TEXT,kind TEXT,item_id TEXT,PRIMARY KEY(user_id,kind,item_id));");const service=createCourseProgress({db}),lesson=courseLessons.find(l=>l.id==='develop-together');
 try{let s=service.start('alice',lesson.id,{}).session;const act=(body)=>service.act('alice',lesson.id,{id:s.id,revision:s.revision,...body});
  s=act({action:'move',move:lesson.challenges[0].solution[0]}).session;assert.equal(s.current.moves.length,2);assert.equal(s.current.state,'active');assert.equal(service.list('alice').completed.length,0);
  assert.throws(()=>service.act('alice',lesson.id,{id:s.id,revision:0,action:'move',move:'b1c3'}),/changed/);s=act({action:'move',move:lesson.challenges[0].solution[2]}).session;s=act({action:'next'}).session;
  s=act({action:'move',move:lesson.challenges[1].solution[0]}).session;db.exec("CREATE TRIGGER fail_lesson BEFORE UPDATE ON lesson_sessions BEGIN SELECT RAISE(ABORT,'storage failure'); END;");assert.throws(()=>act({action:'move',move:lesson.challenges[1].solution[2]}),/storage failure/);assert.equal(service.list('alice').completed.length,0);assert.equal(service.start('alice',lesson.id,{}).session.revision,s.revision);db.exec('DROP TRIGGER fail_lesson');
  s=act({action:'move',move:lesson.challenges[1].solution[2]}).session;assert.equal(s.state,'complete');assert.deepEqual(service.list('alice').completed,[lesson.id]);
 }finally{db.close();}
});
