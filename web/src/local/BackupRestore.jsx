import React, {useRef, useState} from 'react';
import {localBackup, localRestore} from './index.js';

// Settings section for the browser app: save everything to one file, or load such a file back.
export default function BackupRestore({settings, onRestored}) {
  const input = useRef(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function backUp() {
    setBusy(true); setMessage('');
    try {
      const {filename, text} = await localBackup(settings);
      const url = URL.createObjectURL(new Blob([text], {type: 'application/json'})), link = document.createElement('a');
      link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
      setMessage(`Saved ${filename}. Keep it somewhere safe.`);
    } catch (error) { setMessage(`Backup failed: ${error.message}`); }
    finally { setBusy(false); }
  }
  async function restore(file) {
    if (!file) return;
    if (!window.confirm('Restore replaces every game, lesson and setting saved in this browser with the backup. Continue?')) { input.current.value = ''; return; }
    setBusy(true); setMessage('');
    try { onRestored(await localRestore(await file.text())); }
    catch (error) { setMessage(`${error.message} Nothing was changed.`.replace('. Nothing was changed. Nothing was changed.', '. Nothing was changed.')); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <section className="backup-restore" aria-label="Back up and restore">
    <h3>Your data</h3>
    <p className="tiny-note">Games, lessons, puzzles and settings are saved only in this browser. Back up to keep a copy or to move to another browser. A backup never includes a Claude key.</p>
    <div className="backup-actions">
      <button type="button" className="button secondary" disabled={busy} onClick={backUp}>Back up</button>
      <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>Restore</button>
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Choose a backup file" onChange={e => restore(e.target.files?.[0])}/>
    </div>
    {message && <p className="tiny-note" role="status">{message}</p>}
  </section>;
}
