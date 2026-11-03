// Fairy-Stockfish 14 (Lichess build); for plain chess it needs no net. See run.js.
import '../wasm-memory-fit.js'; // first, so iPhone and iPad Safari can give the engine its memory
import Sf from './fsf_14.js';
import { run } from './run.js';

run(Sf);
