// A classic-worker front for Stockfish 19 on several cores. It loads the memory fit first, so iPhone
// and iPad Safari (which refuse its 2 GB shared memory) can still start it, then the engine itself.
// The engine's helper threads start from this same file, so they get the fit too.
importScripts('wasm-memory-fit.js', 'stockfish-19.js');
