export const markColors={R:'#e85d59',G:'#65ae55',Y:'#efb94e',B:'#4c8cdb'};
export const markColorNames={R:'Red',G:'Green',Y:'Yellow',B:'Blue'};
const square=/^[a-h][1-8]$/;
export function validateMarks(marks){
 if(!Array.isArray(marks)||marks.length>64)throw new Error('Use at most 64 drawings at one position.');
 const seen=new Set();return marks.map(m=>{
  if(!m||typeof m.from!=='string'||typeof m.to!=='string'||!square.test(m.from)||!square.test(m.to)||typeof m.color!=='string'||!Object.hasOwn(markColors,m.color))throw new Error('A drawing needs valid board squares and a red, green, yellow or blue color.');
  const key=m.from+m.to;if(seen.has(key))throw new Error('A position contains duplicate drawings.');seen.add(key);return {from:m.from,to:m.to,color:m.color};
 });
}
export function toggleMark(marks,mark){
 validateMarks([mark]);const next=validateMarks(marks),index=next.findIndex(m=>m.from===mark.from&&m.to===mark.to);
 if(index<0)next.push(mark);else if(next[index].color===mark.color)next.splice(index,1);else next[index]=mark;
 return validateMarks(next);
}
export function readMarkComment(text=''){
 const marks=[];const comment=text.replace(/\[%c(al|sl)\s+([^\]]*)\]/g,(_,kind,payload)=>{
  for(const value of payload.trim().split(',')){
   const token=value.trim(),pattern=kind==='al'?/^[RGYB][a-h][1-8][a-h][1-8]$/:/^[RGYB][a-h][1-8]$/;
   if(!pattern.test(token))throw new Error('This PGN contains an invalid drawing directive.');
   marks.push({color:token[0],from:token.slice(1,3),to:kind==='al'?token.slice(3,5):token.slice(1,3)});
  }return '';
 }).trim();
 if(/\[%c(?:al|sl)\b/.test(comment))throw new Error('This PGN contains an invalid drawing directive.');
 return {comment,marks:validateMarks(marks)};
}
export function writeMarkComment(comment='',marks=[]){
 const arrows=marks.filter(m=>m.from!==m.to).map(m=>m.color+m.from+m.to),squares=marks.filter(m=>m.from===m.to).map(m=>m.color+m.from);
 return [comment,arrows.length?`[%cal ${arrows.join(',')}]`:'',squares.length?`[%csl ${squares.join(',')}]`:''].filter(Boolean).join(' ');
}
