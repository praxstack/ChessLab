// Stockfish 19 Lite (Lichess build) with its small net; see run.js.
import '../wasm-memory-fit.js'; // first, so iPhone and iPad Safari can give the engine its memory
import Sf from './sf_19_smallnet.js';
import { run } from './run.js';

run(Sf);
