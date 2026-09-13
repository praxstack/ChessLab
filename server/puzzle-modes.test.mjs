import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTrainer,ratingUpdate,localDay} from './puzzle-training.mjs';

function fixture(){
 const folder=mkdtempSync(join(tmpdir(),'puzzle-modes-')),cataloguePath=join(folder,'source.sqlite'),path=join(folder,'accounts.sqlite'),source=new DatabaseSync(cataloguePath);
 source.exec('CREATE TABLE puzzles(seq INTEGER,id TEXT,fen TEXT,moves TEXT,rating INTEGER,themes TEXT,game_url TEXT,opening_tags TEXT);CREATE TABLE pool(theme TEXT,rating INTEGER,seq INTEGER);CREATE TABLE metadata(key TEXT,value TEXT);');
 for(let seq=1;seq<=100;seq++){source.prepare('INSERT INTO puzzles VALUES (?,?,?,?,?,?,?,?)').run(seq,'test'+seq,'8/5K1k/6Q1/8/8/8/8/8 b - - 0 1','h7h8 g6g7',1050+seq*6,'mateIn1','https://lichess.org/12345678','');source.prepare('INSERT INTO pool VALUES (?,?,?)').run('',1050+seq*6,seq);}
 source.prepare('INSERT INTO metadata VALUES (?,?)').run('catalogue',JSON.stringify({count:100,themes:{mateIn1:100},archiveSha256:'fixture'}));source.close();
 let db=new DatabaseSync(path);db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES ('alice'),('bob')");let now=new Date(2026,8,13,12).getTime();let trainer=createTrainer({db,cataloguePath,nowMs:()=>now});
 return {get db(){return db;},get trainer(){return trainer;},setTime:value=>{now=value;},get now(){return now;},restart(){trainer.close();db.close();db=new DatabaseSync(path);trainer=createTrainer({db,cataloguePath,nowMs:()=>now});},close(){trainer.close();db.close();rmSync(folder,{recursive:true,force:true});}};
}
test('local puzzle rating follows fixed Elo expectation and bounded changes',()=>{
 assert.equal(ratingUpdate(1500,1500,true),1516);assert.equal(ratingUpdate(1500,1500,false),1484);
 assert.ok(ratingUpdate(1500,1800,true)>ratingUpdate(1500,1200,true));assert.ok(ratingUpdate(1500,1200,false)<ratingUpdate(1500,1800,false));
 assert.equal(localDay(new Date(2026,8,13,23,59).getTime()),'2026-09-13');
});
test('rated scoring is atomic and once-only; practice and daily cannot farm rating',()=>{
 const f=fixture();try{
  let a=f.trainer.start('alice',{mode:'rated',difficulty:'standard'});assert.equal(a.mode,'rated');assert.ok(a.puzzle.rating>=1050&&a.puzzle.rating<=1350);assert.equal(a.ratingChange,null);
  const win=f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:0});assert.equal(win.attempt.ratingChange.result,'win');const profile=f.trainer.state('alice').profile;assert.equal(profile.ratedCount,1);assert.ok(profile.rating>1500);
  assert.throws(()=>f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:1}),/already finished/);
  a=f.trainer.start('alice',{mode:'rated',fromAttempt:a.id});assert.equal(a.mode,'custom');f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:0});assert.equal(f.trainer.state('alice').profile.rating,profile.rating);
  a=f.trainer.start('alice',{mode:'rated',difficulty:'hard'});const hint=f.trainer.act('alice',a.id,{action:'hint',revision:0});assert.equal(hint.attempt.ratingChange.result,'loss');const lost=f.trainer.state('alice').profile.rating;
  f.restart();assert.equal(f.trainer.get('alice',a.id).ratingChange.after,lost);f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:1});assert.equal(f.trainer.state('alice').profile.rating,lost);assert.equal(f.trainer.state('alice').profile.ratedCount,2);
  a=f.trainer.start('alice',{mode:'rated',difficulty:'extra'});f.db.exec("CREATE TRIGGER fail_attempt BEFORE UPDATE ON puzzle_attempts BEGIN SELECT RAISE(ABORT,'storage failure'); END;");
  assert.throws(()=>f.trainer.act('alice',a.id,{action:'reveal',revision:0}),/storage failure/);assert.equal(f.trainer.state('alice').profile.rating,lost);assert.equal(f.trainer.get('alice',a.id).revision,0);f.db.exec('DROP TRIGGER fail_attempt');
  f.trainer.act('alice',a.id,{action:'skip',revision:0});assert.equal(f.trainer.state('alice').profile.ratedCount,3);
  assert.throws(()=>f.trainer.start('alice',{mode:'rated',difficulty:'nonsense'}),/difficulty/);assert.throws(()=>f.trainer.start('alice',{mode:'invented'}),/mode/);
  f.db.prepare('INSERT INTO puzzle_profiles VALUES (?,?,?,?)').run('bob',100,1500,5);const low=f.trainer.start('bob',{mode:'rated'});assert.ok(low.puzzle.rating>=1056,'An empty low band falls back to the nearest installed difficulty');
 }finally{f.close();}
});
test('daily is shared, pinned across rollover and restart, and credited once per account/date',()=>{
 const f=fixture();try{
  let a=f.trainer.start('alice',{mode:'daily'}),b=f.trainer.start('bob',{mode:'daily'});assert.equal(a.dailyDate,'2026-09-13');assert.equal(a.puzzle.id,b.puzzle.id);assert.equal(f.trainer.start('alice',{mode:'daily'}).id,a.id);
  f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:0});assert.equal(f.trainer.start('alice',{mode:'daily'}).id,a.id);assert.equal(f.trainer.state('alice').daily.streak,1);assert.equal(f.trainer.state('alice').profile.ratedCount,0);
  f.setTime(new Date(2026,8,14,0,1).getTime());assert.equal(f.trainer.get('bob',b.id).dailyDate,'2026-09-13');assert.throws(()=>f.trainer.start('bob',{mode:'daily'}),/current puzzle/);
  f.trainer.act('bob',b.id,{action:'move',move:'g6g7',revision:0});a=f.trainer.start('alice',{mode:'daily'});b=f.trainer.start('bob',{mode:'daily'});assert.equal(a.dailyDate,'2026-09-14');assert.equal(a.puzzle.id,b.puzzle.id);
  f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:0});f.restart();assert.equal(f.trainer.state('alice').daily.streak,2);assert.equal(f.trainer.state('alice').daily.completedDates.length,2);assert.equal(f.trainer.state('alice').daily.today.state,'solved');
  a=f.trainer.start('alice',{fromAttempt:a.id,mode:'daily'});assert.equal(a.mode,'custom');f.trainer.act('alice',a.id,{action:'move',move:'g6g7',revision:0});assert.equal(f.trainer.state('alice').daily.completedDates.length,2);
  f.setTime(new Date(2026,8,17,12).getTime());assert.equal(f.trainer.state('alice').daily.streak,0);
 }finally{f.close();}
});
