import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

const folder=await mkdtemp(join(tmpdir(),'chesslab-local-'));
const env={...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:'0',CHESSLAB_DB:join(folder,'test.sqlite'),COOKIE_SECURE:'0'};
delete env.PUBLIC_ORIGIN;
delete env.CHESSLAB_BACKEND_SECRET;
const child=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});
let diagnostics='';
child.stderr.on('data',chunk=>diagnostics+=chunk);
const exited=once(child,'exit');
try {
  const base=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error(`Startup timed out: ${diagnostics}`)),15000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',()=>{clearTimeout(timeout);reject(new Error(`Server exited: ${diagnostics}`));});
    child.stdout.on('data',chunk=>{const match=String(chunk).match(/ChessLab ready at (http:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
  });
  for(const path of ['/','/research/','/design/','/pieces/chesscom/wn.png']){
    const response=await fetch(base+path);
    assert.equal(response.status,200,path);
    assert.ok((await response.arrayBuffer()).byteLength>100,path);
  }
  const status=await (await fetch(base+'/api/status')).json();
  assert.equal(status.engine.available,true);
  for(const path of ['/data/chesslab.sqlite','/.env','/.git/config']){
    const response=await fetch(base+path,{headers:{Accept:'application/octet-stream'}});
    assert.equal(response.status,404,`${path} stays private`);
  }
  console.log(JSON.stringify({status:'pass',checks:['loopback startup','web app','research archive','design archive','local piece asset','native engine ready','private data paths unavailable']}));
} finally {
  child.kill('SIGTERM');
  const force=setTimeout(()=>child.kill('SIGKILL'),5000);
  await exited;
  clearTimeout(force);
  await rm(folder,{recursive:true,force:true});
}
