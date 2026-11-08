// A classic-worker front for Stockfish 14.1 (stockfish.js npm 14.1.0, file unchanged), which only
// comes as a several-cores build. It loads the memory fit first, then the engine. The engine's helper
// threads start from this same file, so they get the fit too.
importScripts('wasm-memory-fit.js', 'stockfish-14.1.js');
