import React, {useEffect, useRef, useState} from 'react';
import {warningLines} from './catalog.js';
import './engine-picker.css';

// Settings > Engine in the browser build: which engine plays and analyses, a download under way
// with a Stop button, and the list of the puzzle board's engines to switch to. A heavy engine
// shows what it would take (size, rough time, memory, risk) and asks a second time before it
// downloads. Everything goes through /api/engines, so the picker never touches a worker itself.
const POLL_MS = 600;

const formatMb = bytes => `${(bytes / 1e6).toFixed(bytes >= 10e6 ? 0 : 1)} MB`;

export function progressText(switching) {
  if (!switching) return '';
  if (switching.phase === 'download' && switching.total) return `Downloading ${switching.name}: ${formatMb(switching.got || 0)} of ${formatMb(switching.total)}`;
  if (switching.checking) return `Checking the download of ${switching.name}…`;
  if (switching.fromDevice) return `Starting ${switching.name} from this device…`;
  return `Starting ${switching.name}…`;
}

export default function EnginePicker({request, onChange}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [warning, setWarning] = useState(null); // the heavy engine waiting for its second yes
  const current = useRef(null);
  const changed = useRef(onChange);
  changed.current = onChange;

  function adopt(next) {
    setData(next);
    if (current.current && next.current && current.current !== next.current.id) changed.current?.(next.current);
    current.current = next.current?.id || null;
  }

  // The state is read once, then again every POLL_MS while a download or start is under way.
  useEffect(() => {
    let alive = true, timer = null;
    const read = () => request('/api/engines').then(next => {
      if (!alive) return;
      adopt(next);
      if (next.switching) timer = setTimeout(read, POLL_MS);
    }).catch(err => { if (alive) setError(err.message); });
    read();
    return () => { alive = false; clearTimeout(timer); };
  }, [request, data?.switching?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(path, body) {
    setError('');
    try { adopt(await request(path, body)); }
    catch (err) { setError(err.message); }
  }

  function choose(entry) {
    if (entry.heavy && !warning) { setWarning(entry); return; }
    setWarning(null);
    post('/api/engines/use', {id: entry.id});
  }

  if (!data) return <p className="tiny-note" role="status">{error || 'Checking the engine…'}</p>;
  const {engines, switching, failed, siteCatalog, siteUrl} = data;
  const offered = engines.filter(e => !e.bundled);
  const connection = globalThis.navigator?.connection || {};

  return <div className="engine-picker">
    <div className="setting-row"><span>Engine in use</span><span className="setting-value">{data.current ? `${data.current.name} · ${data.current.size}` : 'None'}</span></div>
    {switching && <div className="engine-progress" role="status">
      <p>{progressText(switching)}</p>
      {switching.phase === 'download' && switching.total ? <progress max={switching.total} value={switching.got || 0}/> : <progress/>}
      <button type="button" className="text-button" onClick={() => post('/api/engines/stop', {})}>Stop</button>
    </div>}
    {failed && !switching && <p className="form-error" role="alert">{failed.error}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!siteCatalog
      ? <p className="tiny-note">More engines (Stockfish 19 full, Maia, Leela and others) are in the app at <a href={siteUrl} target="_blank" rel="noreferrer">askthemove.online/betapp</a>. This copy of the app has Stockfish 19 Lite built in.</p>
      : warning
        ? <div className="engine-warning" role="group" aria-label={`Download ${warning.name}?`}>
          <h4>Download {warning.name}?</h4>
          <ul>{warningLines(warning, {downlink: Number(connection.downlink) || 0, cellular: Boolean(connection.saveData || connection.type === 'cellular')}).map(([label, text]) => <li key={label}><b>{label}: </b>{text}</li>)}</ul>
          <div className="engine-warning-actions"><button type="button" className="button secondary" onClick={() => setWarning(null)}>Cancel</button><button type="button" className="button primary" onClick={() => choose(warning)}>Yes, download it</button></div>
        </div>
        : <>
          <button type="button" className="text-button engine-list-toggle" aria-expanded={listOpen} onClick={() => setListOpen(open => !open)}>{listOpen ? 'Hide the list' : 'Choose another engine'}</button>
          {listOpen && <div className="engine-cards engine-picker-list" role="list">
            {engines.map(entry => {
              const inUse = entry.id === data.current?.id, coming = entry.id === switching?.id;
              return <button type="button" role="listitem" key={entry.id} className={`engine-card ${inUse ? 'selected' : ''}`} disabled={Boolean(entry.cantRun) || inUse || coming} onClick={() => choose(entry)}>
                <span><strong>{entry.name}</strong><small>{entry.cantRun || `${entry.size}${entry.heavy ? ' · big download, needs a strong device' : ''}${entry.neural ? ' · human move model' : ''}${entry.memory ? ` · about ${entry.memory} of memory` : ''}${inUse ? ' · in use' : coming ? ' · starting' : ''}`}</small></span>
                <span className={`availability-dot ${inUse ? 'available' : ''}`}/>
              </button>;
            })}
          </div>}
          <p className="tiny-note">{offered.length} engines from the puzzle board. Each downloads once and is kept on this device for 30 days; Stockfish 19 Lite keeps working until the new one answers. Several-cores builds need a page setting the app doesn't have yet.</p>
        </>}
  </div>;
}
