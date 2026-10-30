import {createEngine, ENGINE_URL} from './engine.js';
import {createTablebase, withTablebase} from './tablebase.js';
import {createLocalOpponent} from './opponent.js';

export {createEngine, createTablebase, withTablebase, createLocalOpponent, ENGINE_URL};

// True where the real engine can run: a browser with Web Workers and WebAssembly.
export const browserEngineSupported = () => typeof Worker === 'function' && typeof WebAssembly === 'object';

// The app's engine: Stockfish 19 Lite in a worker, with Lichess tablebase answers in small endgames.
export function createBrowserEngine({workerUrl = ENGINE_URL} = {}) {
  return withTablebase(createEngine({workerUrl}), createTablebase());
}
