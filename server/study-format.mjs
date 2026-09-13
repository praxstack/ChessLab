import {Chess} from 'chess.js';
import {gameVariant} from '../shared/chess.js';
import {validateMarks,readMarkComment,writeMarkComment} from '../shared/board-marks.js';
import {parse} from 'chess.js/src/pgn.js';
import {randomUUID} from 'node:crypto';
import {replay} from './engine.mjs';
import {validatePosition as rawPosition} from '../shared/position.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function validatePosition(fen,variant){try{return rawPosition(fen,variant);}catch(error){fail(400,error.message);}}
const uci=m=>m.from+m.to+(m.promotion||'');
export function validateStudy(study, game) {
 if (!study || study.version !== 1 || !Array.isArray(study.branches) || study.branches.length > 40) fail(400, 'This study format is invalid or too large.');
 const ids = new Set(); let total = 0;
 const branches = study.branches.map(b => {
  if (!b || typeof b.id !== 'string' || !/^[\w-]{1,80}$/.test(b.id) || ids.has(b.id)) fail(400, 'Each branch needs a unique identifier.');
  ids.add(b.id);
  if (!Number.isInteger(b.anchorPly) || b.anchorPly < 0 || !Array.isArray(b.moves) || b.anchorPly > b.moves.length) fail(400, 'A branch has an invalid starting point.');
  total += b.moves.length;
  if (total > 5000) fail(400, 'This study has too many moves. Export or split the study before adding more.');
  replay(b.moves, game.initialFen, game.variant);
  if (b.question !== undefined && (typeof b.question !== 'string' || b.question.length > 2000)) fail(400, 'Keep each question under 2000 characters.');
  if (b.parentId !== null && b.parentId !== undefined && typeof b.parentId !== 'string') fail(400, 'Invalid branch parent.');
  return {id:b.id,parentId:b.parentId || null,anchorPly:b.anchorPly,moves:b.moves,question:b.question || ''};
 });
 const byId = new Map(branches.map(b=>[b.id,b]));
 for (const b of branches) {
  const parent = b.parentId ? byId.get(b.parentId) : null;
  if (b.parentId && !parent) fail(400, 'A branch refers to a missing parent.');
  const original = parent ? parent.moves : game.moves;
  if (b.anchorPly > original.length || b.moves.slice(0,b.anchorPly).some((m,i)=>m !== original[i])) fail(400, 'A branch must preserve the moves before its starting point.');
  const visited = new Set([b.id]); let p = parent;
  while (p) { if (visited.has(p.id)) fail(400, 'Branch parents cannot form a loop.'); visited.add(p.id); p = p.parentId ? byId.get(p.parentId) : null; }
 }
 const selected = study.selectedBranchId ?? null;
 if (selected !== null && !byId.has(selected)) fail(400, 'The selected branch does not exist.');
 if (!Number.isInteger(study.anchorPly) || study.anchorPly < 0 || study.anchorPly > game.moves.length) fail(400, 'The return point is outside the actual game.');
 const annotations=[];const keys=new Set();
 if(study.annotations!==undefined){
  if(!Array.isArray(study.annotations)||study.annotations.length>1000)fail(400,'Keep a study under 1,000 annotated positions.');
  for(const a of study.annotations){
   if(!a||a.branchId!==null&&typeof a.branchId!=='string')fail(400,'Invalid annotation branch.');
   const branch=a.branchId?byId.get(a.branchId):null;if(a.branchId!==null&&!branch)fail(400,'Annotation branch not found.');
   const line=branch?branch.moves:game.moves,key=JSON.stringify([a.branchId,a.ply]);
   if(!Number.isInteger(a.ply)||a.ply<(branch?.anchorPly||0)||a.ply>line.length||keys.has(key))fail(400,'Each annotation needs one valid branch position.');
   if(typeof a.comment!=='string'||a.comment.length>2000||!Array.isArray(a.nags)||a.nags.length>8||a.nags.some(n=>!Number.isInteger(n)||n<0||n>255))fail(400,'Invalid comment or move annotation.');
   let marks;if(a.marks!==undefined)try{marks=validateMarks(a.marks);}catch(error){fail(400,error.message);}
   keys.add(key);annotations.push({branchId:a.branchId,ply:a.ply,comment:a.comment,nags:[...new Set(a.nags)],...(marks!==undefined?{marks}:{})});
  }
 }
 const result={version:1,branches,selectedBranchId:selected,anchorPly:study.anchorPly,...(study.annotations!==undefined?{annotations}:{})};
 if(Buffer.byteLength(JSON.stringify(result))>700000)fail(400,'This annotated study exceeds 700 KB. Split it before adding more.');
 return result;
}

