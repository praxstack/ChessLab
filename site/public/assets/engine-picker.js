// The engine picker: a pop-up card that lists every engine in
// engine-catalog.js with its size, licence and source. Light engines switch
// at a tap. A heavy one first shows a warning (size, rough time, memory,
// WebGPU, that the tab may freeze or crash) and asks a second time,
// "Yes, download it", before anything downloads.
//
// Phones and tablets see the light engines first, with "Show all engines".

import { ENGINES, formatBytes, isHandheld, needsWarning, roughTimes, visibleEngines } from './engine-catalog.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href, text, label) {
  const a = el('a', '', text);
  a.href = href;
  if (/^https?:/.test(href)) a.rel = 'noopener';
  if (label) a.setAttribute('aria-label', label);
  return a;
}

const sizeText = (e) => `${e.files.some((f) => f.approx) ? 'about ' : ''}${formatBytes(e.bytes)}`;

function detectHandheld() {
  try {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return isHandheld({ coarse, width: (window.screen && window.screen.width) || window.innerWidth });
  } catch {
    return false;
  }
}

/**
 * getActive() is the engine in use; isSaved(entry) says whether it is kept on
 * this device; onChoose(entry) is called once the learner has picked a ready
 * engine (after the warning and its second yes, for a heavy one).
 */
