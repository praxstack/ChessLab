import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {settingDefaults, normalizeSettings, pieceSet, boardThemes} from './settings-state.js';

test('stored preferences from older builds load with the shipped piece set',()=>{
 assert.equal(settingDefaults.pieceSet,'cburnett');
 assert.equal(normalizeSettings({pieceSet:'chesscom',coordinates:false}).pieceSet,pieceSet.id);
 assert.equal(normalizeSettings({coordinates:false}).coordinates,false);
 for(const bad of [null,[],'text',7])assert.deepEqual(normalizeSettings(bad),settingDefaults);
});

test('board themes from older builds map onto the original themes',()=>{
 assert.equal(settingDefaults.boardTheme,'slate');
 assert.equal(normalizeSettings({boardTheme:'green'}).boardTheme,'slate');
 assert.equal(normalizeSettings({boardTheme:'brown'}).boardTheme,'walnut');
 assert.equal(normalizeSettings({boardTheme:'blue'}).boardTheme,'blue');
 assert.equal(normalizeSettings({boardTheme:'neon'}).boardTheme,'slate');
});

// OA-003: coordinates sit above the last-move and selection overlays, so check them on every state.
test('board coordinates keep 4.5:1 contrast on plain and highlighted squares in every theme',()=>{
 const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,''),rules=new Map();
 for(const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))for(const selector of selectors.split(',').map(s=>s.trim().replace(/\s+/g,' '))){
  const declared=rules.get(selector)||{};for(const part of body.split(';')){const i=part.indexOf(':');if(i>0)declared[part.slice(0,i).trim()]=part.slice(i+1).trim();}rules.set(selector,declared);
 }
 // The first selector that declares the property wins, so list them from most to least specific.
 const colour=(property,...selectors)=>{for(const selector of selectors){const value=rules.get(selector)?.[property]?.match(/#[0-9a-f]{3,8}\b/i)?.[0];if(value)return value;}throw new Error(`No ${property} for ${selectors[0]}`);};
 const channels=hex=>{let h=hex.slice(1);if(h.length<6)h=[...h].map(c=>c+c).join('');return {rgb:[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),alpha:h.length===8?parseInt(h.slice(6),16)/255:1};};
 const over=(top,bottom)=>{const t=channels(top),b=channels(bottom);return '#'+t.rgb.map((c,i)=>Math.round(t.alpha*c+(1-t.alpha)*b.rgb[i]).toString(16).padStart(2,'0')).join('');};
 const luminance=hex=>channels(hex).rgb.map(c=>c/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
 const ratio=(a,b)=>{const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (high+0.05)/(low+0.05);};
 const lastMove=colour('box-shadow','[data-board-theme] .square.last-move'),selection=colour('background','.square.selected:after');
 for(const [theme] of boardThemes)for(const kind of ['light','dark']){
  const themed=`[data-board-theme=${theme}] .square.${kind}`,plain=colour('background',themed,`.square.${kind}`);
  const moved=over(lastMove,colour('background',themed,`.square.${kind}.last-move`));
  const ink=(...states)=>colour('color',...states.flatMap(state=>[`[data-board-theme=${theme}] .square.${kind}.${state} .rank`,`.square.${kind}.${state} .rank`]),themed,`.square.${kind}`);
  for(const [state,background,text] of [['plain',plain,ink()],['last move',moved,ink('last-move')],['selected',over(selection,plain),ink('selected')],['last move and selected',over(selection,moved),ink('selected','last-move')]]){
   const contrast=ratio(text,background);assert.ok(contrast>=4.5,`${theme} ${kind} ${state}: ${text} on ${background} is ${contrast.toFixed(2)}:1`);
  }
 }
});
