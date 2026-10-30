// What the app's pen toolbar offers, a subset of the puzzle page's pens (draw.js).
import {ROLES} from '../../../site/public/assets/draw.js';

/** The pens offered over the app's board: three freehand nibs, then arrow and circle. */
export const PEN_TOOLS = [
  ['pen', 'Pen', 'Pen: smooth ink, freehand'],
  ['pencil', 'Pencil', 'Pencil: soft grainy line, freehand'],
  ['marker', 'Marker', 'Marker: wide see-through highlight, freehand'],
  ['arrow', 'Arrow', 'Arrow from one square to another'],
  ['circle', 'Circle', 'Circle a square'],
];
/** The inks, in the puzzle page's meaning: green is your plan, red their threats, blue an idea. */
export const PEN_INKS = [
  ['green', ROLES.green, 'Mine: your plan, in green'],
  ['red', ROLES.red, 'Theirs: their threats, in red with a double head'],
  ['blue', ROLES.blue, 'Idea: a move you are testing, in blue'],
];
export const PEN_SIZES = [['thin', 'Thin line'], ['medium', 'Medium line'], ['thick', 'Thick line']];
