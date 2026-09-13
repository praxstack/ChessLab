import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {Chess} from 'chess.js';
import {portableStudy,writeAnnotatedPgn} from './study-format.mjs';
import {validatePosition} from '../shared/position.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const explorerKey=fen=>fen.split(' ').slice(0,4).join(' ');
const maxPlies=60,results=['1-0','1/2-1/2','0-1'];
export function indexPersonalGame(game){
 if(game.initialFen||!results.includes(game.result)||!game.moves.length)return null;
 const board=new Chess(),seen=new Set(),edges=[];
 for(const move of game.moves.slice(0,maxPlies)){
  const position=explorerKey(board.fen()),played=board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  if(!seen.has(position)){edges.push({position,move,san:played.san});seen.add(position);}
 }
 return {...game,edges};
}
const summary=game=>({id:game.id,headers:{White:'White',Black:'Black',...game.headers},result:game.result||game.headers?.Result});
export function createExplorer({cataloguePath,db}){
 let catalogue=null;
 const personalCache=new Map();
 function corpus(){
  if(!catalogue&&existsSync(cataloguePath))catalogue=new DatabaseSync(cataloguePath,{readOnly:true});
  return catalogue;
 }
 function personal(user){
  if(!user)fail(401,'Sign in to explore your own games.');
  const games=db.prepare('SELECT data FROM games WHERE user_id=? ORDER BY id').all(user.id).map(row=>JSON.parse(row.data)).filter(game=>!game.initialFen&&results.includes(game.result)&&game.moves.length);
  const signature=JSON.stringify(games.map(game=>[game.id,game.revision,game.result]));
  if(personalCache.get(user.id)?.signature===signature)return personalCache.get(user.id).games;
  // ponytail: rebuild on completed-game changes for local libraries; persist an index if large imports make this slow.
  const indexed=games.map(game=>indexPersonalGame({...game,headers:portableStudy(game,user.username).game.headers})).filter(Boolean);
  if(personalCache.size>=8)personalCache.delete(personalCache.keys().next().value);
  personalCache.set(user.id,{signature,games:indexed});return indexed;
 }
 function sourceName(value){if(value!==undefined&&!['elite','mine'].includes(value))fail(400,'Choose the local corpus or My Games.');return value||'elite';}
 function game(id,source,user){
  source=sourceName(source);let found;
  if(source==='mine')found=personal(user).find(game=>game.id===id);
  else if(typeof id==='string'&&/^[1-9]\d{0,9}$/.test(id)){
   const row=corpus()?.prepare('SELECT * FROM games WHERE id=?').get(Number(id));
   if(row)found={id:row.id,headers:JSON.parse(row.headers),moves:JSON.parse(row.moves)};
  }
  if(!found)fail(404,'This example game was not found.');
  return {...summary(found),moves:found.moves,pgn:writeAnnotatedPgn({...found,source:'import',study:null,result:found.result||found.headers.Result})};
 }
 function position({fen,source}={},user){
  source=sourceName(source);
  if(fen!==undefined&&(typeof fen!=='string'||fen.length>150))fail(400,'Enter a valid standard chess position.');
  let board;try{board=fen===undefined?new Chess():validatePosition(fen).chess;}catch(error){fail(400,error.message);}
  const key=explorerKey(board.fen());let rows,metadata,examples=[];
  if(source==='mine'){
   const games=personal(user),byMove=new Map();
   for(const value of games){const edge=value.edges.find(edge=>edge.position===key);if(!edge)continue;
    let row=byMove.get(edge.move);if(!row){row={move:edge.move,white:0,draw:0,black:0};byMove.set(edge.move,row);}
    row[results.indexOf(value.result)===0?'white':value.result==='0-1'?'black':'draw']++;
    if(examples.length<12)examples.push(summary(value));
   }
   rows=[...byMove.values()];metadata={label:'My completed games',count:games.length,maxPlies,selection:'Your completed standard games on this Mac',counting:'First encounter per game; first 60 half-moves.'};
  }else{
   const data=corpus();if(!data)return {available:false,moves:[],games:[],total:0,source:null,fen:board.fen()};
   metadata=JSON.parse(data.prepare('SELECT data FROM metadata').get().data);
   rows=data.prepare('SELECT * FROM edges WHERE position=?').all(key).sort((a,b)=>(b.white+b.draw+b.black)-(a.white+a.draw+a.black)||a.move.localeCompare(b.move));
   const ids=[...new Set(rows.flatMap(row=>row.samples.split(',').map(Number)))].slice(0,12);
   examples=ids.map(id=>{const row=data.prepare('SELECT id,headers FROM games WHERE id=?').get(id);return summary({id:row.id,headers:JSON.parse(row.headers)});});
  }
  const moves=rows.map(row=>{
   const next=new Chess(board.fen()),move=next.move({from:row.move.slice(0,2),to:row.move.slice(2,4),promotion:row.move[4]});
   return {move:row.move,san:move.san,white:row.white,draw:row.draw,black:row.black,total:row.white+row.draw+row.black};
  }).sort((a,b)=>b.total-a.total||a.san.localeCompare(b.san));
  return {available:true,fen:board.fen(),source:metadata,moves,games:examples,total:moves.reduce((sum,row)=>sum+row.total,0)};
 }
 return {position,game,close:()=>{catalogue?.close();personalCache.clear();}};
}
