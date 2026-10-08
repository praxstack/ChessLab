// Reads a JSON or form-encoded request body into a plain object of strings/booleans.

export class BodyError extends Error {}

export async function readBody(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new BodyError('too-large');

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new BodyError('too-large');

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
