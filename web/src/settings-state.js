// Browser preferences. Stored values from older builds are normalized on load.
export const pieceSet = {id:'cburnett', label:'Classic (cburnett)'};
export const boardThemes = [['book','Book diagram'],['slate','Slate & sand'],['walnut','Walnut & ivory'],['blue','Blue'],['gray','Gray']];
const renamedThemes = {green:'slate', brown:'walnut'};
// Light is the paper notebook, dark is the chalkboard; system follows the device.
export const colorThemes = [['system','Match this device'],['light','Light (paper)'],['dark','Dark (chalkboard)']];
export const settingDefaults={coordinates:true,legalMoves:true,lastMove:true,arrows:true,sound:true,orientation:'auto',movetime:3000,lines:3,threads:2,pace:1000,boardTheme:'book',theme:'system',pieceSet:pieceSet.id,animation:200,notation:'figurine',coachAvatar:true,classification:true,autoplay:true,analysisEngine:'stockfish18',reviewStrength:1000,thinkingTime:1500};
// How long the browser engine thinks for analysis, review and hints. Phones are slower, so Quick
// keeps them responsive; Deep is stronger and slower.
export const thinkingTimes = [[500,'Quick (0.5 sec)'],[1500,'Normal (1.5 sec)'],[4000,'Deep (4 sec)']];

export function normalizeSettings(stored) {
  const value = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  // One piece set ships with the app; earlier builds stored other piece and board theme ids.
  // Settings saved before the colour theme existed carry the old default board, slate; they move to
  // the new default, the book diagram. A slate board chosen after that stays slate.
  const legacyDefault = value.boardTheme === 'slate' && !('theme' in value);
  const theme = legacyDefault ? settingDefaults.boardTheme : renamedThemes[value.boardTheme] ?? value.boardTheme;
  const colorTheme = colorThemes.some(([id])=>id===value.theme) ? value.theme : settingDefaults.theme;
  const thinkingTime = thinkingTimes.some(([ms])=>ms===value.thinkingTime)?value.thinkingTime:settingDefaults.thinkingTime;
  return {...settingDefaults, ...value, pieceSet:pieceSet.id, boardTheme:boardThemes.some(([id])=>id===theme)?theme:settingDefaults.boardTheme, theme:colorTheme, thinkingTime};
}

// The search settings the browser build sends: one thinking time for analysis and review, and one
// thread, since the browser engine is single-threaded. The server build keeps its own settings.
export function browserSearchSettings(settings) {
  return {...settings, movetime:settings.thinkingTime, reviewStrength:settings.thinkingTime, threads:1};
}
