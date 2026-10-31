// Every chess engine the puzzle page can offer, in one list.
//
// Each entry: id, name, family, about (plain words), bytes (what the learner
// downloads), license, licenseUrl, source (where its code or weights come
// from), device ('light' runs on any phone; 'heavy' is a big download that
// gets the warning first), status ('ready' runs now; 'soon' is listed but not
// wired up yet) and files.
//
// A ready engine's files have roles: 'worker' (the script the page starts),
// 'wasm' (handed to the script after #, as a blob URL), 'model' (the same,
// for a neural model), 'net' (a separate Stockfish net, loaded with
// setoption EvalFile) and 'runtime' (files the worker fetches by itself,
// listed for their size). `options` are UCI lines sent once it has said uciok
// (Maia-2's rating). `threads: true` runs on several cores and needs a
// cross-origin isolated page (see canRun). A plain-JavaScript engine is `scriptOnly`; one
// whose script is an ES module is `module`; `hash: 'raw'` passes the blob
// URL unencoded, for Stockfish 11. A file too big
// for Cloudflare Pages (25 MiB a file) lists its parts in joining order, each
// with its SHA-256, and the joined file's SHA-256; scripts/split-engine.mjs
// makes them and writes the same numbers to <file>.parts.json. Sizes marked `approx` are
// rounded from the catalog research (askthemove/puzzle-board/engine-catalog.md,
// checked 28 Oct 2026); the rest are exact byte counts of the published files.
//
// Plain data and pure functions only, so the tests can read it in Node.

export const DEFAULT_ENGINE = 'sf19-lite';

/** Anything bigger than this always gets the warning, whatever it is. */
export const HEAVY_BYTES = 100e6;

/** These families always get the warning, whatever their size: they need a neural-net runtime and lots of memory. */
export const HEAVY_FAMILIES = ['DeepMind searchless', 'Maia-2', 'Lc0 (Leela)', 'C1', 'Allie'];

const GPL = 'GPL-3.0';
const COPYING = '/assets/engine/COPYING.txt';
const GPL_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';
const AGPL_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';
const MIT_URL = 'https://opensource.org/license/mit';
const SFJS = 'https://github.com/nmrugg/stockfish.js';
const LICHESS_SF = 'https://github.com/lichess-org/stockfish-web';
const SF_NETS = 'https://tests.stockfishchess.org/nns';
const ORT = 'It would run with onnxruntime-web (MIT), which the page already loads for DeepMind 9M and Maia-1, but it isn’t wired up yet.';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const DM_SOURCE = 'https://huggingface.co/cstr/searchless-chess-onnx';
/** CC BY 4.0 asks for the authors, the licence and what was changed; the picker and the page footer show this. */
export const DM_CREDIT =
  'Model from “Grandmaster-Level Chess Without Search” (Ruoss et al., 2024), © 2024 DeepMind Technologies Limited, CC BY 4.0. Converted to ONNX by cstr, with no change to the weights; run here with onnxruntime-web (MIT).';
/** The sizes of the neural workers; the catalog test checks them against the files. */
const SEARCHLESS_WORKER_BYTES = 3786;
const MAIA_WORKER_BYTES = 3904;
const MAIA2_WORKER_BYTES = 3953;
const LC0_WORKER_BYTES = 3880;
/** GPL-3.0 asks that the authors and the source be named; the picker and the page footer show this. */
export const LC0_CREDIT =
  'Lc0 (Leela Chess Zero) networks by the LeelaChessZero authors and contributors, GPL-3.0, lczero.org, source github.com/LeelaChessZero/lc0. ONNX conversions by lczerolens (Hugging Face), weights stored here as 16-bit floats; run with onnxruntime-web (MIT) and a small Lc0-style search written for this page.';

const MAIA3_WORKER_BYTES = 3912;
/** AGPL-3.0 asks for the notice and the source; the picker and the page footer show this. */
export const MAIA3_CREDIT =
  'Maia-3 (Chessformer) by Daniel Monroe, George Eilender, Philip Chalmers, Zhenwei Tang and Ashton Anderson (CSSLab, University of Toronto, 2026), AGPL-3.0, source github.com/CSSLab/maia3. The published checkpoints, exported to ONNX for this page with their weights stored as 16-bit floats (how: site/tools/maia3-export in github.com/praxstack/ChessLab); run here with onnxruntime-web (MIT).';
/** MIT asks that the copyright notice be kept; the picker and the page footer show this. */
export const MAIA2_CREDIT =
  'Maia-2 by Zhenwei Tang, Difan Jiao, Reid McIlroy-Young, Jon Kleinberg, Siddhartha Sen and Ashton Anderson (CSSLab, University of Toronto, 2024), MIT licence, source github.com/CSSLab/maia2. The rapid model, exported to ONNX for this page with no change to its weights; run here with onnxruntime-web (MIT).';
/** GPL-3.0 asks that the authors and the source be named; the picker and the page footer show this. */
export const MAIA_CREDIT =
  'Maia by Reid McIlroy-Young, Siddhartha Sen, Jon Kleinberg and Ashton Anderson (CSSLab, University of Toronto, 2020), GPL-3.0, source github.com/CSSLab/maia-chess. Converted to ONNX by shermansiu; run here with onnxruntime-web (MIT).';

const file = (path, bytes, more = {}) => ({ path, bytes, ...more });
const sum = (files) => files.reduce((n, f) => n + f.bytes, 0);

function entry(e) {
  return { ...e, bytes: e.bytes ?? sum(e.files) };
}

/** onnxruntime-web 1.31.1 (MIT), fetched by the neural workers themselves. */
const ORT_FILES = [
  file('/assets/engine/ort/ort.wasm.bundle.min.mjs', 77024, { role: 'runtime' }),
  file('/assets/engine/ort/ort-wasm-simd-threaded.wasm', 14848852, { role: 'runtime' }),
];

