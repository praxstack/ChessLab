// Stockfish 19 (Lichess build) with its full net; see run.js.
import '../wasm-memory-fit.js'; // first, so iPhone and iPad Safari can give the engine its memory
import Sf from './sf_19.js';
import { run } from './run.js';

run(Sf);
