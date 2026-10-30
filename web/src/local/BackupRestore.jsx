import React, {useRef, useState} from 'react';
import {localBackup, localRestore, inspectBackup} from './index.js';

// Settings section for the browser app: save everything to one file, or load such a file back.
// A restore replaces what is here and cannot be undone, so it first checks the file, then asks the
// learner to save the current data (one click) or confirm they already have a copy.
export default function BackupRestore({settings, onRestored}) {
  const input = useRef(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null), [saved, setSaved] = useState(false);
  async function backUp() {
    setBusy(true); setMessage('');
    try {
      const {filename, text} = await localBackup(settings);
      const url = URL.createObjectURL(new Blob([text], {type: 'application/json'})), link = document.createElement('a');
      link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
      setMessage(`Saved ${filename}. Keep it somewhere safe.`);
      return true;
    } catch (error) { setMessage(`Backup failed: ${error.message}`); return false; }
    finally { setBusy(false); }
  }
  async function choose(file) {
    if (input.current) input.current.value = '';
    if (!file) return;
    setMessage(''); setSaved(false);
    try {
      const text = await file.text();
      setPending({name: file.name, text, ...inspectBackup(text)});
    } catch (error) { setPending(null); setMessage(`${error.message} Nothing was changed.`); }
  }
  async function restore() {
    setBusy(true); setMessage('');
    try { onRestored(await localRestore(pending.text, {currentSaved: saved})); }
    catch (error) { setMessage(`${error.message} Nothing was changed.`); }
    finally { setBusy(false); }
  }
  const games = count => `${count} saved game${count === 1 ? '' : 's'}`;
  return <section className="backup-restore" aria-label="Back up and restore">
    <h3>Your data</h3>
    <p className="tiny-note">Games, lessons, puzzles and settings are saved only in this browser. Back up to keep a copy or to move to another browser. A backup never includes a Claude key.</p>
    <div className="backup-actions">
      <button type="button" className="button secondary" disabled={busy} onClick={backUp}>Back up</button>
      <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>Restore</button>
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Choose a backup file" onChange={e => choose(e.target.files?.[0])}/>
    </div>
    {pending && <div className="restore-confirm" role="group" aria-label="Confirm restore">
      <p className="tiny-note"><strong>{pending.name}</strong> holds {games(pending.games)}{pending.exportedAt ? `, saved ${pending.exportedAt.slice(0, 10)}` : ''}. Restoring replaces every game, lesson and puzzle in this browser{pending.hasSettings ? ' and your settings' : '; your settings stay as they are'}. This cannot be undone.</p>
      <div className="backup-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={async () => { if (await backUp()) setSaved(true); }}>Save current data first</button>
      </div>
      <label className="tiny-note restore-check"><input type="checkbox" checked={saved} disabled={busy} onChange={e => setSaved(e.target.checked)}/> I have a backup of what is in this browser now, or I don't need it</label>
      <div className="backup-actions">
        <button type="button" className="button" disabled={busy || !saved} onClick={restore}>Replace with this backup</button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => { setPending(null); setSaved(false); }}>Cancel</button>
      </div>
    </div>}
    {message && <p className="tiny-note" role="status">{message}</p>}
  </section>;
}
