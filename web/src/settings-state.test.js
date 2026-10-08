import test from 'node:test';
import assert from 'node:assert/strict';
import {settingDefaults, normalizeSettings, pieceSet} from './settings-state.js';

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