/** DeepMind's bigger models, as cstr published them (weights already 16-bit, cast to 32-bit inside). */
const DM_MODELS = {
  '136m': file('/assets/engine/searchless-136m.onnx', 273016527, {
    role: 'model',
    sha256: '755c951db3e1d9789bb40e74fe3a34ddf8ee645f671ce7778656794514310495',
    parts: [
      file('/assets/engine/searchless-136m.onnx.part0', 24819685, { sha256: '3e2623969ee362497308fb4ba5cfc067eceb8aa45b26804089d695d222c4456f' }),
      file('/assets/engine/searchless-136m.onnx.part1', 24819685, { sha256: 'fbb91859ff116cf080c0e9bfc898a0aad7367b820771f3b27966131def4ed1c4' }),
      file('/assets/engine/searchless-136m.onnx.part2', 24819685, { sha256: 'bde060d9d6dfeab8fb88b75c7ac9d37e517a0469e6f29369094712fe89731594' }),
      file('/assets/engine/searchless-136m.onnx.part3', 24819684, { sha256: '9d6a4835e80c0d66694854058884a2a33ade60c374886d25e332e607231fad07' }),
      file('/assets/engine/searchless-136m.onnx.part4', 24819684, { sha256: '2a06cc3e75874e0cc35f28b8a2aed946e8e53c1258c2b41f60a83bde57efe853' }),
      file('/assets/engine/searchless-136m.onnx.part5', 24819684, { sha256: '6355238e339477945e02a19a4c5252fdeed64ebc9e416f7306f278e3c6aec7bc' }),
      file('/assets/engine/searchless-136m.onnx.part6', 24819684, { sha256: '849a30c9da28c1e747066a8ec1259d2d12171ba353d5ae7e9af2563edbd81158' }),
      file('/assets/engine/searchless-136m.onnx.part7', 24819684, { sha256: '17c3d520ba686b292753060c65a0fae669acb54a49f6532502f2b308b35de23a' }),
      file('/assets/engine/searchless-136m.onnx.part8', 24819684, { sha256: '09bd658719b65ec53c61dd479930e57bfbd4dff2327c9a468f951ff2e5a859a5' }),
      file('/assets/engine/searchless-136m.onnx.part9', 24819684, { sha256: '8401d4cf71624bd9064bfd66a18141d4fd062362bcd259838be2d0f8b381bf28' }),
      file('/assets/engine/searchless-136m.onnx.part10', 24819684, { sha256: '86e12d70689d1d4c8c26d724937e19d3bc97cd307008926d6f6bd362da02dd60' }),
    ],
        }),
  '270m': file('/assets/engine/searchless-270m.onnx', 541571344, {
    role: 'model',
    sha256: 'f121286445c20e721f8a428c0e746e078d0b7686b0b034f83eaefe603f2855dc',
    parts: [
      file('/assets/engine/searchless-270m.onnx.part0', 24616880, { sha256: '83b48239e7927f6782e82e6a28a2241fc617e438df347e44ce8ba7ef54ea6586' }),
      file('/assets/engine/searchless-270m.onnx.part1', 24616880, { sha256: '354184731d4ea0f432c197a06dc664650f01525e4197c83d46a55f8ce0352706' }),
      file('/assets/engine/searchless-270m.onnx.part2', 24616880, { sha256: '4fadeb69fdd3d2d1fb4ed64903209ad2c10aa3851a5310b20aaba285d4b1a07e' }),
      file('/assets/engine/searchless-270m.onnx.part3', 24616880, { sha256: 'ff4cdd5591d743f9b36d5dfbb65962bde7e86c56d8716734a5b7b93d5d201435' }),
      file('/assets/engine/searchless-270m.onnx.part4', 24616880, { sha256: '687ffd3224a478cd9756f98cf67c6b8eb43a7b28805837ad6c85c373da27c660' }),
      file('/assets/engine/searchless-270m.onnx.part5', 24616880, { sha256: '069dde0605f801a111aac116005bab85dd8f832f34c7c35cc51569f65acd8dd9' }),
      file('/assets/engine/searchless-270m.onnx.part6', 24616879, { sha256: '9828269d9caaa8d5c3f09d9b6a1154cc22d972088cab84cba0ece0ca0aaf7f05' }),
      file('/assets/engine/searchless-270m.onnx.part7', 24616879, { sha256: 'eb0ae385ec61dac5bbdb218cf4d7cbffc6bbbdcdb5fbc2ed2880ae1b7b7b0334' }),
      file('/assets/engine/searchless-270m.onnx.part8', 24616879, { sha256: 'dab384c46121fe3e5686b9647d2cb268d1c237e320dc6ebe52559a7ad4aefca3' }),
      file('/assets/engine/searchless-270m.onnx.part9', 24616879, { sha256: 'de2975ac798fbbf6fdcb32f46714e9504c6358137dcdd78e7cf19a1ce86f3bd1' }),
      file('/assets/engine/searchless-270m.onnx.part10', 24616879, { sha256: 'dfeb3552dcff76dcbc9f63942cc6bd3d22c2498eb1b9c27467ccbb5a17c76461' }),
      file('/assets/engine/searchless-270m.onnx.part11', 24616879, { sha256: '99a01b3103ad48472b9ea23bd298328271b5f0d4ca61e8779d550d0c4ec73fb7' }),
      file('/assets/engine/searchless-270m.onnx.part12', 24616879, { sha256: 'dfeec0301f8b439b2aa414ad62bfb7d7040684179e104fdb9512d8fb791cb555' }),
      file('/assets/engine/searchless-270m.onnx.part13', 24616879, { sha256: '6cb85140c1c538e04670deb409e38d584e571f21edde0ff7462e3a4933a72266' }),
      file('/assets/engine/searchless-270m.onnx.part14', 24616879, { sha256: 'dc34a3b174dfd968a3ae08eb312f2be2ecba5251e39c988ec7b82891b8738174' }),
      file('/assets/engine/searchless-270m.onnx.part15', 24616879, { sha256: '70f67eabc9152f31f9271ddef3c9451dbbd418f8a48470ed15ac0ef36ea0fa8a' }),
      file('/assets/engine/searchless-270m.onnx.part16', 24616879, { sha256: 'd01940a05ab7ca8536ffe4b143393881432404c00f690000579e1d6116f6cb93' }),
      file('/assets/engine/searchless-270m.onnx.part17', 24616879, { sha256: '292e688f1d3da22a8a57f53c49422bb4923def2c54326a5c5fdadb8d91d444f3' }),
      file('/assets/engine/searchless-270m.onnx.part18', 24616879, { sha256: '293e64d30fed18e38a55a26fe80c273db01d682dbbc772369761d670fa1b170b' }),
      file('/assets/engine/searchless-270m.onnx.part19', 24616879, { sha256: '421e1813e994a5fab02d87f40caab4d9a2282513946758e7516130f99912220d' }),
      file('/assets/engine/searchless-270m.onnx.part20', 24616879, { sha256: 'd3729a8f6dc029b2d633d3dc52db705783e82b802641ccc3d6949fb49a0ca03a' }),
      file('/assets/engine/searchless-270m.onnx.part21', 24616879, { sha256: 'b7f49b656c61de15864b4be123c492b9e6e16a5f3b3a0c68c3f03f4d1b93110d' }),
    ],
        }),
};

