// The learner's own pens over the app's board, reusing the puzzle page's drawing layer
// (site/public/assets/draw.js) as it is. draw.js draws into an SVG over the board and wires
// itself to a set of buttons; here those buttons are small detached proxies, and the toolbar
// the learner sees is ordinary React that clicks them. So React owns the toolbar (labels,
// pressed states, keyboard) and draw.js owns the ink, with no copy of either.
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createDrawLayer} from '../../../site/public/assets/draw.js';
import {PEN_TOOLS, PEN_INKS, PEN_SIZES} from './pen-options.js';
import './sensory.css';

const WAVE = 'M3 17 C3.5 15.67 5 9.33 6 9 C7 8.67 7.83 15.33 9 15 C10.17 14.67 11.83 7.17 13 7 C14.17 6.83 14.83 14.17 16 14 C17.17 13.83 19.33 7.33 20 6';
const ICONS = {
  draw: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 7l3 3'],
  pen: [WAVE],
  pencil: [WAVE],
  marker: ['M4 15 C7 12 9 10.5 12 11 C15 11.5 17 10 20 8'],
  arrow: ['M4 19 L19 5', 'M12.5 5.5 L19 5 L18.5 11.5'],
  circle: ['M12 4.5 C17 4.5 20 7.5 20 12 C20 16.5 16.5 19.5 12 19.5 C7.5 19.5 4 16.5 4 12 C4 8 7 4.6 10.6 5.4'],
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

/** Read the proxies back: draw.js keeps its state in their aria-pressed, disabled and text. */
function readProxies(p) {
  const pressed = list => list.find(b => b.getAttribute('aria-pressed') === 'true');
  return {
    drawMode: p.mode.getAttribute('aria-pressed') === 'true',
    visible: p.show.getAttribute('aria-pressed') !== 'false',
    canUndo: !p.undo.disabled,
    canClear: !p.clear.disabled,
    tool: pressed(p.tools)?.dataset.tool || null,
    color: pressed(p.colors)?.dataset.color || null,
    size: pressed(p.sizes)?.dataset.size || null,
    hint: p.hint.textContent,
  };
}

const idle = {drawMode: false, visible: true, canUndo: false, canClear: false, tool: 'pen', color: 'green', size: 'medium', hint: ''};

/**
 * The pens for one board. positionKey: drawings belong to the position, so a new one clears
 * them (draw.js's reset). orientation: 'w' or 'b'; a flip redraws them flipped.
 * studyMarks: true while the board's own saved study marks take the right mouse button.
 * Returns refs and props for <Board> and the state <PenToolbar> shows.
 */
export function usePens({positionKey, orientation = 'w', studyMarks = false}) {
  const [boardEl, setBoardEl] = useState(null), [svgEl, setSvgEl] = useState(null), [state, setState] = useState(idle);
  const layer = useRef(null), proxies = useRef(null), orientationRef = useRef(orientation), studyRef = useRef(studyMarks);
  orientationRef.current = orientation;
  studyRef.current = studyMarks;

  useEffect(() => {
    if (!boardEl || !svgEl) return undefined;
    const box = document.createElement('div');
    const p = {
      mode: proxyButton(box), show: proxyButton(box), undo: proxyButton(box), clear: proxyButton(box), hint: document.createElement('p'),
      tools: PEN_TOOLS.map(([tool]) => proxyButton(box, {tool})),
      colors: PEN_INKS.map(([color]) => proxyButton(box, {color})),
      sizes: PEN_SIZES.map(([size]) => proxyButton(box, {size})),
    };
    box.append(p.hint);
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
      created.reset();
      boardEl.removeEventListener('pointerdown', hide, true);
      boardEl.removeEventListener('pointerdown', restore, true);
      boardEl.removeEventListener('pointerup', afterStroke, true);
      boardEl.removeEventListener('pointercancel', afterStroke, true);
      boardEl.removeEventListener('click', click, true);
      if (layer.current === created) { layer.current = null; proxies.current = null; }
    };
  }, [boardEl, svgEl]);

  // A new position on the board: its drawings and their history go.
  useEffect(() => { layer.current?.reset(); }, [positionKey, boardEl]);
  // The board flipped: the same drawings, drawn from the other side.
  useEffect(() => { layer.current?.render(); }, [orientation]);

  const press = useCallback((kind, value) => {
    const p = proxies.current;
    if (!p) return;
    const button = kind === 'tool' ? p.tools.find(b => b.dataset.tool === value) : kind === 'color' ? p.colors.find(b => b.dataset.color === value) : kind === 'size' ? p.sizes.find(b => b.dataset.size === value) : p[kind];
    button?.click();
  }, []);

  const overlay = <svg ref={setSvgEl} className="sn-ink" viewBox="0 0 80 80" aria-hidden="true" focusable="false"/>;
  return {boardRef: setBoardEl, overlay, drawMode: state.drawMode, state, press, ready: !!boardEl && !!svgEl};
}

/** The toolbar under the board: Draw, the nib, the size, the ink, then Undo, Clear and Show. */
export function PenToolbar({pens, disabled = false}) {
  const {state, press} = pens;
  const hintId = 'sn-pens-hint';
  return <section className={`sn-pens ${state.drawMode ? 'is-on' : ''}`} aria-label="Draw on the board">
    <div className="sn-pens__row">
      <button type="button" className="sn-pens__mode" aria-pressed={state.drawMode} aria-describedby={hintId} disabled={disabled || !pens.ready} onClick={() => press('mode')} title={state.drawMode ? 'Draw is on: turn it off to move pieces' : 'Draw on the board'}><PenIcon name="draw"/><span>Draw</span></button>
      <div className="sn-pens__set" role="group" aria-label="Drawing tool">
        {PEN_TOOLS.map(([tool, title, label]) => <button key={tool} type="button" className="sn-pens__pick" aria-label={label} title={title} aria-pressed={state.tool === tool} onClick={() => press('tool', tool)}><PenIcon name={tool}/></button>)}
      </div>
      <div className="sn-pens__set" role="group" aria-label="Line size">
        {PEN_SIZES.map(([size, label]) => <button key={size} type="button" className="sn-pens__pick" aria-label={label} title={label} aria-pressed={state.size === size} onClick={() => press('size', size)}><span className={`sn-pens__size sn-pens__size--${size}`} aria-hidden="true"/></button>)}
      </div>
      <div className="sn-pens__set sn-pens__inks" role="group" aria-label="What the ink means">
        {PEN_INKS.map(([color, role, label]) => <button key={color} type="button" className={`sn-pens__pick sn-pens__ink sn-tone--${color}`} aria-label={label} title={label} aria-pressed={state.color === color} onClick={() => press('color', color)}><span className="sn-pens__dot" aria-hidden="true"/><span className="sn-pens__role">{role}</span></button>)}
      </div>
      <div className="sn-pens__keep">
        <button type="button" className="sn-pens__act" aria-label="Undo the last drawing" disabled={!state.canUndo} onClick={() => press('undo')}>Undo</button>
        <button type="button" className="sn-pens__act" aria-label="Clear all drawings" disabled={!state.canClear} onClick={() => press('clear')}>Clear</button>
        <button type="button" className="sn-pens__show" aria-pressed={state.visible} onClick={() => press('show')}>Show drawings</button>
      </div>
    </div>
    <p className="sn-pens__hint" id={hintId} aria-live="polite">{state.hint}</p>
  </section>;
}
