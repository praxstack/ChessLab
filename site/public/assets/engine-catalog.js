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
// listed for their size). A plain-JavaScript engine is `scriptOnly`; one
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

export const ENGINES = [
  /* ---------------------------------------------------------- ready now */
  // Stockfish files come unchanged (but for one line of 17.1's script, below) from the npm package `stockfish` (stockfish.js by Nathan Rugg and
  // Chess.com): 19 and 19 Lite from 19.0.1, 18 and 18 Lite from 18.0.8, 17.1 and 17.1 Lite from 17.1.0,
  // 16 from 16.0.0 (stockfish-nnue-16-single.*, net src/nn-5af11540bbfe.nnue), 11 from 11.0.0
  // (src/stockfish.js and .wasm). Single-threaded builds only: the page has no COOP/COEP headers.
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
    ['1500', 'a club player', '2c39eae560305e4d3158259346c33bfefb4b6c4dbb0e0e9856f5749a52737498'],
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
    id: 'sf19-lite-mt',
    name: 'Stockfish 19 Lite, several cores',
    family: 'Stockfish',
    about: 'Lite on several CPU cores, so it looks deeper in the same time. Needs extra page headers that are still being tested.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: SFJS,
    device: 'light',
    status: 'soon',
    files: [file('stockfish-19-lite.js', 33426), file('stockfish-19-lite.wasm', 1697617)],
  }),
  entry({
    id: 'sf19-full-mt',
    name: 'Stockfish 19, several cores',
    family: 'Stockfish',
    about: 'The full Stockfish 19 on several CPU cores. The strongest setup of all, once the page headers allow it.',
    license: GPL,
    licenseUrl: GPL_URL,
    source: SFJS,
    device: 'heavy',
    status: 'soon',
    memory: 'about 200 to 300 MB while it runs (an estimate)',
    files: [file('stockfish-19.js', 33326), file('stockfish-19.wasm', 99076105)],
  }),
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
    ['3m', 'Maia3-3M', 'Maia-3 3M', 12659441, 'light'],
    ['5m', 'Maia3-5M', 'Maia-3 5M', 20968049, 'light'],
    ['23m', 'Maia3-23M', 'Maia-3 23M', 91799307, 'heavy'],
    ['23m-ponder', 'Maia3-23M-ponder', 'Maia-3 23M ponder', 108644919, 'heavy'],
    ['79m', 'Maia3-79M', 'Maia-3 79M', 315651851, 'heavy'],
  ].map(([size, repo, name, bytes, device]) =>
    entry({
      id: `maia3-${size}`,
      name,
      family: 'Maia',
      about: `The newest human-like model, for players from about 600 to 2600. Bigger sizes guess human moves a little better. ${ORT}`,
      license: 'AGPL-3.0',
      licenseUrl: AGPL_URL,
      source: `https://huggingface.co/UofTCSSLab/${repo}`,
      device,
      status: 'soon',
      ...(device === 'heavy' ? { memory: 'several hundred MB, more than the download', webgpu: 'better' } : {}),
      files: [file(`maia3-${size}.pt`, bytes)],
    }),
  ),
  entry({
    id: 'maia2',
    name: 'Maia-2',
    family: 'Maia-2',
    about: `One human-like model for every rating. Its authors now point to Maia-3. ${ORT}`,
    license: 'MIT',
    licenseUrl: MIT_URL,
    source: 'https://github.com/CSSLab/maia2',
    device: 'heavy',
    status: 'soon',
    memory: 'several hundred MB',
    webgpu: 'better',
    files: [file('model.safetensors', 93223920)],
  }),
  ...[
    ['136m', '136M', 'model_fp16.onnx', 273016527],
    ['270m', '270M', 'model_fp16.onnx', 541571344],
  ].map(([id, size, name, bytes]) =>
    entry({
      id: `dm-${id}`,
      name: `DeepMind searchless chess ${size}`,
      family: 'DeepMind searchless',
      about: `A transformer that plays grandmaster-level chess by looking at the board once, with no search. ${ORT}`,
      license: 'CC-BY-4.0',
      licenseUrl: CC_BY,
      source: DM_SOURCE,
      device: 'heavy',
      status: 'soon',
      memory: bytes > HEAVY_BYTES ? 'over 1 GB' : 'a few hundred MB',
      webgpu: bytes > HEAVY_BYTES ? 'needs' : 'better',
      files: [file(`${size}/${name}`, bytes)],
    }),
  ),
  entry({
    id: 'lc0-bt3',
    name: 'Lc0 (Leela) BT3',
    family: 'Lc0 (Leela)',
    about: `Leela, the strongest neural-net engine, with its own style. Needs search code in the page too. ${ORT}`,
    license: GPL,
    licenseUrl: GPL_URL,
    source: 'https://lczero.org/play/networks/bestnets/',
    device: 'heavy',
    status: 'soon',
    memory: 'over 1 GB',
    webgpu: 'needs',
    devices: 'Desktop or iPad Pro only.',
    files: [file('BT3 net (ONNX)', 410e6, { approx: true })],
  }),
  entry({
    id: 'lc0-bt4',
    name: 'Lc0 (Leela) BT4',
    family: 'Lc0 (Leela)',
    about: 'Leela’s newer net. Needs converting before a browser can run it.',
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
