import React from 'react';

const names = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function Piece({type, color, animation=0, offset}) {
  return <img src={`/pieces/chesscom/${color}${type}.png`} className={`piece ${offset?'moving':''}`} style={{animationDuration:`${animation}ms`,'--move-x':`${offset?.[0]||0}%`,'--move-y':`${offset?.[1]||0}%`}} width="150" height="150" alt="" aria-hidden="true" draggable={false}/>;
}
export default function Board({chess, orientation='w', selected, onSquare, onMove, enabled, settings, arrows=[], lastMove, classification, label}) {
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  const legal = selected && enabled ? chess.moves({square:selected,verbose:true}) : [];
  const targets = new Set(legal.map(m=>m.to));
  const squarePoint = square => [(files.indexOf(square[0])+.5)*100, (ranks.indexOf(square[1])+.5)*100];
  return <div className="board" role="group" aria-label={label || 'Chess board'}>
    {[...ranks].flatMap((rank,row)=>[...files].map((file,col)=>{
      const square=file+rank, piece=chess.get(square), dark=(file.charCodeAt(0)-97+Number(rank))%2===0;
      let from=lastMove?.[1]===square?lastMove[0]:null;
      if(piece?.type==='r'&&lastMove?.[0]?.[0]==='e'&&chess.get(lastMove[1])?.type==='k'&&lastMove[1][1]===rank){if(lastMove[1][0]==='g'&&file==='f')from='h'+rank;if(lastMove[1][0]==='c'&&file==='d')from='a'+rank;}
      const offset=from?[(files.indexOf(from[0])-col)*100,(ranks.indexOf(from[1])-row)*100]:null;
      const check = piece?.type==='k' && piece.color===chess.turn() && chess.isCheck();
      return <button type="button" key={square} className={`square ${dark?'dark':'light'} ${selected===square?'selected':''} ${settings.lastMove && lastMove?.includes(square)?'last-move':''} ${check?'in-check':''}`} aria-label={`${square}${piece?`, ${piece.color==='w'?'white':'black'} ${names[piece.type]}`:', empty'}${targets.has(square)?', legal destination':''}${check?', in check':''}`} onClick={()=>onSquare(square)} draggable={enabled && !!piece && piece.color===chess.turn()} onDragStart={event=>{event.dataTransfer.setData('text/plain',square);event.dataTransfer.effectAllowed='move';onSquare(square);}} onDragOver={event=>enabled&&event.preventDefault()} onDrop={event=>{event.preventDefault();const from=event.dataTransfer.getData('text/plain');if(/^[a-h][1-8]$/.test(from))onMove(from,square);}}>
        {settings.coordinates && col===0 && <span className="rank">{rank}</span>}
        {piece && <Piece key={piece.color+piece.type+square} type={piece.type} color={piece.color} animation={settings.animation} offset={offset}/>}
        {classification&&lastMove?.[1]===square&&<span className={`move-classification ${classification.toLowerCase().replaceAll(' ','-')}`} title={classification} aria-label={`Move classification: ${classification}`}>{{Best:'★',Good:'✓',Inaccuracy:'?!',Mistake:'?',Blunder:'??',Checkmate:'#'}[classification]||'!'}</span>}
        {settings.legalMoves && targets.has(square) && <span className={piece?'legal-capture':'legal-dot'}/>}
        {settings.coordinates && row===7 && <span className="file">{file}</span>}
      </button>;
    }))}
    {settings.arrows && arrows.length>0 && <svg className="board-arrows" viewBox="0 0 800 800" aria-hidden="true"><defs>{arrows.map((_,i)=><marker key={i} id={`arrow-${i}`} markerWidth="3" markerHeight="3" refX="2.3" refY="1.5" orient="auto"><path d="M0 0L3 1.5L0 3z" fill={['#edba68','#405fe0','#bd74ce'][i%3]}/></marker>)}</defs>{arrows.map((move,i)=>{const [x1,y1]=squarePoint(move.slice(0,2)),[x2,y2]=squarePoint(move.slice(2,4));return <line key={move+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={['#edba68','#405fe0','#bd74ce'][i%3]} strokeWidth="13" opacity=".88" strokeLinecap="round" markerEnd={`url(#arrow-${i})`}/>;})}</svg>}
  </div>;
}
