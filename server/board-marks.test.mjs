import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMarks,toggleMark,readMarkComment,writeMarkComment} from '../shared/board-marks.js';
import {readAnnotatedPgn,writeAnnotatedPgn,portableStudy,readPortableStudy,validateStudy} from './study-format.mjs';

test('board marks validate, toggle and round trip standard PGN comments without losing text',()=>{
 const arrow={from:'e2',to:'e4',color:'G'},highlight={from:'d4',to:'d4',color:'R'};
 let marks=toggleMark([],arrow);marks=toggleMark(marks,highlight);assert.equal(marks.length,2);assert.deepEqual(toggleMark(marks,arrow),[highlight]);assert.deepEqual(toggleMark(marks,{...arrow,color:'B'}),[{...arrow,color:'B'},highlight]);
 const encoded=writeMarkComment('Control the center.',marks);assert.match(encoded,/\[%cal Ge2e4\]/);assert.match(encoded,/\[%csl Rd4\]/);assert.deepEqual(readMarkComment(encoded),{comment:'Control the center.',marks});
 for(const invalid of [[{...arrow,color:['R']}],[{...arrow,color:'X'}],[{...arrow,to:'e9'}],[arrow,arrow],Array(65).fill(arrow)])assert.throws(()=>validateMarks(invalid));
 for(const text of ['[%cal Ge2e9]','[%csl Xe4]','[%cal]','[%cal Ge2e4,]'])assert.throws(()=>readMarkComment(text));
 const game=readAnnotatedPgn('1. e4 {Center [%cal Ge2e4] [%csl Rd4]} e5 (1... c5 {Side idea [%cal Bc7c5]}) *');assert.equal(game.study.annotations[0].marks.length,2);assert.ok(game.study.annotations.some(a=>a.marks.length===2));
 const copy=readAnnotatedPgn(writeAnnotatedPgn(game,'local'));assert.deepEqual(copy.study.annotations.map(a=>[a.ply,a.comment,a.marks]),game.study.annotations.map(a=>[a.ply,a.comment,a.marks]));assert.deepEqual(readPortableStudy(portableStudy(game)).study,game.study);
 const bad=structuredClone(game.study);bad.annotations[0].marks=[{from:'a1',to:'a9',color:'R'}];assert.throws(()=>validateStudy(bad,game));
});