/** The four Maia-3 sizes; the ratings of a size share its file. */
const MAIA3_MODELS = {
  '3m': file('/assets/engine/maia3-3m.onnx', 6406545, { role: 'model', sha256: '8143e3b5742c59c6d4a5f86e1961bcc1cd2ae4e2be904b3383d09dff578bbe3e' }),
  '5m': file('/assets/engine/maia3-5m.onnx', 10514156, { role: 'model', sha256: '62d9eca8fe162b858bff0ecb13744eaa51a243afe08ebe91cbf84095a064930e' }),
  '23m': file('/assets/engine/maia3-23m.onnx', 45527138, {
        role: 'model',
        sha256: '2df4328b15c8d47cb73284cb9fb1fa397d629cef2cf2c47dc27b9ae072fbc665',
        parts: [
          file('/assets/engine/maia3-23m.onnx.part0', 22763569, { sha256: 'c70c4955e3d97acd5a3614923cc10a4e323b760aefb17c5dd4c5fca0e93d64a3' }),
          file('/assets/engine/maia3-23m.onnx.part1', 22763569, { sha256: '4379044fd92cd2f2fa68a08daa5ba861333d5afca35a51881da4a04070242077' }),
        ],
      }),
  '79m': file('/assets/engine/maia3-79m.onnx', 155850482, {
        role: 'model',
        sha256: 'dc0c820f6a953f5a9c41cc2150dfd77e968ca8d33ca5b55028b367b9ea0f3092',
        parts: [
          file('/assets/engine/maia3-79m.onnx.part0', 22264355, { sha256: '895eeda82161bea00a5dc53da4cd3b5f77e50c75e331201f7ad34a68f8ce67e6' }),
          file('/assets/engine/maia3-79m.onnx.part1', 22264355, { sha256: '7514b867ab59561099f7c6f90f78d309c8441b6c62b8333f8bcb80102d7ad7be' }),
          file('/assets/engine/maia3-79m.onnx.part2', 22264355, { sha256: '8f2c2a5f6b8a24a2406569cb43e7324b7b649c6ce83bc5daf5a6209151417bb9' }),
          file('/assets/engine/maia3-79m.onnx.part3', 22264355, { sha256: 'cf43f13cfeb5b0085ff31d2c492c691c176d60411e3345ac3d6c1fbbd8d6a09f' }),
          file('/assets/engine/maia3-79m.onnx.part4', 22264354, { sha256: 'd2e98b764444497a065bcbe792bfd6bc2381ca26b46f0561c62de0d54f17d790' }),
          file('/assets/engine/maia3-79m.onnx.part5', 22264354, { sha256: '5e5b7684a6832788203582aead7f33116f872d6710591a48b820fba22dd73b02' }),
          file('/assets/engine/maia3-79m.onnx.part6', 22264354, { sha256: '0efdf565916214dc9024bd4249ab93ee684700879139b949bc50e019c05def66' }),
        ],
      }),
};

