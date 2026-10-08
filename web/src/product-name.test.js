// The interface shows the AskTheMove name. Stored keys and the study file format keep their earlier identifiers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');

test('the page title, sidebar wordmark and footer name AskTheMove',()=>{
 assert.match(read('../index.html'),/<title>AskTheMove · [^<]+<\/title>/);
 const main=read('./main.jsx');
 assert.ok(main.includes('aria-label="AskTheMove home"'));
 assert.ok(main.includes('<span>Ask<span className="brand-light">TheMove</span></span>'));
 assert.ok(main.includes('<span>AskTheMove · {status?.hosted?'));
});

test('no interface source shows the earlier ChessLab name',()=>{
 assert.ok(!read('../index.html').includes('ChessLab'));
 const sources=readdirSync(new URL('.',import.meta.url)).filter(name=>/\.(jsx|js)$/.test(name)&&!name.endsWith('.test.js'));
 assert.ok(sources.includes('main.jsx'));
 for(const name of sources)assert.ok(!read('./'+name).includes('ChessLab'),`${name} still shows ChessLab`);
});

test('saved settings, the open game and study files keep their earlier identifiers',()=>{
 const main=read('./main.jsx');
 for(const key of ["'chesslab-settings'","'chesslab-game'",'.chesslab.json'])assert.ok(main.includes(key),`${key} must stay readable for existing users`);
});
