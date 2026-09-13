import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTrainer} from './puzzle-training.mjs';

function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'rush-')),cataloguePath=join(dir,'source.sqlite'),dbPath=join(dir,'accounts.sqlite'),source=new DatabaseSync(cataloguePath);
 source.exec('CREATE TABLE puzzles(seq INTEGER,id TEXT,fen TEXT,moves TEXT,rating INTEGER,themes TEXT,game_url TEXT,opening_tags TEXT);CREATE TABLE pool(theme TEXT,rating INTEGER,seq INTEGER);CREATE TABLE metadata(key TEXT,value TEXT);');
 for(let seq=1;seq<=100;seq++){source.prepare('INSERT INTO puzzles VALUES (?,?,?,?,?,?,?,?)').run(seq,'rush'+seq,'8/5K1k/6Q1/8/8/8/8/8 b - - 0 1','h7h8 g6g7',seq*50,'mateIn1','https://lichess.org/12345678','');source.prepare('INSERT INTO pool VALUES (?,?,?)').run('',seq*50,seq);}
 source.prepare('INSERT INTO metadata VALUES (?,?)').run('catalogue',JSON.stringify({count:100,themes:{mateIn1:100},archiveSha256:'fixture'}));source.close();
 let db=new DatabaseSync(dbPath);db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES ('alice'),('bob')");let now=1800000000000,trainer=createTrainer({db,cataloguePath,nowMs:()=>now});
 return {get trainer(){return trainer;},get db(){return db;},get now(){return now;},advance:ms=>{now+=ms;},restart(){trainer.close();db.close();db=new DatabaseSync(dbPath);trainer=createTrainer({db,cataloguePath,nowMs:()=>now});},close(){trainer.close();db.close();rmSync(dir,{recursive:true,force:true});}};
}
const action=(f,run,body)=>f.trainer.rush.act('alice',run.id,{revision:run.revision,...body}).run;
test('Rush scores complete solutions once, increases difficulty and ends on three failed puzzles',()=>{
 const f=fixture();try{
  let run=f.trainer.rush.start('alice',{variant:'survival'}).run;assert.equal(run.deadline,null);assert.equal(run.current.puzzle.solution,undefined);assert.equal(run.current.puzzle.initialFen,undefined);
  const first=run.current.puzzle;assert.throws(()=>action(f,run,{action:'hint'}),/move, skip or end/);assert.throws(()=>action(f,run,{action:'move',move:'g6g9'}),/coordinate move/);
  run=action(f,run,{action:'move',move:'g6g7'});assert.equal(run.score,1);assert.equal(run.items.length,1);assert.equal(run.items[0].result,'solved');assert.notEqual(run.current.puzzle.id,first.id);assert.ok(run.current.puzzle.rating>=first.rating);
  assert.throws(()=>f.trainer.rush.act('alice',run.id,{revision:0,action:'skip'}),/changed/);assert.throws(()=>f.trainer.rush.retry('alice',run.id,0),/Finish/);
  run=action(f,run,{action:'move',move:'g6g1'});assert.equal(run.mistakes,1);assert.equal(run.items[1].result,'failed');run=action(f,run,{action:'skip'});run=action(f,run,{action:'skip'});
  assert.equal(run.state,'finished');assert.equal(run.reason,'mistakes');assert.equal(run.score,1);assert.equal(run.mistakes,3);assert.equal(new Set(run.items.map(x=>x.puzzleId)).size,4);
  assert.equal(f.trainer.rush.state('alice').bests.survival,1);assert.equal(f.trainer.state('alice').profile.ratedCount,0);assert.equal(f.trainer.state('alice').daily.completedDates.length,0);
  const saved=JSON.stringify(f.trainer.rush.get('alice',run.id).run);const retry=f.trainer.rush.retry('alice',run.id,1);assert.equal(retry.mode,'custom');assert.equal(retry.puzzle.id,run.items[1].puzzleId);f.trainer.act('alice',retry.id,{action:'reveal',revision:0});assert.equal(JSON.stringify(f.trainer.rush.get('alice',run.id).run),saved);
  assert.throws(()=>action(f,run,{action:'skip'}),/finished/);
 }finally{f.close();}
});
test('timed Rush expires exactly at its server deadline across restart; Survival does not',()=>{
 const f=fixture();try{
  for(const [variant,duration] of [['3min',180000],['5min',300000]]){
   let run=f.trainer.rush.start('alice',{variant}).run;assert.equal(run.deadline,f.now+duration);f.advance(duration-1);f.restart();assert.equal(f.trainer.rush.state('alice').run.id,run.id);f.advance(1);
   run=action(f,run,{action:'move',move:'g6g7'});assert.equal(run.state,'finished');assert.equal(run.reason,'time');assert.equal(run.score,0);assert.equal(run.endedAt,run.deadline);assert.equal(run.items.at(-1).result,'timeout');assert.equal(f.trainer.rush.state('alice').run,null);
  }
  let run=f.trainer.rush.start('alice',{variant:'survival'}).run;f.advance(86400000);f.restart();assert.equal(f.trainer.rush.state('alice').run.id,run.id);run=action(f,run,{action:'end'});assert.equal(run.reason,'ended');assert.equal(run.mistakes,0);
 }finally{f.close();}
});
test('Rush isolates accounts, excludes concurrent practice, and rolls back a failed atomic save',()=>{
 const f=fixture();try{
  assert.throws(()=>f.trainer.rush.start('alice',{variant:'blitz'}),/mode/);
  let practice=f.trainer.start('alice',{});assert.throws(()=>f.trainer.rush.start('alice',{variant:'3min'}),/current puzzle/);f.trainer.act('alice',practice.id,{action:'skip',revision:0});
  let run=f.trainer.rush.start('alice',{variant:'3min'}).run;assert.throws(()=>f.trainer.start('alice',{}),/Rush/);assert.throws(()=>f.trainer.rush.start('alice',{variant:'survival'}),/Rush/);
  assert.throws(()=>f.trainer.rush.get('bob',run.id),/not found/);assert.throws(()=>f.trainer.rush.act('bob',run.id,{action:'skip',revision:0}),/not found/);assert.throws(()=>f.trainer.rush.retry('bob',run.id,0),/not found/);assert.equal(f.trainer.rush.state('bob').history.length,0);
  f.db.exec("CREATE TRIGGER fail_run BEFORE UPDATE ON puzzle_runs BEGIN SELECT RAISE(ABORT,'storage failure'); END;");assert.throws(()=>action(f,run,{action:'move',move:'g6g7'}),/storage failure/);f.db.exec('DROP TRIGGER fail_run');
  let restored=f.trainer.rush.get('alice',run.id).run;assert.equal(restored.revision,0);assert.equal(restored.score,0);assert.equal(restored.current.puzzle.id,run.current.puzzle.id);
  run=action(f,run,{action:'end'});assert.throws(()=>f.trainer.rush.retry('alice',run.id,-1),/puzzle/);assert.throws(()=>f.trainer.rush.retry('alice',run.id,99),/puzzle/);practice=f.trainer.rush.retry('alice',run.id,0);assert.equal(practice.mode,'custom');
 }finally{f.close();}
});
