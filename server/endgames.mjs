import {readFileSync} from 'node:fs';
export const endgames=JSON.parse(readFileSync(new URL('./endgames.json',import.meta.url),'utf8'));
export const endgameById=id=>endgames.find(item=>item.id===id);
