import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {preparePuzzle,createTrainer} from './puzzle-training.mjs';

test('source trigger and every continuation replay legally; malformed lines fail closed',()=>{
 const rows=JSON.parse(readFileSync(new URL('../references/puzzles/test-lines.json',import.meta.url),'utf8'));
 for(const row of rows){const puzzle=preparePuzzle(row);assert.equal(puzzle.solution.length,row.moves.split(' ').length-1);assert.notEqual(puzzle.fen,row.fen);}
 assert.throws(()=>preparePuzzle({...rows[0],moves:'e8e1 a2e6'}));assert.throws(()=>preparePuzzle({...rows[0],moves:'e8d7 a2e6 d7d8'}));
});
test('alternate immediate mates count once; skip, unavailable source and empty retry remain explicit',()=>{
 const folder=mkdtempSync(join(tmpdir(),'trainer-unit-')),path=join(folder,'catalogue.sqlite'),source=new DatabaseSync(path),db=new DatabaseSync(':memory:');
 source.exec('CREATE TABLE puzzles(seq INTEGER,id TEXT,fen TEXT,moves TEXT,rating INTEGER,themes TEXT,game_url TEXT,opening_tags TEXT);CREATE TABLE pool(theme TEXT,rating INTEGER,seq INTEGER);CREATE TABLE metadata(key TEXT,value TEXT);');
 source.prepare('INSERT INTO puzzles VALUES (?,?,?,?,?,?,?,?)').run(1,'mate1','8/5K1k/6Q1/8/8/8/8/8 b - - 0 1','h7h8 g6g7',1000,'mateIn1','https://lichess.org/12345678','');
 source.exec("INSERT INTO pool VALUES ('',1000,1),('mateIn1',1000,1)");source.prepare('INSERT INTO metadata VALUES (?,?)').run('catalogue',JSON.stringify({count:1,themes:{mateIn1:1}}));source.close();
 db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES ('owner')");const trainer=createTrainer({db,cataloguePath:path,insertStudy:(_,v)=>v});
 try{
  assert.throws(()=>trainer.start('owner',{failedOnly:true}),/No previous mistakes/);
  let a=trainer.start('owner',{});const result=trainer.act('owner',a.id,{revision:0,action:'move',move:'g6h6'});assert.equal(result.attempt.state,'solved');assert.equal(trainer.state('owner').totals.unassisted,1);
  assert.throws(()=>trainer.act('owner',a.id,{revision:1,action:'move',move:'g6h6'}),/already finished/);assert.deepEqual(trainer.study('owner',a.id).moves,['h7h8','g6h6']);
  a=trainer.start('owner',{fromAttempt:a.id});trainer.act('owner',a.id,{revision:0,action:'skip'});assert.equal(trainer.state('owner').totals.solved,1);assert.equal(trainer.state('owner').totals.attempts,2);
  assert.throws(()=>trainer.start('owner',{min:1500,max:1000}),/rating range/);
 }finally{trainer.close();db.close();rmSync(folder,{recursive:true,force:true});}
 const empty=new DatabaseSync(':memory:');empty.exec('CREATE TABLE users(id TEXT PRIMARY KEY)');const missing=createTrainer({db:empty,cataloguePath:join(folder,'missing.sqlite')});assert.equal(missing.catalogue().available,false);assert.throws(()=>missing.start('owner',{}),/Install the local/);missing.close();empty.close();
});
