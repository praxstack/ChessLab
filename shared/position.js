import {Chess,validateFen} from 'chess.js';

export function validatePosition(value) {
 if(typeof value!=='string'||value.length>200)throw new Error('Enter a FEN of at most 200 characters.');
 const fen=value.trim().replace(/\s+/g,' '),fields=fen.split(' ');
 if(fields.length!==6)throw new Error('FEN needs the board, turn, castling, en passant and two move counters.');
 if(!/^(?:K?Q?k?q?|-)$/.test(fields[2])||!fields[2])throw new Error('Use each castling right once, in KQkq order, or a dash.');
 if(!/^\d+$/.test(fields[4])||!/^\d+$/.test(fields[5])||Number(fields[4])>10000||Number(fields[5])<1||Number(fields[5])>10000)throw new Error('Use whole move counters: halfmoves 0–10,000 and move number 1–10,000.');
 const valid=validateFen(fen);if(!valid.ok)throw new Error(valid.error);
 const chess=new Chess(fen),turn=chess.turn(),previous=turn==='w'?'b':'w';
 const previousKing=chess.board().flat().find(piece=>piece?.color===previous&&piece.type==='k');
 if(chess.isAttacked(previousKing.square,turn))throw new Error('The side that just moved cannot leave its king in check. Check the kings and side to move.');
 for(const [right,color,rook] of [['K','w','h1'],['Q','w','a1'],['k','b','h8'],['q','b','a8']]){
  if(!fields[2].includes(right))continue;
  const king=chess.get(color==='w'?'e1':'e8'),piece=chess.get(rook);
  if(king?.type!=='k'||king.color!==color||piece?.type!=='r'||piece.color!==color)throw new Error('Castling rights require the king and rook on their original squares.');
 }
 if(fields[3]!=='-'){
  const file=fields[3][0],pawn=chess.get(file+(turn==='w'?'5':'4'));
  if(chess.get(fields[3])||chess.get(file+(turn==='w'?'7':'2'))||pawn?.type!=='p'||pawn.color!==previous||Number(fields[4])!==0)throw new Error('En passant requires an empty target and a pawn that just advanced two squares.');
 }
 return {fen:chess.fen({forceEnpassantSquare:true}),chess};
}
