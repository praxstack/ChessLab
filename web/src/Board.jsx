import React,{useEffect,useId,useRef,useState} from 'react';
import {markColors} from '../../shared/board-marks.js';

const names = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function Piece({type, color, animation=0, offset}) {
  return <img src={`/pieces/chesscom/${color}${type}.png`} className={`piece ${offset?'moving':''}`} style={{animationDuration:`${animation}ms`,'--move-x':`${offset?.[0]||0}%`,'--move-y':`${offset?.[1]||0}%`}} width="150" height="150" alt="" aria-hidden="true" draggable={false}/>;
}
export default function Board({chess, orientation='w', selected, onSquare, onMove, enabled, settings, arrows=[], lastMove, lastMoveDetails, classification, label, editing=false,marks=[],onMark,markTool='move',markColor='Y',positionKey}) {
  const markerId=useId().replace(/[^a-zA-Z0-9_-]/g,''),gesture=useRef(null),[tapFrom,setTapFrom]=useState(null);
  useEffect(()=>{gesture.current=null;setTapFrom(null);},[positionKey,markTool,orientation]);
  const toolActive=!!onMark&&markTool!=='move';
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  const legal = selected && enabled && !editing ? chess.moves({square:selected,verbose:true}) : [];
  const targets = new Set(legal.map(m=>m.to));
  const squarePoint = square => [(files.indexOf(square[0])+.5)*100, (ranks.indexOf(square[1])+.5)*100];
  const eventSquare=event=>{const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;if(x<0||y<0||x>=rect.width||y>=rect.height)return null;return files[Math.floor(x/rect.width*8)]+ranks[Math.floor(y/rect.height*8)];};
  function chooseSquare(square){if(!toolActive){onSquare(square);return;}if(markTool==='square'){onMark({from:square,to:square,color:markColor});return;}if(tapFrom?.key===positionKey){onMark({from:tapFrom.square,to:square,color:markColor});setTapFrom(null);}else setTapFrom({square,key:positionKey});}
  function startDrawing(event){if(!onMark||event.button!==2)return;const from=eventSquare(event);if(!from)return;event.preventDefault();gesture.current={from,key:positionKey,orientation,ctrl:event.ctrlKey,alt:event.altKey,shift:event.shiftKey};setTapFrom({square:from,key:positionKey});event.currentTarget.setPointerCapture(event.pointerId);}
  function finishDrawing(event){const current=gesture.current;if(!current)return;gesture.current=null;setTapFrom(null);const to=eventSquare(event);if(!to||!onMark||current.key!==positionKey||current.orientation!==orientation)return;const same=current.from===to,color=current.alt?'B':current.shift?'G':current.ctrl?(same?'Y':'R'):(same?'R':'Y');onMark({from:current.from,to,color});}
  return <div className="board" role="group" aria-label={label || 'Chess board'} onPointerDown={startDrawing} onPointerUp={finishDrawing} onPointerCancel={()=>{gesture.current=null;setTapFrom(null);}} onLostPointerCapture={()=>{if(gesture.current){gesture.current=null;setTapFrom(null);}}} onKeyDown={event=>{if(event.key==='Escape'){gesture.current=null;setTapFrom(null);}}} onContextMenu={onMark?event=>event.preventDefault():undefined}>
    {[...ranks].flatMap((rank,row)=>[...files].map((file,col)=>{
      const square=file+rank, piece=chess.get(square), dark=(file.charCodeAt(0)-97+Number(rank))%2===0;
      let from=lastMove?.[1]===square?lastMove[0]:null;
      if(lastMoveDetails?.castle&&piece?.type==='r'&&square===lastMoveDetails.castle.rookTo)from=lastMoveDetails.castle.rookFrom;
      if(!lastMoveDetails?.castle&&piece?.type==='r'&&lastMove?.[0]?.[0]==='e'&&chess.get(lastMove[1])?.type==='k'&&lastMove[1][1]===rank){if(lastMove[1][0]==='g'&&file==='f')from='h'+rank;if(lastMove[1][0]==='c'&&file==='d')from='a'+rank;}
      const offset=from?[(files.indexOf(from[0])-col)*100,(ranks.indexOf(from[1])-row)*100]:null;
      const check = !editing && piece?.type==='k' && piece.color===chess.turn() && chess.isCheck();
      return <button type="button" key={square} className={`square ${dark?'dark':'light'} ${selected===square?'selected':''} ${settings.lastMove && lastMove?.includes(square)?'last-move':''} ${check?'in-check':''} ${tapFrom&&tapFrom.key===positionKey&&tapFrom.square===square?'drawing-start':''}`} aria-label={`${square}${piece?`, ${piece.color==='w'?'white':'black'} ${names[piece.type]}`:', empty'}${targets.has(square)?', legal destination':''}${check?', in check':''}`} onClick={()=>chooseSquare(square)} draggable={!toolActive && enabled && !!piece && (editing || piece.color===chess.turn())} onDragStart={event=>{event.dataTransfer.setData('text/plain',square);event.dataTransfer.effectAllowed='move';if(!editing)onSquare(square);}} onDragOver={event=>!toolActive&&enabled&&event.preventDefault()} onDrop={event=>{event.preventDefault();const from=event.dataTransfer.getData('text/plain');if(!toolActive&&enabled&&(/^[a-h][1-8]$/.test(from)||(editing&&/^[wb][pnbrqk]$/.test(from))))onMove(from,square);}}>
        {marks.filter(m=>m.from===square&&m.to===square).map(m=><span key={m.color} className="study-square-mark" data-square={square} data-color={m.color} aria-hidden="true" style={{background:markColors[m.color]}}/>)}
        {settings.coordinates && col===0 && <span className="rank">{rank}</span>}
        {piece && <Piece key={piece.color+piece.type+square} type={piece.type} color={piece.color} animation={settings.animation} offset={offset}/>}
        {classification&&lastMove?.[1]===square&&<span className={`move-classification ${classification.toLowerCase().replaceAll(' ','-')}`} title={classification} aria-label={`Move classification: ${classification}`}>{{Best:'★',Good:'✓',Inaccuracy:'?!',Mistake:'?',Blunder:'??',Checkmate:'#'}[classification]||'!'}</span>}
        {settings.legalMoves && targets.has(square) && <span className={piece&&piece.color!==chess.turn()?'legal-capture':'legal-dot'}/>}
        {settings.coordinates && row===7 && <span className="file">{file}</span>}
      </button>;
    }))}
    {settings.arrows && arrows.length>0 && <svg className="board-arrows" viewBox="0 0 800 800" aria-hidden="true"><defs>{arrows.map((_,i)=><marker key={i} id={`${markerId}-arrow-${i}`} markerWidth="3" markerHeight="3" refX="2.3" refY="1.5" orient="auto"><path d="M0 0L3 1.5L0 3z" fill={['#edba68','#405fe0','#bd74ce'][i%3]}/></marker>)}</defs>{arrows.map((move,i)=>{const [x1,y1]=squarePoint(move.slice(0,2)),[x2,y2]=squarePoint(move.slice(2,4));return <line key={move+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={['#edba68','#405fe0','#bd74ce'][i%3]} strokeWidth="13" opacity=".88" strokeLinecap="round" markerEnd={`url(#${markerId}-arrow-${i})`}/>;})}</svg>}
    {marks.some(m=>m.from!==m.to)&&<svg className="board-arrows study-arrows" viewBox="0 0 800 800" aria-hidden="true"><defs>{Object.entries(markColors).map(([key,color])=><marker key={key} id={`${markerId}-study-${key}`} markerWidth="3" markerHeight="3" refX="2.3" refY="1.5" orient="auto"><path d="M0 0L3 1.5L0 3z" fill={color}/></marker>)}</defs>{marks.filter(m=>m.from!==m.to).map(m=>{const [x1,y1]=squarePoint(m.from),[x2,y2]=squarePoint(m.to),dx=Math.abs(x2-x1),dy=Math.abs(y2-y1),knight=dx===100&&dy===200||dx===200&&dy===100;const path=knight?`M${x1} ${y1} L${dx>dy?x2:x1} ${dx>dy?y1:y2} L${x2} ${y2}`:`M${x1} ${y1} L${x2} ${y2}`;return <path key={m.from+m.to} data-from={m.from} data-to={m.to} data-color={m.color} d={path} fill="none" stroke={markColors[m.color]} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" opacity=".9" markerEnd={`url(#${markerId}-study-${m.color})`}/>;})}</svg>}
  </div>;
}
