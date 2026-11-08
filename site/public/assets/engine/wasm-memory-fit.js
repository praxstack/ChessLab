// Lets the engines start on iPhone and iPad.
//
// onnxruntime-web (Maia, Lc0, DeepMind) asks for a shared WebAssembly memory
// that may grow to 4 GB, and the Lichess Stockfish builds ask for 2 GB. Safari
// on iPhone and iPad can't set that much aside for one tab, so the request
// fails with "RangeError: Out of memory" before the engine even loads. These
// engines never need that much. When the first request fails, this retries
// with a smaller ceiling, from 2 GB down to 256 MB. A WebAssembly program
// accepts a memory with a lower ceiling than it declares, so nothing else
// changes. Browsers that grant the first request never get here.
//
// Import this before the engine's own code, so it is in place first. Module workers import it;
// classic workers load it with importScripts, so it keeps its names inside a block, out of the
// worker's shared global scope.

{
  const Real = WebAssembly.Memory;
  const CEILINGS = [32768, 16384, 8192, 4096]; // in 64 KB pages: 2 GB, 1 GB, 512 MB, 256 MB

  const Memory = function Memory(desc) {
    try {
      return new Real(desc);
    } catch (err) {
      if (!(err instanceof RangeError) || !desc || !(desc.maximum > 0)) throw err;
      for (const maximum of CEILINGS) {
        if (maximum >= desc.maximum || maximum < (desc.initial || 0)) continue;
        try {
          return new Real({ ...desc, maximum });
        } catch (e) {
          if (!(e instanceof RangeError)) throw e;
        }
      }
      throw err;
    }
  };
  Memory.prototype = Real.prototype;
  WebAssembly.Memory = Memory;
}