export function createPicker({ getActive, isSaved = async () => false, onChoose }) {
  const pop = $('engine-pop');
  const handheld = detectHandheld();
  let showAll = false;
  let pending = null; // the entry the warning is about
  let opener = $('engine-pick');

  function close() {
    if (typeof pop.close === 'function') pop.close();
    else pop.removeAttribute('open');
  }

  function showList() {
    pending = null;
    $('engine-warn').hidden = true;
    $('engine-list-view').hidden = false;
  }

  function row(e, active, saved) {
    const li = el('li', 'engines__row');
    li.dataset.engine = e.id;
    li.dataset.status = e.status;
    if (e.id === active.id) li.classList.add('is-active');

    const head = el('p', 'engines__head');
    head.append(el('span', 'engines__name', e.name));
    if (e.id === active.id) head.append(el('span', 'engines__tag engines__tag--on', 'in use'));
    if (saved) head.append(el('span', 'engines__tag', 'on this device'));
    if (needsWarning(e)) head.append(el('span', 'engines__tag engines__tag--heavy', 'heavy'));
    li.append(head);

    li.append(el('p', 'engines__about', e.about));

    const meta = el('p', 'engines__meta');
    meta.append(el('span', 'engines__bytes', sizeText(e)), ' · ', link(e.licenseUrl, e.license, `${e.name} licence: ${e.license}`), ' · ', link(e.source, 'source', `${e.name} source`));
    li.append(meta);

    let btn = null;
    if (e.status === 'ready') {
      if (e.id === active.id) {
        btn = el('button', 'btn btn--plain btn--small engines__use', 'In use');
        btn.disabled = true;
      } else {
        btn = el('button', `btn btn--small engines__use ${needsWarning(e) && !saved ? 'btn--plain' : 'btn--pen'}`, needsWarning(e) && !saved ? `Download ${formatBytes(e.bytes)}…` : 'Use this');
      }
    } else if (needsWarning(e)) {
      btn = el('button', 'btn btn--plain btn--small engines__use', 'What it would take');
    }
    if (btn) {
      btn.type = 'button';
      btn.dataset.engine = e.id;
      li.append(btn);
    }
    return li;
  }

  async function render() {
    const active = getActive();
    const list = visibleEngines({ handheld, showAll });
    const saved = new Map(await Promise.all(list.filter((e) => e.status === 'ready').map(async (e) => [e.id, await isSaved(e)])));
    const ready = $('engine-ready');
    const soon = $('engine-soon');
    ready.replaceChildren(...list.filter((e) => e.status === 'ready').map((e) => row(e, active, saved.get(e.id))));
    soon.replaceChildren(...list.filter((e) => e.status !== 'ready').map((e) => row(e, active, false)));
    const hiddenCount = ENGINES.length - list.length;
    $('engine-handheld').hidden = !handheld;
    $('engine-all').setAttribute('aria-pressed', String(showAll));
    $('engine-all').textContent = showAll ? 'Light engines only' : `Show all engines (${hiddenCount} more)`;
  }

  function warn(e, saved) {
    pending = e;
    $('engine-warn-title').textContent = e.status === 'ready' ? `Download ${e.name}?` : `${e.name}: before it downloads`;
    $('engine-warn-size').textContent = sizeText(e);
    const items = [];
    const conn = navigator.connection || {};
    const times = roughTimes(e.bytes, Number(conn.downlink) || 0);
    items.push(['Rough time', times.map((t) => `${t.text} ${t.label}`).join('; ') + '.']);
    if (conn.saveData || conn.type === 'cellular') items.push(['Data', 'You seem to be on mobile data or Data Saver. All of it counts against your data.']);
    if (e.webgpu === 'needs') {
      const has = 'gpu' in navigator;
      items.push(['WebGPU', has ? 'It needs WebGPU, which this browser has.' : 'It needs WebGPU, and this browser doesn’t have it, so it won’t run here.']);
    } else if (e.webgpu === 'better') {
      items.push(['WebGPU', 'It runs far faster with WebGPU; without it, expect long waits.']);
    } else {
      items.push(['WebGPU', 'Not needed: it runs on the processor.']);
    }
    items.push(['Memory', `It needs a lot of memory: ${e.memory || 'more than most phones can spare'}.`]);
    items.push(['Risk', `The tab may freeze for a while, or crash. If it crashes, reload: the page goes back to Stockfish 19 Lite by itself.`]);
    items.push(['Devices', e.devices || 'Fine on a recent computer or iPad. Older phones and tablets may close the tab.']);
    if (e.status === 'ready') items.push(['Stopping', 'You can stop the download at any time with Stop download under the board.']);
    $('engine-warn-list').replaceChildren(
      ...items.map(([label, text]) => {
        const li = el('li');
        li.append(el('b', '', `${label}: `), text);
        return li;
      }),
    );
    const runnable = e.status === 'ready';
    $('engine-yes').hidden = !runnable;
    $('engine-yes').textContent = saved ? 'Yes, use it' : 'Yes, download it';
    $('engine-no').textContent = runnable ? 'Cancel' : 'Back to the list';
    $('engine-warn-soon').hidden = runnable;
    $('engine-list-view').hidden = true;
    $('engine-warn').hidden = false;
    pop.scrollTop = 0;
    $('engine-no').focus({ preventScroll: true }); // the safe answer has the focus
  }

  async function open(from) {
    if (from) opener = from;
    showList();
    if (typeof pop.showModal === 'function') pop.showModal();
    else pop.setAttribute('open', '');
    await render();
    // Focus the close button, so the card opens at its top (title, and the phone note) rather than scrolled to a row.
    $('engine-close').focus();
    pop.scrollTop = 0;
  }

  pop.addEventListener('click', async (ev) => {
    if (ev.target === pop) return close(); // a tap on the dimmed page around it
    const use = ev.target.closest('.engines__use');
    if (!use || use.disabled) return;
    const e = ENGINES.find((x) => x.id === use.dataset.engine);
    if (!e) return;
    const saved = e.status === 'ready' && (await isSaved(e));
    if (needsWarning(e) && !saved) return warn(e, saved);
    if (e.status !== 'ready') return;
    close();
    onChoose(e);
  });

  $('engine-yes').addEventListener('click', () => {
    const e = pending;
    if (!e || e.status !== 'ready') return;
    close();
    onChoose(e);
  });
  $('engine-no').addEventListener('click', () => {
    const from = pending && pop.querySelector(`.engines__use[data-engine="${pending.id}"]`);
    showList();
    (from || $('engine-close')).focus();
  });
  $('engine-close').addEventListener('click', close);
  $('engine-all').addEventListener('click', () => {
    showAll = !showAll;
    render();
  });
  pop.addEventListener('close', () => {
    showList();
    if (opener) opener.focus({ preventScroll: true });
  });

  return { open, render, close, handheld };
}