export const ENGINES = [
  /* ---------------------------------------------------------- ready now */
  // Stockfish files come unchanged (but for one line of 17.1's script, below) from the npm package `stockfish` (stockfish.js by Nathan Rugg and
  // Chess.com): 19 and 19 Lite from 19.0.1, 18 and 18 Lite from 18.0.8, 17.1 and 17.1 Lite from 17.1.0,
  // 16 from 16.0.0 (stockfish-nnue-16-single.*, net src/nn-5af11540bbfe.nnue), 11 from 11.0.0
  // (src/stockfish.js and .wasm). The "several cores" builds (`threads: true`) are 19.0.1's
  // stockfish-19-lite.* and stockfish-19.*; they need the page to be cross-origin isolated
  // (COOP + COEP headers, sent for /puzzleanalyzr by scripts/build.mjs) for SharedArrayBuffer.
  entry({
    id: 'sf19-lite',
    name: 'Stockfish 19 Lite',
    family: 'Stockfish',
    about: 'The newest Stockfish with a small net. Quick to download, works on any phone, and far stronger than any human. The default.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'light',
    status: 'ready',
    files: [
      file('/assets/engine/stockfish-19-lite-single.js', 28230, { role: 'worker' }),
      file('/assets/engine/stockfish-19-lite-single.wasm', 1845971, { role: 'wasm' }),
    ],
  }),
  entry({
    id: 'sf19-full',
    name: 'Stockfish 19',
    family: 'Stockfish',
    about: 'The same Stockfish with its full-size net: the strongest engine on this page. A big download, and slower to start.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'heavy',
    status: 'ready',
    memory: 'about 200 to 300 MB while it runs (an estimate)',
    files: [
      file('/assets/engine/stockfish-19-single.js', 28130, { role: 'worker' }),
      file('/assets/engine/stockfish-19-single.wasm', 99169054, {
        role: 'wasm',
        sha256: '991bede2f253ebb08ff01fcc48270f4b9c8e66b12d5bd5f8d6f52eb3e3b3a740',
        parts: [
          file('/assets/engine/stockfish-19-single.wasm.part0', 24792264, { sha256: '3e450b2f13557f4e2a99cca2f54423118fcbd05aa189aa67794d16b65838deb2' }),
          file('/assets/engine/stockfish-19-single.wasm.part1', 24792264, { sha256: '6c39a4e8f77db1ce16c29a421cc35cf53b2382f4683a76f170af67ab0d76b059' }),
          file('/assets/engine/stockfish-19-single.wasm.part2', 24792263, { sha256: '314e6b9fbe936999ed238949886c8e0f18ba5075aa71211073498e2d18b34e09' }),
          file('/assets/engine/stockfish-19-single.wasm.part3', 24792263, { sha256: 'f1e17ca7f29cff9c0ccdcb972e9880682f0ded324e188f0b85ec4f499bca8f32' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'sf19-lite-mt',
    name: 'Stockfish 19 Lite, several cores',
    family: 'Stockfish',
    about: 'Lite on several CPU cores at once, so it looks deeper in the same time. Same small download as Lite.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'light',
    status: 'ready',
    threads: true,
    files: [
      file('/assets/engine/stockfish-19-lite.js', 33426, { role: 'worker' }),
      file('/assets/engine/stockfish-19-lite.wasm', 1697617, { role: 'wasm' }),
    ],
  }),
  entry({
    id: 'sf19-full-mt',
    name: 'Stockfish 19, several cores',
    family: 'Stockfish',
    about: 'The full Stockfish 19 on several CPU cores: the strongest setup on this page. A big download, and slower to start.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'heavy',
    status: 'ready',
    threads: true,
    memory: 'about 200 to 300 MB while it runs (an estimate)',
    files: [
      file('/assets/engine/stockfish-19.js', 33326, { role: 'worker' }),
      file('/assets/engine/stockfish-19.wasm', 99076105, {
        role: 'wasm',
        sha256: 'a599d78d72e0722d8895be84aca8b492d12e8bba3cdfcbcbc4a64017888c6667',
        parts: [
          file('/assets/engine/stockfish-19.wasm.part0', 24769027, { sha256: '5d1481373652fffaf692cf737d9cd3921d172b0c17131b2d5eb273c2eadac95d' }),
          file('/assets/engine/stockfish-19.wasm.part1', 24769026, { sha256: '3e96c6675297fc6391ff4abe95e72882a0eee7950db29cef4281247cdc1d7fdd' }),
          file('/assets/engine/stockfish-19.wasm.part2', 24769026, { sha256: '1652b799cb78d4cfd1b9f54939e1f2c306a5c432fc2c19a00dcc8805bdb6cd5c' }),
          file('/assets/engine/stockfish-19.wasm.part3', 24769026, { sha256: '7f68dd27127fbf1f4301b05ce8d6780a00c2d02d27d2b2e867cfbf0a18cfc8a4' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'sf18-lite',
    name: 'Stockfish 18 Lite',
    family: 'Stockfish',
    about: 'Last version’s Stockfish with a small net. Here to compare with 19; it’s a little weaker.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'light',
    status: 'ready',
    files: [
      file('/assets/engine/stockfish-18-lite-single.js', 21429, { role: 'worker' }),
      file('/assets/engine/stockfish-18-lite-single.wasm', 7295411, { role: 'wasm' }),
    ],
  }),

  entry({
    id: 'sf17-lite',
    name: 'Stockfish 17.1 Lite',
    family: 'Stockfish',
    about: 'Stockfish 17.1 with a small net, from 2025. Light and quick; here to compare with 18 and 19.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'light',
    status: 'ready',
    files: [
      file('/assets/engine/stockfish-17.1-lite-single.js', 20672, { role: 'worker' }),
      file('/assets/engine/stockfish-17.1-lite-single.wasm', 7280741, { role: 'wasm' }),
    ],
  }),
  entry({
    id: 'sf19-asm',
    name: 'Stockfish 19, plain JavaScript',
    family: 'Stockfish',
    about: 'Stockfish 19 Lite as one plain JavaScript file, for browsers without WebAssembly. Several times slower, so it sees less in the same time.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'light',
    status: 'ready',
    scriptOnly: true,
    files: [file('/assets/engine/stockfish-19-asm.js', 3155627, { role: 'worker' })],
  }),
  entry({
    id: 'sf11',
    name: 'Stockfish 11',
    family: 'Stockfish',
    about: 'The last “classical” Stockfish (2020), with no neural net at all. Still stronger than any human. For history.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'light',
    status: 'ready',
    hash: 'raw', // this older script reads the .wasm address after # as it is, not URL-encoded
    files: [
      file('/assets/engine/stockfish-11.js', 2329105, { role: 'worker' }),
      file('/assets/engine/stockfish-11.wasm', 1413916, { role: 'wasm' }),
    ],
  }),
  entry({
    id: 'sf17-full',
    name: 'Stockfish 17.1',
    family: 'Stockfish',
    about: 'Stockfish 17.1 with its full-size net. Strong, but 19 is stronger and a little bigger.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'heavy',
    status: 'ready',
    memory: 'about 200 to 300 MB while it runs (an estimate)',
    files: [
      // stockfish@17.1.0 src/stockfish-17.1-single-a496a04.js fetches its own six parts; this copy has that one
      // line changed (and says so at its top) to read the joined file the page hands it instead.
      file('/assets/engine/stockfish-17.1-single.js', 20886, { role: 'worker' }),
      file('/assets/engine/stockfish-17.1-single.wasm', 79053306, {
        role: 'wasm',
        sha256: '14b25e2973a52e6095ee0ce7283ce3ff776a5e56bfe393333fe0066f6ccd666e',
        parts: [
          file('/assets/engine/stockfish-17.1-single.wasm.part0', 19763327, { sha256: 'bc7c3261a770f59bebab0d9a06e19e8a8fe5045002a747511b4bb64b570143ff' }),
          file('/assets/engine/stockfish-17.1-single.wasm.part1', 19763327, { sha256: '2ec32479f9af6b151536e8a11c53d6a0d9541af1d551f462e1d368777c304774' }),
          file('/assets/engine/stockfish-17.1-single.wasm.part2', 19763326, { sha256: '330ffa4f3984e664f52c69a4a81fb469ccecc6fe5bb5e544fa8f39004d225f84' }),
          file('/assets/engine/stockfish-17.1-single.wasm.part3', 19763326, { sha256: 'd878d95193eff84f41f1057f5936b59edebb68e0960dca35f70c7b34b1799e1a' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'sf18-full',
    name: 'Stockfish 18',
    family: 'Stockfish',
    about: 'The previous version with its full net. Bigger than 19 but weaker; only for comparing.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'heavy',
    status: 'ready',
    memory: 'about 250 to 350 MB while it runs (an estimate)',
    files: [
      file('/assets/engine/stockfish-18-single.js', 21330, { role: 'worker' }),
      file('/assets/engine/stockfish-18-single.wasm', 112992459, {
        role: 'wasm',
        sha256: 'f611ac05ddb248fe975a4f180ac9fec7f7fb650f8f17f5fe4230fcc0fe6419c7',
        parts: [
          file('/assets/engine/stockfish-18-single.wasm.part0', 22598492, { sha256: 'f61e45f008a4d45927256e2028b6860d585e92da2402df44df35e569eda270b4' }),
          file('/assets/engine/stockfish-18-single.wasm.part1', 22598492, { sha256: 'faf5cb5e206d50c5f440fb0d4a3dc41b2c90263f66b4ca89b0057552b18a4f3b' }),
          file('/assets/engine/stockfish-18-single.wasm.part2', 22598492, { sha256: '34a49336cdb07eb18de825223e8b9d91319099da773ea9cfa1656d35a9815a6e' }),
          file('/assets/engine/stockfish-18-single.wasm.part3', 22598492, { sha256: 'ea983407086000586bd424419b57eb5d2378407e7744296a792779eedd2cf013' }),
          file('/assets/engine/stockfish-18-single.wasm.part4', 22598491, { sha256: 'bd402474f163f1c6202ef947126e57d62113a44e9f0cfe1cdb4eb9a1a47c0607' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'sf16',
    name: 'Stockfish 16',
    family: 'Stockfish',
    about: 'Stockfish 16 (2023). The engine is small; its net is a separate 40 MB file it reads after it starts.',
    license: GPL,
    licenseUrl: COPYING,
    source: SFJS,
    device: 'heavy',
    status: 'ready',
    memory: 'about 100 to 150 MB while it runs (an estimate)',
    files: [
      file('/assets/engine/stockfish-16-single.js', 25594, { role: 'worker' }),
      file('/assets/engine/stockfish-16-single.wasm', 575029, { role: 'wasm' }),
      file('/assets/engine/nn-5af11540bbfe.nnue', 40119326, {
        role: 'net',
        sha256: '5af11540bbfefcb54e38c5dd000cab4b469dfa7599a1d55be5d2722c20a8929b',
        parts: [
          file('/assets/engine/nn-5af11540bbfe.nnue.part0', 20059663, { sha256: 'db5d40fa62e38aabbc228a0af0f2f00dd93f7a2028754288de9595e0461ad89f' }),
          file('/assets/engine/nn-5af11540bbfe.nnue.part1', 20059663, { sha256: 'a0620afabb5da6c321edecf088b1d3cda99e95ed55dfa11219b4aab1165de4d5' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'dm-9m',
    name: 'DeepMind searchless chess 9M',
    family: 'DeepMind searchless',
    about: 'A small transformer from Google DeepMind that picks a move by looking at the board once, with no search. Much weaker than Stockfish, and its score is only its guess at the winning chances.',
    license: 'CC-BY-4.0',
    licenseUrl: CC_BY,
    source: DM_SOURCE,
    credit: DM_CREDIT,
    device: 'heavy',
    status: 'ready',
    module: true,
    memory: 'a few hundred MB',
    files: [
      file('/assets/engine/searchless-worker.js', SEARCHLESS_WORKER_BYTES, { role: 'worker' }),
      ...ORT_FILES,
      file('/assets/engine/searchless-9m.onnx', 35871373, {
        role: 'model',
        sha256: 'ec45313c1ed1451acdf09e56f46fa6dee72698b8cea6803ad0f30c526659dac6',
        parts: [
          file('/assets/engine/searchless-9m.onnx.part0', 17935687, { sha256: 'bb8dc6444dc2006c5310567116979b7db8ae9f8c0bdfead3a8e4bf3a43a91557' }),
          file('/assets/engine/searchless-9m.onnx.part1', 17935686, { sha256: '57fd1369986ac821d0343d3b85f70ce8940bee1544ce4ad57f9519a469778bef' }),
        ],
      }),
    ],
  }),

  ...[
    ['1100', 'a club beginner', '67922d80f645d8153b29df1dcf516c1a13a1ec4f474c06649f4b82d58258ec60'],
    ['1200', 'a club beginner', '99266202e4d49ac732d22b24066bf67b4dd4922811637859e34d5b20b9967e72'],
    ['1300', 'a newer club player', 'b49dbbc4ee4ea025e9e04257aa74f96d56a8fbbfd49422e9bc151f41182329ed'],
    ['1400', 'a newer club player', '71222bdc58a768653950faa8019c5bcbc44db576141bfc0794789969e17d8b49'],
    ['1500', 'a club player', '2c39eae560305e4d3158259346c33bfefb4b6c4dbb0e0e9856f5749a52737498'],
    ['1600', 'a club player', 'ee4357086a1d07e1e991d6b41092201e8ac7612aa372d15018cab840c8ab9e63'],
    ['1700', 'a good club player', 'c4888e7a2f1230229303bd1cc57159ce0ef465790c8ca4dcd98e4b391cd18de6'],
    ['1800', 'a good club player', 'ffdcf7a9a5677c6d83263fb4719e6f31ef52211f9088f0253f7d2ef94821e7db'],
    ['1900', 'a strong club player', '29bef50a33fbfd4b879cae91d3359cb15f9d168fc423b53e5dda71cc8cf11cca'],
  ].map(([elo, who, sha256]) =>
    entry({
      id: `maia1-${elo}`,
      name: `Maia-1 ${elo}`,
      family: 'Maia',
      about: `Plays the move a human rated about ${elo} (${who}) would most likely play, not the best move. Good for “what would a ${elo} play here?”. It doesn’t search, so its score is only its guess at the result.`,
      license: GPL,
      licenseUrl: GPL_URL,
      source: `https://huggingface.co/shermansiu/maia-${elo}`,
      credit: MAIA_CREDIT,
      device: 'light',
      status: 'ready',
      module: true,
      files: [
        file('/assets/engine/maia-worker.js', MAIA_WORKER_BYTES, { role: 'worker' }),
        ...ORT_FILES,
        file(`/assets/engine/maia-${elo}.onnx`, 3483886, { role: 'model', sha256 }),
      ],
    }),
  ),

  /* ---------------------------------------------------- listed, not yet */
  entry({
    id: 'sf19-lichess-big',
    name: 'Stockfish 19 (Lichess build)',
    family: 'Stockfish',
    about: 'Lichess’s own browser build with the full net, as two files. As strong as Stockfish 19 above. It always starts extra threads, which need page headers this site doesn’t send yet.',
    license: 'AGPL-3.0 + GPL-3.0',
    licenseUrl: AGPL_URL,
    source: LICHESS_SF,
    device: 'heavy',
    status: 'soon',
    memory: 'about 200 to 300 MB while it runs (an estimate)',
    files: [file('engine', 0.6e6, { approx: true }), file('big net', 98.5e6, { approx: true })],
  }),
  entry({
    id: 'sf19-lichess-small',
    name: 'Stockfish 19 Lite (Lichess build)',
    family: 'Stockfish',
    about: 'Lichess’s tiny build with the small net. Much like Lite. It always starts extra threads, which need page headers this site doesn’t send yet.',
    license: 'AGPL-3.0 + GPL-3.0',
    licenseUrl: AGPL_URL,
    source: LICHESS_SF,
    device: 'light',
    status: 'soon',
    files: [file('engine', 0.5e6, { approx: true }), file('small net', 1.2e6, { approx: true })],
  }),
  entry({
    id: 'sf15',
    name: 'Stockfish 15 / 14.1',
    family: 'Stockfish',
    about: 'Older Stockfish versions with their nets. Only published as several-core builds, which need page headers this site doesn’t send yet.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: SF_NETS,
    device: 'heavy',
    status: 'soon',
    files: [file('engine', 0.7e6, { approx: true }), file('net', 47e6, { approx: true })],
  }),
  entry({
    id: 'fairy-sf14',
    name: 'Fairy-Stockfish 14',
    family: 'Fairy-Stockfish',
    about: 'Stockfish for chess variants: crazyhouse, three-check, Chess960 and more. Only useful once the board plays variants.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://github.com/fairy-stockfish/fairy-stockfish.wasm',
    device: 'light',
    status: 'soon',
    files: [file('fairy-stockfish-nnue.wasm', 1.7e6, { approx: true })],
  }),
  ...[
    ['3m', 'Maia3-ablate-3M', '3M', 'light', 'the smallest and quickest'],
    ['5m', 'Maia3-5M', '5M', 'light', 'small and quick'],
    ['23m', 'Maia3-23M', '23M', 'heavy', 'bigger: a little closer to real players'],
    ['79m', 'Maia3-79M', '79M', 'heavy', 'the biggest: closest to real players, slowest to download'],
  ].flatMap(([size, repo, label, device, what]) =>
    [
      ['1100', 'a club beginner'],
      ['1500', 'a club player'],
      ['1900', 'a strong club player'],
    ].map(([elo, who]) =>
      entry({
        id: `maia3-${size}-${elo}`,
        name: `Maia-3 ${label} ${elo}`,
        family: 'Maia-3',
        about: `The newest human-like model (2026): plays the move a human rated about ${elo} (${who}) would most likely play. This is the ${label} size, ${what}. It doesn’t search, so its score is only its guess at the result. The three ratings of one size share one download.`,
        license: 'AGPL-3.0',
        licenseUrl: AGPL_URL,
        source: 'https://github.com/CSSLab/maia3',
        weights: `https://huggingface.co/UofTCSSLab/${repo}`,
        credit: MAIA3_CREDIT,
        device,
        status: 'ready',
        module: true,
        memory: device === 'heavy' ? 'several hundred MB' : 'about 100 MB',
        options: [`setoption name Elo value ${elo}`],
        files: [file('/assets/engine/maia3-worker.js', MAIA3_WORKER_BYTES, { role: 'worker' }), ...ORT_FILES, MAIA3_MODELS[size]],
      }),
    ),
  ),
  ...[
    ['1100', 'a club beginner'],
    ['1500', 'a club player'],
    ['1900', 'a strong club player'],
  ].map(([elo, who]) =>
    entry({
      id: `maia2-${elo}`,
      name: `Maia-2 ${elo}`,
      family: 'Maia-2',
      about: `Plays the move a human rated about ${elo} (${who}) would most likely play, from one model that knows every rating. Newer and closer to real players than Maia-1, but it learned from middlegames: its first few moves can look odd. It doesn’t search, so its score is only its guess at the result. The three ratings share one download.`,
      license: 'MIT',
      licenseUrl: MIT_URL,
      source: 'https://github.com/CSSLab/maia2',
      credit: MAIA2_CREDIT,
      device: 'heavy',
      status: 'ready',
      module: true,
      memory: 'a few hundred MB',
      options: [`setoption name Elo value ${elo}`],
      files: [
        file('/assets/engine/maia2-worker.js', MAIA2_WORKER_BYTES, { role: 'worker' }),
        ...ORT_FILES,
        file('/assets/engine/maia2-rapid.onnx', 84934218, {
          role: 'model',
          sha256: 'e02c24370e11074b10db93c0d1401e5142495448fd22851a2357b7bc0ea944d4',
          parts: [
            file('/assets/engine/maia2-rapid.onnx.part0', 21233555, { sha256: 'e122c1b3835b14f9f5e5762bea76ce916a44e85e46409ece08bb71e65b000762' }),
            file('/assets/engine/maia2-rapid.onnx.part1', 21233555, { sha256: '1d287390f9c11be00b45994b6e3f99f46f3f52887202a1d19e0e809af61095f3' }),
            file('/assets/engine/maia2-rapid.onnx.part2', 21233554, { sha256: 'c666e54400f54bbb3b98fcaeec81b08efdd7bc644bf47a4fbb8a43549c5dc977' }),
            file('/assets/engine/maia2-rapid.onnx.part3', 21233554, { sha256: '7f5653090240222e7939dfadebce5c80e896c99b415a25f9f3f2fb8094675bbc' }),
          ],
        }),
      ],
    }),
  ),
  ...[
    ['136m', '136M', 'Much stronger than 9M and much slower: each look scores every legal move with a 136-million-weight model, which can take 10 to 30 seconds on a laptop.'],
    ['270m', '270M', 'The biggest, about 2900 Elo against people on Lichess blitz in DeepMind’s paper. Each look can take a minute on a laptop; a desktop helps.'],
  ].map(([id, size, about]) =>
    entry({
      id: `dm-${id}`,
      name: `DeepMind searchless chess ${size}`,
      family: 'DeepMind searchless',
      about: `A transformer from Google DeepMind that picks a move by looking at the board once, with no search. ${about} Its score is only its guess at the winning chances.`,
      license: 'CC-BY-4.0',
      licenseUrl: CC_BY,
      source: DM_SOURCE,
      credit: DM_CREDIT,
      device: 'heavy',
      status: 'ready',
      module: true,
      memory: id === '270m' ? 'about 2 GB' : 'about 1 GB',
      files: [
        file('/assets/engine/searchless-worker.js', SEARCHLESS_WORKER_BYTES, { role: 'worker' }),
        ...ORT_FILES,
        DM_MODELS[id],
      ],
    }),
  ),
  entry({
    id: 'lc0-t1-256x10',
    name: 'Lc0 (Leela) T1 256x10',
    family: 'Lc0 (Leela)',
    about: 'A small, fast Leela net (distilled from the big ones): far stronger than any club player on its own, and it searches the way Leela does. It searches for as long as the page gives it (about 2 seconds a look); its score is its own estimate.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://github.com/LeelaChessZero/lc0',
    weights: 'https://huggingface.co/lczerolens/t1-256x10-distilled-swa-2432500',
    credit: LC0_CREDIT,
    device: 'heavy',
    status: 'ready',
    module: true,
    memory: 'about 300 MB',
    files: [
      file('/assets/engine/lc0-worker.js', LC0_WORKER_BYTES, { role: 'worker' }),
      ...ORT_FILES,
      file('/assets/engine/lc0-t1-256x10.onnx', 40573370, {
        role: 'model',
        sha256: '9e206450a4012906da5b29364aaf459f4c7c4af3e1ccb8048666c93a280427a7',
        parts: [
          file('/assets/engine/lc0-t1-256x10.onnx.part0', 20286685, { sha256: 'bcf6c1e7b3c71a70499f5ed07a862288d6b0d3b4a77d614df5b03ab40ccbc2c6' }),
          file('/assets/engine/lc0-t1-256x10.onnx.part1', 20286685, { sha256: 'f42ad2fa099eee5429622e8ac26a1b288322978eaa19315bd54e5b8a2647fa9e' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'lc0-t1-512x15',
    name: 'Lc0 (Leela) T1 512x15',
    family: 'Lc0 (Leela)',
    about: 'A mid-size Leela net, distilled: stronger per look than T1 256x10, but each look is slower in a browser. It searches for as long as the page gives it (about 2 seconds a look); its score is its own estimate.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://github.com/LeelaChessZero/lc0',
    weights: 'https://huggingface.co/lczerolens/t1-smolgen-512x15x8h-distilled-swa-3395000',
    credit: LC0_CREDIT,
    device: 'heavy',
    status: 'ready',
    module: true,
    memory: '1 GB or more',
    files: [
      file('/assets/engine/lc0-worker.js', LC0_WORKER_BYTES, { role: 'worker' }),
      ...ORT_FILES,
      file('/assets/engine/lc0-t1-512x15.onnx', 165492280, {
        role: 'model',
        sha256: 'cd0226ea81dea56e5d1197c232ad3a414061d3b43e4d0391dd23ff6207d6a590',
        parts: [
          file('/assets/engine/lc0-t1-512x15.onnx.part0', 23641755, { sha256: 'e72b7b75f25e484796b06afc2e7f1ef94923aeac53e27f5502807175d4a078d3' }),
          file('/assets/engine/lc0-t1-512x15.onnx.part1', 23641755, { sha256: '0ed685b93356a88b01b4ff0196fb2666ea23f362dbc2730937ea3ec32f60aa9b' }),
          file('/assets/engine/lc0-t1-512x15.onnx.part2', 23641754, { sha256: '9efc55b9eda72addf695a643af26461d5e54be8b5ba2ea21b6ff3db283d6c72a' }),
          file('/assets/engine/lc0-t1-512x15.onnx.part3', 23641754, { sha256: 'c7f5d896298a40277dab86e054884d02b9d2fb8073180d796f9693b956c84524' }),
          file('/assets/engine/lc0-t1-512x15.onnx.part4', 23641754, { sha256: '496a92aa9f5f4a35c679a8638698268e226576954a680d63dbd2c0dca850d17c' }),
          file('/assets/engine/lc0-t1-512x15.onnx.part5', 23641754, { sha256: '6e3956c68778bdb924434d22ef2d49e235f572245a287895a54ad45df28be6fa' }),
          file('/assets/engine/lc0-t1-512x15.onnx.part6', 23641754, { sha256: '963dde9521d00471d376af76c8d447c2d9e167c20f116f459434b103437eeed2' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'lc0-t82',
    name: 'Lc0 (Leela) T82 768x15',
    family: 'Lc0 (Leela)',
    about: 'One of Leela’s big main-run nets (T82). Very strong per look; slow in a browser, so it sees fewer positions in the same time. It searches for as long as the page gives it (about 2 seconds a look); its score is its own estimate.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://github.com/LeelaChessZero/lc0',
    weights: 'https://huggingface.co/lczerolens/768x15x24h-t82-swa-7464000',
    credit: LC0_CREDIT,
    device: 'heavy',
    status: 'ready',
    module: true,
    memory: '1 GB or more',
    files: [
      file('/assets/engine/lc0-worker.js', LC0_WORKER_BYTES, { role: 'worker' }),
      ...ORT_FILES,
      file('/assets/engine/lc0-t82-768x15.onnx', 189659755, {
        role: 'model',
        sha256: 'f7d418f4039815d6dd38aeb66ee3d82cda271cd7dd0e8a9ad4b8287ad51969bc',
        parts: [
          file('/assets/engine/lc0-t82-768x15.onnx.part0', 23707470, { sha256: 'c591d91eaba42dbaf80791aa154d6cd67b4e26eaff57128b24835f521df21542' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part1', 23707470, { sha256: '042b6309657be131678405412cb972dc2bafc9446c120b217c5a320364297f16' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part2', 23707470, { sha256: 'c48d8a3e780720d91a77831b66c800ee50dcde6aef692a0c1e2bf6763b915705' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part3', 23707469, { sha256: 'e26a8dcfc1c9e506466b7c4ba33e35b8df9e4ca6af8b372250ea7c1bb91fec06' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part4', 23707469, { sha256: 'e32444aadfb95ba7adf5b628ee0768a18be71a25d545619846a95b0077ae67e3' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part5', 23707469, { sha256: '5cecc2bd55a7b1a5c34948a449902fe40c0dd6ba7ab310c43bf53baebe6682ca' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part6', 23707469, { sha256: '566ddbc4ae0087a1ae0ee285ebb1a2eeb2f3d2244ded9d2be1518fa476ccbddd' }),
          file('/assets/engine/lc0-t82-768x15.onnx.part7', 23707469, { sha256: '5286359bdd9141fc4385cd5aee5661ba5bdf3c93308e2db3faf377175de5fc1d' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'lc0-bt3',
    name: 'Lc0 (Leela) BT3 768x15',
    family: 'Lc0 (Leela)',
    about: 'Leela’s BT3 net, from the family Leela plays its strongest games with. The slowest here: best on a fast laptop or desktop. It searches for as long as the page gives it (about 2 seconds a look); its score is its own estimate.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://github.com/LeelaChessZero/lc0',
    weights: 'https://huggingface.co/lczerolens/BT3-768x15x24h-swa-2790000',
    credit: LC0_CREDIT,
    device: 'heavy',
    status: 'ready',
    module: true,
    memory: '1 GB or more',
    files: [
      file('/assets/engine/lc0-worker.js', LC0_WORKER_BYTES, { role: 'worker' }),
      ...ORT_FILES,
      file('/assets/engine/lc0-bt3-768x15.onnx', 205507072, {
        role: 'model',
        sha256: '48a570874eab0c3d2eaff110f4ab04dde51cf6aee9a10b73cbe094b2f9494b11',
        parts: [
          file('/assets/engine/lc0-bt3-768x15.onnx.part0', 22834120, { sha256: '3eb45c9589612ef5ab16f962c1705da7ef7ec910c486b8d6038318589953bbb6' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part1', 22834119, { sha256: '3cde12e52f06de97a0e20e02c3bbae70b52d477f450980e7d9f9b0d6b8050b58' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part2', 22834119, { sha256: '5468ec50a849848a42079a9f290527b85fea6b11512a29b25e6cdb940d4dcbdb' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part3', 22834119, { sha256: '2f33e14443badc3f72752fa96bfb027a2bf827518cbeab09aeb8c712b5b9bdfc' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part4', 22834119, { sha256: '80b344dbc34d2512289d530f7faaedd04da27f7d797b32a84012774548616257' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part5', 22834119, { sha256: '7f5c36807499ca26e5d5c1db4c0f2ede170bd3615506813afe34041559cef3f7' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part6', 22834119, { sha256: '6ecb5d2efea1523e5a24746beb789c004de1da1840e4b7d6d342041e7ebf9791' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part7', 22834119, { sha256: 'bec8410466503dd7d7b0de7306fc57cb2ecdf0e1669a769666238d73fcf877af' }),
          file('/assets/engine/lc0-bt3-768x15.onnx.part8', 22834119, { sha256: '4a1b6c9a56c2f908ba8351567c3f7bdae7534b8b6d0623586550994467e37c85' }),
        ],
      }),
    ],
  }),
  entry({
    id: 'lc0-bt4',
    name: 'Lc0 (Leela) BT4',
    family: 'Lc0 (Leela)',
    about: 'Leela’s newest net family. Published only in Lc0’s own .pb.gz format, which this page can’t read yet: it needs converting to ONNX first (Lc0’s leela2onnx).',
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://lczero.org/play/networks/bestnets/',
    device: 'heavy',
    status: 'soon',
    memory: 'over 1 GB',
    webgpu: 'needs',
    devices: 'Desktop only.',
    files: [file('BT4 net', 336e6, { approx: true })],
  }),
  entry({
    id: 'c1-4b',
    name: 'C1-4B',
    family: 'C1',
    about: 'A small language model that explains a puzzle step by step in words, then gives its move. About 2.5 GB if shrunk to 4-bit.',
    license: 'Apache-2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    source: 'https://huggingface.co/UofTCSSLab/C1-4B',
    device: 'heavy',
    status: 'soon',
    memory: 'several GB',
    webgpu: 'needs',
    devices: 'A Mac or PC with WebGPU only; too big for phones.',
    files: [file('model-00001-of-00002.safetensors', 4967215360), file('model-00002-of-00002.safetensors', 3077766632)],
  }),
  entry({
    id: 'allie',
    name: 'Allie 2.0',
    family: 'Allie',
    about: 'A human-like bot that also takes human-like time to think. Too big for a browser today.',
    license: 'MIT',
    licenseUrl: MIT_URL,
    source: 'https://arxiv.org/abs/2410.03893',
    device: 'heavy',
    status: 'soon',
    memory: 'well over 10 GB',
    webgpu: 'needs',
    devices: 'No browser can run it yet.',
    files: [file('weights', 11.2e9, { approx: true })],
  }),
];

const BY_ID = new Map(ENGINES.map((e) => [e.id, e]));

/** The entry with this id, or undefined. */
export const engineById = (id) => BY_ID.get(id);

/** The entry to use for a remembered id: only a ready engine; anything else means the default. */
export function engineFor(id) {
  const e = BY_ID.get(id);
  return e && e.status === 'ready' ? e : BY_ID.get(DEFAULT_ENGINE);
}

/** How many threads a several-cores engine uses: one core left for the page, at least 2, at most 4 (more gains little and costs memory). */
export function threadCount(cores) {
  const n = Number(cores) || 2;
  return Math.max(2, Math.min(4, n - 1));
}

/** Why this browser can't run this engine here, or '' when it can. isolated: the page's crossOriginIsolated. */
export function cantRun(e, { isolated = false } = {}) {
  if (e.threads && !isolated) return 'This browser didn’t switch on several cores for this page, so it can’t run here.';
  return '';
}

/** True when this engine gets the big warning and the second "Yes, download it" before it downloads. */
export function needsWarning(e) {
  return e.device === 'heavy' || e.bytes > HEAVY_BYTES || HEAVY_FAMILIES.includes(e.family);
}

/**
 * A ready engine's files: its worker script; the file the script is handed
 * after # (its .wasm, or a neural model), unless the script is the whole
 * engine (plain JavaScript); and a separate net, for an engine that reads
 * its net through `setoption name EvalFile`.
 */
export function engineFiles(e) {
  const worker = e.files.find((f) => f.role === 'worker');
  const wasm = e.files.find((f) => f.role === 'wasm' || f.role === 'model');
  const net = e.files.find((f) => f.role === 'net');
  if (!worker || (!wasm && !e.scriptOnly)) throw new Error(`${e.id} has no worker and wasm`);
  return { worker, wasm, net };
}

/**
 * Phones and tablets: a touch-first pointer (matchMedia('(pointer: coarse)'))
 * on a screen up to iPad Pro size, or any narrow screen. `width` is
 * screen.width, so a narrow desktop window still counts as a desktop.
 */
export function isHandheld({ coarse = false, width = 1280 } = {}) {
  return width < 768 || (coarse && width <= 1366);
}

/** Which entries to show: everything on a desktop; the light ones on a phone or tablet unless asked for all. */
export function visibleEngines({ handheld = false, showAll = false } = {}, list = ENGINES) {
  return handheld && !showAll ? list.filter((e) => e.device === 'light') : list.slice();
}

/** "1.9 MB", "99.2 MB", "8.0 GB", with 1 MB = 1,000,000 bytes like the catalog. */
export function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 10e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

/** Seconds to download `bytes` at `mbps` megabits a second. */
export const downloadSeconds = (bytes, mbps) => (bytes * 8) / (mbps * 1e6);

/** "about 10 seconds", "about 2 minutes", "about 1.5 hours". */
export function formatDuration(s) {
  if (s < 5) return 'a few seconds';
  if (s < 60) return `about ${Math.round(s / 5) * 5} seconds`;
  if (s < 90) return 'about a minute';
  if (s < 3600) return `about ${Math.round(s / 60)} minutes`;
  const h = s / 3600;
  return `about ${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)} hour${h < 1.05 ? '' : 's'}`;
}

/** The rough download times shown in the warning, fast to slow; with the browser's own guess of its speed first, when it has one. */
export function roughTimes(bytes, downlinkMbps) {
  const rows = [];
  if (downlinkMbps > 0) rows.push({ label: `on this connection (about ${Math.round(downlinkMbps)} Mbit/s)`, text: formatDuration(downloadSeconds(bytes, downlinkMbps)) });
  rows.push(
    { label: 'on fast broadband (100 Mbit/s)', text: formatDuration(downloadSeconds(bytes, 100)) },
    { label: 'on slow Wi-Fi or 4G (10 Mbit/s)', text: formatDuration(downloadSeconds(bytes, 10)) },
  );
  return rows;
}

/* ------------------------------------------------- the remembered choice */

/** localStorage keys: the engine picked, and the engine that was starting (cleared once it answers). */
export const PICK_KEY = 'pz-engine';
export const TRYING_KEY = 'pz-engine-trying';

/** Why an engine failed, in plain words, from its error text. */
export function failureReason(error = '') {
  const text = String(error);
  if (/SHA-256|wrong size|bigger than expected|add up to|bytes, not/i.test(text)) return 'its download arrived damaged';
  if (/HTTP|fetch|network|load failed/i.test(text)) return 'its download failed';
  if (/took too long/i.test(text)) return 'it was too slow on this device';
  if (/several cores/i.test(text)) return 'this browser didn’t switch on several cores for this page';
  return 'it couldn’t start on this device (it may need more memory than the tab has)';
}

/**
 * The engine choice, kept in `storage` (localStorage, or anything with
 * getItem/setItem/removeItem). Every call is wrapped, so blocked storage just
 * means the default. Lite is always the way back: an engine other than Lite
 * that fails is not retried; the choice goes back to Lite.
 */
export function createChoice(storage) {
  const get = (k) => {
    try {
      return storage ? storage.getItem(k) : null;
    } catch {
      return null;
    }
  };
  const put = (k, v) => {
    try {
      if (!storage) return;
      if (v === null) storage.removeItem(k);
      else storage.setItem(k, v);
    } catch {
      /* private mode or blocked: nothing is remembered */
    }
  };
  const lite = engineFor(DEFAULT_ENGINE);
  return {
    /** The engine to use when the page opens, and a note when the last start never finished (the tab froze or crashed). */
    start() {
      const trying = get(TRYING_KEY);
      put(TRYING_KEY, null);
      if (trying && trying !== DEFAULT_ENGINE) {
        put(PICK_KEY, DEFAULT_ENGINE);
        const e = engineById(trying);
        return { engine: lite, note: `Last time ${e ? e.name : 'that engine'} didn’t finish starting, so this page is back on ${lite.name}.` };
      }
      return { engine: engineFor(get(PICK_KEY)), note: '' };
    },
    /** An engine is about to compile and start: if the tab dies now, the next visit uses Lite. */
    starting(e) {
      if (e.id !== DEFAULT_ENGINE) put(TRYING_KEY, e.id);
    },
    /** An engine answered: remember it. */
    ready(e) {
      put(TRYING_KEY, null);
      put(PICK_KEY, e.id);
    },
    /** Remember a pick straight away (Lite, or the engine a stopped download went back to). */
    pick(e) {
      put(PICK_KEY, e.id);
    },
    /**
     * An engine failed. For anything but Lite, the choice goes back to Lite and
     * this returns { engine: Lite, message }. For Lite itself it returns null:
     * there is nothing lighter, so the page keeps its "tap to try again".
     */
    failed(e, error) {
      put(TRYING_KEY, null);
      if (e.id === DEFAULT_ENGINE) return null;
      put(PICK_KEY, DEFAULT_ENGINE);
      return { engine: lite, message: `${e.name} stopped: ${failureReason(error)}. The page is back on ${lite.name}.` };
    },
    get saved() {
      return get(PICK_KEY);
    },
  };
}
