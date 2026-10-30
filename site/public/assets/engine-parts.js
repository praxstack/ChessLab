// Engine files bigger than Cloudflare Pages allows (25 MiB a file) ship in
// parts. scripts/split-engine.mjs cuts them; engine.js fetches the parts in
// the manifest's order, checks each part's SHA-256, keeps each part in Cache
// Storage on its own (so a broken download picks up at the part that failed),
// joins them and checks the whole file's SHA-256 before running it.
//
// Plain functions with no DOM, shared by the script, the page and the tests,
// so another app can copy this file as it is.

/** Cloudflare Pages refuses files over 25 MiB; parts stay under 24 MiB to leave room. */
export const MAX_PART_BYTES = 24 * 1024 * 1024;

/** The sizes of the parts for a file of `total` bytes: as few as fit under `max`, as even as possible. */
export function planParts(total, max = MAX_PART_BYTES) {
  if (!Number.isInteger(total) || total <= 0) throw new Error('total must be a positive whole number');
  if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive whole number');
  const count = Math.ceil(total / max);
  const base = Math.floor(total / count);
  const extra = total - base * count; // the first `extra` parts get one byte more
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Cut bytes into parts (views, no copies). */
export function splitBytes(bytes, max = MAX_PART_BYTES) {
  let at = 0;
  return planParts(bytes.length, max).map((size) => {
    const part = bytes.subarray(at, at + size);
    at += size;
    return part;
  });
}

/** The name of part `i` of a file: stockfish-19-single.wasm.part0, .part1 … */
export const partName = (file, i) => `${file}.part${i}`;

/**
 * Joins parts as they stream in, straight into one buffer of the expected size,
 * so a 99 MB engine is never held twice while it downloads. Throws if the parts
 * add up to more, or (on done) to fewer, bytes than expected.
 */
export function createJoiner(total) {
  const out = new Uint8Array(total);
  let at = 0;
  return {
    write(chunk) {
      if (at + chunk.length > total) throw new Error('The engine parts are bigger than expected');
      out.set(chunk, at);
      at += chunk.length;
      return at;
    },
    get length() {
      return at;
    },
    done() {
      if (at !== total) throw new Error(`The engine parts add up to ${at} bytes, not ${total}`);
      return out;
    },
  };
}

/** Join whole parts into one file of `total` bytes. */
export function joinParts(parts, total = parts.reduce((n, p) => n + p.length, 0)) {
  const joiner = createJoiner(total);
  for (const part of parts) joiner.write(part);
  return joiner.done();
}

/** SHA-256 of some bytes, as lower-case hex (Web Crypto: in the browser and in Node). */
export async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Throws unless one part is exactly the one the manifest lists. */
export async function checkPart(bytes, { bytes: size, sha256 }) {
  if (bytes.length !== size) throw new Error(`An engine part is ${bytes.length} bytes, not ${size}`);
  const got = await sha256Hex(bytes);
  if (got !== sha256) throw new Error('An engine part is damaged (its SHA-256 does not match)');
  return true;
}

/** Throws unless the joined file is exactly the one the catalog expects. */
export async function checkJoined(bytes, { bytes: size, sha256 }) {
  if (bytes.length !== size) throw new Error(`The engine is ${bytes.length} bytes, not ${size}`);
  const got = await sha256Hex(bytes);
  if (got !== sha256) throw new Error('The engine download is damaged (its SHA-256 does not match)');
  return true;
}

/** The manifest written next to the parts, in joining order: what they join into and how to check each. */
export function manifestFor({ file, bytes, sha256, parts }) {
  return {
    file,
    bytes,
    sha256,
    parts: parts.map((p, i) => ({ file: partName(file, i), bytes: p.bytes, sha256: p.sha256 })),
  };
}
