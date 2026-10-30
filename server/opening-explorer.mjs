import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {portableStudy} from '../shared/study-format.js';
import {explorerKey,indexPersonalGame,explorerSummary as summary,explorable,explorerSource as sourceName,explorerBoard,personalRows,personalMetadata,explorerResponse,explorerGame} from '../shared/opening-explorer.js';
export {explorerKey,indexPersonalGame};

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createExplorer({cataloguePath,db}){
 let catalogue=null;
 const personalCache=new Map();
 function corpus(){
  if(!catalogue&&existsSync(cataloguePath))catalogue=new DatabaseSync(cataloguePath,{readOnly:true});
  return catalogue;
 }
 function personal(user){
  if(!user)fail(401,'Sign in to explore your own games.');
  const games=db.prepare('SELECT data FROM games WHERE user_id=? ORDER BY id').all(user.id).map(row=>JSON.parse(row.data)).filter(explorable);
  const signature=JSON.stringify(games.map(game=>[game.id,game.revision,game.result]));
  if(personalCache.get(user.id)?.signature===signature)return personalCache.get(user.id).games;
  // ponytail: rebuild on completed-game changes for local libraries; persist an index if large imports make this slow.
  const indexed=games.map(game=>indexPersonalGame({...game,headers:portableStudy(game,user.username).game.headers})).filter(Boolean);
  if(personalCache.size>=8)personalCache.delete(personalCache.keys().next().value);
  personalCache.set(user.id,{signature,games:indexed});return indexed;
 }
 function game(id,source,user){
  source=sourceName(source);let found;
  if(source==='mine')found=personal(user).find(game=>game.id===id);
  else if(typeof id==='string'&&/^[1-9]\d{0,9}$/.test(id)){
   const row=corpus()?.prepare('SELECT * FROM games WHERE id=?').get(Number(id));
   if(row)found={id:row.id,headers:JSON.parse(row.headers),moves:JSON.parse(row.moves)};
  }
  if(!found)fail(404,'This example game was not found.');
  return explorerGame(found);
 }
 function position({fen,source}={},user){
  source=sourceName(source);
  const board=explorerBoard(fen);
  const key=explorerKey(board.fen());let rows,metadata,examples=[];
  if(source==='mine'){
   const games=personal(user);({rows,examples}=personalRows(games,key));metadata=personalMetadata(games.length);
  }else{
   const data=corpus();if(!data)return {available:false,moves:[],games:[],total:0,source:null,fen:board.fen()};
   metadata=JSON.parse(data.prepare('SELECT data FROM metadata').get().data);
   rows=data.prepare('SELECT * FROM edges WHERE position=?').all(key).sort((a,b)=>(b.white+b.draw+b.black)-(a.white+a.draw+a.black)||a.move.localeCompare(b.move));
   const ids=[...new Set(rows.flatMap(row=>row.samples.split(',').map(Number)))].slice(0,12);
   examples=ids.map(id=>{const row=data.prepare('SELECT id,headers FROM games WHERE id=?').get(id);return summary({id:row.id,headers:JSON.parse(row.headers)});});
  }
  return explorerResponse(board,rows,metadata,examples);
 }
 return {position,game,close:()=>{catalogue?.close();personalCache.clear();}};
}
