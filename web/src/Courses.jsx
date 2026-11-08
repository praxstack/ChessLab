import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Chess} from 'chess.js';
import Board from './Board.jsx';
import {STARTER_COURSES} from '../../shared/starter-courses.js';

// Courses tab: your courses, what is due today, and the three ways to practise a course:
// drill a line from memory, answer a quiz, or shuffle everything. All answers come from the
// local /api/courses routes, so the schedule and progress live in this browser.

const SIDE={w:'White',b:'Black',both:'Both sides'};
const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
// Plain words for the time left until a due date ("in 3 hours", "in 2 days").
function timeLeft(ms){const h=Math.max(1,Math.round(ms/3600000)),d=Math.round(ms/86400000);if(h<24)return plural(h,'hour');if(d<7)return plural(d,'day');if(d<30)return plural(Math.round(d/7),'week');if(d<365)return plural(Math.round(d/30),'month');return 'a year';}
const boardFrom=(fen)=>{const b=new Chess();if(fen)b.load(fen);return b;};

export default function Courses({request,settings}){
 const [list,setList]=useState(null),[course,setCourse]=useState(null),[session,setSession]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[adding,setAdding]=useState(null);
 const alive=useRef(true);useEffect(()=>()=>{alive.current=false;},[]);
 async function call(path,body){setBusy(true);setError('');try{return await request(path,body);}catch(e){if(alive.current)setError(e.message);return null;}finally{if(alive.current)setBusy(false);}}
 async function refresh(){const data=await call('/api/courses');if(data&&alive.current)setList(data);}
 async function open(id){const data=await call(`/api/courses/${encodeURIComponent(id)}`);if(data&&alive.current){setCourse(data);setSession(null);}}
 useEffect(()=>{refresh();},[]);
 async function added(data){if(!data)return;setAdding(null);await refresh();await open(data.course.id);}

 if(session&&course)return <Practice request={request} settings={settings} course={course} session={session} onExit={async()=>{setSession(null);await open(course.course.id);await refresh();}}/>;
 if(course)return <CourseDetail data={course} busy={busy} error={error}
   onBack={async()=>{setCourse(null);await refresh();}}
   onStart={items=>setSession({items,index:0,stats:{done:0,perfect:0,missed:[]}})}
   onReview={async()=>{const data=await call(`/api/courses/${course.course.id}/review`);if(data){if(!data.queue.length){setError('Nothing is due. Shuffle the course or come back later.');return;}setSession({items:data.queue.map(card=>({kind:'line',id:card.lineId})),index:0,stats:{done:0,perfect:0,missed:[]}});}}}
   onShuffle={async chapterId=>{const data=await call(`/api/courses/${course.course.id}/shuffle`,chapterId?{chapterId}:{});if(data)setSession({items:data.items,index:0,stats:{done:0,perfect:0,missed:[]}});}}
   onMode={async mode=>{if(await call(`/api/courses/${course.course.id}/mode`,{mode}))await open(course.course.id);}}
   onExport={async()=>{const data=await call(`/api/courses/${course.course.id}/pgn`);if(!data)return;const url=URL.createObjectURL(new Blob([data.pgn],{type:'application/x-chess-pgn'}));const a=document.createElement('a');a.href=url;a.download=`${course.course.id}.pgn`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
   onDelete={async()=>{if(!window.confirm(`Delete "${course.course.title}" and its progress from this browser? This can't be undone.`))return;if(await call(`/api/courses/${course.course.id}/delete`,{})){setCourse(null);await refresh();}}}/>;

 const installed=new Set((list?.courses||[]).map(c=>c.id));
 return <section className="courses-page" aria-label="Courses">
  <div className="opening-intro"><div><p className="eyebrow">LEARN IT, DRILL IT, KEEP IT</p><h2>Courses that remember for you.</h2><p>Play your side of each line from memory. Lines you know come back less often. Lines you miss come back sooner.</p></div><span className="opening-local-count">{list?list.due:'…'}<small>lines due today</small></span></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="courses-actions"><button className="button secondary" onClick={()=>setAdding(adding==='pgn'?null:'pgn')} aria-expanded={adding==='pgn'}>Import a PGN</button><button className="button secondary" onClick={()=>setAdding(adding==='lichess'?null:'lichess')} aria-expanded={adding==='lichess'}>Import a Lichess study</button></div>
  {adding==='pgn'&&<ImportPgn busy={busy} onImport={async payload=>added(await call('/api/courses/import',payload))}/>}
  {adding==='lichess'&&<ImportLichess busy={busy} onImport={async payload=>added(await call('/api/courses/lichess',payload))}/>}
  <p className="section-label" role="status">{list?plural(list.courses.length,'course'):'Loading…'}</p>
  <div className="courses-grid">{(list?.courses||[]).map(c=><button key={c.id} className="endgame-card course-card" onClick={()=>open(c.id)} aria-label={`Open ${c.title}`}>
   <span className="course-colour" aria-hidden="true">{c.colour==='b'?'♚':c.colour==='w'?'♔':'♔♚'}</span>
   <span><small>{SIDE[c.colour]} · {c.level} · {c.mode==='adaptive'?'adaptive schedule':'ladder schedule'}</small><strong>{c.title}</strong><small>{plural(c.lines,'line')} · {c.schedule.known} known · {c.schedule.learning} learning · {c.schedule.fresh} new</small></span>
   <span className={`course-due ${c.schedule.due?'':'quiet'}`}>{c.schedule.due?`${c.schedule.due} due`:'Up to date'}</span></button>)}
   {list&&!list.courses.length&&<div className="empty-state"><h3>No courses yet.</h3><p>Add the starter course below, or import a PGN or a Lichess study.</p></div>}</div>
  <p className="section-label">STARTER COURSES · FREE, WRITTEN FOR ASKTHEMOVE</p>
  <div className="courses-grid">{STARTER_COURSES.map(c=><div key={c.id} className="endgame-card course-card starter"><span className="course-colour" aria-hidden="true">{c.colour==='b'?'♚':'♔'}</span><span><small>{SIDE[c.colour]} · {c.level}</small><strong>{c.title}</strong><small>{c.blurb}</small><span className="course-starter-action">{installed.has(c.id)?<button className="button small secondary" onClick={()=>open(c.id)}>Open</button>:<button className="button small primary" disabled={busy} onClick={async()=>added(await call('/api/courses',{course:c}))}>Add to my courses</button>}</span></span></div>)}</div>
 </section>;
}

function ImportPgn({busy,onImport}){
 const [pgn,setPgn]=useState(''),[title,setTitle]=useState(''),[side,setSide]=useState('');
 return <form className="courses-import" onSubmit={e=>{e.preventDefault();onImport({pgn,title:title.trim()||undefined,side:side||undefined});}}>
  <label htmlFor="course-pgn">PGN, one game per chapter. Variations become lines; comments and arrows come along.</label>
  <textarea id="course-pgn" rows={7} value={pgn} onChange={e=>setPgn(e.target.value)} placeholder={'[Event "My repertoire"]\n\n1. e4 e5 2. Nf3 (2. Bc4) Nc6 *'} required/>
  <div className="courses-import-row"><label>Title<input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} placeholder="From the PGN"/></label><label>I play<select value={side} onChange={e=>setSide(e.target.value)}><option value="">Side from the PGN</option><option value="w">White</option><option value="b">Black</option></select></label></div>
  <button className="button primary" disabled={busy||!pgn.trim()}>Make a course</button></form>;
}

function ImportLichess({busy,onImport}){
 const [url,setUrl]=useState(''),[side,setSide]=useState('');
 return <form className="courses-import" onSubmit={e=>{e.preventDefault();onImport({url,side:side||undefined});}}>
  <label htmlFor="course-lichess">A public Lichess study link, or a single chapter link.</label>
  <input id="course-lichess" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://lichess.org/study/abcdefgh" required/>
  <div className="courses-import-row"><label>I play<select value={side} onChange={e=>setSide(e.target.value)}><option value="">Side from the study</option><option value="w">White</option><option value="b">Black</option></select></label></div>
  <button className="button primary" disabled={busy||!url.trim()}>Import study</button></form>;
}

function CourseDetail({data,busy,error,onBack,onStart,onReview,onShuffle,onMode,onExport,onDelete}){
 const {course,cards,schedule,quizzes}=data,cardOf=useMemo(()=>Object.fromEntries(cards.map(c=>[c.lineId,c])),[cards]);
 const now=Date.now();
 return <section className="courses-page course-detail" aria-label={course.title}>
  <button className="text-button" onClick={onBack}>← All courses</button>
  <div className="opening-intro"><div><p className="eyebrow">{SIDE[course.colour]} · {course.level} · {course.source?.kind==='own'?'AskTheMove course':course.source?.author?`by ${course.source.author}`:'imported'}</p><h2>{course.title}</h2>{course.blurb&&<p>{course.blurb}</p>}</div><span className="opening-local-count">{schedule.due}<small>due now</small></span></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="course-progress" aria-label="Progress"><span style={{'--part':schedule.total?schedule.known/schedule.total:0}} className="known"/><span style={{'--part':schedule.total?schedule.learning/schedule.total:0}} className="learning"/></div>
  <p className="course-progress-label">{schedule.known} known · {schedule.learning} learning · {schedule.fresh} new{schedule.nextDue&&!schedule.due?` · next review ${new Date(schedule.nextDue).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})}`:''}</p>
  <div className="courses-actions"><button className="button primary" disabled={busy} onClick={onReview}>Review due lines ({schedule.due})</button><button className="button secondary" disabled={busy} onClick={()=>onShuffle()}>Shuffle the whole course</button>
   <label className="course-mode">Schedule<select value={data.course.mode||'ladder'} disabled={busy} onChange={e=>onMode(e.target.value)}><option value="ladder">Ladder: 4 hours to 6 months</option><option value="adaptive">Adaptive: easy lines stretch out</option></select></label></div>
  {course.chapters.map(chapter=><article key={chapter.id} className="course-chapter"><header><h3>{chapter.title}</h3><button className="text-button" disabled={busy} onClick={()=>onShuffle(chapter.id)}>Shuffle this chapter</button></header>
   {chapter.explain.map((p,i)=><p key={i} className="course-explain">{p}</p>)}
   <ul className="course-items">{chapter.lines.map(line=>{const card=cardOf[line.id],due=card&&card.due<=now;return <li key={line.id}><span><strong>{line.title||'Line'}</strong><small>{line.side==='w'?'White':'Black'} · {line.moves.length} moves · {!card||card.reps===0?'new':due?'due now':`next in ${timeLeft(card.due-now)}`}{card?.lapses?` · ${plural(card.lapses,'miss')}`:''}</small></span><button className="button small secondary" disabled={busy} onClick={()=>onStart([{kind:'line',id:line.id}])}>Drill</button></li>;})}
    {chapter.quizzes.map(quiz=><li key={quiz.id}><span><strong>{quiz.question}</strong><small>Quiz · {quizzes.includes(quiz.id)?'answered':'not answered yet'}</small></span><button className="button small secondary" disabled={busy} onClick={()=>onStart([{kind:'quiz',id:quiz.id}])}>Answer</button></li>)}</ul></article>)}
  <div className="courses-actions course-footer"><button className="button small secondary" disabled={busy} onClick={onExport}>Export PGN</button><button className="button small danger" disabled={busy} onClick={onDelete}>Delete course</button></div>
 </section>;
}

// Runs a queue of lines and quizzes, one at a time, then shows the session result.
function Practice({request,settings,course,session,onExit}){
 const [index,setIndex]=useState(0),[stats,setStats]=useState({done:0,perfect:0,missed:[]});
 const item=session.items[index];
 function next(result){setStats(s=>({done:s.done+1,perfect:s.perfect+(result==='pass'?1:0),missed:result==='miss'?[...s.missed,item]:s.missed}));setIndex(i=>i+1);}
 if(!item){const total=session.items.length,missed=stats.missed;
  return <section className="courses-page course-results" aria-label="Session results"><p className="eyebrow">SESSION DONE</p><h2>{stats.perfect===total?'Clean sweep.':missed.length===0?'All done.':stats.perfect?'Good work, a few to fix.':'Tough one. Again tomorrow.'}</h2>
   <div className="vision-metrics"><div><strong>{total}</strong><span>items</span></div><div><strong>{stats.perfect}</strong><span>perfect</span></div><div><strong>{missed.length}</strong><span>missed</span></div></div>
   <div className="courses-actions">{missed.length>0&&<button className="button primary" onClick={()=>{setStats({done:0,perfect:0,missed:[]});session.items=missed;setIndex(0);}}>Redo the {plural(missed.length,'miss')}</button>}<button className="button secondary" onClick={onExit}>Back to the course</button></div></section>;}
 const progress=`${index+1} of ${session.items.length}`;
 return item.kind==='quiz'
  ?<QuizCard key={`${index}-${item.id}`} request={request} settings={settings} course={course} quizId={item.id} progress={progress} onNext={next} onExit={onExit}/>
  :<DrillCard key={`${index}-${item.id}`} request={request} settings={settings} course={course} lineId={item.id} progress={progress} onNext={next} onExit={onExit}/>;
}

function DrillCard({request,settings,course,lineId,progress,onNext,onExit}){
 const [drill,setDrill]=useState(null),[promotion,setPromotion]=useState(null),[selected,setSelected]=useState(null),[feedback,setFeedback]=useState(null),[card,setCard]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const id=course.course.id;
 useEffect(()=>{let live=true;request(`/api/courses/${id}/drills/start`,{lineId}).then(d=>{if(live)setDrill(d.drill);}).catch(e=>live&&setError(e.message));return()=>{live=false;};},[lineId]);
 const board=useMemo(()=>boardFrom(drill?.fen),[drill?.fen]);
 async function play(uci){if(!drill||busy||drill.state!=='active')return;setBusy(true);setError('');setSelected(null);
  try{const r=await request(`/api/courses/${id}/drills/${drill.id}/move`,{move:uci,revision:drill.revision});setDrill(r.drill);
   setFeedback(r.correct?{good:true,text:r.reply?.length?'Right. The book answers.':'Right.'}:{good:false,text:r.expectedShown?'Not this one. Play the arrow move.':'Not the book move. Look at the highlighted piece.'});
   if(r.done)setCard(r.card);}
  catch(e){setError(e.message);}finally{setBusy(false);}}
 async function hint(){if(!drill||busy)return;setBusy(true);try{const r=await request(`/api/courses/${id}/drills/${drill.id}/hint`,{});setDrill(r.drill);}catch(e){setError(e.message);}finally{setBusy(false);}}
 // A pawn reaching the last rank asks which piece to promote to; the book may want a knight.
 function attempt(from,to){const moving=board.get(from);if(moving?.type==='p'&&(to[1]==='8'||to[1]==='1')){setSelected(null);setPromotion({from,to});return;}play(from+to);}
 function choose(square){if(!drill||drill.state!=='active'||busy)return;const piece=board.get(square);
  if(selected&&selected!==square&&board.moves({square:selected,verbose:true}).some(m=>m.to===square)){attempt(selected,square);return;}
  setSelected(piece&&piece.color===board.turn()?square:null);}
 const turnName=drill?(drill.toMove==='w'?'White':'Black'):'';
 // Notes for the learner's last move and the book's reply both stay on screen until the next move.
 const note=drill?[drill.notes[drill.ply-1],drill.notes[drill.ply]].filter(Boolean).join(' '):null;
 const marks=drill?(drill.marks[drill.ply]||drill.marks[drill.ply-1]||[]):[];
 const hintMarks=drill?.hint?[{from:drill.hint.from,to:drill.hint.from,color:'G'}]:[];
 const arrows=drill?.required?[drill.required]:drill?.hint?.move?[drill.hint.move]:[];
 const last=drill?.lastMove?[drill.lastMove.slice(0,2),drill.lastMove.slice(2,4)]:null;
 return <section className="vision-layout course-drill" aria-label="Drill"><div className="vision-board-column"><div className="vision-board-heading"><strong>{drill?.title||'Loading line…'}</strong><span>{progress}</span></div>
  <div className="vision-board-wrap"><Board chess={board} orientation={drill?.side||'w'} selected={selected} onSquare={choose} onMove={(from,to)=>attempt(from,to)} enabled={!!drill&&drill.state==='active'&&!busy&&!promotion} settings={{...settings,arrows:true}} arrows={arrows} marks={[...marks,...hintMarks]} lastMove={last} positionKey={drill?.fen} label="Drill board"/></div></div>
  <div className="vision-panel"><p className="eyebrow">DRILL · {course.course.title}</p><h2>{!drill?'…':drill.state==='done'?(drill.result==='pass'?'Perfect.':drill.result==='hinted'?'Done, with a hint.':'Done. It comes back soon.'):`Your move as ${turnName}`}</h2>
   {error&&<p className="form-error" role="alert">{error}</p>}
   {feedback&&drill?.state==='active'&&<p className={`vision-feedback ${feedback.good?'':'incorrect'}`} role="status">{feedback.text}</p>}
   {promotion&&<div className="course-promotion" role="group" aria-label="Promote to"><span>Promote to</span>{[['q','Queen'],['r','Rook'],['b','Bishop'],['n','Knight']].map(([k,name])=><button key={k} className="button small secondary" onClick={()=>{const {from,to}=promotion;setPromotion(null);play(from+to+k);}}>{name}</button>)}<button className="text-button" onClick={()=>setPromotion(null)}>Cancel</button></div>}
   {note&&<div className="vision-prompt course-note"><small>NOTE</small><p>{note}</p></div>}
   <div className="vision-metrics"><div><strong>{drill?`${drill.ply}/${drill.total}`:'–'}</strong><span>moves</span></div><div><strong>{drill?.misses??0}</strong><span>misses</span></div><div><strong>{drill?.hints??0}</strong><span>hints</span></div></div>
   {drill?.state==='done'&&card&&<div className="vision-result"><strong>{card.label}</strong><p>until this line comes back{card.lapses?` · ${plural(card.lapses,'miss')} so far`:''}</p></div>}
   <div className="courses-actions">{drill?.state==='active'?<><button className="button secondary" disabled={busy||drill.hint?.move} onClick={hint}>{drill.hint?'Show the move':'Hint'}</button><button className="text-button" onClick={onExit}>End session</button></>:<><button className="button primary" disabled={!drill} onClick={()=>onNext(drill.result)}>Next →</button><button className="text-button" onClick={onExit}>End session</button></>}</div>
  </div></section>;
}

function QuizCard({request,settings,course,quizId,progress,onNext,onExit}){
 const quiz=useMemo(()=>course.course.chapters.flatMap(c=>c.quizzes).find(q=>q.id===quizId),[course,quizId]);
 const position=useMemo(()=>quiz?.fen?boardFrom(quiz.fen):null,[quiz?.fen]);
 const [answer,setAnswer]=useState(null),[tries,setTries]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function choose(i){if(busy||answer?.correct)return;setBusy(true);setError('');try{const r=await request(`/api/courses/${course.course.id}/quizzes/${quizId}/answer`,{choice:i});setAnswer({...r,choice:i});setTries(t=>t+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!quiz)return <section className="courses-page"><p>This quiz is no longer in the course.</p><button className="button primary" onClick={()=>onNext('miss')}>Next →</button></section>;
 return <section className="courses-page course-quiz" aria-label="Quiz"><div className="vision-board-heading"><strong>Quiz · {course.course.title}</strong><span>{progress}</span></div>
  <h2>{quiz.question}</h2>{position&&<div className="course-quiz-board"><Board chess={position} orientation={position.turn()} enabled={false} onSquare={()=>{}} onMove={()=>{}} settings={settings} label="Quiz position"/></div>}{error&&<p className="form-error" role="alert">{error}</p>}
  <div className="course-choices">{quiz.choices.map((choice,i)=><button key={i} className={`endgame-card ${answer?.choice===i?(answer.correct?'chosen':'wrong'):''}`} disabled={busy||answer?.correct} aria-pressed={answer?.choice===i} onClick={()=>choose(i)}><span>{choice}</span></button>)}</div>
  {answer&&<div className={`vision-result ${answer.correct?'':'course-wrong'}`}><strong>{answer.correct?'Right.':'Not quite.'}</strong>{answer.correct?<p>{answer.why}</p>:<p>Try another answer.</p>}</div>}
  <div className="courses-actions">{answer?.correct&&<button className="button primary" onClick={()=>onNext(tries===1?'pass':'miss')}>Next →</button>}<button className="text-button" onClick={onExit}>End session</button></div></section>;
}
