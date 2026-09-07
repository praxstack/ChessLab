import { randomInt } from 'node:crypto';
import { Chess } from 'chess.js';
import { replay } from './engine.mjs';

const fail = message => { throw Object.assign(new Error(message), {status:400}); };
export const assistanceDefaults = {chat:true,evaluation:false,threats:false,suggestions:false,feedback:false,engine:false};
export function setupOptions(body, profiles) {
 const {color='w',level=2,title,botId=null,engineId='stockfish19'}=body;
 if(!['w','b','random'].includes(color)||!Number.isInteger(level)||level<1||level>5||typeof engineId!=='string'||(title!==undefined&&(typeof title!=='string'||title.length>100)))fail('Choose a color, an available engine and a valid strength.');
 const profile=botId===null?null:profiles.find(p=>p.id===botId);
 if(botId!==null&&!profile)fail('Choose a bot from the current catalog.');
 const rating=body.rating??profile?.rating??[400,800,1200,1800,2600][level-1];
 if(!Number.isInteger(rating)||rating<(profile?.category==='New to Chess'?100:250)||rating>3200)fail('Choose a target rating between 250 and 3200.');
 const timeControl=body.timeControl??{initialSeconds:0,incrementSeconds:0};
 if(!timeControl||Array.isArray(timeControl)||!Number.isInteger(timeControl.initialSeconds)||!(timeControl.initialSeconds===0||(timeControl.initialSeconds>=60&&timeControl.initialSeconds<=3600))||!Number.isInteger(timeControl.incrementSeconds)||timeControl.incrementSeconds<0||timeControl.incrementSeconds>60||(timeControl.initialSeconds===0&&timeControl.incrementSeconds!==0))fail('Choose no clock, or 1–60 minutes with an increment of 0–60 seconds.');
 const assistance={...assistanceDefaults};
 if(body.assistance!==undefined){if(!body.assistance||Array.isArray(body.assistance)||typeof body.assistance!=='object')fail('Invalid assistance settings.');for(const [key,value] of Object.entries(body.assistance)){if(!Object.hasOwn(assistance,key)||typeof value!=='boolean')fail('Invalid assistance setting.');assistance[key]=value;}}
 return {color:color==='random'?(randomInt(2)?'w':'b'):color,level,title:title||profile?.name||`Practice · level ${level}`,botId,botName:profile?.name||'Engine opponent',engineId,rating,currentRating:rating,style:profile?.style||'balanced',adaptive:profile?.adaptive||false,timeControl:{initialSeconds:timeControl.initialSeconds,incrementSeconds:timeControl.incrementSeconds},assistance,hintsUsed:0,undosUsed:0,crownsAwarded:0,resultReason:null,chat:assistance.chat?[profile?(profile.description||`I'm ${profile.name}. Let's play.`):'Ready when you are. Choose your move.']:[],legacyStrength:body.rating===undefined&&!profile&&!body.engineId};
}
export function beginClock(game,stamp) {
 const ms=(game.timeControl?.initialSeconds||0)*1000;
 game.clock={whiteMs:ms,blackMs:ms,activeSince:ms?stamp:null};
 game.clockHistory=[{whiteMs:ms,blackMs:ms}];
}
export function settleClock(game,stamp) {
 if(game.result||!game.timeControl?.initialSeconds||game.clock?.activeSince==null)return false;
 const board=replay(game.moves,game.initialFen),turn=board.turn(),key=turn==='w'?'whiteMs':'blackMs';
 game.clock[key]=Math.max(0,game.clock[key]-Math.max(0,stamp-game.clock.activeSince));game.clock.activeSince=stamp;
 if(game.clock[key]>0)return false;
 const winner=turn==='w'?'b':'w';
 const winnerPieces=board.board().flat().filter(p=>p?.color===winner);
 const cannotMate=winnerPieces.every(p=>p.type==='k')||board.isInsufficientMaterial();
 game.result=cannotMate?'1/2-1/2':winner==='w'?'1-0':'0-1';game.resultReason=cannotMate?'Time expired; opponent has insufficient mating material':'Time expired';game.clock.activeSince=null;
 return true;
}
export function finishMoveClock(game,color,stamp) {
 if(!game.clock)return;
 if(game.timeControl?.initialSeconds){game.clock[color==='w'?'whiteMs':'blackMs']+=(game.timeControl.incrementSeconds||0)*1000;game.clock.activeSince=game.result?null:stamp;}
 game.clockHistory??=[];game.clockHistory.push({whiteMs:game.clock.whiteMs,blackMs:game.clock.blackMs});
}
export function crownsFor(game) {
 if(!game.botId||game.source!=='bot'||game.result!==(game.color==='w'?'1-0':'0-1'))return 0;
 const automatic=game.reviewUsed||Object.entries(game.assistance||{}).some(([key,value])=>key!=='chat'&&value);
 const help=(game.hintsUsed||0)+(game.undosUsed||0);
 return automatic||help>3?1:help?2:3;
}
export function adaptiveRating(game) {
 if(!game.adaptive)return game.rating;
 const values={p:1,n:3,b:3,r:5,q:9,k:0};let advantage=0;
 for(const p of replay(game.moves,game.initialFen).board().flat())if(p)advantage+=(p.color===game.color?1:-1)*values[p.type];
 return Math.max(250,Math.min(3200,game.rating+Math.max(-350,Math.min(350,advantage*80))));
}
export function addBotChat(game,move) {
 if(!game.assistance?.chat)return;
 let text=game.result?'Good game. Let’s look at the decisions that mattered.':move.san.includes('+')?'Check. Look for a capture, a block, or a king move.':move.captured?'I captured a piece. Check the whole exchange before replying.':game.moves.length<6?'The center and development both matter here.':game.adaptive&&game.currentRating!==game.rating?'I’m adjusting the challenge as the material balance changes.':game.style==='aggressive'?'Keep an eye on checks and threats.':game.style==='solid'?'I’m looking for a safe position. What is your plan?':'Your move. Take a moment to look at the position.';
 game.chat=[...(game.chat||[]),text].slice(-30);
}
export function undoTurn(game,stamp) {
 if(game.result||game.source!=='bot')fail('Only a game still in progress can be taken back.');
 const board=replay(game.moves,game.initialFen);
 const target=game.moves.length-(board.turn()===game.color?2:1);
 if(target<0)fail('Play a move before taking back a turn.');
 if((game.study?.anchorPly||0)>target||(game.study?.branches||[]).some(b=>!b.parentId&&b.anchorPly>target))fail('A saved study uses this part of the game. Keep its history and start a rematch instead.');
 game.moves=game.moves.slice(0,target);game.undosUsed=(game.undosUsed||0)+1;game.lastFeedback=null;
 const prior=game.clockHistory?.[target];
 if(prior)game.clock={...prior,activeSince:game.timeControl?.initialSeconds?stamp:null};
 game.clockHistory=game.clockHistory?.slice(0,target+1)||[];
 if(game.assistance?.chat)game.chat=[...(game.chat||[]),'Turn taken back. Try a different idea.'].slice(-30);
 return game;
}
export function attackedPieces(game) {
 const board=replay(game.moves,game.initialFen),enemy=game.color==='w'?'b':'w';
 const fields=board.fen().split(' ');if(fields[1]!==enemy){fields[1]=enemy;fields[3]='-';}
 const opponent=new Chess(fields.join(' '));
 return opponent.moves({verbose:true}).filter(move=>move.captured).map(move=>({from:move.from,to:move.to}));
}
