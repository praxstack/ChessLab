import {Chess} from 'chess.js';
import {writeAnnotatedPgn} from './study-format.js';
import {validatePosition} from './position.js';

// Opening explorer over the learner's own completed games. The server adds a SQLite master-game corpus.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const explorerKey=fen=>fen.split(' ').slice(0,4).join(' ');
export const maxPlies=60,results=['1-0','1/2-1/2','0-1'];
export const explorable=game=>!game.initialFen&&results.includes(game.result)&&game.moves.length;
export function indexPersonalGame(game){
 if(game.initialFen||!results.includes(game.result)||!game.moves.length)return null;
 const board=new Chess(),seen=new Set(),edges=[];
 for(const move of game.moves.slice(0,maxPlies)){
  const position=explorerKey(board.fen()),played=board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  if(!seen.has(position)){edges.push({position,move,san:played.san});seen.add(position);}
 }
 return {...game,edges};
}
export const explorerSummary=game=>({id:game.id,headers:{White:'White',Black:'Black',...game.headers},result:game.result||game.headers?.Result});
export function explorerSource(value){if(value!==undefined&&!['elite','mine'].includes(value))fail(400,'Choose the local corpus or My Games.');return value||'elite';}
export function explorerBoard(fen){
 if(fen!==undefined&&(typeof fen!=='string'||fen.length>150))fail(400,'Enter a valid standard chess position.');
 try{return fen===undefined?new Chess():validatePosition(fen).chess;}catch(error){fail(400,error.message);}
}
// Move counts and example games for one position across indexed personal games.
export function personalRows(games,key){
 const byMove=new Map(),examples=[];
 for(const value of games){const edge=value.edges.find(edge=>edge.position===key);if(!edge)continue;
  let row=byMove.get(edge.move);if(!row){row={move:edge.move,white:0,draw:0,black:0};byMove.set(edge.move,row);}
  row[results.indexOf(value.result)===0?'white':value.result==='0-1'?'black':'draw']++;
  if(examples.length<12)examples.push(explorerSummary(value));
 }
 return {rows:[...byMove.values()],examples};
}
export const personalMetadata=count=>({label:'My completed games',count,maxPlies,selection:'Your completed standard games on this Mac',counting:'First encounter per game; first 60 half-moves.'});
export function explorerResponse(board,rows,metadata,examples){
 const moves=rows.map(row=>{
  const next=new Chess(board.fen()),move=next.move({from:row.move.slice(0,2),to:row.move.slice(2,4),promotion:row.move[4]});
  return {move:row.move,san:move.san,white:row.white,draw:row.draw,black:row.black,total:row.white+row.draw+row.black};
 }).sort((a,b)=>b.total-a.total||a.san.localeCompare(b.san));
 return {available:true,fen:board.fen(),source:metadata,moves,games:examples,total:moves.reduce((sum,row)=>sum+row.total,0)};
}
export const explorerGame=found=>({...explorerSummary(found),moves:found.moves,pgn:writeAnnotatedPgn({...found,source:'import',study:null,result:found.result||found.headers.Result})});
