// The board follows the real chessboard: a1 is dark and h1 is light ("light on the right").
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDarkSquare} from './square-color.js';

test('a1 and h8 are dark; h1 and a8 are light',()=>{
 for(const square of ['a1','h8','c1','e1','d8','b2','e5'])assert.equal(isDarkSquare(square),true,square);
 for(const square of ['h1','a8','b1','d1','e8','a2','d5'])assert.equal(isDarkSquare(square),false,square);
});

test('neighbouring squares always alternate',()=>{
 const files='abcdefgh';
 for(let rank=1;rank<=8;rank++)for(let file=0;file<8;file++){
  const square=files[file]+rank;
  if(file<7)assert.notEqual(isDarkSquare(square),isDarkSquare(files[file+1]+rank),square);
  if(rank<8)assert.notEqual(isDarkSquare(square),isDarkSquare(files[file]+(rank+1)),square);
 }
});

test('the board colours its squares with isDarkSquare',()=>{
 const board=readFileSync(new URL('./Board.jsx',import.meta.url),'utf8');
 assert.ok(board.includes("import {isDarkSquare} from './square-color.js';"));
 assert.ok(board.includes('dark=isDarkSquare(square)'));
});
