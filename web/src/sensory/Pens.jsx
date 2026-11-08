// The learner's own pens over the app's board, reusing the puzzle page's drawing layer
// (site/public/assets/draw.js) as it is. draw.js draws into an SVG over the board and wires
// itself to a set of buttons; here those buttons are small detached proxies, and the toolbar
// the learner sees is ordinary React that clicks them. So React owns the toolbar (labels,
// pressed states, keyboard) and draw.js owns the ink, with no copy of either.
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createDrawLayer} from '../../../site/public/assets/draw.js';
import {PEN_MODES, PEN_FADES, PEN_TOOLS, PEN_INKS, PEN_SIZES} from './pen-options.js';
import './sensory.css';

const WAVE = 'M3 17 C3.5 15.67 5 9.33 6 9 C7 8.67 7.83 15.33 9 15 C10.17 14.67 11.83 7.17 13 7 C14.17 6.83 14.83 14.17 16 14 C17.17 13.83 19.33 7.33 20 6';
// The puzzle page's own pictures for each tool, so the two boards look the same.
const ICONS = {
  pen: [WAVE],
  pencil: [WAVE],
  marker: ['M4 15 C7 12 9 10.5 12 11 C15 11.5 17 10 20 8'],
  arrow: [
    'M3.99 18.89 C4.34 18.46 5.35 17.09 6.14 16.28 C6.93 15.47 7.9 14.82 8.72 14.03 C9.54 13.24 10.27 12.35 11.08 11.55 C11.89 10.75 12.73 9.98 13.59 9.23 C14.45 8.48 15.33 7.75 16.23 7.05 C17.14 6.34 18.54 5.34 19 5',
    'M12.66 6.56 C13.03 6.49 14.17 6.29 14.91 6.13 C15.65 5.97 16.37 5.81 17.1 5.61 C17.82 5.42 18.89 5.05 19.25 4.94',
    'M17.13 11.13 C17.26 10.78 17.66 9.71 17.9 9.01 C18.14 8.31 18.38 7.62 18.58 6.91 C18.77 6.2 18.99 5.12 19.07 4.76',
  ],
  circle: ['M4.09 8.99 C4.26 8.7 4.66 7.77 5.1 7.28 C5.55 6.79 6.19 6.39 6.78 6.05 C7.38 5.7 8.02 5.39 8.67 5.2 C9.32 5 10.02 4.94 10.68 4.88 C11.34 4.83 11.99 4.83 12.63 4.87 C13.26 4.92 13.91 4.99 14.5 5.17 C15.08 5.34 15.63 5.64 16.15 5.93 C16.67 6.22 17.14 6.55 17.62 6.9 C18.11 7.25 18.66 7.59 19.04 8.03 C19.42 8.47 19.67 9.03 19.92 9.57 C20.17 10.11 20.42 10.68 20.52 11.27 C20.62 11.86 20.64 12.52 20.52 13.12 C20.39 13.72 20.07 14.3 19.77 14.87 C19.47 15.44 19.18 16.04 18.73 16.51 C18.29 16.98 17.66 17.34 17.1 17.69 C16.53 18.04 15.95 18.39 15.33 18.6 C14.71 18.82 14.02 18.9 13.38 18.97 C12.74 19.04 12.08 19.1 11.46 19.05 C10.84 18.99 10.23 18.82 9.66 18.62 C9.1 18.42 8.62 18.1 8.09 17.85 C7.56 17.6 6.92 17.46 6.46 17.12 C6 16.79 5.71 16.28 5.34 15.84 C4.97 15.39 4.5 14.97 4.24 14.46 C3.98 13.96 3.83 13.36 3.77 12.78 C3.71 12.21 3.77 11.6 3.87 11.01 C3.96 10.43 4.05 9.79 4.33 9.25 C4.61 8.71 5.1 8.23 5.54 7.78 C5.99 7.32 6.46 6.88 6.98 6.52 C7.51 6.16 8.08 5.81 8.69 5.62 C9.3 5.44 10.29 5.44 10.61 5.41'],
};
function PenIcon({name}) {
  return <svg className={`sn-icon sn-icon--${name}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS[name].map(d => <path key={d} d={d}/>)}</svg>;
}

function proxyButton(parent, data = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  Object.assign(b.dataset, data);
  parent.append(b);
  return b;
}

/** Read the proxies back: draw.js keeps its state in their aria-pressed/-checked, disabled, value and text. */
function readProxies(p) {
  const pressed = list => list.find(b => b.getAttribute('aria-pressed') === 'true');
  const mode = p.modes.find(b => b.getAttribute('aria-checked') === 'true')?.dataset.mode || 'move';
  return {
    mode,
    drawMode: mode === 'draw',
    fade: Number(p.fade.value) || 50,
    canUndo: !p.undo.disabled,
    canClear: !p.clear.disabled,
    tool: pressed(p.tools)?.dataset.tool || null,
    color: pressed(p.colors)?.dataset.color || null,
    size: pressed(p.sizes)?.dataset.size || null,
    hint: p.hint.textContent,
  };
}

const idle = {mode: 'move', drawMode: false, fade: 50, canUndo: false, canClear: false, tool: 'pen', color: 'green', size: 'medium', hint: ''};

/**
 * The pens for one board. positionKey: drawings belong to what is on the board (a game, a puzzle,
 * a lesson), so a new one clears them (draw.js's reset); moves within it keep them, as on the
 * puzzle page, so Faint can show them while you play. orientation: 'w' or 'b'; a flip redraws
 * them flipped. studyMarks: true while the board's own saved study marks take the right mouse
 * button. Returns refs and props for <Board> and the state <PenToolbar> shows.
 */
export function usePens({positionKey, orientation = 'w', studyMarks = false}) {
  const [boardEl, setBoardEl] = useState(null), [svgEl, setSvgEl] = useState(null), [state, setState] = useState(idle);
  const layer = useRef(null), proxies = useRef(null), orientationRef = useRef(orientation), studyRef = useRef(studyMarks);
  orientationRef.current = orientation;
  studyRef.current = studyMarks;

  useEffect(() => {
    if (!boardEl || !svgEl) return undefined;
    const box = document.createElement('div');
    const fade = document.createElement('input');
    Object.assign(fade, {type: 'range', min: String(PEN_FADES.min), max: String(PEN_FADES.max), step: String(PEN_FADES.step), value: '50'});
    const p = {
      modes: PEN_MODES.map(([mode]) => proxyButton(box, {mode})),
      fade, fadeOut: document.createElement('span'),
      undo: proxyButton(box), clear: proxyButton(box), hint: document.createElement('p'),
      tools: PEN_TOOLS.map(([tool]) => proxyButton(box, {tool})),
      colors: PEN_INKS.map(([color]) => proxyButton(box, {color})),
      sizes: PEN_SIZES.map(([size]) => proxyButton(box, {size})),
    };
    box.append(fade, p.fadeOut, p.hint);
    // While study marks are on, a right-button mouse press belongs to them (they're saved with the
    // study), so draw.js is shown it as "no button" and the button is put back right after it looks.
    // Listeners on one element run in the order they were added: this one first, draw.js, then restore.
    let took = null;
    const hide = e => {
      took = e.pointerId;
      if (studyRef.current && e.pointerType === 'mouse' && e.button === 2) Object.defineProperty(e, 'button', {value: -1, configurable: true});
    };
    boardEl.addEventListener('pointerdown', hide, true);
    // A stroke draw.js took must not also click the square it ended on. (Added before draw.js,
    // which stops the pointerup of its own strokes from going any further.)
    let swallowUntil = 0;
    const afterStroke = e => { if (took !== null && took === e.pointerId) swallowUntil = performance.now() + 600; took = null; };
    const click = e => { if (performance.now() < swallowUntil) { swallowUntil = 0; e.stopPropagation(); e.preventDefault(); } };
    boardEl.addEventListener('pointerup', afterStroke, true);
    boardEl.addEventListener('pointercancel', afterStroke, true);
    boardEl.addEventListener('click', click, true);
    // draw.js opens in Move, or in Faint if that was the last choice (never in Draw), and
    // remembers the faint level, exactly as on the puzzle page.
    const created = createDrawLayer({board: boardEl, svg: svgEl, ...p, stickers: [], sheet: null}, {
      orientation: () => (orientationRef.current === 'b' ? 'black' : 'white'),
    });
    const restore = e => {
      took = null; // reached here: draw.js left this press to the pieces
      if (Object.prototype.hasOwnProperty.call(e, 'button')) delete e.button;
    };
    boardEl.addEventListener('pointerdown', restore, true);
    // An ink remembered from another page that this toolbar doesn't offer falls back to the pen.
    if (!p.tools.some(b => b.getAttribute('aria-pressed') === 'true')) p.tools[0].click();
    layer.current = created;
    proxies.current = p;
    const sync = () => setState(readProxies(p));
    const watch = new MutationObserver(sync);
    watch.observe(box, {attributes: true, subtree: true, childList: true, characterData: true});
    sync();
    return () => {
      watch.disconnect();
      // draw.js takes off everything it put on: board, document, window and media-query listeners.
      created.destroy();
      boardEl.removeEventListener('pointerdown', hide, true);
      boardEl.removeEventListener('pointerdown', restore, true);
      boardEl.removeEventListener('pointerup', afterStroke, true);
      boardEl.removeEventListener('pointercancel', afterStroke, true);
      boardEl.removeEventListener('click', click, true);
      if (layer.current === created) { layer.current = null; proxies.current = null; }
    };
  }, [boardEl, svgEl]);

  // Something new on the board: its drawings and their history go.
  useEffect(() => { layer.current?.reset(); }, [positionKey, boardEl]);
  // The board flipped: the same drawings, drawn from the other side.
  useEffect(() => { layer.current?.render(); }, [orientation]);

  const press = useCallback((kind, value) => {
    const p = proxies.current;
    if (!p) return;
    if (kind === 'fade') {
      p.fade.value = String(value);
      p.fade.dispatchEvent(new Event('input'));
      return;
    }
    const find = (list, key) => list.find(b => b.dataset[key] === value);
    const button = kind === 'mode' ? find(p.modes, 'mode') : kind === 'tool' ? find(p.tools, 'tool') : kind === 'color' ? find(p.colors, 'color') : kind === 'size' ? find(p.sizes, 'size') : p[kind];
    button?.click();
  }, []);

  const overlay = <svg ref={setSvgEl} className="sn-ink" viewBox="0 0 80 80" aria-hidden="true" focusable="false"/>;
  return {boardRef: setBoardEl, overlay, drawMode: state.drawMode, mode: state.mode, state, press, ready: !!boardEl && !!svgEl};
}

/**
 * The toolbar under the board, as on the puzzle page: the Move · Faint · Draw switch; in Faint,
 * how faint; in Draw, the kit (tool, size, ink, Undo, Clear), every button with its name.
 */
export function PenToolbar({pens, disabled = false}) {
  const {state, press} = pens;
  const hintId = 'sn-pens-hint', modeRefs = useRef([]);
  const off = disabled || !pens.ready;
  // A radio group: arrow keys move between the modes (and, like the puzzle page, keep the key
  // from also stepping through the game's moves).
  const modeKey = (event, i) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (i + step + PEN_MODES.length) % PEN_MODES.length;
    press('mode', PEN_MODES[next][0]);
    modeRefs.current[next]?.focus();
  };
  return <section className="sn-pens" data-mode={state.mode} aria-label="Draw on the board">
    <div className="sn-pens__row">
      <div className="sn-pens__modes" role="radiogroup" aria-label="Board mode" aria-describedby={hintId}>
        {PEN_MODES.map(([mode, name, title], i) => <button key={mode} ref={el => { modeRefs.current[i] = el; }} type="button" role="radio" className="sn-pens__modebtn" data-mode={mode} aria-checked={state.mode === mode} tabIndex={state.mode === mode ? 0 : -1} title={title} disabled={off} onClick={() => press('mode', mode)} onKeyDown={e => modeKey(e, i)}>{mode === 'draw' && <PenIcon name="pen"/>}{name}</button>)}
      </div>
      {state.mode === 'faint' && <label className="sn-pens__fade"><span className="sn-pens__fade-label">How faint</span><input type="range" min={PEN_FADES.min} max={PEN_FADES.max} step={PEN_FADES.step} value={state.fade} aria-describedby="sn-pens-fade-out" onChange={e => press('fade', e.target.value)}/><output className="sn-pens__fade-out" id="sn-pens-fade-out">{state.fade}%</output></label>}
    </div>
    {state.mode === 'draw' && <div className="sn-pens__kit">
      <div className="sn-pens__set" role="group" aria-label="Drawing tool">
        {PEN_TOOLS.map(([tool, name, label]) => <button key={tool} type="button" className="sn-pens__pick sn-pens__pick--named" data-tool={tool} aria-label={label} title={name} aria-pressed={state.tool === tool} onClick={() => press('tool', tool)}><PenIcon name={tool}/><span className="sn-pens__name" aria-hidden="true">{name}</span></button>)}
      </div>
      <div className="sn-pens__set" role="group" aria-label="Line size">
        {PEN_SIZES.map(([size, name, label]) => <button key={size} type="button" className="sn-pens__pick sn-pens__pick--named" data-size={size} aria-label={label} title={name} aria-pressed={state.size === size} onClick={() => press('size', size)}><span className="sn-pens__sizebox" aria-hidden="true"><span className={`sn-pens__size sn-pens__size--${size}`}/></span><span className="sn-pens__name" aria-hidden="true">{name}</span></button>)}
      </div>
      <div className="sn-pens__set sn-pens__inks" role="group" aria-label="What the ink means">
        {PEN_INKS.map(([color, role, label]) => <button key={color} type="button" className={`sn-pens__pick sn-pens__ink sn-tone--${color}`} data-color={color} aria-label={label} title={label} aria-pressed={state.color === color} onClick={() => press('color', color)}><span className="sn-pens__dot" aria-hidden="true"/><span className="sn-pens__role" aria-hidden="true">{role}</span></button>)}
      </div>
      <div className="sn-pens__keep">
        <button type="button" className="sn-pens__act" aria-label="Undo the last drawing" disabled={!state.canUndo} onClick={() => press('undo')}>Undo</button>
        <button type="button" className="sn-pens__act" aria-label="Clear all drawings" disabled={!state.canClear} onClick={() => press('clear')}>Clear</button>
      </div>
    </div>}
    <p className="sn-pens__hint" id={hintId} aria-live="polite">{state.hint}</p>
  </section>;
}
