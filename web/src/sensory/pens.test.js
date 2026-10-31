import test from 'node:test';
import assert from 'node:assert/strict';
import {TOOLS, COLORS, SIZES, ROLES, NIBS, MODES, FADES, inkFor} from '../../../site/public/assets/draw.js';
import {PEN_TOOLS, PEN_INKS, PEN_SIZES, PEN_MODES, PEN_FADES} from './pen-options.js';

test('the toolbar only offers pens, inks and sizes the drawing layer knows', () => {
  for (const [tool] of PEN_TOOLS) assert.ok(TOOLS.includes(tool), tool);
  assert.deepEqual(PEN_INKS.map(([color]) => color).sort(), [...COLORS].sort(), 'every ink, no more');
  assert.deepEqual(PEN_SIZES.map(([size]) => size), Object.keys(SIZES));
  assert.deepEqual(PEN_TOOLS.slice(0, 3).map(([tool]) => tool), NIBS, 'the three freehand nibs come first');
});

test('every tool and size has a short name to show under its picture', () => {
  for (const [key, name, label] of [...PEN_TOOLS, ...PEN_SIZES]) {
    assert.ok(name && name.length <= 7, `${key} has a short name`);
    assert.ok(label.startsWith(name), `${key}'s spoken label starts with its visible name`);
  }
});

test('the mode switch is Move, Faint, Draw, in the puzzle page order and words', () => {
  assert.deepEqual(PEN_MODES.map(([mode]) => mode), MODES);
  assert.deepEqual(PEN_MODES.map(([, name]) => name), ['Move', 'Faint', 'Draw']);
  assert.deepEqual(PEN_FADES, {min: 10, max: 90, step: 10});
  assert.ok(FADES.includes(50));
  assert.deepEqual(inkFor('faint'), {hidden: false, opacity: 0.5}, 'Faint starts at 50%');
  assert.deepEqual(inkFor('move'), {hidden: true, opacity: 1});
});

test('the inks keep the puzzle page meaning: green Mine, red Theirs, blue Idea', () => {
  assert.deepEqual(Object.fromEntries(PEN_INKS.map(([color, role]) => [color, role])), ROLES);
  assert.deepEqual(ROLES, {green: 'Mine', red: 'Theirs', blue: 'Idea'});
});

test('the first pen is the plain pen, the fallback for a remembered tool the app does not offer', () => {
  assert.equal(PEN_TOOLS[0][0], 'pen');
});
