// What the app's pen toolbar offers, a subset of the puzzle page's pens (draw.js).
import {ROLES, MODES, FADES} from '../../../site/public/assets/draw.js';

/** The board's three modes, worded as on the puzzle page: [mode, name, what it does]. */
export const PEN_MODES = [
  ['move', 'Move', 'Move pieces only. Drawings hidden; nothing can draw.'],
  ['faint', 'Faint', 'Move pieces only. Drawings stay, faint; nothing can draw.'],
  ['draw', 'Draw', 'Draw on the board.'],
];
/** How faint the drawings show in Faint, in percent, as on the puzzle page's slider. */
export const PEN_FADES = {min: FADES[0], max: FADES[FADES.length - 1], step: FADES[1] - FADES[0]};
export {MODES};

/** The pens offered over the app's board: three freehand nibs, then arrow and circle. [tool, name, label] */
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
/** [size, name, label] */
export const PEN_SIZES = [['thin', 'Thin', 'Thin line'], ['medium', 'Medium', 'Medium line'], ['thick', 'Thick', 'Thick line']];
