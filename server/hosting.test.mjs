import test from 'node:test';
import assert from 'node:assert/strict';
import {hostingGuard} from './hosting.mjs';
import worker from './sites-worker.mjs';

test('private hosting fails closed and rejects cross-site or oversized proxy requests',async()=>{
  const origin='https://chess.example',secret='a'.repeat(64);
  assert.throws(()=>hostingGuard({publicOrigin:origin,secret:''}));
  assert.throws(()=>hostingGuard({publicOrigin:origin+'/path',secret}));
  for(const value of ['', 'b'.repeat(64),'é'.repeat(64)]) {
    let status=0;
    hostingGuard({publicOrigin:origin,secret})({get:()=>value},{status(n){status=n;return this;},json(){}},()=>assert.fail('Must reject'));
    assert.equal(status,403);
  }
  let passed=false;hostingGuard({publicOrigin:origin,secret})({get:()=>secret},{},()=>passed=true);assert.ok(passed);
  const env={CHESSLAB_BACKEND_URL:'https://engine.example',CHESSLAB_BACKEND_SECRET:secret};
  const bad=await worker.fetch(new Request(origin+'/api/games',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'}),env);
  assert.equal(bad.status,403);
  let canceled=false;
  const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(16384));},cancel(){canceled=true;}});
  const large=await worker.fetch(new Request(origin+'/api/games',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body,duplex:'half'}),env);
  assert.equal(large.status,413);assert.ok(canceled);
});
