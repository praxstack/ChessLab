// Randomness and identifiers from the Web Crypto API, available in browsers and in Node.

export const randomUUID = () => globalThis.crypto.randomUUID();

// A uniform integer from 0 to max - 1, like node:crypto randomInt(max).
export function randomInt(max) {
  if (!Number.isSafeInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('randomInt needs a positive range of at most 2^32.');
  const limit = 2 ** 32 - (2 ** 32 % max), word = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(word);
    if (word[0] < limit) return word[0] % max;
  }
}
