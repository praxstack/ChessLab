// Reads a JSON or form-encoded request body into a plain object of strings/booleans.

export class BodyError extends Error {}

/**
 * Reads the body as UTF-8 text, stopping as soon as it passes maxBytes, so a
 * chunked request without a Content-Length can't make us buffer all of it.
 */
async function readCappedText(request, maxBytes) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BodyError('too-large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readBody(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new BodyError('too-large');

  const raw = await readCappedText(request, maxBytes);

  const rawType = request.headers.get('content-type') || '';
  const type = rawType.toLowerCase();
  if (type.includes('application/json')) {
    let parsed;
    try {
      parsed = JSON.parse(raw || '{}');
    } catch {
      throw new BodyError('unreadable');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BodyError('unreadable');
    }
    return parsed;
  }
  if (type.includes('application/x-www-form-urlencoded') || type === '') {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  if (type.includes('multipart/form-data')) {
    // The boundary is case-sensitive, so pass the header through unchanged.
    let form;
    try {
      form = await new Response(raw, { headers: { 'content-type': rawType } }).formData();
    } catch {
      throw new BodyError('unreadable');
    }
    const out = {};
    for (const [key, value] of form) if (typeof value === 'string') out[key] = value;
    return out;
  }
  throw new BodyError('unsupported');
}
