import React from 'react';

const names = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function Piece({type, color}) {
  return <svg viewBox="0 0 80 80" className={`piece piece-${color}`} aria-hidden="true"><g strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
    {type === 'p' && <><circle cx="40" cy="22" r="10"/><path d="M32 32h16l-2 11 5 12H29l5-12z"/><path d="M28 55h24l4 9H24z"/></>}
    {type === 'r' && <><path d="M23 13h8v8h6v-8h7v8h6v-8h8v18l-7 5 2 21H28l2-21-7-5z"/><path d="M29 31h23M29 38h22M24 57h32l3 8H21z"/></>}
    {type === 'b' && <><path d="M40 10c-7 9-17 15-17 26 0 8 7 11 17 11s17-3 17-11c0-11-10-17-17-26z"/><path d="M45 22l-8 13M31 47l-4 11h26l-4-11M26 58h28l5 7H21z"/><circle cx="40" cy="10" r="3"/></>}
    {type === 'n' && <><path d="M53 56H25c1-11 11-19 19-27l-10 4-8 8-9-7 11-19 13-3 4-7 5 9c17 10 11 29 3 42z"/><path d="M43 18l-9 7M29 57h26l4 8H23z"/><circle cx="31" cy="26" r="1.5" className="piece-eye"/></>}
    {type === 'q' && <><path d="M20 23l9 8 3-14 8 13 8-13 3 14 9-8-9 30H29z"/><circle cx="20" cy="21" r="4"/><circle cx="32" cy="15" r="4"/><circle cx="48" cy="15" r="4"/><circle cx="60" cy="21" r="4"/><path d="M28 53h24l3 5H25zM24 59h32l3 6H21z"/></>}
    {type === 'k' && <><path d="M40 8v14M34 14h12" fill="none"/><path d="M40 26c-10-12-27-3-22 9l11 18h22l11-18c5-12-12-21-22-9z"/><path d="M40 26v18M28 53h24l3 5H25zM24 59h32l3 6H21z"/></>}
  </g></svg>;
}
export default function Board({chess, orientation='w', selected, onSquare, onMove, enabled, settings, arrows=[], lastMove, label}) {
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  const legal = selected && enabled ? chess.moves({square:selected,verbose:true}) : [];
  const targets = new Set(legal.map(m=>m.to));
  const squarePoint = square => [(files.indexOf(square[0])+.5)*100, (ranks.indexOf(square[1])+.5)*100];
  return <div className="board" role="group" aria-label={label || 'Chess board'}>
    {[...ranks].flatMap((rank,row)=>[...files].map((file,col)=>{
      const square=file+rank, piece=chess.get(square), dark=(file.charCodeAt(0)-97+Number(rank))%2===0;
      const check = piece?.type==='k' && piece.color===chess.turn() && chess.isCheck();
      return <button type="button" key={square} className={`square ${dark?'dark':'light'} ${selected===square?'selected':''} ${settings.lastMove && lastMove?.includes(square)?'last-move':''} ${check?'in-check':''}`} aria-label={`${square}${piece?`, ${piece.color==='w'?'white':'black'} ${names[piece.type]}`:', empty'}${targets.has(square)?', legal destination':''}${check?', in check':''}`} onClick={()=>onSquare(square)} draggable={enabled && !!piece && piece.color===chess.turn()} onDragStart={event=>{event.dataTransfer.setData('text/plain',square);event.dataTransfer.effectAllowed='move';onSquare(square);}} onDragOver={event=>enabled&&event.preventDefault()} onDrop={event=>{event.preventDefault();const from=event.dataTransfer.getData('text/plain');if(/^[a-h][1-8]$/.test(from))onMove(from,square);}}>
        {settings.coordinates && col===0 && <span className="rank">{rank}</span>}
        {piece && <Piece type={piece.type} color={piece.color}/>}
        {settings.legalMoves && targets.has(square) && <span className={piece?'legal-capture':'legal-dot'}/>}
        {settings.coordinates && row===7 && <span className="file">{file}</span>}
      </button>;
    }))}
    {settings.arrows && arrows.length>0 && <svg className="board-arrows" viewBox="0 0 800 800" aria-hidden="true"><defs>{arrows.map((_,i)=><marker key={i} id={`arrow-${i}`} markerWidth="3" markerHeight="3" refX="2.3" refY="1.5" orient="auto"><path d="M0 0L3 1.5L0 3z" fill={['#edba68','#405fe0','#bd74ce'][i%3]}/></marker>)}</defs>{arrows.map((move,i)=>{const [x1,y1]=squarePoint(move.slice(0,2)),[x2,y2]=squarePoint(move.slice(2,4));return <line key={move+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={['#edba68','#405fe0','#bd74ce'][i%3]} strokeWidth="13" opacity=".88" strokeLinecap="round" markerEnd={`url(#arrow-${i})`}/>;})}</svg>}
  </div>;
}
