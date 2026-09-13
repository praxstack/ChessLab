import {Chess as StandardChess} from 'chess.js';
import {Chess,castlingSide} from 'chessops/chess';
import {parseFen,makeFen} from 'chessops/fen';
import {parseSan,makeSan} from 'chessops/san';
import {makeSquare,parseSquare,parseUci,roleToChar,kingCastlesTo,rookCastlesTo} from 'chessops/util';
import {attacks} from 'chessops/attacks';

export function gameVariant(value='standard') {
 if(!['standard','chess960'].includes(value))throw new Error('Choose Standard or Chess960.');
 return value;
}
export function chess960Fen(number) {
 if(!Number.isInteger(number)||number<0||number>959)throw new Error('Choose a Chess960 position from 0 to 959.');
 let n=number;const pieces=Array(8).fill(null),empty=()=>pieces.flatMap((p,i)=>p?[]:[i]);
 pieces[(n%4)*2+1]='B';n=Math.floor(n/4);pieces[(n%4)*2]='B';n=Math.floor(n/4);
 pieces[empty()[n%6]]='Q';n=Math.floor(n/6);
 const pairs=[[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]],slots=empty();
 for(const i of pairs[n])pieces[slots[i]]='N';
 empty().forEach((file,i)=>{pieces[file]='RKR'[i];});
 const rank=pieces.join(''),rights=pieces.flatMap((p,i)=>p==='R'?['ABCDEFGH'[i]]:[]).reverse().join('');
 return `${rank.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${rank} w ${rights+rights.toLowerCase()} - 0 1`;
}
export function createChess(fen,variant) {
 return gameVariant(variant)==='chess960'?new Chess960(fen):new StandardChess(fen??undefined);
}
export function copyChess(board) {return createChess(board.fen(),board.variant);}

