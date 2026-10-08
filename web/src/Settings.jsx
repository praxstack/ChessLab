import React from 'react';
import {pieceSet, boardThemes} from './settings-state.js';

export {settingDefaults} from './settings-state.js';
export function SettingSelect({label,value,onChange,options}) {const id=React.useId();return <div className="setting-row"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e=>onChange(e.target.value)}>{options.map(option=><option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></div>;}
export function SettingToggle({label,value,onChange}){return <div className="setting-row"><span>{label}</span><button type="button" className={`toggle ${value?'on':''}`} role="switch" aria-checked={!!value} aria-label={label} onClick={onChange}><span/></button></div>;}
export default function Settings({settings,tab,onTab,onChange,engines}) {
 const select=(key,label,options,numeric=false)=><SettingSelect label={label} value={settings[key]} onChange={value=>onChange(key,numeric?Number(value):value)} options={options.map(([value,label,disabled])=>({value,label,disabled}))}/>;
 const toggle=(key,label)=><SettingToggle label={label} value={settings[key]} onChange={()=>onChange(key,!settings[key])}/>;
 const available=id=>engines.some(e=>e.id===id&&e.available);
 return <><div className="settings-tabs" role="tablist" aria-label="Settings sections">{['board','review','engine'].map(id=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?'active':''} onClick={()=>onTab(id)}>{id==='review'?'Interface':id}</button>)}</div>
 <div className="settings-body">{tab==='board'?<>
  <h3>Board</h3>
  <div className="setting-row"><span>Pieces</span><span className="setting-value">{pieceSet.label}</span></div>
  {select('boardTheme','Board',boardThemes)}
  {select('orientation','Orientation',[['auto','Your playing color'],['w','White at bottom'],['b','Black at bottom']])}
  {select('coordinates','Coordinates',[[true,'Inside'],[false,'None']])}
  {select('notation','Move notation',[['figurine','Figurine'],['text','Text']])}
  {select('animation','Piece animation',[[0,'None'],[100,'Fast'],[200,'Medium (default)'],[400,'Slow']],true)}
  {toggle('lastMove','Highlight the last move')}{toggle('sound','Move sounds')}{toggle('legalMoves','Show legal moves')}
  <h3>Credits</h3><ul className="credits" aria-label="Artwork and software credits"><li>Pieces: cburnett by Colin M.L. Burnett · GPLv2+ · <a href="/licenses/cburnett/README.txt" target="_blank" rel="noreferrer">licence</a></li><li>Navigation icons: Lucide · ISC · <a href="/licenses/lucide/LICENSE.txt" target="_blank" rel="noreferrer">licence</a></li><li>Move rules: chessops · GPL-3.0 · <a href="/licenses/chessops/LICENSE.txt" target="_blank" rel="noreferrer">licence</a></li></ul>
 </>:tab==='review'?<>
  <h3>Review</h3>{toggle('arrows','Candidate arrows')}{toggle('classification','Move labels on the board')}{toggle('autoplay','Play through suggested lines')}
  {select('pace','Delay between moves',[[500,'0.5 seconds'],[1000,'1 second'],[2000,'2 seconds'],[3000,'3 seconds']],true)}
  {toggle('coachAvatar','Coach avatar')}
 </>:<>
  <h3>Game review</h3><SettingSelect label="Engine" value="stockfish" onChange={()=>{}} options={[{value:'stockfish',label:'Stockfish'}]}/>
  {select('reviewStrength','Strength',[[1000,'Fast (~1 sec)'],[5000,'Standard (~5 sec)'],[20000,'Deep (~20 sec)'],[90000,'Maximum (~1 min 30 sec)']],true)}
  <h3>Analysis</h3>{select('analysisEngine','Engine',[['stockfish18','Stockfish 18',!available('stockfish18')],['stockfish18-lite','Stockfish 18 Lite',!available('stockfish18-lite')],['stockfish19','Stockfish 19',!available('stockfish19')],['stockfish16','Stockfish 16',!available('stockfish16')],['off','Engine off']])}
  {select('movetime','Maximum time',[...([3000,5000,10000,20000,30000].includes(settings.movetime)?[]:[[settings.movetime,`${settings.movetime/1000} sec (saved)`]]),[3000,'3 sec'],[5000,'5 sec'],[10000,'10 sec'],[20000,'20 sec'],[30000,'30 sec']],true)}
  {select('lines','Lines shown',[1,2,3,4,5].map(n=>[n,String(n)]),true)}
  {select('threads','Threads',[1,2,3,4,6,8].map(n=>[n,String(n)]),true)}
  <p className="tiny-note">Runs on your chess server. Opponent strength is set separately in Game Options.</p>
  <details className="installed-engines"><summary>Installed engines</summary>{engines.map(e=><p key={e.id}><strong>{e.name}</strong><span>{e.available?'Ready':e.reason||'Offline'}</span></p>)}</details>
 </>}</div><div className="settings-saved">✓ Preferences saved</div></>;
}
