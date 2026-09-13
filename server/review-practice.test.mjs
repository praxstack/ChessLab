import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {beginPractice,practiceView,advancePractice} from './review-practice.mjs';
import {positionKey} from './game-review.mjs';
const game={id:'g',source:'import',moves:['f2f3','e7e5','g2g4','d8h4'],initialFen:null};
const board=new Chess();board.move('f3');board.move('e5');
const report={complete:true,positionKey:positionKey(game),signature:'report',limits:{movetime:1000,threads:1,lines:1,engineId:'stockfish19'},engine:'Stockfish 19',entries:[{ply:3,color:'w',number:2,san:'g4',classification:'Blunder',analysis:{fen:board.fen(),bestmove:'e2e4',lines:[{move:'e2e4',moves:['e2e4'],score:{type:'cp',value:-100}}]}}]};
test('review practice hides answers, resumes hints and separates attempts from original history',async()=>{
 let p=beginPractice(game,report,'w');let view=practiceView(p,game);assert.equal(view.current.fen,board.fen());assert.equal(JSON.stringify(view).includes('e2e4'),false);
 p=await advancePractice(p,game,{type:'hint'});assert.equal(practiceView(p,game).current.hint.square,'e2');assert.equal(practiceView(p,game).current.hint.move,undefined);
 p=await advancePractice(p,game,{type:'hint'});assert.equal(practiceView(p,game).current.hint.move,'e2e4');
 const before=structuredClone(game);p=await advancePractice(p,game,{type:'move',move:'e2e4'});assert.equal(p.current.outcome,'solved');p=await advancePractice(p,game,{type:'next'});view=practiceView(p,game);assert.equal(view.complete,true);assert.equal(view.summary.unassisted,0);assert.equal(view.summary.learned,1);assert.deepEqual(game,before);
 const reordered=structuredClone(report);reordered.entries[0].analysis.lines.unshift({move:'a2a3',moves:['a2a3'],score:{type:'cp',value:-200}});assert.equal(beginPractice(game,reordered,'w').questions[0].line.move,'e2e4');
 const missing=structuredClone(report);missing.entries[0].analysis.lines[0].move='a2a3';assert.throws(()=>beginPractice(game,missing,'w'),error=>error.status===503);
 assert.throws(()=>beginPractice(game,{...report,complete:false},'w'));assert.equal(beginPractice(game,report,'b').questions.length,0);
});
test('review attempts validate engine evidence and accept strong alternatives without losing failures',async()=>{
 const original=beginPractice(game,report,'w');await assert.rejects(()=>advancePractice(original,game,{type:'move',move:'e2e5'}));await assert.rejects(()=>advancePractice(original,game,{type:'move',move:'a2a3'},async()=>{throw new Error('offline');}));assert.equal(original.current.attempts,0);
 const evidence={fen:board.fen(),engine:'Stockfish 19',limits:report.limits,played:{move:'a2a3',san:'a3',classification:'Good',lossCp:20,afterScore:{type:'cp',value:-120},explanation:'A legal alternative.'}};
 let p=await advancePractice(original,game,{type:'move',move:'a2a3'},async()=>evidence);assert.equal(p.current.outcome,'solved');assert.equal(p.current.feedback.kind,'alternative');assert.equal(p.current.feedback.engine,'Stockfish 19');
 await assert.rejects(()=>advancePractice(original,game,{type:'move',move:'a2a3'},async()=>({...evidence,fen:new Chess().fen()})));
 const mateTry=await advancePractice(original,game,{type:'move',move:'a2a3'},async()=>({...evidence,played:{...evidence.played,classification:'Mate sequence',lossCp:null,afterScore:{type:'mate',value:-1}}}));assert.match(mateTry.current.feedback.text,/mate in 1 for Black/);assert.equal(mateTry.current.outcome,'active');
 const falseBest=await advancePractice(original,game,{type:'move',move:'a2a3'},async()=>({...evidence,bestmove:'e2e4',played:{...evidence.played,classification:'Best'}}));assert.equal(falseBest.current.outcome,'active');const falseMate=await advancePractice(original,game,{type:'move',move:'a2a3'},async()=>({...evidence,played:{...evidence.played,classification:'Checkmate'}}));assert.equal(falseMate.current.outcome,'active');
 p=await advancePractice(original,game,{type:'move',move:'a2a3'},async()=>({...evidence,played:{...evidence.played,classification:'Mistake',lossCp:200}}));assert.equal(p.current.outcome,'active');assert.notEqual(practiceView(p,game).current.fen,board.fen());p=await advancePractice(p,game,{type:'retry'});assert.equal(practiceView(p,game).current.fen,board.fen());assert.equal(p.current.attempts,1);p=await advancePractice(p,game,{type:'reveal'});assert.equal(p.current.outcome,'revealed');assert.equal(practiceView(p,game).current.answer.move,'e2e4');
});
