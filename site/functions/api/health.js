// GET /api/health — liveness check.
import { json, methodNotAllowed } from '../../src/lib/http.js';

export const onRequestGet = () => json(200, { ok: true });

export const onRequest = (context) =>
  context.request.method === 'GET' || context.request.method === 'HEAD'
    ? onRequestGet(context)
    : methodNotAllowed('GET');
