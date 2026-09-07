import React from 'react';

export const settingDefaults={coordinates:true,legalMoves:true,lastMove:true,arrows:true,sound:true,orientation:'auto',movetime:3000,lines:3,threads:2,pace:1000,boardTheme:'green',pieceSet:'chesscom',animation:200,notation:'figurine',coachAvatar:true,classification:true,autoplay:true,analysisEngine:'stockfish18',reviewStrength:1000};
export function SettingSelect({label,value,onChange,options}) {const id=React.useId();return <div className="setting-row"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e=>onChange(e.target.value)}>{options.map(option=><option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></div>;}
export function SettingToggle({label,value,onChange}){return <div className="setting-row"><span>{label}</span><button type="button" className={`toggle ${value?'on':''}`} role="switch" aria-checked={!!value} aria-label={label} onClick={onChange}><span/></button></div>;}
export default function Settings({settings,tab,onTab,onChange,engines}) {
 const select=(key,label,options,numeric=false)=><SettingSelect label={label} value={settings[key]} onChange={value=>onChange(key,numeric?Number(value):value)} options={options.map(([value,label,disabled])=>({value,label,disabled}))}/>;
 const toggle=(key,label)=><SettingToggle label={label} value={settings[key]} onChange={()=>onChange(key,!settings[key])}/>;
 const available=id=>engines.some(e=>e.id===id&&e.available);
 return <><div className="settings-tabs" role="tablist" aria-label="Settings sections">{['board','review','engine'].map(id=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?'active':''} onClick={()=>onTab(id)}>{id==='review'?'Interface':id}</button>)}</div>
 <div className="settings-body">{tab==='board'?<>
  <h3>Board</h3>
  {select('pieceSet','Pieces',[['chesscom','Neo']])}
  {select('boardTheme','Board',[['green','Green'],['blue','Blue'],['brown','Brown'],['gray','Gray']])}
  {select('orientation','Orientation',[['auto','Your playing color'],['w','White at bottom'],['b','Black at bottom']])}
  {select('coordinates','Coordinates',[[true,'Inside'],[false,'None']])}
  {select('notation','Piece Notation',[['figurine','Figurine'],['text','Text']])}
  {select('animation','Piece Animations',[[0,'None'],[100,'Fast'],[200,'Medium (default)'],[400,'Slow']],true)}
  {toggle('lastMove','Highlight Last Move')}{toggle('sound','Play Sounds')}{toggle('legalMoves','Show Legal Moves')}
 </>:tab==='review'?<>
  <h3>Review</h3>{toggle('arrows',"Coach’s Arrows")}{toggle('classification','Show Move Classification On Board')}{toggle('autoplay','Autoplay Show Moves')}
  {select('pace','Delay Between Moves',[[500,'0.5 seconds'],[1000,'1 second'],[2000,'2 seconds'],[3000,'3 seconds']],true)}
  {toggle('coachAvatar','Show Coach Avatar')}
 </>:<>
  <h3>Game Review</h3><SettingSelect label="Chess Engine" value="stockfish" onChange={()=>{}} options={[{value:'stockfish',label:'Stockfish'},{value:'torch-human',label:'Torch Human · not connected',disabled:true}]}/>
  {select('reviewStrength','Strength',[[1000,'Fast (~1 sec)'],[5000,'Standard (~5 sec)'],[20000,'Deep (~20 sec)'],[90000,'Maximum (~1 min 30 sec)']],true)}
  <h3>Analysis</h3>{select('analysisEngine','Chess Engine',[['stockfish18','Stockfish 18',!available('stockfish18')],['stockfish18-lite','Stockfish 18 Lite',!available('stockfish18-lite')],['stockfish19','Stockfish 19',!available('stockfish19')],['stockfish16','Stockfish 16',!available('stockfish16')],['torch4','Torch 4 · not connected',true],['torch4-lite','Torch 4 Lite · not connected',true],['off','Engine Off']])}
  {select('movetime','Maximum Time',[...([3000,5000,10000,20000,30000].includes(settings.movetime)?[]:[[settings.movetime,`${settings.movetime/1000} sec (saved)`]]),[3000,'3 sec'],[5000,'5 sec'],[10000,'10 sec'],[20000,'20 sec'],[30000,'30 sec']],true)}
  {select('lines','Number of Lines',[1,2,3,4,5].map(n=>[n,String(n)]),true)}
  {select('threads','Threads',[1,2,3,4,6,8].map(n=>[n,String(n)]),true)}
  <p className="tiny-note">Runs on your chess server. Opponent strength is set separately in Game Options.</p>
  <details className="installed-engines"><summary>Installed engines</summary>{engines.map(e=><p key={e.id}><strong>{e.name}</strong><span>{e.available?'Ready':e.reason||'Offline'}</span></p>)}</details>
 </>}</div><div className="settings-saved">✓ Preferences saved</div></>;
}