const glyphs={'!':1,'?':2,'!!':3,'??':4,'!?':5,'?!':6};
export function readAnnotatedPgn(pgn){
 if(typeof pgn!=='string'||pgn.length<3||Buffer.byteLength(pgn)>900000)fail(400,'Import a PGN between 3 characters and 900 KB.');
 let parsed;try{parsed=parse(pgn);}catch{fail(400,'This PGN contains an invalid position, move or variation.');}
 const tag=parsed.headers.Variant;let variant;if(tag===undefined||tag==='Standard')variant='standard';else if(['Chess960','Fischerandom','FischerRandom','Fischer Random'].includes(tag))variant='chess960';else fail(400,'Only Standard and Chess960 PGNs are supported.');
 const initialFen=parsed.headers.FEN||null;if(variant==='chess960'&&!initialFen)fail(400,'A Chess960 PGN needs its starting FEN.');if(initialFen)validatePosition(initialFen,variant);
 const study={version:1,branches:[],selectedBranchId:null,anchorPly:0,annotations:[]};let total=0;
 const note=(node,branchId,ply)=>{const nags=[...(node.nag||[]).map(Number),...(glyphs[node.suffix?.join('')]?[glyphs[node.suffix.join('')]]:[])];let parsed;try{parsed=readMarkComment(node.comment||'');}catch(error){fail(400,error.message); }if(parsed.comment||nags.length||parsed.marks.length)study.annotations.push({branchId,ply,comment:parsed.comment,nags:[...new Set(nags)],...(parsed.marks.length?{marks:parsed.marks}:{})});};
 function line(root,prefix,branchId){
  const board=replay(prefix,initialFen,variant),moves=[...prefix];let cursor=root;if(!branchId)note(root,null,moves.length);else{let parsed;try{parsed=readMarkComment(root.comment||'');}catch(error){fail(400,error.message);}if(parsed.marks.length)study.annotations.push({branchId,ply:moves.length,comment:'',nags:[],marks:parsed.marks});}
  while(cursor.variations?.length){
   for(const alternative of cursor.variations.slice(1)){
    if(study.branches.length>=40)fail(400,'Import at most 40 variations.');
    let alternativeText;try{alternativeText=readMarkComment(alternative.comment||'').comment;}catch(error){fail(400,error.message);}
    const branch={id:randomUUID(),parentId:branchId,anchorPly:moves.length,moves:[],question:alternativeText};study.branches.push(branch);branch.moves=line(alternative,moves,branch.id);
   }
   const next=cursor.variations[0];let move;try{move=board.move(next.move,{strict:true});}catch{fail(400,'This PGN contains an illegal move in its game or a variation.');}
   if(!move||moves.length>=1000||++total>5000)fail(400,'Import at most 1,000 moves per line and 5,000 total moves.');
   moves.push(uci(move));note(next,branchId,moves.length);cursor=next;
  }
  return moves;
 }
 let moves=line(parsed.root,[],null);if(!moves.length&&!initialFen)fail(400,'Import a game with moves or a starting FEN.');
 if(parsed.headers.ChessLabOriginalPly!==undefined){
  const n=Number(parsed.headers.ChessLabOriginalPly);if(!/^\d+$/.test(parsed.headers.ChessLabOriginalPly)||!Number.isInteger(n)||n>moves.length)fail(400,'Invalid original-game boundary.');
  if(n<moves.length){
   const branch={id:randomUUID(),parentId:null,anchorPly:n,moves:[...moves],question:''};
   for(const b of study.branches)if(b.parentId===null&&b.anchorPly>=n)b.parentId=branch.id;
   for(const a of study.annotations)if(a.branchId===null&&a.ply>n)a.branchId=branch.id;
   study.branches.unshift(branch);moves=moves.slice(0,n);
  }
 }
 const board=replay(moves,initialFen,variant),result=board.isCheckmate()?(board.turn()==='w'?'0-1':'1-0'):board.isDraw()?'1/2-1/2':['1-0','0-1','1/2-1/2'].includes(parsed.result||parsed.headers.Result)?parsed.result||parsed.headers.Result:null;
 const headers=Object.fromEntries(Object.entries(parsed.headers).filter(([k,v])=>/^[A-Za-z]+$/.test(k)&&typeof v==='string'&&v.length<=500));
 const game={title:`${headers.White||'White'} vs ${headers.Black||'Black'}`.slice(0,100),source:'import',positionSetup:!moves.length,moves,initialFen,...(variant==='chess960'?{variant}:{}),result,headers};game.study=validateStudy(study,game);return game;
}
export function writeAnnotatedPgn(game,username){
 const study=game.study||{branches:[]},annotations=study.annotations||[];
 const comment=text=>text?`{${text.replace(/[{}]/g,c=>c==='{'?'[':']').replace(/[\r\n]+/g,' ')}}`:'';
 const at=(branchId,ply)=>annotations.find(a=>a.branchId===branchId&&a.ply===ply);
 const annotation=a=>a?[...(a.nags||[]).map(n=>`$${n}`),comment(writeMarkComment(a.comment,a.marks))].filter(Boolean).join(' '):'';
 const children=(branchId,ply)=>study.branches.filter(b=>b.parentId===branchId&&b.anchorPly===ply);
 function line(moves,branchId,start=0,extra=[]){
  const board=replay(moves.slice(0,start),game.initialFen,game.variant),branch=study.branches.find(b=>b.id===branchId),out=[comment(writeMarkComment([branch?.question,at(branchId,start)?.comment].filter(Boolean).join(' — '),at(branchId,start)?.marks))].filter(Boolean);
  for(let i=start;i<moves.length;i++){
   const prefix=board.turn()==='w'?`${board.fen().split(' ')[5]}. `:i===start?`${board.fen().split(' ')[5]}... `:'';
   const move=board.move({from:moves[i].slice(0,2),to:moves[i].slice(2,4),promotion:moves[i][4]});out.push(`${prefix}${move.san}`,annotation(at(branchId,i+1)));
   for(const alt of [...children(branchId,i),...(i===start?extra:[])])out.push(alt.moves.length>i?`(${line(alt.moves,alt.id,i)})`:comment(alt.question?`Unplayed variation: ${alt.question}`:''));
  }
  const end=children(branchId,moves.length),continued=end.filter(b=>b.moves.length>moves.length);
  for(const empty of end.filter(b=>b.moves.length===moves.length))out.push(comment(empty.question?`Unplayed variation: ${empty.question}`:''));
  // ponytail: PGN has no branch after a terminal node; emit its continuation as a main line. Study files preserve the exact original boundary and empty branches.
  if(continued.length)out.push(line(continued[0].moves,continued[0].id,moves.length,continued.slice(1)));
  return out.filter(Boolean).join(' ');
 }
 const headers={...game.headers,ChessLabOriginalPly:String(game.moves.length),Event:game.headers?.Event||'ChessLab study',White:game.source==='import'?game.headers?.White||'White':game.color==='w'?username:game.botName||'ChessLab bot',Black:game.source==='import'?game.headers?.Black||'Black':game.color==='b'?username:game.botName||'ChessLab bot',Result:game.result||'*'};
 if(game.initialFen||!game.moves.length){headers.SetUp='1';headers.FEN=game.initialFen||new Chess().fen();}else{delete headers.SetUp;delete headers.FEN;}
 if(game.variant==='chess960')headers.Variant='Chess960';else delete headers.Variant;
 if(game.opening){headers.ECO=game.opening.eco;headers.Opening=game.opening.name;}
 const tags=Object.entries(headers).filter(([k,v])=>/^[A-Za-z]+$/.test(k)&&typeof v==='string').map(([k,v])=>`[${k} "${v.replace(/["\\\r\n]/g,' ')}"]`).join('\n');
 return `${tags}\n\n${line(game.moves,null).replace(/}\s*{/g,' — ')} ${game.result||'*'}\n`;
}
export function portableStudy(game,username='Player'){return {format:'chesslab-study',version:1,game:{title:game.title,...(game.variant==='chess960'?{variant:game.variant}:{}),initialFen:game.initialFen||null,moves:game.moves,result:game.result||null,headers:game.source==='bot'?{...game.headers,White:game.color==='w'?username:game.botName||'ChessLab bot',Black:game.color==='b'?username:game.botName||'ChessLab bot'}:game.headers||{},study:game.study||{version:1,branches:[],selectedBranchId:null,anchorPly:0}}};}
export function readPortableStudy(value){
 if(!value||value.format!=='chesslab-study'||value.version!==1||!value.game||typeof value.game!=='object')fail(400,'Choose a supported ChessLab study file.');
 const g=value.game;let variant;try{variant=gameVariant(g.variant);}catch(error){fail(400,error.message);}if(variant==='chess960'&&!g.initialFen)fail(400,'A Chess960 study needs its starting FEN.');if(typeof g.title!=='string'||!g.title.trim()||g.title.length>100||!Array.isArray(g.moves)||g.moves.length>1000||![null,'1-0','0-1','1/2-1/2'].includes(g.result))fail(400,'Invalid study title, moves or result.');
 if(g.initialFen!==null){if(typeof g.initialFen!=='string')fail(400,'Invalid starting position.');validatePosition(g.initialFen,variant);}
 replay(g.moves,g.initialFen,variant);
 if(!g.headers||typeof g.headers!=='object'||Array.isArray(g.headers)||Object.keys(g.headers).length>100||Object.entries(g.headers).some(([k,v])=>!/^[A-Za-z]+$/.test(k)||typeof v!=='string'||v.length>500))fail(400,'Invalid study headers.');
 const game={title:g.title,...(variant==='chess960'?{variant}:{}),initialFen:g.initialFen,moves:g.moves,result:g.result,headers:g.headers,source:'import',positionSetup:!g.moves.length};game.study=validateStudy(g.study,game);return game;
}
