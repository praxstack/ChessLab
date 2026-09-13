import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Board, {Piece} from './Board.jsx';
import BotSetup, {BotAvatar, Crowns, assistanceDefaults} from './BotSetup.jsx';
import {replay, parseMove, moveRows, emptyStudy, addBranch, scoreText, branchDepth, rootAnchor, studyLimitError, mergePolledGame, clockText, rematchOptions} from './chess-state.js';
import Settings, {settingDefaults} from './Settings.jsx';
import GameReview from './GameReview.jsx';
import PositionEditor from './PositionEditor.jsx';
import OpeningLibrary from './OpeningLibrary.jsx';
import PuzzleTraining from './PuzzleTraining.jsx';
import './styles.css';

const defaults = settingDefaults;
function loadSettings() { try {return {...defaults,...JSON.parse(localStorage.getItem('chesslab-settings') || '{}')};} catch {return defaults;} }
async function api(path, body, signal) {
  const response = await fetch(path, {method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}
function Icon({name,...props}) {
  const paths={play:'M6 3l12 9-12 9z',learn:'M3 4h7c2 0 2 2 2 2s0-2 2-2h7v15h-7c-2 0-2 2-2 2s0-2-2-2H3zM12 6v15',puzzle:'M8 3h8v5h3a3 3 0 010 6h-3v7H8v-5H5a3 3 0 010-6h3z',library:'M4 4h4v16H4zM11 4h4v16h-4zM18 4l4 15-3 1-4-15',settings:'M12 8a4 4 0 100 8 4 4 0 000-8M10 2h4l1 3 3 1 3 1-1 4v2l1 4-3 1-3 1-1 3h-4l-1-3-3-1-3-1 1-4v-2L3 7l3-1 3-1z',chevron:'M9 5l7 7-7 7',back:'M15 5l-7 7 7 7',first:'M5 4v16M19 5l-9 7 9 7',last:'M19 4v16M5 5l9 7-9 7',flip:'M4 7h15l-4-4M20 17H5l4 4M19 7l-4 4M5 17l4-4',upload:'M12 16V3M7 8l5-5 5 5M4 15v6h16v-6',download:'M12 3v13M7 11l5 5 5-5M4 18v3h16v-3',close:'M5 5l14 14M19 5L5 19',plus:'M12 4v16M4 12h16',check:'M4 12l5 5L20 6',branch:'M6 3v18M6 12h7a5 5 0 005-5V3M3 18l3 3 3-3',user:'M12 12a4 4 0 100-8 4 4 0 000 8M4 21v-2a8 8 0 0116 0v2',pause:'M8 4v16M16 4v16',flag:'M5 22V3M5 4c5-5 9 5 15 0v10c-6 5-10-5-15 0',arrow:'M4 12h16M14 6l6 6-6 6'};
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]||paths.play}/></svg>;
}
function Modal({title,onClose,children,wide=false}) {
  const ref=useRef();
  useEffect(()=>{const previous=document.activeElement;ref.current?.focus();const handle=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const items=ref.current?.querySelectorAll('button:not(:disabled),input,select,textarea,[tabindex="0"]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',handle);return()=>{document.removeEventListener('keydown',handle);previous?.focus();};},[]);
  return <div className="modal-scrim" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className={`modal ${wide?'modal-wide':''}`} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></header>{children}</section></div>;
}
function App() {
  const figurines={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘'};
  const notation=san=>settings.notation==='figurine'?san.replace(/[KQRBN]/g,piece=>figurines[piece]):san;
  const [user,setUser]=useState(null),[progress,setProgress]=useState({lessons:[],puzzles:[]}),[status,setStatus]=useState(null),[booting,setBooting]=useState(true);
  const [page,setPage]=useState('play'),[modal,setModal]=useState(null),[authMode,setAuthMode]=useState('register'),[settings,setSettings]=useState(loadSettings),[settingsTab,setSettingsTab]=useState('board');
  const [game,setGame]=useState(null),[games,setGames]=useState([]),[mode,setMode]=useState('play'),[ply,setPly]=useState(0),[study,setStudy]=useState(emptyStudy),[branchId,setBranchId]=useState(null),[dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false),[gameReport,setGameReport]=useState(undefined),[practiceTarget,setPracticeTarget]=useState(null),[positionDraft,setPositionDraft]=useState(null),[openingSelection,setOpeningSelection]=useState(null),[openingMatch,setOpeningMatch]=useState(null);
  const [selected,setSelected]=useState(null),[promotion,setPromotion]=useState(null),[typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [analysisScope,setAnalysisScope]=useState('review'),[analysis,setAnalysis]=useState(null),[analysisError,setAnalysisError]=useState(''),[analyzing,setAnalyzing]=useState(false),[analysisTick,setAnalysisTick]=useState(0),[showBefore,setShowBefore]=useState(false),[autoplay,setAutoplay]=useState(false);
  const pendingAction=useRef(null),accountSequence=useRef(0),gamesSequence=useRef(0);
  const [pgn,setPgn]=useState(''),[learn,setLearn]=useState({lessons:[],puzzles:[]}),[lesson,setLesson]=useState(null),[puzzle,setPuzzle]=useState(null),[puzzleMoves,setPuzzleMoves]=useState([]),[feedback,setFeedback]=useState(null),[puzzleComplete,setPuzzleComplete]=useState(false);
  const [catalog,setCatalog]=useState({bots:[],engines:[]}),[catalogError,setCatalogError]=useState(''),[catalogPending,setCatalogPending]=useState(true),[setup,setSetup]=useState({botId:'martin',engineId:'',rating:250,color:'w',timeControl:{initialSeconds:0,incrementSeconds:0},assistance:assistanceDefaults});
  const [help,setHelp]=useState(null),[helpError,setHelpError]=useState(''),[hint,setHint]=useState(null),[clockNow,setClockNow]=useState(Date.now);
  const exerciseSequence=useRef(0),userRef=useRef(user);
  const studyRef=useRef(study),studyBaselineRevision=useRef(0),savingRef=useRef(false),viewSequence=useRef(0),reviewingRef=useRef(false);
  const gameRef=useRef(null),busyRef=useRef(false),analysisSequence=useRef(0),analysisController=useRef(null),soundRef=useRef(null);
  const branch=study.branches.find(item=>item.id===branchId);
  const history=branch?.moves || game?.moves || [];
  const historyKey=history.join(' ');
  const visiblePly=showBefore && ply>0 ? ply-1 : ply;
  const chess=useMemo(()=>{
    if(page==='puzzles'&&puzzle)return replay(puzzleMoves,puzzle.fen);
    if(page==='learn'&&lesson)return replay([],lesson.fen);
    return replay(history.slice(0,visiblePly),game?.initialFen);
  },[page,puzzle,puzzleMoves,lesson,historyKey,visiblePly,game?.initialFen]);
  const rows=useMemo(()=>moveRows(history,game?.initialFen),[historyKey,game?.initialFen]);
  const last=chess.history({verbose:true}).at(-1);
  const selectedMove=rows[ply-1];
  const orientation=settings.orientation==='auto' ? (page==='puzzles'&&puzzle?puzzle.side:game?.color || 'w') : settings.orientation;
  const isLive=page==='play'&&game&&mode==='play'&&!branchId&&ply===game.moves.length&&!game.result&&game.source==='bot';
  const boardEnabled=!busy&&!saving&&!showBefore&&((page==='puzzles'&&puzzle&&!puzzleComplete&&chess.turn()===puzzle.side)||(page==='play'&&branchId&&ply===history.length)||(isLive&&chess.turn()===game.color));
  const engineTurn=isLive&&chess.turn()!==game.color;
  const cachedAnalysis=gameReport&&game&&!branchId&&analysisScope==='review'&&gameReport.gameId===game.id?gameReport.entries[ply-1]?.analysis:null;

  function startBusy(){if(busyRef.current||savingRef.current)return false;busyRef.current=true;setBusy(true);setError('');return true;}
  function endBusy(){busyRef.current=false;setBusy(false);}
  function sound(){if(!settings.sound)return;try{const Context=window.AudioContext||window.webkitAudioContext;const audio=soundRef.current ||= new Context();audio.resume();const tone=audio.createOscillator(),gain=audio.createGain();tone.type='sine';tone.frequency.value=last?.captured?240:420;gain.gain.setValueAtTime(.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);tone.connect(gain);gain.connect(audio.destination);tone.start();tone.stop(audio.currentTime+.1);}catch{}}
  function adopt(next,{restore=false}={}) {
    viewSequence.current++;setGameReport(undefined);gameRef.current=next;studyBaselineRevision.current=next.studyRevision??0;setGame(next);setStudy(next.study||emptyStudy());setDirty(false);setSelected(null);setAnalysis(null);setHelp(null);setHint(null);setHelpError('');setShowBefore(false);setAutoplay(false);
    const stored=restore&&next.study?.branches?.find(b=>b.id===next.study.selectedBranchId);
    setBranchId(stored?.id||null);setPly(stored?stored.moves.length:next.moves.length);setMode(stored||next.source==='import'||next.result?'review':'play');
    localStorage.setItem('chesslab-game',next.id);
  }
  function installUser(next){accountSequence.current++;if(userRef.current?.id!==next?.id)exerciseSequence.current++;userRef.current=next;setUser(next);}
  function requireAccount(action){if(userRef.current)return true;pendingAction.current={...action,sequence:exerciseSequence.current};setModal('auth');return false;}
  async function refreshGames(){const sequence=accountSequence.current,request=++gamesSequence.current;const data=await api('/api/games');if(sequence===accountSequence.current&&request===gamesSequence.current)setGames(data.games);}
  useEffect(()=>{
    let alive=true;const accountSeq=accountSequence.current;
    Promise.allSettled([api('/api/me'),api('/api/status'),api('/api/learn')]).then(async results=>{
      if(!alive)return;
      if(results[0].status==='fulfilled'){if(accountSeq===accountSequence.current){const data=results[0].value;installUser(data.user);const installedSequence=accountSequence.current;setProgress(data.progress||{lessons:[],puzzles:[]});if(data.user){refreshGames().catch(()=>{});const id=localStorage.getItem('chesslab-game');if(id)try{const saved=await api(`/api/games/${id}`);if(alive&&installedSequence===accountSequence.current)adopt(saved.game,{restore:true});}catch{}}}}else setError('Cannot reach the local server. Start it and refresh this page.');
      if(results[1].status==='fulfilled')setStatus(results[1].value);
      if(results[2].status==='fulfilled')setLearn(results[2].value);
      if(alive)setBooting(false);
    });return()=>{alive=false;};
  },[]);
  useEffect(()=>{
    let alive=true;
    api('/api/bots').then(data=>{if(!alive)return;setCatalog(data);setSetup(current=>({...current,engineId:current.engineId||data.engines.find(engine=>engine.available)?.id||''}));}).catch(()=>{if(alive)setCatalogError('Bot roster could not load. Refresh to retry.');}).finally(()=>{if(alive)setCatalogPending(false);});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{localStorage.setItem('chesslab-settings',JSON.stringify(settings));},[settings]);
  useEffect(()=>{studyRef.current=study;},[study]);
  useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  useEffect(()=>{reviewingRef.current=mode==='review'||!!branchId||page!=='play';},[mode,branchId,page]);
  useEffect(()=>{setSelected(null);setTyped('');setHint(null);},[chess.fen(),page]);
  useEffect(()=>{
    setOpeningMatch(null);if(page!=='play'||mode!=='review'||!game)return;
    const controller=new AbortController(),timer=setTimeout(()=>api('/api/openings/recognize',{gameId:game.id,moves:history.slice(0,visiblePly),initialFen:game.initialFen},controller.signal).then(data=>setOpeningMatch(data.opening)).catch(()=>{}),140);
    return()=>{clearTimeout(timer);controller.abort();};
  },[page,mode,game?.id,historyKey,visiblePly,game?.initialFen]);

  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    analysisController.current?.abort();const seq=++analysisSequence.current;setAnalysis(null);setAnalysisError('');setAnalyzing(false);
    if(page!=='play'||mode!=='review'||!game||(analysisScope==='analysis'&&settings.analysisEngine==='off'))return;
    if(analysisScope==='review'&&!branchId&&gameReport===undefined)return;
    if(cachedAnalysis){setAnalysis(cachedAnalysis);return;}
    const controller=new AbortController();analysisController.current=controller;setAnalyzing(true);
    const base=history.slice(0,Math.max(0,ply-1));
    const body={gameId:game.id,moves:ply?base:[],initialFen:game.initialFen,engineId:analysisScope==='review'?'stockfish19':settings.analysisEngine,movetime:Number(analysisScope==='review'?settings.reviewStrength:settings.movetime),lines:Number(settings.lines),threads:Number(settings.threads),...(ply?{playedMove:history[ply-1]}:{})};
    const timer=setTimeout(()=>api('/api/analyze',body,controller.signal).then(data=>{if(seq===analysisSequence.current&&!controller.signal.aborted)setAnalysis(data);}).catch(err=>{if(err.name!=='AbortError'&&seq===analysisSequence.current)setAnalysisError(err.message);}).finally(()=>{if(seq===analysisSequence.current)setAnalyzing(false);}),220);
    return()=>{clearTimeout(timer);controller.abort();};
  },[page,mode,game?.id,historyKey,ply,settings.movetime,settings.lines,settings.threads,settings.analysisEngine,settings.reviewStrength,analysisScope,analysisTick,cachedAnalysis,gameReport===undefined]);
  useEffect(()=>{if(!game?.timeControl?.initialSeconds||game.result)return;const timer=setInterval(()=>setClockNow(Date.now()),250);return()=>clearInterval(timer);},[game?.id,game?.result,game?.timeControl?.initialSeconds]);
  useEffect(()=>{
    if(!user||!game||game.source!=='bot'||game.result||!game.timeControl?.initialSeconds)return;
    let alive=true,inFlight=false;const id=game.id,accountId=user.id;
    const poll=async()=>{if(inFlight||busyRef.current||savingRef.current)return;inFlight=true;const viewSeq=viewSequence.current;
      try{const data=await api(`/api/games/${id}`);if(!alive||userRef.current?.id!==accountId||gameRef.current?.id!==id)return;const next=mergePolledGame(gameRef.current,data.game);gameRef.current=next;setGame(next);if(viewSequence.current===viewSeq&&!reviewingRef.current){setPly(next.moves.length);if(next.result)setMode('review');}}
      catch(err){if(alive)setError(`Clock refresh failed. ${err.message}`);}finally{inFlight=false;}};
    const timer=setInterval(poll,1000);return()=>{alive=false;clearInterval(timer);};
  },[user?.id,game?.id,game?.result,game?.timeControl?.initialSeconds]);
  useEffect(()=>{
    setHelp(null);setHelpError('');
    if(!isLive||busy||engineTurn||!game.assistance||!['evaluation','threats','suggestions','feedback','engine'].some(key=>game.assistance[key]))return;
    let alive=true;const id=game.id,revision=game.revision,viewSeq=viewSequence.current;
    api(`/api/games/${id}/assist`,{revision}).then(data=>{if(!alive||gameRef.current?.id!==id||gameRef.current.revision!==revision)return;if(data.game){const next=mergePolledGame(gameRef.current,data.game);gameRef.current=next;setGame(next);if(next.result){if(viewSequence.current===viewSeq&&!reviewingRef.current)setMode('review');return;}}setHelp({...data,revision});}).catch(err=>{if(alive)setHelpError(err.message);});
    return()=>{alive=false;};
  },[game?.id,game?.revision,isLive,busy,engineTurn]);
  useEffect(()=>{if(!game?.result||!user)return;let alive=true;const accountId=user.id;api('/api/me').then(data=>{if(alive&&userRef.current?.id===accountId)setProgress(data.progress||{lessons:[],puzzles:[]});}).catch(()=>{});return()=>{alive=false;};},[game?.id,game?.result,user?.id]);
  useEffect(()=>{if(!autoplay)return;const timer=setInterval(()=>setPly(current=>{if(current>=history.length){setAutoplay(false);return current;}return current+1;}),Number(settings.pace));return()=>clearInterval(timer);},[autoplay,history.length,settings.pace]);
  useEffect(()=>{const key=e=>{if(page!=='play'||modal||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();jump(ply-1);}if(e.key==='ArrowRight'){e.preventDefault();jump(ply+1);}if(e.key==='Home'){e.preventDefault();jump(0);}if(e.key==='End'){e.preventDefault();jump(history.length);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[page,modal,ply,history.length]);

  async function persistStudy(){
    if(!game||!dirty)return true;
    if(savingRef.current||busyRef.current)return false;
    const id=game.id,submitted=study;savingRef.current=true;setSaving(true);
    try{const data=await api(`/api/games/${id}/study`,{study:{...study,selectedBranchId:branchId},studyRevision:studyBaselineRevision.current});if(gameRef.current?.id===id){if(data.game){studyBaselineRevision.current=data.game.studyRevision;gameRef.current={...gameRef.current,study:data.game.study,studyRevision:data.game.studyRevision};setGame(gameRef.current);}setDirty(studyRef.current!==submitted);setNotice('Study saved.');}return studyRef.current===submitted;}catch(err){setError(`Study was not saved. Your draft is still here. ${err.message}`);return false;}finally{savingRef.current=false;setSaving(false);}
  }
  async function openGame(id){if(busyRef.current)return;if(!await persistStudy())return;if(!startBusy())return;try{const data=await api(`/api/games/${id}`);adopt(data.game,{restore:true});setPage('play');setModal(null);}catch(err){setError(err.message);}finally{endBusy();}}
  async function botReply(current){
    if(current.result||current.source!=='bot'||replay(current.moves,current.initialFen).turn()===current.color)return current;
    const viewSeq=viewSequence.current;
    const data=await api(`/api/games/${current.id}/bot`,{revision:current.revision});
    if(gameRef.current?.id===current.id){gameRef.current=data.game;setGame(data.game);if(viewSequence.current===viewSeq&&!reviewingRef.current){setPly(data.game.moves.length);if(data.game.result)setMode('review');}sound();}
    return data.game;
  }
  async function startGame(){
    if(!requireAccount({type:'start',options:structuredClone(setup)}))return;
    await createGame();
  }
  async function createGame(options=setup){
    if(!await persistStudy())return;if(!startBusy())return;
    try{const data=await api('/api/games',options);adopt(data.game);setPage('play');setModal(null);await botReply(data.game);await refreshGames();}catch(err){setError(err.message);}finally{endBusy();}
  }
  async function choosePractice(){
    if(busyRef.current||savingRef.current||chess.isGameOver())return;
    if(!await persistStudy())return;
    setPracticeTarget({id:game.id,branchId,ply:visiblePly,fen:chess.fen(),title:game.title});setSetup(current=>({...current,color:chess.turn()}));setModal('practice');
  }
  async function createPractice(restart=false){
    if(!await persistStudy())return;if(!startBusy())return;
    const source=gameRef.current,target=restart?{id:source.id,restart:true}:practiceTarget;
    try{
      if(!target||target.id!==source.id)throw new Error('The source position changed. Choose it again.');
      const options=restart?rematchOptions(source,setup):setup;
      const data=await api(`/api/games/${source.id}/practice`,{...options,revision:source.revision,studyRevision:source.studyRevision||0,...(restart?{restart:true}:{branchId:target.branchId,ply:target.ply})});
      adopt(data.game);setPage('play');setModal(null);setPracticeTarget(null);await botReply(data.game);await refreshGames();
    }catch(err){setError(err.message);}finally{endBusy();}
  }
  async function returnToSource(){
    if(!game?.practice||!await persistStudy())return;if(!startBusy())return;
    const origin=game.practice,originalPrefix=game.moves.slice(0,origin.startPly);
    try{
      const data=await api(`/api/games/${origin.sourceGameId}`),next=data.game;
      const branch=next.study?.branches?.find(item=>item.id===origin.sourceBranchId),sourceHistory=branch?.moves||next.moves;
      const changed=(!!origin.sourceBranchId&&!branch)||sourceHistory.slice(0,origin.sourcePly).join(' ')!==originalPrefix.join(' ');
      adopt(next);setBranchId(branch?.id||null);setPly(Math.min(origin.sourcePly,sourceHistory.length));setMode('review');setAnalysisScope('review');setPage('play');
      if(branch)setStudy({...next.study,selectedBranchId:branch.id,anchorPly:rootAnchor(branch,next.study.branches)});
      if(changed)setNotice('The source study has changed. Your separate practice history is still saved.');
    }catch(err){setError(`The source study could not open. Your practice is preserved. ${err.message}`);}finally{endBusy();}
  }
  async function rematch(){if(game.practice)await createPractice(true);else await createGame(rematchOptions(game,setup));}
  async function useHelp(action){
    if(!await persistStudy())return;if(!startBusy())return;const current=gameRef.current,viewSeq=viewSequence.current;
    try{const data=await api(`/api/games/${current.id}/${action}`,{revision:current.revision});if(gameRef.current?.id!==current.id||data.game.revision<gameRef.current.revision)return;const next=mergePolledGame(gameRef.current,data.game);gameRef.current=next;setGame(next);if(next.result){setHint(null);if(viewSequence.current===viewSeq&&!reviewingRef.current){setPly(next.moves.length);setMode('review');}}else if(action==='undo'){setHelp(null);setHint(null);if(viewSequence.current===viewSeq&&!reviewingRef.current)setPly(next.moves.length);}else if(data.move)setHint({...data,revision:next.revision});}catch(err){setError(err.message);try{const fresh=await api(`/api/games/${current.id}`);if(gameRef.current?.id===current.id){const next=mergePolledGame(gameRef.current,fresh.game);gameRef.current=next;setGame(next);if(viewSequence.current===viewSeq&&!reviewingRef.current&&next.result)setMode('review');}}catch{}}finally{endBusy();}
  }
  async function authenticate(e){
    e.preventDefault();if(!startBusy())return;
    const form=new FormData(e.currentTarget);
    let action;
    try{const data=await api(`/api/${authMode}`,{username:form.get('username'),password:form.get('password')});const pending=pendingAction.current;pendingAction.current=null;if(pending?.sequence===exerciseSequence.current)action=pending;installUser(data.user);setProgress(data.progress||{lessons:[],puzzles:[]});setModal(null);refreshGames().catch(()=>{});}catch(err){setError(err.message);}finally{endBusy();}
    if(action?.type==='start')await createGame(action.options);
    else if(action?.type==='puzzle')await submitPuzzle(action);
    else if(action?.type==='lesson')await submitLesson(action);
    else if(action?.type==='import')await performImport(action.pgn);
    else if(action?.type==='position')await performPosition(action.payload);
    else if(action?.type==='opening')await performOpening(action);
  }
  async function logout(){if(!await persistStudy())return;if(!startBusy())return;try{await api('/api/logout',{});installUser(null);pendingAction.current=null;setGame(null);gameRef.current=null;setStudy(emptyStudy());setBranchId(null);setGames([]);setProgress({lessons:[],puzzles:[]});setPly(0);setMode('play');setModal(null);localStorage.removeItem('chesslab-game');setPage('play');}catch(err){setError(err.message);}finally{endBusy();}}
  async function submitMove(value){
    if(!boardEnabled)return;
    let move;try{move=parseMove(chess,value);}catch{setError('That move is not legal here. Try SAN (Nf3) or coordinates (g1f3).');return;}
    setSelected(null);setTyped('');setError('');
    if(page==='puzzles'){
      const action={type:'puzzle',id:puzzle.id,moves:[...puzzleMoves,move]};
      if(requireAccount(action))await submitPuzzle(action);return;
    }
    if(branchId){
      const next={...study,branches:study.branches.map(item=>item.id===branchId?{...item,moves:[...item.moves,move]}:item)};
      const limitError=studyLimitError(next.branches);if(limitError){setError(limitError);return;}
      setStudy(next);setDirty(true);setPly(history.length+1);sound();return;
    }
    if(!startBusy())return;const id=game.id,viewSeq=viewSequence.current;
    try{const data=await api(`/api/games/${id}/move`,{move,revision:game.revision});if(gameRef.current?.id!==id)return;gameRef.current=data.game;setGame(data.game);if(viewSequence.current===viewSeq&&!reviewingRef.current)setPly(data.game.moves.length);sound();if(data.game.result){if(viewSequence.current===viewSeq&&!reviewingRef.current)setMode('review');}else await botReply(data.game);refreshGames().catch(()=>{});}catch(err){setError(err.message);try{const fresh=await api(`/api/games/${id}`);if(gameRef.current?.id===id){gameRef.current=fresh.game;setGame(fresh.game);if(viewSequence.current===viewSeq&&!reviewingRef.current){setPly(fresh.game.moves.length);if(fresh.game.result)setMode('review');}}}catch{}}finally{endBusy();}
  }
  async function submitPuzzle({id,moves}){
    if(!startBusy())return;const sequence=exerciseSequence.current,accountId=userRef.current.id;
    try{const data=await api(`/api/puzzles/${id}/answer`,{moves});if(userRef.current?.id===accountId){if(data.progress)setProgress(data.progress);if(sequence===exerciseSequence.current){setFeedback(data);if(data.correct){setPuzzleMoves([...moves,...(data.reply?[data.reply]:[])]);setPuzzleComplete(data.complete);sound();}}}}
    catch(err){if(sequence===exerciseSequence.current&&userRef.current?.id===accountId)setError(err.message);}finally{endBusy();}
  }
  function boardMove(from,to){
    if(!boardEnabled||from===to)return;
    const choices=chess.moves({square:from,verbose:true}).filter(move=>move.to===to);
    if(!choices.length){setSelected(null);setError(`${from}–${to} is not legal in this position.`);return;}
    if(choices.some(move=>move.promotion)){setPromotion({from,to});return;}
    submitMove(from+to);
  }
  function onSquare(square){if(!boardEnabled)return;const piece=chess.get(square);if(selected===square){setSelected(null);return;}if(selected&&piece?.color!==chess.turn()){boardMove(selected,square);return;}if(piece?.color===chess.turn())setSelected(square);else setSelected(null);}
  function jump(next){viewSequence.current++;setMode('review');setShowBefore(false);setAutoplay(false);setPly(Math.max(0,Math.min(history.length,next)));}
  function explore(line){
    const basePly=line?Math.max(0,ply-1):visiblePly;
    const next=addBranch(study,history,basePly,branchId);
    if(line)next.branches.at(-1).moves.push(...line.moves);
    const limitError=studyLimitError(next.branches);if(limitError){setError(limitError);return;}
    viewSequence.current++;setStudy(next);setBranchId(next.selectedBranchId);setPly(basePly);setShowBefore(false);setMode('review');setDirty(true);setSelected(null);setAutoplay(!!line&&settings.autoplay);setNotice(line?'Candidate saved as a variation. Use the arrows to step through it.':'Variation started. Play either side; your game stays intact.');
  }
  function selectBranch(item){viewSequence.current++;setBranchId(item.id);setStudy(current=>({...current,selectedBranchId:item.id,anchorPly:rootAnchor(item,current.branches)}));setPly(item.moves.length);setMode('review');setShowBefore(false);setAutoplay(false);setDirty(true);}
  function returnToGame(){viewSequence.current++;setBranchId(null);setPly(Math.min(study.anchorPly,game.moves.length));setStudy(current=>({...current,selectedBranchId:null}));setDirty(true);setShowBefore(false);setMode('review');setAutoplay(false);}
  function resumeGame(){viewSequence.current++;setBranchId(null);setPly(game.moves.length);setShowBefore(false);setMode('play');setAutoplay(false);}
  async function retryBot(){if(!startBusy())return;try{await botReply(game);}catch(err){setError(err.message);}finally{endBusy();}}
  async function resign(){if(!await persistStudy())return;if(!startBusy())return;try{const data=await api(`/api/games/${game.id}/resign`,{revision:game.revision});adopt(data.game);setModal(null);refreshGames().catch(()=>{});}catch(err){setError(err.message);}finally{endBusy();}}
  async function openTrainingStudy(id){if(!await persistStudy())return;const data=await api(`/api/training/${id}/study`,{});adopt(data.game);setPage('play');setMode('review');setPly(data.game.moves.length);await refreshGames();}
  async function openOpening(id,selectedPly,practice){const action={type:'opening',id,selectedPly,practice};if(requireAccount(action))await performOpening(action);}
  async function performOpening({id,selectedPly,practice}){
    if(!await persistStudy())return;if(!startBusy())return;
    try{const data=await api(`/api/openings/${id}/study`,{}),next=data.game;adopt(next);setOpeningSelection(id);setPage('play');setMode('review');setPly(selectedPly);setModal(null);
      if(practice){const position=replay(next.moves.slice(0,selectedPly),next.initialFen);setPracticeTarget({id:next.id,branchId:null,ply:selectedPly,fen:position.fen(),title:next.title});setSetup(current=>({...current,color:position.turn()}));setModal('practice');}
      await refreshGames();
    }catch(err){setError(err.message);}finally{endBusy();}
  }
  async function openPositionEditor(){if(!await persistStudy())return;setPositionDraft({fen:page==='play'?chess.fen():null,title:'Custom position'});setError('');setModal('position');}
  async function savePosition(payload){setPositionDraft(payload);if(requireAccount({type:'position',payload}))await performPosition(payload);}
  async function performPosition(payload){if(!await persistStudy())return;if(!startBusy())return;try{const data=await api('/api/positions',payload);adopt(data.game);setMode('review');setPage('play');setModal(null);await refreshGames();setNotice('Position saved. Explore a variation or practice against a bot.');}catch(err){setError(err.message);setModal('position');}finally{endBusy();}}
  async function importPgn(e){e.preventDefault();if(requireAccount({type:'import',pgn}))await performImport(pgn);}
  async function performImport(pgn){if(!await persistStudy())return;if(!startBusy())return;try{const data=await api('/api/import',{pgn});adopt(data.game);setMode('review');setPly(0);setPage('play');setModal(null);setPgn('');await refreshGames();setNotice('PGN imported. Select a move to begin review.');}catch(err){setError(err.message);}finally{endBusy();}}
  async function exportPgn(){try{const response=await fetch(`/api/games/${game.id}/pgn`);if(!response.ok)throw new Error('Could not export this game.');const text=await response.text();const url=URL.createObjectURL(new Blob([text],{type:'application/x-chess-pgn'}));const link=document.createElement('a');link.href=url;link.download=`chesslab-${game.id.slice(0,8)}.pgn`;link.click();URL.revokeObjectURL(url);}catch(err){setError(err.message);}}
  async function answerLesson(choice){
    const action={type:'lesson',id:lesson.id,choice};if(requireAccount(action))await submitLesson(action);
  }
  async function submitLesson({id,choice}){
    if(!startBusy())return;const sequence=exerciseSequence.current,accountId=userRef.current.id;
    try{const data=await api(`/api/lessons/${id}/answer`,{choice});if(userRef.current?.id===accountId){if(data.progress)setProgress(data.progress);if(sequence===exerciseSequence.current)setFeedback(data);}}
    catch(err){if(sequence===exerciseSequence.current&&userRef.current?.id===accountId)setError(err.message);}finally{endBusy();}
  }
  function selectLesson(item){exerciseSequence.current++;setLesson(item);setFeedback(null);}
  function selectPuzzle(item){exerciseSequence.current++;setPuzzle(item);setPuzzleMoves([]);setPuzzleComplete(false);setFeedback(null);}
  function changePage(next){exerciseSequence.current++;viewSequence.current++;setPage(next);setSelected(null);setFeedback(null);setAutoplay(false);setShowBefore(false);if(next==='library'&&user)refreshGames().catch(err=>setError(err.message));}
  function setPreference(key,value){setSettings(current=>({...current,[key]:key==='coordinates'?(value===true||value==='true'):value}));}
  const lastSquares=last?[last.from,last.to]:null;
  const candidates=analysis?.lines||[];
  const liveAssistance=isLive&&help?.revision===game?.revision?help:null;
  const displayedScore=mode==='play'?(game?.assistance?.evaluation?liveAssistance?.analysis?.lines?.[0]?.score:null):ply>0&&!showBefore?analysis?.played?.afterScore:analysis?.lines[0]?.score;
  const arrowMoves=mode==='play'&&isLive?[...(hint?.revision===game.revision?[hint.move]:[]),...(game.assistance?.suggestions?(liveAssistance?.analysis?.lines?.slice(0,1).map(line=>line.move)||[]):[]),...(game.assistance?.threats?(liveAssistance?.threats?.map(move=>move.from+move.to)||[]):[])]:page==='play'&&analysis&&(showBefore||ply===0)?candidates.map(line=>line.move):[];
  const liveLabel=game?.result ? (game.result==='1/2-1/2'?'Draw':game.source==='import'?(game.result==='1-0'?'White won':'Black won'):game.result===(game.color==='w'?'1-0':'0-1')?'You won':'Game finished') : chess.isCheck()?'King in check':busy?'Waiting for a reply…':engineTurn?`${game?.botName||'Engine'} to move`:`${chess.turn()==='w'?'White':'Black'} to move`;
  const pageTitle=page==='training'?'Puzzles':page==='openings'?'Openings':page==='learn'?'Learn the essentials':page==='puzzles'?'Find the next move':page==='library'?'Your games & studies':mode==='review'?'Game review':'Play bots';
  const note=branch?.question||'';
  const selectedBot=catalog.bots.find(bot=>bot.id===(game?game.botId:setup.botId));
  const selectedEngine=catalog.engines.find(engine=>engine.id===(game?game.engineId:setup.engineId));
  const setupProps={bots:catalog.bots,engines:catalog.engines,pending:catalogPending,progress,...setup,onChange:patch=>setSetup(current=>({...current,...patch})),onStart:startGame,disabled:busy||booting,busy};

  return <div className="app-shell" data-page={page} data-board-theme={settings.boardTheme}>
    <aside className="navigation"><a className="brand" href="#" aria-label="ChessLab home" onClick={e=>{e.preventDefault();changePage('play');}}><span className="brand-mark"><Piece type="n" color="w"/></span><span>Chess<span className="brand-light">Lab</span></span></a>
      <p className="nav-section">Play & practice</p><nav aria-label="Main navigation">{[['play','Play bots','play'],['training','Puzzles','puzzle'],['learn','Learn','learn'],['openings','Openings','openings'],['library','My games','library']].map(([id,label,icon])=><button key={id} aria-label={label} className={`nav-item ${page===id||(id==='training'&&page==='puzzles')?'active':''}`} onClick={()=>changePage(id)}><img className="nav-asset" src={`/icons/${{play:'play-white',puzzle:'puzzle-piece',learn:'lessons',openings:'binoculars',library:'training'}[icon]}.svg`} alt=""/><span>{label}</span>{id==='play'&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="rail-bottom"><div className="local-workspace"><span className="status-dot"/><span>On this Mac<small>Your games stay here</small></span></div><div className="archive-links"><a href="/research/" target="_blank" rel="noreferrer">Research</a><a href="/design/" target="_blank" rel="noreferrer">Design archive</a></div><button className="nav-item" aria-label="Settings" onClick={()=>setModal('settings')}><Icon name="settings"/><span>Settings</span></button><button className="account-button" aria-label={user?`Account: ${user.username}`:'Sign in'} onClick={()=>{pendingAction.current=null;setModal(user?'account':'auth');}}><span className="small-avatar">{user?.username?.slice(0,1).toUpperCase()||<Icon name="user"/>}</span><span>{user?.username||'Sign in'}<small>{user?'Local account':'Save your progress'}</small></span></button></div>
    </aside>
    <main className="main"><header className="page-header"><div><p className="eyebrow">{page==='play'?'YOUR DAILY CHESS':page==='library'?'YOUR COLLECTION':'PRACTICE'}</p><h1>{pageTitle}</h1></div><div className="header-actions"><button className="icon-button mobile-account" aria-label={user?'Your account':'Sign in'} onClick={()=>{pendingAction.current=null;setModal(user?'account':'auth');}}><Icon name="user"/></button><span className={`engine-status ${status?.engine?.available?'ready':''}`}><span className="status-dot"/>{status?.engine?.available?'Coach online':status?'Engine unavailable':'Connecting'}</span><button className="icon-button" title="Settings" aria-label="Open settings" onClick={()=>setModal('settings')}><Icon name="settings"/></button></div></header>
      {error&&<div className="feedback error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={()=>setError('')}><Icon name="close"/></button></div>}
      {notice&&<div className="toast" role="status"><Icon name="check"/>{notice}</div>}
      {page==='training'?<PuzzleTraining request={api} user={user} settings={settings} onSignIn={()=>requireAccount({type:'training'})} onStarter={()=>changePage('puzzles')} onStudy={openTrainingStudy}/>:page==='openings'?<OpeningLibrary request={api} settings={settings} initialId={openingSelection} onOpen={openOpening} busy={busy}/>:page==='library'?<section className="library-page"><div className="collection-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Your chess, move by move.</h2></div><button className="button primary" onClick={()=>setModal('new')}><Icon name="plus"/>New game</button></div>{!user?<div className="empty-state"><Icon name="library"/><h3>A place for your games.</h3><p>Sign in to save games, variations and your learning progress on this server.</p><button className="button primary" onClick={()=>{pendingAction.current=null;setModal('auth');}}>Create an account</button></div>:games.length===0?<div className="empty-state"><h3>Your first game is waiting.</h3><p>Start with a coach game or import a PGN to look closer.</p><button className="button secondary" onClick={()=>setModal('import')}>Import PGN</button></div>:<div className="games-grid">{games.map(item=><button className="game-card" key={item.id} onClick={()=>openGame(item.id)} disabled={busy}><span className="game-card-icon"><Piece type={item.source==='import'?'b':'n'} color={item.color}/></span><span className="game-card-copy"><small>{item.practice?'POSITION PRACTICE':item.opening?`OPENING · ${item.opening.eco}`:item.positionSetup?'CUSTOM POSITION':item.source==='import'?'IMPORTED GAME':`${item.botName||item.engineId||'COACH'} · ${item.rating||`LEVEL ${item.level}`}`}</small><strong>{item.title}</strong><span>{Math.ceil((item.moves.length-(item.practice?.startPly||0))/2)} {item.practice?'practice moves':'moves'} · {item.result||'In progress'}{item.study?.branches?.length?` · ${item.study.branches.length} variations`:''}</span><time>{new Date(item.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></span><Icon name="chevron"/></button>)}</div>}<button className="text-button" onClick={()=>setModal('import')}><Icon name="upload"/>Import a PGN</button><button className="text-button" disabled={busy||saving} onClick={openPositionEditor}>Set up position</button></section>:
      <div className="workspace"><section className="board-column">
        <div className="player-row"><span className="player-avatar coach-avatar">{page==='play'?<BotAvatar bot={selectedBot}/>:<Piece type={page==='learn'?'b':'q'} color="b"/>}</span><div className="player-copy"><strong>{page==='learn'?'Learn by looking':page==='puzzles'?'Calculation practice':game?.source==='import'?(game.headers?.[orientation==='w'?'Black':'White']||'Imported game'):game?.botName||selectedBot?.name||selectedEngine?.name||'Choose your opponent'}</strong><span>{page==='play'?(game?.positionSetup?'Custom position':game?.source==='import'?'Imported game':`${game?.currentRating||game?.rating||setup.rating} · ${game?.adaptive?'Adaptive opponent':'Computer opponent'}`):page==='learn'?'Original introductory lessons':puzzle?.theme||'Original introductory puzzles'}</span></div>{page==='play'&&game?.source==='bot'?<span className={`game-clock ${engineTurn?'active':''}`} aria-label="Opponent clock">{clockText(game,game.color==='w'?'b':'w',clockNow)}</span>:<span className="player-tag">{page==='play'?(game?.positionSetup?'FEN':game?.source==='import'?'PGN':'BOT'):page==='learn'?'LEARN':'SOLVE'}</span>}<button className="icon-button board-settings" aria-label="Board settings" onClick={()=>setModal('settings')}><Icon name="settings"/></button></div>
        <div className="board-wrap"><div className={`evaluation-rail ${page==='play'&&mode==='play'&&!game?.assistance?.evaluation?'evaluation-hidden':''}`} title="Evaluation from White’s perspective"><div className="evaluation-white" style={{height:chess.isCheckmate()?(chess.turn()==='w'?'5%':'95%'):displayedScore?`${Math.max(5,Math.min(95,50+(displayedScore.type==='mate'?Math.sign(displayedScore.value)*45:displayedScore.value/20)))}%`:'50%'}}/><span>{chess.isCheckmate()?'#':scoreText(displayedScore)}</span></div><Board chess={chess} orientation={orientation} selected={selected} onSquare={onSquare} onMove={boardMove} enabled={boardEnabled} settings={settings} arrows={arrowMoves} lastMove={lastSquares} classification={settings.classification&&mode==='review'&&!showBefore?analysis?.played?.classification:null} label={`${page==='puzzles'?'Puzzle':'Game'} board. ${chess.turn()==='w'?'White':'Black'} to move`}/></div>
        <div className="player-row own-player"><span className="player-avatar own-avatar">{user?.username?.slice(0,1).toUpperCase()||<Icon name="user"/>}</span><div className="player-copy"><strong>{page==='play'&&game?.source==='import'?(game.headers?.[orientation==='w'?'White':'Black']||'Imported player'):user?.username||'You'}<span className="color-label">{orientation==='w'?'White side':'Black side'}</span></strong><span>{page==='play'?(branchId?'Exploring a variation':showBefore?'Position before the selected move':game?liveLabel:'Ready when you are'):page==='learn'?'Read the position, then choose an answer':puzzleComplete?'Puzzle complete':puzzle?`${puzzle.side==='w'?'White':'Black'} to move`:'Choose a puzzle to begin'}</span></div>{page==='play'&&game?.source==='bot'&&<span className={`game-clock ${isLive&&!engineTurn?'active':''}`} aria-label="Your clock">{clockText(game,game.color,clockNow)}</span>}<button className="icon-button" title="Flip board" aria-label="Flip board" onClick={()=>setPreference('orientation',orientation==='w'?'b':'w')}><Icon name="flip"/></button></div>
        <div className="board-bottom"><form className="move-entry" onSubmit={e=>{e.preventDefault();submitMove(typed);}}><label className="sr-only" htmlFor="move-entry">Enter a move in SAN or UCI</label><span className="move-prompt">›</span><input id="move-entry" autoComplete="off" value={typed} onChange={e=>setTyped(e.target.value)} placeholder={boardEnabled?'Enter a move, e.g. e4 or Nf3':'Select a playable position to enter a move'} disabled={!boardEnabled}/><button aria-label="Play entered move" disabled={!boardEnabled||!typed.trim()}><Icon name="arrow"/></button></form><span className="keyboard-hint">{boardEnabled?'Click, drag, or type a move':'← → to review moves'}</span></div>
        {page==='play'&&game&&<div className="board-actions"><button className="text-button" onClick={()=>setModal('new')}><Icon name="plus"/>New game</button>{game.source==='bot'&&<button className="text-button" disabled={busy} onClick={rematch}>{game.practice?'Restart position':'Rematch'}</button>}<button className="text-button" onClick={()=>setModal('import')}><Icon name="upload"/>Import</button><button className="text-button" disabled={busy||saving} onClick={openPositionEditor}>Set up position</button><button className="text-button" onClick={exportPgn}><Icon name="download"/>Export PGN</button>{game.source==='bot'&&!game.result&&<button className="text-button resign" disabled={busy} onClick={()=>setModal('resign')}><Icon name="flag"/>Resign</button>}</div>}
      </section>
      <section className="coach-panel">
        {page==='play'?<><div className="panel-tabs"><button className={mode==='play'?'active':''} onClick={()=>game?resumeGame():setMode('play')}>Play bots</button><button className={mode==='review'&&analysisScope==='review'?'active':''} disabled={!game} onClick={()=>{setMode('review');setAnalysisScope('review');setShowBefore(false);}}>Review</button><button className={mode==='review'&&analysisScope==='analysis'?'active':''} disabled={!game} onClick={()=>{setMode('review');setAnalysisScope('analysis');setShowBefore(false);}}>Analysis</button></div>
          {!game?<div className="welcome-panel bot-welcome">{catalogError&&<p className="form-error" role="alert">{catalogError}</p>}<BotSetup {...setupProps}/><button className="import-invitation" onClick={()=>setModal('import')}><Icon name="upload"/><span><strong>Review a completed game</strong><small>Import PGN and explore alternatives.</small></span><Icon name="chevron"/></button><button className="button secondary full-width" onClick={openPositionEditor}>Set up position</button></div>:
          <>{mode==='review'&&openingMatch&&<div className="opening-recognition"><span className="eco-code">{openingMatch.eco}</span><div><strong>{openingMatch.name}</strong><small>{openingMatch.matchType==='line'?'Played line':'Position match'} · at half-move {openingMatch.ply}</small></div><button className="text-button" onClick={async()=>{if(!await persistStudy())return;setOpeningSelection(openingMatch.id);setPage('openings');}}>Explore opening<Icon name="arrow"/></button></div>}{game.practice&&<div className="practice-origin"><div><span>POSITION PRACTICE</span><strong>{game.practice.sourceTitle}</strong><small>From {game.practice.sourceBranchId?'a saved variation':'the original game'} · {game.practice.startPly} prior plies</small></div><button className="text-button" disabled={busy||saving} onClick={returnToSource}>Return to source study<Icon name="arrow"/></button></div>}{mode==='review'&&analysisScope==='review'&&<GameReview key={game.id} game={game} settings={settings} selectedPly={branchId?-1:ply} onSelect={value=>{setBranchId(null);setAnalysisScope('review');jump(value);}} onReport={setGameReport} request={api}/>}<div className={`coach-message ${analyzing?'is-loading':''}`}><div className="coach-message-heading">{settings.coachAvatar&&<span className="mini-knight"><Piece type="n" color="w"/></span>}<strong>{branchId?'Variation lab':mode==='play'?'At your side':selectedMove?`${selectedMove.number}${selectedMove.color==='b'?'…':'.'} ${selectedMove.san}`:'Starting position'}</strong>{settings.classification&&analysis?.played&&<span className={`classification ${analysis.played.classification}`}>{analysis.played.classification}</span>}</div>
            {mode==='play'?<><h2>{game.result?liveLabel:busy?`${game.botName||'Engine'} is thinking`:engineTurn?`${game.botName||'Engine'}’s turn`:chess.isCheck()?'Your king needs attention.':'What’s your next move?'}</h2><p>{game.result?'Every game leaves something to learn. Select a move below to review it.':busy?'The position is being evaluated. Your move is saved.':engineTurn?'Continue the game when you are ready.':'Look for checks, captures and threats. When you are curious about a move, open its review.'}</p>{engineTurn&&!busy&&<button className="button primary" onClick={retryBot}>Continue bot turn<Icon name="arrow"/></button>}{!busy&&<button className="button secondary" onClick={()=>setMode('review')}>Review this position<Icon name="chevron"/></button>}</>:
            analyzing?<div className="analysis-loading" role="status"><span className="thinking-dots"><i/><i/><i/></span><h3>Looking at this position…</h3><p>The explanation will match your selected move.</p></div>:analysisError?<div><h3>Analysis paused.</h3><p>{analysisError}</p><button className="button secondary" onClick={()=>setAnalysisTick(t=>t+1)}>Try analysis again</button></div>:analysis?<><p className="coach-explanation">{analysis.played?.explanation||analysis.explanation}</p><div className="evidence-facts"><span>{scoreText(displayedScore)} <small>White’s score</small></span><span>{analysis.facts.legalMoves} <small>legal moves {ply?'before':''}</small></span><span>{analysis.facts.material.white} : {analysis.facts.material.black}<small>material {ply?'before':''}</small></span></div><p className="engine-receipt">{analysis.engine} · {analysis.limits.movetime} ms · depth {analysis.lines[0]?.depth||'—'}<br/>Engine estimate; a shown line is not a guaranteed outcome.</p></>:<p>{analysisScope==='analysis'&&settings.analysisEngine==='off'?'Engine is off. Change it in Settings to analyze.':'Select a move to inspect it.'}</p>}
          </div>
          {(mode==='play'||game.result)&&game.source==='bot'&&<div className="live-controls">{game.result?<div className="game-result"><strong>{liveLabel} · {game.resultReason||game.result}</strong><Crowns count={game.crownsAwarded||0}/><button className="button primary" disabled={busy} onClick={rematch}>{game.practice?'Restart position':'Rematch'}</button></div>:<><div className="help-buttons"><button className="button secondary" disabled={busy||!isLive||engineTurn} onClick={()=>useHelp('hint')}>Hint <small>{game.hintsUsed||0}</small></button><button className="button secondary" disabled={busy||!isLive||game.moves.length-(game.practice?.startPly||0)<1} onClick={()=>useHelp('undo')}>Undo <small>{game.undosUsed||0}</small></button></div>{hint?.revision===game.revision&&<p className="hint-message" role="status"><strong>{hint.san}</strong> {hint.explanation}</p>}{helpError&&<p className="form-error">Assistance unavailable: {helpError}</p>}{game.assistance?.feedback&&liveAssistance?.feedback&&<p className="hint-message">{liveAssistance.feedback.played?.explanation||liveAssistance.feedback.explanation}</p>}{game.assistance?.engine&&liveAssistance?.analysis?.lines?.map(line=><p className="live-engine-line" key={line.move}><b>{scoreText(line.score)}</b> {line.san.slice(0,6).map(notation).join(' ')}</p>)}</>}{game.assistance?.chat&&game.chat?.length>0&&<div className="bot-chat" aria-label="Bot chat"><BotAvatar bot={selectedBot}/><p>{game.chat.at(-1)}</p></div>}<div className="live-game-meta"><span>{selectedEngine?.name||game.engineId} · target {game.currentRating||game.rating}</span><span>{game.adaptive?'Adaptive':'Local simulation'}</span></div></div>}
          {mode==='review'&&<><div className="review-actions">{ply>0&&<button className={`button small ${showBefore?'primary':'secondary'}`} onClick={()=>setShowBefore(!showBefore)}>{showBefore?'Show played move':'Compare before move'}</button>}<button className="button small secondary" onClick={()=>explore()} disabled={busy}><Icon name="branch"/>{branchId?'Branch here':'Try a variation'}</button><button className="button small secondary" disabled={busy||saving||chess.isGameOver()} onClick={choosePractice}><Icon name="play"/>Practice this position</button></div>{analysis&&candidates.length>0&&<div className="candidate-lines"><div className="section-label"><span>CANDIDATE CONTINUATIONS</span><button className="text-button" onClick={()=>setPreference('arrows',!settings.arrows)}>{settings.arrows?'Hide arrows':'Show arrows'}</button></div>{candidates.map((line,index)=><button className="candidate-line" key={line.move} onClick={()=>explore(line)} title="Save and play this candidate as a variation"><span className={`line-dot line-${index}`}/><b>{scoreText(line.score)}</b><span>{line.san.slice(0,6).map(notation).join(' ')}</span><Icon name="play"/></button>)}{ply>0&&!showBefore&&<p className="tiny-note">Compare before the move to see candidate arrows.</p>}</div>}</>}
          <div className="moves-heading"><span>{branchId?'VARIATION MOVES':'GAME MOVES'}</span><span>{history.length} ply</span></div><div className="move-list" aria-label="Move history">{rows.length===0?<div className="empty-moves">The first move is yours to discover.</div>:Array.from(new Set(rows.map(row=>row.number))).map(number=><div className="move-row" key={number}><span className="move-number">{number}.</span>{['w','b'].map(color=>{const row=rows.find(item=>item.number===number&&item.color===color);return row?<button key={color} className={ply===row.ply?'selected-move':''} onClick={()=>jump(row.ply)} aria-label={`Move ${number}, ${color==='w'?'white':'black'}, ${row.san}`} aria-current={ply===row.ply?'step':undefined}>{notation(row.san)}{row.captured&&<span className="capture-indicator">×</span>}</button>:<span key={color}/>;})}</div>)}</div>
          <div className="transport"><button aria-label="First position" onClick={()=>jump(0)} disabled={ply===0}><Icon name="first"/></button><button aria-label="Previous move" onClick={()=>jump(ply-1)} disabled={ply===0}><Icon name="back"/></button><button aria-label={autoplay?'Pause playback':'Play move history'} className={autoplay?'playing':''} disabled={!history.length} onClick={()=>{setMode('review');setShowBefore(false);if(ply===history.length)setPly(0);setAutoplay(!autoplay);}}><Icon name={autoplay?'pause':'play'}/></button><button aria-label="Next move" onClick={()=>jump(ply+1)} disabled={ply===history.length}><Icon name="chevron"/></button><button aria-label="Last position" onClick={()=>jump(history.length)} disabled={ply===history.length}><Icon name="last"/></button></div>
          {branchId&&<div className="branch-workspace"><div className="branch-title"><span><Icon name="branch"/>Alternative line</span><button className="text-button" onClick={returnToGame}>Return to game · ply {study.anchorPly}</button></div><label htmlFor="branch-question">Your question at this branch</label><textarea id="branch-question" value={note} maxLength={2000} placeholder="What did I expect to happen here?" onChange={e=>{const question=e.target.value;setStudy(current=>({...current,branches:current.branches.map(item=>item.id===branchId?{...item,question}:item)}));setDirty(true);}}/><p className="tiny-note">Saved learner note. The coach currently explains engine evidence; it does not answer free-form chat.</p></div>}
          {study.branches.length>0&&<div className="saved-branches"><div className="section-label"><span>YOUR VARIATIONS · {study.branches.length}</span><button className="text-button" disabled={!dirty||busy||saving} onClick={persistStudy}>{saving?'Saving…':dirty?'Save study':'Saved'}</button></div>{study.branches.map((item,index)=><button className={`branch-item ${branchId===item.id?'active':''}`} key={item.id} style={{paddingLeft:12+Math.min(4,branchDepth(item,study.branches))*14}} onClick={()=>selectBranch(item)}><Icon name="branch"/><span>Line {index+1}<small>from ply {item.anchorPly} · {item.moves.length-item.anchorPly} moves</small></span>{item.question&&<span className="note-mark">NOTE</span>}</button>)}</div>}
          {mode==='review'&&!branchId&&game.source==='bot'&&!game.result&&<button className="button primary resume-button" onClick={resumeGame}>Back to playing<Icon name="arrow"/></button>}
          </>}
        </>:page==='learn'?<><div className="panel-heading"><Icon name="learn"/><h2>Learn</h2><span>{progress.lessons.length}/{learn.lessons.length}</span></div><div className="learning-intro"><p className="eyebrow">THE STARTER COLLECTION</p><h2>Small ideas.<br/>Better decisions.</h2><p>Original introductory lessons. Look at the board and put one idea into practice.</p></div>{lesson?<div className="lesson-content"><button className="text-button" onClick={()=>selectLesson(null)}>← All lessons</button><span className="content-category">{lesson.category}</span><h2>{lesson.title}</h2>{lesson.body.map((text,index)=><p key={index}>{text}</p>)}<h3>{lesson.question}</h3><div className="answer-choices">{lesson.choices.map((choice,index)=><button className="answer-choice" disabled={busy} key={index} onClick={()=>answerLesson(index)}><span>{String.fromCharCode(65+index)}</span>{choice}</button>)}</div>{feedback&&<div className={`learning-feedback ${feedback.correct?'correct':'incorrect'}`} role="status"><strong>{feedback.correct?'That’s right.':'Take another look.'}</strong><p>{feedback.explanation}</p></div>}</div>:<div className="content-list">{learn.lessons.map(item=><button className="content-item" key={item.id} onClick={()=>selectLesson(item)}><span className="content-icon"><Icon name={progress.lessons.includes(item.id)?'check':'learn'}/></span><span><small>{item.category}</small><strong>{item.title}</strong><p>{item.description}</p></span><Icon name="chevron"/></button>)}</div>}</>:
        <><div className="panel-heading"><Icon name="puzzle"/><h2>Puzzles</h2><span>{progress.puzzles.length}/{learn.puzzles.length}</span></div>{puzzle?<div className="puzzle-content"><button className="text-button" onClick={()=>selectPuzzle(null)}>← All puzzles</button><span className="content-category">{puzzle.theme}</span><h2>{puzzle.title}</h2><p>{puzzleComplete?'Well calculated. Your completion is saved.':`${puzzle.side==='w'?'White':'Black'} to move. Find the strongest continuation on the board.`}</p>{!puzzleComplete&&<details className="puzzle-hint"><summary>Show a hint</summary><p>{puzzle.hint}</p></details>}{feedback&&<div className={`learning-feedback ${feedback.correct?'correct':'incorrect'}`} role="status"><strong>{feedback.complete?'Puzzle complete':feedback.correct?'Keep going.':'Try another move.'}</strong><p>{feedback.explanation}</p></div>}<div className="help-buttons">{puzzleComplete&&learn.puzzles.length>1&&<button className="button primary" onClick={()=>selectPuzzle(learn.puzzles[(learn.puzzles.findIndex(item=>item.id===puzzle.id)+1)%learn.puzzles.length])}>Next puzzle<Icon name="arrow"/></button>}<button className="button secondary" onClick={()=>selectPuzzle(puzzle)}>Restart puzzle</button></div></div>:<><div className="learning-intro"><p className="eyebrow">THE STARTER COLLECTION</p><h2>Pause. Calculate.<br/>Then play.</h2><p>Original introductory puzzles. Find a move, follow the reply, and finish the idea.</p><button className="button primary full-width" disabled={!learn.puzzles.length} onClick={()=>selectPuzzle(learn.puzzles.find(item=>!progress.puzzles.includes(item.id))||learn.puzzles[0])}>Solve puzzles<Icon name="arrow"/></button></div><div className="content-list">{learn.puzzles.map(item=><button className="content-item" key={item.id} onClick={()=>selectPuzzle(item)}><span className="content-icon"><Icon name={progress.puzzles.includes(item.id)?'check':'puzzle'}/></span><span><small>{item.theme}</small><strong>{item.title}</strong><p>{item.side==='w'?'White':'Black'} to move</p></span><Icon name="chevron"/></button>)}</div></>}</>}
      </section></div>}
      <footer className="workspace-footer"><span>Play. Understand. Try another line.</span><span>ChessLab · On this Mac</span></footer>
    </main>
    {modal==='position'&&<Modal title="Set up position" onClose={()=>setModal(null)} wide><PositionEditor initialFen={positionDraft?.fen} initialTitle={positionDraft?.title} settings={settings} busy={busy} error={error} onSave={savePosition}/></Modal>}
    {modal==='new'&&<Modal title="New bot game" onClose={()=>setModal(null)} wide><BotSetup {...setupProps} compact/></Modal>}
    {modal==='practice'&&practiceTarget&&<Modal title="Practice this position" onClose={()=>{setModal(null);setPracticeTarget(null);}} wide><div className="practice-preview"><div className="practice-preview-board" inert><Board chess={replay([],practiceTarget.fen)} orientation={setup.color==='b'?'b':'w'} enabled={false} onSquare={()=>{}} onMove={()=>{}} settings={{...settings,coordinates:false,animation:0}}/></div><div><span>{practiceTarget.branchId?'SAVED VARIATION':'GAME POSITION'}</span><h3>{replay([],practiceTarget.fen).turn()==='w'?'White':'Black'} to move</h3><p>Choose your opponent and side. Practice creates a separate game and keeps the full history of this position.</p></div></div>{error&&<p className="form-error" role="alert">{error}</p>}<BotSetup {...setupProps} compact onStart={()=>createPractice()} startLabel="Start position practice"/><p className="fine-print">Practice games do not award roster crowns. You can return to the source study at any time.</p></Modal>}
    {modal==='auth'&&<Modal title={authMode==='register'?'Make this your workspace':'Welcome back'} onClose={()=>{setModal(pendingAction.current?.type==='position'?'position':null);pendingAction.current=null;}}><p className="modal-intro">Save your games, variations and progress with an account on this server.</p><form className="auth-form" onSubmit={authenticate}><label>Username<input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_-]+" title="3–32 letters, numbers, underscores or hyphens" autoComplete="username" placeholder="Your name at the board"/></label><label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={authMode==='register'?'new-password':'current-password'} placeholder="At least 10 characters"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full-width" disabled={busy}>{busy?'Please wait…':authMode==='register'?'Create account':'Sign in'}<Icon name="arrow"/></button></form><button className="text-button auth-switch" onClick={()=>{setAuthMode(authMode==='register'?'login':'register');setError('');}}>{authMode==='register'?'Already have an account? Sign in':'New here? Create an account'}</button><p className="fine-print">No email required. Saved on this server; no cloud sync.</p></Modal>}
    {modal==='account'&&<Modal title="Your account" onClose={()=>setModal(null)}><div className="account-summary"><span className="big-initial">{user?.username.slice(0,1).toUpperCase()}</span><h2>{user?.username}</h2><p>{games.length} saved games · {progress.lessons.length} lessons · {progress.puzzles.length} puzzles</p></div><button className="button secondary full-width" disabled={busy} onClick={logout}>Sign out</button></Modal>}
    {modal==='import'&&<Modal title="Import a game" onClose={()=>setModal(null)} wide><p className="modal-intro">Paste PGN from a completed game. The original moves become a review you can explore.</p><form onSubmit={importPgn}><label className="file-import">Choose a .pgn file<input type="file" accept=".pgn,text/plain" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>50000){setError('Choose a PGN smaller than 50 KB.');return;}setPgn(await file.text());}}}/></label><label className="sr-only" htmlFor="pgn-input">PGN text</label><textarea id="pgn-input" className="pgn-input" value={pgn} onChange={e=>setPgn(e.target.value)} maxLength={50000} placeholder={'[Event "My game"]\n\n1. e4 e5 2. Nf3 Nc6 *'} required/>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full-width" disabled={busy||!pgn.trim()}>{busy?'Importing…':user?'Import & review':'Sign in to import'}<Icon name="arrow"/></button></form></Modal>}
    {modal==='resign'&&<Modal title="Resign this game?" onClose={()=>setModal(null)}><p className="modal-intro">The game will end. You can still review every move and explore variations.</p><button className="button danger full-width" disabled={busy} onClick={resign}>Resign game</button><button className="button secondary full-width" onClick={()=>setModal(null)}>Keep playing</button></Modal>}
    {promotion&&<Modal title="Choose your promotion" onClose={()=>setPromotion(null)}><p className="modal-intro">Your pawn reached the last rank. Choose a piece.</p><div className="promotion-options">{['q','r','b','n'].map(type=><button key={type} aria-label={`Promote to ${{q:'queen',r:'rook',b:'bishop',n:'knight'}[type]}`} onClick={()=>{const value=promotion.from+promotion.to+type;setPromotion(null);submitMove(value);}}><Piece type={type} color={chess.turn()}/><span>{{q:'Queen',r:'Rook',b:'Bishop',n:'Knight'}[type]}</span></button>)}</div></Modal>}
    {modal==='settings'&&<Modal title="Settings" wide onClose={()=>setModal(null)}><Settings settings={settings} tab={settingsTab} onTab={setSettingsTab} onChange={setPreference} engines={catalog.engines}/></Modal>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
