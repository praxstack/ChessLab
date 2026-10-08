// Browser preferences. Stored values from older builds are normalized on load.
export const pieceSet = {id:'cburnett', label:'Classic (cburnett)'};
export const boardThemes = [['slate','Slate & sand'],['walnut','Walnut & ivory'],['blue','Blue'],['gray','Gray']];
const renamedThemes = {green:'slate', brown:'walnut'};
export const settingDefaults={coordinates:true,legalMoves:true,lastMove:true,arrows:true,sound:true,orientation:'auto',movetime:3000,lines:3,threads:2,pace:1000,boardTheme:'slate',pieceSet:pieceSet.id,animation:200,notation:'figurine',coachAvatar:true,classification:true,autoplay:true,analysisEngine:'stockfish18',reviewStrength:1000};

export function normalizeSettings(stored) {
  const value = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  // One piece set ships with the app; earlier builds stored other piece and board theme ids.
  const theme = renamedThemes[value.boardTheme] ?? value.boardTheme;
  return {...settingDefaults, ...value, pieceSet:pieceSet.id, boardTheme:boardThemes.some(([id])=>id===theme)?theme:settingDefaults.boardTheme};
}
