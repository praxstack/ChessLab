import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {validatePosition} from '../shared/position.js';

const catalogue=JSON.parse(readFileSync(new URL('./openings.json',import.meta.url),'utf8'));
export const openingSource={url:catalogue.source,commit:catalogue.commit,license:catalogue.license,count:catalogue.entries.length};
const byId=new Map(catalogue.entries.map(entry=>[entry.id,entry])),byPosition=new Map();
const key=fen=>fen.split(' ').slice(0,4).join(' ');
const normalize=value=>value.normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'');
const searchRows=catalogue.entries.map(entry=>({entry,text:normalize(entry.name+' '+entry.eco)}));
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
for(const entry of catalogue.entries){const position=key(entry.fen);if(!byPosition.has(position))byPosition.set(position,[]);byPosition.get(position).push(entry);}
export const openingById=id=>byId.get(id);
export function searchOpenings({q='',eco='',page='0'}={}){
 if(typeof q!=='string'||q.length>100||typeof eco!=='string'||!/^([A-E]\d{0,2})?$/.test(eco)||typeof page!=='string'||!/^(0|[1-9]\d{0,4})$/.test(page))fail('Use a search of at most 100 characters, ECO A–E or A00–E99, and a nonnegative page.');
 const words=normalize(q).split(/\s+/).filter(Boolean),matches=searchRows.filter(row=>row.entry.eco.startsWith(eco)&&words.every(word=>row.text.includes(word)));
 return {items:matches.slice(Number(page)*24,Number(page)*24+24).map(({entry})=>({id:entry.id,name:entry.name,eco:entry.eco,pgn:entry.pgn,plies:entry.moves.length})),total:matches.length,page:Number(page),pageSize:24,source:openingSource};
}
export function recognizeOpening(moves=[],initialFen=null){
 if(!Array.isArray(moves)||moves.length>1000||moves.some(move=>typeof move!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)))fail('Provide at most 1,000 legal coordinate moves.');
 let chess;try{chess=initialFen==null?new Chess():validatePosition(initialFen).chess;}catch(error){fail(error.message);}
 let found=null;
 for(let ply=0;ply<=moves.length;ply++){
  if(ply)try{const move=moves[ply-1];chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});}catch{fail('The selected history contains an illegal move.');}
  const candidates=byPosition.get(key(chess.fen()));if(!candidates)continue;
  const exact=initialFen==null&&candidates.find(entry=>entry.moves.length===ply&&entry.moves.every((move,index)=>move===moves[index]));
  const entry=exact||candidates[0];found={id:entry.id,eco:entry.eco,name:entry.name,ply,matchType:exact?'line':'position'};
 }
 return found;
}
