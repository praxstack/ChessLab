import React, {useState} from 'react';
import {createCredentials, coachEndpoint} from './credentials.js';

// Settings for the browser app's AI coach: paste your own Claude key, or enter an invite code when
// this build has a coach Worker (VITE_COACH_URL). Shown only in the browser build.
const credentials = createCredentials();

export default function CoachSettings({onChange}) {
  const workerReady = Boolean(coachEndpoint(import.meta.env.VITE_COACH_URL));
  const current = () => credentials.key() ? 'key' : workerReady && credentials.invite() ? 'invite' : null;
  const [mode, setMode] = useState(current), [choice, setChoice] = useState(() => current() || 'key');
  const [draft, setDraft] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
  function finish(text) { setMode(current()); setDraft(''); setError(''); setMessage(text); onChange?.(); }
  function save(event) {
    event.preventDefault();
    try {
      if (choice === 'key') { credentials.saveKey(draft); finish('Your key is saved in this browser. Try Explain why on any move.'); }
      else { credentials.saveInvite(draft); finish('Your invite code is saved. Try Explain why on any move.'); }
    } catch (failure) { setMessage(''); setError(failure.message); }
  }
  function remove() { credentials.clear(); finish('Removed. Explain why now shows the engine summary only.'); }
  const options = [['key', 'Your own Claude key'], ...(workerReady ? [['invite', 'Invite code']] : [])];
  return <section className="coach-settings" aria-label="AI coach">
    <h3>AI coach</h3>
    <p className="tiny-note">Explain why can use Claude to put the engine's lines into plain words. Every answer is checked against the engine evidence. Without Claude you still get the engine summary.</p>
    <p className="coach-status" role="status">{mode === 'key' ? 'On: using your own Claude key.' : mode === 'invite' ? 'On: using your invite code.' : 'Off: nothing saved yet.'}</p>
    {options.length > 1 && <div className="coach-choice" role="radiogroup" aria-label="How to use Claude">
      {options.map(([id, label]) => <label key={id}><input type="radio" name="coach-choice" value={id} checked={choice === id} onChange={() => { setChoice(id); setDraft(''); setError(''); setMessage(''); }}/>{label}</label>)}
    </div>}
    <form className="coach-form" onSubmit={save}>
      <label htmlFor="coach-secret">{choice === 'key' ? 'Claude API key' : 'Invite code'}</label>
      <div className="coach-input">
        <input id="coach-secret" type={choice === 'key' ? 'password' : 'text'} autoComplete="off" spellCheck={false} placeholder={choice === 'key' ? 'sk-ant-…' : 'Your invite code'} value={draft} onChange={event => setDraft(event.target.value)}/>
        <button className="button secondary" disabled={!draft.trim()}>Save</button>
      </div>
    </form>
    <p className="tiny-note">{choice === 'key'
      ? <>You pay Anthropic for each explanation, usually a few cents. Your key stays in this browser, is sent only to api.anthropic.com, and is never put in a backup. Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.</>
      : <>The app's owner pays for these explanations, so each code has a daily limit. The code is sent to the AskTheMove coach service with the moves and engine lines, nothing else.</>}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="tiny-note" role="status">{message}</p>}
    {mode && <button type="button" className="text-button" onClick={remove}>Remove saved {mode === 'key' ? 'key' : 'invite code'}</button>}
  </section>;
}
