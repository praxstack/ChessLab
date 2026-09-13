import React,{useEffect,useRef,useState} from 'react';

const classificationClass=value=>value.toLowerCase().replaceAll(' ','-');
function graphValue(score){
 if(!score)return null;
 if(score.type==='result')return score.value==='1-0'?800:-800;
 if(score.type==='mate')return score.value>=0?800:-800;
 return Math.max(-800,Math.min(800,score.value));
}
function evaluationText(score){
 if(!score)return 'No numerical evaluation';
 if(score.type==='result')return score.value==='1-0'?'White checkmates':'Black checkmates';
 if(score.type==='mate')return `Mate in ${Math.abs(score.value)} for ${score.value>=0?'White':'Black'}`;
 return `${score.value>=0?'+':''}${(score.value/100).toFixed(2)} for White`;
}
export default function GameReview({game,settings,selectedPly,onSelect,onReport,request,onPractice}){
 const [report,setReport]=useState(null),[loading,setLoading]=useState(true),[running,setRunning]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState(false),[side,setSide]=useState('both');
 const controller=useRef(null),generation=useRef(0);
 const eligible=game.moves.length>0&&(game.source==='import'||!!game.result),historyKey=game.moves.join(' ');
 const route=`/api/games/${game.id}/review`;
 function install(value){setReport(value);onReport(value);}
 useEffect(()=>{
  const seq=++generation.current,load=new AbortController();controller.current?.abort();setRunning(false);setLoading(true);setError('');setReport(null);onReport(undefined);
  if(!eligible){onReport(null);setLoading(false);return;}
  request(route,undefined,load.signal).then(data=>{if(seq===generation.current)install(data.review);}).catch(err=>{if(err.name!=='AbortError'&&seq===generation.current){setError(err.message);onReport(null);}}).finally(()=>{if(seq===generation.current)setLoading(false);});
  return()=>{generation.current++;load.abort();controller.current?.abort();};
 },[game.id,historyKey,game.initialFen,eligible]);
 async function run(){
  if(controller.current)return;
  const abort=new AbortController(),seq=generation.current;controller.current=abort;setRunning(true);setError('');setExpanded(true);
  try{
   let current=(await request(route,undefined,abort.signal)).review;
   const matches=current?.limits.movetime===Number(settings.reviewStrength)&&current?.limits.threads===Number(settings.threads);
   if(!matches)current=null;
   if(current&&seq===generation.current)install(current);
   while(!current?.complete&&!abort.signal.aborted&&seq===generation.current){
    const data=await request(route,{revision:game.revision,after:current?.entries.length||0,movetime:Number(settings.reviewStrength),threads:Number(settings.threads)},abort.signal);
    if(abort.signal.aborted||seq!==generation.current)break;
    current=data.review;install(current);
   }
  }catch(err){if(err.name!=='AbortError'&&seq===generation.current)setError(err.message);}
  finally{if(controller.current===abort)controller.current=null;if(seq===generation.current)setRunning(false);}
 }
 if(!eligible)return null;
 const entries=report?.entries||[],matches=report?.limits.movetime===Number(settings.reviewStrength)&&report?.limits.threads===Number(settings.threads);
 const current=entries.find(entry=>entry.ply===selectedPly);
 const keys=entries.filter(entry=>(side==='both'||side===entry.color)&&(['Blunder','Mistake','Inaccuracy','Mate sequence','Checkmate'].includes(entry.classification)));
 const next=keys.find(entry=>entry.ply>selectedPly)||keys[0];
 const scores=entries.length?[entries[0].analysis.lines[0].score,...entries.map(entry=>entry.evaluation)]:[];
 const points=scores.map((score,index)=>{const value=graphValue(score);return value===null?null:`${index/Math.max(1,scores.length-1)*600},${50-value/800*45}`;});
 const graph=points.map((point,index)=>point?`${index===0||points[index-1]===null?'M':'L'}${point}`:'').join(' ');
 const counts=[...new Set(entries.map(entry=>entry.classification))];
 return <section className="game-report" aria-label="Whole game review">
  <div className="report-heading"><button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><strong>Game report</strong><span aria-hidden="true">{expanded?'⌃':'⌄'}</span></button><span>{loading?'Loading…':report?.complete?'Saved':entries.length?`${entries.length} / ${report.total} moves`:'Every move, both sides'}</span></div>
  {!report&&<p className="report-intro">See where the game turned. Review every move with your local chess engine.</p>}
  <div className="report-run"><button className="button primary" disabled={loading||running||(report?.complete&&matches)} onClick={run}>{running?`Reviewing ${Math.min(entries.length+1,game.moves.length)} / ${game.moves.length}`:report?.complete&&matches?'Review complete':entries.length&&matches?'Resume review':report?'Review with current settings':'Review whole game'}</button>{running&&<button className="button secondary" onClick={()=>controller.current?.abort()}>Pause review</button>}</div>
  {report?.complete&&<button className="button secondary practice-review-button" disabled={running} onClick={()=>onPractice(side)}>Practice key moves</button>}
  {running&&<progress aria-label="Game review progress" value={entries.length} max={game.moves.length}/>}
  {error&&<p className="form-error" role="alert">{error} Completed moves remain saved.</p>}
  {expanded&&entries.length>0&&<>
   <div className="report-scores">{['w','b'].map(color=><div key={color}><span><i className={`side-dot ${color}`}/>{color==='w'?(game.headers?.White||'White'):(game.headers?.Black||'Black')}</span><strong>{report.players[color].averageLossCp??'—'}<small> cp</small></strong><small>Average loss · {report.players[color].measuredMoves} measured {report.players[color].measuredMoves===1?'move':'moves'}</small></div>)}</div>
   <div className="game-graph"><svg viewBox="0 0 600 100" preserveAspectRatio="none" role="img" aria-label="Game advantage graph, from White’s perspective. Use the position slider to navigate." onClick={event=>{const box=event.currentTarget.getBoundingClientRect();onSelect(Math.max(0,Math.min(entries.length,Math.round((event.clientX-box.left)/box.width*entries.length))));}}><line x1="0" y1="50" x2="600" y2="50" className="graph-equal"/><path d={graph} className="graph-line"/>{selectedPly>=0&&selectedPly<=entries.length&&<line x1={selectedPly/entries.length*600} y1="0" x2={selectedPly/entries.length*600} y2="100" className="graph-cursor"/>}</svg><label><span>{current?`${current.number}${current.color==='w'?'.':'…'} ${current.san}`:'Starting position'}</span><span>{evaluationText(current?.evaluation||scores[0])}</span><input aria-label="Review position" type="range" min="0" max={entries.length} value={Math.max(0,Math.min(selectedPly,entries.length))} onChange={event=>onSelect(Number(event.target.value))}/></label></div>
   <div className="report-counts" aria-label="Move classifications"><div><span>Classification</span><b>White</b><b>Black</b></div>{counts.map(name=><div key={name}><span className={`move-grade ${classificationClass(name)}`}>{name}</span><b>{report.players.w.counts[name]||0}</b><b>{report.players.b.counts[name]||0}</b></div>)}</div>
   <div className="key-moves-heading"><strong>Key moves</strong><select aria-label="Review as" value={side} onChange={event=>setSide(event.target.value)}><option value="both">Both sides</option><option value="w">White</option><option value="b">Black</option></select>{next&&<button className="text-button" onClick={()=>onSelect(next.ply)}>Next key move →</button>}</div>
   <div className="key-moves">{keys.length?keys.map(entry=><button key={entry.ply} aria-label={`Review key move ${entry.number}, ${entry.color==='w'?'white':'black'}, ${entry.san}`} aria-current={selectedPly===entry.ply?'step':undefined} onClick={()=>onSelect(entry.ply)}><strong>{entry.number}{entry.color==='w'?'.':'…'} {entry.san}</strong><span className={`move-grade ${classificationClass(entry.classification)}`}>{entry.classification}</span><small>{entry.lossCp==null?'Mate line':`${entry.lossCp} cp`}</small></button>):<p>No key moves found in the reviewed positions for this side.</p>}</div>
   <p className="report-receipt">{report.engine} · {report.limits.movetime/1000}s per position · {entries.length}/{report.total} moves saved. Centipawn loss and classifications are local search estimates. Mate scores are excluded from the average.</p>
  </>}
 </section>;
}
