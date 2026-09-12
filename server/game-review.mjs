import {createHash} from 'node:crypto';
import {replay} from './engine.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const positionKey=game=>hash([1,game.initialFen,game.moves]);
export const reviewSignature=(game,limits)=>hash([positionKey(game),limits]);
export function beginReview(game,limits){
 return {gameId:game.id,positionKey:positionKey(game),signature:reviewSignature(game,limits),limits,total:game.moves.length,entries:[],complete:false,players:{w:{moves:0,measuredMoves:0,averageLossCp:null,counts:{}},b:{moves:0,measuredMoves:0,averageLossCp:null,counts:{}}}};
}
export function appendReview(report,game,analysis){
 const index=report.entries.length,board=replay(game.moves.slice(0,index),game.initialFen),color=board.turn();
 if(analysis.fen!==board.fen()||analysis.played?.move!==game.moves[index]||!analysis.engine||!analysis.lines?.length)throw Object.assign(new Error('The engine did not return usable evidence for this move.'),{status:503});
 const number=Number(board.fen().split(' ')[5]);
 const after=replay(game.moves.slice(0,index+1),game.initialFen);
 const evaluation=after.isCheckmate()?{type:'result',value:color==='w'?'1-0':'0-1'}:after.isDraw()?{type:'cp',value:0}:analysis.played.afterScore;
 const entries=[...report.entries,{ply:index+1,number,color,san:analysis.played.san,classification:analysis.played.classification,lossCp:analysis.played.lossCp,evaluation,analysis}];
 const players=Object.fromEntries(['w','b'].map(side=>{
  const moves=entries.filter(entry=>entry.color===side),measured=moves.filter(entry=>Number.isFinite(entry.lossCp));
  const counts={};for(const move of moves)counts[move.classification]=(counts[move.classification]||0)+1;
  return [side,{moves:moves.length,measuredMoves:measured.length,averageLossCp:measured.length?Math.round(measured.reduce((sum,entry)=>sum+entry.lossCp,0)/measured.length):null,counts}];
 }));
 return {...report,entries,players,engine:analysis.engine,complete:entries.length===report.total,updatedAt:new Date().toISOString()};
}
