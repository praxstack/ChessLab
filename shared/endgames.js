import endgames from './endgames.json' with {type:'json'};
export {endgames};
export const endgameById=id=>endgames.find(item=>item.id===id);
