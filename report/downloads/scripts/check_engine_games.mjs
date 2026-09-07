import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.mjs';
import {replay,closeEngine} from '../server/engine.mjs';
import {closeOpponentEngines} from '../server/opponent-engines.mjs';
const folder=mkdtempSync(join(tmpdir(),'chesslab-engine-games-'));
const state=createApp({databasePath:join(folder,'games.sqlite')});
const server=state.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base=`http://127.0.0.1:${server.address().port}`;let cookie;
async function request(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;const result=await response.json();assert.ok(response.ok,`${path}: ${JSON.stringify(result)}`);return result;}
try{
 await request('/api/register',{username:'enginecheck',password:'temporary-engine-check'});
 const {engines}=await request('/api/bots');const results=[];
 for(const engine of engines){assert.equal(engine.available,true,`${engine.id}: ${engine.reason}`);const start=performance.now();let {game}=await request('/api/games',{engineId:engine.id,color:'b',rating:1500});game=(await request(`/api/games/${game.id}/bot`,{revision:game.revision})).game;assert.equal(game.moves.length,1);assert.equal(game.lastEngineDecision.engineId,engine.id);replay(game.moves,game.initialFen);const saved=(await request(`/api/games/${game.id}`)).game;assert.deepEqual(saved.moves,game.moves);results.push({engineId:engine.id,engine:game.lastEngineDecision.engine,move:game.moves[0],elapsedMs:Math.round(performance.now()-start),saved:true});}
 console.log(JSON.stringify({verifiedAt:new Date().toISOString(),scope:'Real engine moves through authenticated game API in an isolated temporary database',results},null,2));
}finally{await new Promise(r=>server.close(r));state.close();closeEngine();closeOpponentEngines();rmSync(folder,{recursive:true,force:true});}
