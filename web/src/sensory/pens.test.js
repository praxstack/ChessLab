import test from 'node:test';
import assert from 'node:assert/strict';
import {TOOLS, COLORS, SIZES, ROLES, NIBS} from '../../../site/public/assets/draw.js';
import {PEN_TOOLS, PEN_INKS, PEN_SIZES} from './pen-options.js';

test('the toolbar only offers pens, inks and sizes the drawing layer knows', () => {
  for (const [tool] of PEN_TOOLS) assert.ok(TOOLS.includes(tool), tool);
  assert.deepEqual(PEN_INKS.map(([color]) => color).sort(), [...COLORS].sort(), 'every ink, no more');
  assert.deepEqual(PEN_SIZES.map(([size]) => size), Object.keys(SIZES));
  assert.deepEqual(PEN_TOOLS.slice(0, 3).map(([tool]) => tool), NIBS, 'the three freehand nibs come first');
});

test('the inks keep the puzzle page meaning: green Mine, red Theirs, blue Idea', () => {
  assert.deepEqual(Object.fromEntries(PEN_INKS.map(([color, role]) => [color, role])), ROLES);
  assert.deepEqual(ROLES, {green: 'Mine', red: 'Theirs', blue: 'Idea'});
});

test('the first pen is the plain pen, the fallback for a remembered tool the app does not offer', () => {
  assert.equal(PEN_TOOLS[0][0], 'pen');
});
