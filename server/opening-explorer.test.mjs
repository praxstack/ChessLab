import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Chess} from 'chess.js';
import {createExplorer,explorerKey,indexPersonalGame} from './opening-explorer.mjs';

test('position identity, first encounter, personal ownership, invalid input and read-only corpus',()=>{
 const dir=mkdtempSync(join(tmpdir(),'explorer-')),path=join(dir,'corpus.sqlite'),db=new DatabaseSync(':memory:');db.exec('CREATE TABLE games(id TEXT,user_id TEXT,data TEXT)');
 const board=new Chess(),start=board.fen(),g={id:'a',revision:0,headers:{White:'Alice',Black:'Bot',Result:'1-0'},result:'1-0',moves:['g1f3','g8f6','f3g1','f6g8','e2e4']};
 const indexed=indexPersonalGame(g);assert.equal(indexed.edges.filter(e=>e.position===explorerKey(start)).length,1);
 db.prepare('INSERT INTO games VALUES(?,?,?)').run('a','alice',JSON.stringify(g));
 db.prepare('INSERT INTO games VALUES(?,?,?)').run('b','bob',JSON.stringify({...g,id:'b',moves:['d2d4']}));
 const catalogue=new DatabaseSync(path);catalogue.exec('CREATE TABLE metadata(data TEXT);CREATE TABLE games(id INTEGER,headers TEXT,moves TEXT);CREATE TABLE edges(position TEXT,move TEXT,white INTEGER,draw INTEGER,black INTEGER,samples TEXT)');
 catalogue.prepare('INSERT INTO metadata VALUES(?)').run(JSON.stringify({count:3,maxPlies:60}));
 catalogue.prepare('INSERT INTO games VALUES(?,?,?)').run(1,JSON.stringify(g.headers),JSON.stringify(g.moves));
 catalogue.prepare('INSERT INTO edges VALUES(?,?,?,?,?,?)').run(explorerKey(start),'g1f3',1,1,1,'1');const e4=new Chess();e4.move('e4');catalogue.prepare('INSERT INTO edges VALUES(?,?,?,?,?,?)').run(explorerKey(e4.fen()),'e7e5',1,0,0,'1');catalogue.close();
 const explorer=createExplorer({cataloguePath:path,db});try{
  assert.throws(()=>explorer.position({source:'mine'}),e=>e.status===401);
  const own=explorer.position({source:'mine'},{id:'alice'});assert.equal(own.total,1);assert.equal(own.moves[0].san,'Nf3');assert.equal(own.games.length,1);assert.equal(own.games[0].id,'a');
  assert.throws(()=>explorer.game('b','mine',{id:'alice'}),e=>e.status===404);
  assert.throws(()=>explorer.position({source:'other'}),e=>e.status===400);assert.throws(()=>explorer.position({fen:'bad'}),e=>e.status===400);
  const publicResult=explorer.position();assert.equal(publicResult.total,3);assert.deepEqual(publicResult.moves.map(m=>[m.white,m.draw,m.black]),[[1,1,1]]);
  for(const move of g.moves.slice(0,4))board.move({from:move.slice(0,2),to:move.slice(2,4)});
  assert.deepEqual(explorer.position({fen:board.fen()}).moves,publicResult.moves);
  assert.deepEqual(explorer.position({fen:e4.fen({forceEnpassantSquare:true})}).moves,explorer.position({fen:e4.fen()}).moves);
  assert.equal(explorer.position({fen:start.replace(' KQkq ',' - ')}).total,0);
  assert.match(explorer.game('1').pgn,/Nf3/);assert.throws(()=>explorer.game('../1'),e=>e.status===404);
  const changed={...g,revision:1,moves:['e2e4']};db.prepare('UPDATE games SET data=? WHERE id=?').run(JSON.stringify(changed),'a');assert.equal(explorer.position({source:'mine'},{id:'alice'}).moves[0].san,'e4');
 }finally{explorer.close();db.close();rmSync(dir,{recursive:true,force:true});}
});