class Chess960 {
 constructor(fen) {
  if(typeof fen!=='string'||fen.length>200)throw new Error('Chess960 needs a starting FEN.');
  const f=fen.trim().split(/\s+/);
  if(f.length!==6||!/^[-KQkqA-Ha-h]+$/.test(f[2])||f[2]!=='-'&&(f[2].includes('-')||new Set(f[2]).size!==f[2].length)||!/^\d+$/.test(f[4])||!/^\d+$/.test(f[5])||+f[4]>1000000||+f[5]<1||+f[5]>1000000||!/^[pnbrqkPNBRQK1-8/]+$/.test(f[0]))throw new Error('Invalid Chess960 FEN.');
  // Preserve the editor's counters beyond chessops' four-digit FEN formatter.
  const setup=parseFen([...f.slice(0,4),'0','1'].join(' ')).unwrap();setup.halfmoves=Number(f[4]);setup.fullmoves=Number(f[5]);this.position=Chess.fromSetup(setup).unwrap();
  if(!setup.castlingRights.equals(this.position.castles.castlingRights)||setup.castlingRights.size()!==(f[2]==='-'?0:f[2].length))throw new Error('Castling rights need a king between the named rooks on their home rank.');
  if(f[3]!=='-'){
   const file=f[3][0],turn=f[1],pawn=this.get(file+(turn==='w'?'5':'4'));
   if(this.get(f[3])||this.get(file+(turn==='w'?'7':'2'))||pawn?.type!=='p'||pawn.color===turn||+f[4]!==0||this.position.epSquare!==setup.epSquare)throw new Error('Invalid en passant target.');
  }
  this.variant='chess960';this.records=[];this.positions=[this.fen().split(' ').slice(0,4).join(' ')];
 }
 fen({forceEnpassantSquare=false}={}) {
  const setup=this.position.toSetup();if(forceEnpassantSquare)setup.epSquare=this.position.epSquare;
  const f=makeFen(setup).split(' '),rights=[];
  for(const color of ['white','black'])for(const square of [...this.position.castles.castlingRights.intersect(this.position.board[color])].reverse())rights.push((color==='white'?'ABCDEFGH':'abcdefgh')[square%8]);
  f[2]=rights.join('')||'-';f[4]=String(this.position.halfmoves);f[5]=String(this.position.fullmoves);return f.join(' ');
 }
 turn(){return this.position.turn==='white'?'w':'b';}
 get(square){const n=parseSquare(square);if(n===undefined)return undefined;const p=this.position.board.get(n);return p?{type:roleToChar(p.role),color:p.color==='white'?'w':'b'}:undefined;}
 board(){return [...'87654321'].map(rank=>[...'abcdefgh'].map(file=>{const square=file+rank,p=this.get(square);return p?{...p,square}:null;}));}
 rawMoves(square){
  const moves=[];for(const [from,dests] of this.position.allDests()){
   if(square&&makeSquare(from)!==square)continue;
   for(const to of dests)for(const promotion of this.position.board.pawn.has(from)&&(to<8||to>=56)?['queen','rook','bishop','knight']:[undefined])moves.push({from,to,...(promotion?{promotion}:{})});
  }return moves;
 }
 describe(move){
  const p=this.position,piece=p.board.get(move.from),side=castlingSide(p,move),capture=side?undefined:p.board.get(move.to),ep=piece.role==='pawn'&&move.to===p.epSquare;
  const flags=side?(side==='h'?'k':'q'):ep?'e':capture?'c':piece.role==='pawn'&&Math.abs(move.to-move.from)===16?'b':'n';
  return {color:this.turn(),from:makeSquare(move.from),to:makeSquare(move.to),piece:roleToChar(piece.role),...(capture||ep?{captured:ep?'p':roleToChar(capture.role)}:{}),...(move.promotion?{promotion:roleToChar(move.promotion)}:{}),flags:flags+(move.promotion?'p':''),san:makeSan(p,move),before:this.fen(),...(side?{castle:{kingTo:makeSquare(kingCastlesTo(p.turn,side)),rookFrom:makeSquare(move.to),rookTo:makeSquare(rookCastlesTo(p.turn,side))}}:{})};
 }
 moves({square,verbose=false}={}){return this.rawMoves(square).map(m=>verbose?this.describe(m):makeSan(this.position,m));}
 move(input,{strict=false}={}){
  let move;if(typeof input==='string')move=parseSan(this.position,input);else if(input&&typeof input.from==='string'&&typeof input.to==='string')move=parseUci(input.from+input.to+(input.promotion||''));
  const legal=move&&this.rawMoves().find(m=>m.from===move.from&&m.to===move.to&&m.promotion===move.promotion);
  if(!legal)throw new Error('Illegal move.');
  const record=this.describe(legal);
  if(strict&&typeof input==='string'&&input.replace(/[+#]$/,'').replaceAll('0','O')!==record.san.replace(/[+#]$/,''))throw new Error('Invalid SAN move.');
  this.position.play(legal);record.after=this.fen();this.records.push(record);this.positions.push(record.after.split(' ').slice(0,4).join(' '));return {...record};
 }
 history({verbose=false}={}){return this.records.map(m=>verbose?{...m}:m.san);}
 threats(color){
  const p=this.position.clone(),turn=color==='w'?'white':'black';if(p.turn!==turn)p.epSquare=undefined;p.turn=turn;
  const result=[];for(const [from,dests] of p.allDests())for(const to of dests){const target=p.board.get(to);if(target&&target.color!==turn||p.board.pawn.has(from)&&to===p.epSquare)result.push({from:makeSquare(from),to:makeSquare(to)});}
  return result;
 }
 isAttacked(square,color){const n=parseSquare(square);return n!==undefined&&[...this.position.board[color==='w'?'white':'black']].some(from=>attacks(this.position.board.get(from),from,this.position.board.occupied).has(n));}
 isCheck(){return this.position.isCheck();}
 inCheck(){return this.isCheck();}
 isCheckmate(){return this.position.isCheckmate();}
 isStalemate(){return this.position.isStalemate();}
 isInsufficientMaterial(){return this.position.isInsufficientMaterial();}
 isThreefoldRepetition(){const key=this.positions.at(-1);return this.positions.filter(p=>p===key).length>=3;}
 isDrawByFiftyMoves(){return this.position.halfmoves>=100;}
 isDraw(){return this.isStalemate()||this.isInsufficientMaterial()||this.isThreefoldRepetition()||this.isDrawByFiftyMoves();}
 isGameOver(){return this.isCheckmate()||this.isDraw();}
}
