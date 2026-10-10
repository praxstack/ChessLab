// GET /api/waitlist/stats — list sizes and the market pulse as JSON. Requires: Authorization: Bearer <ADMIN_TOKEN>
import { handleStatsGet } from '../../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../../src/lib/http.js';

export const onRequestGet = ({ request, env }) => handleStatsGet(request, env);

export const onRequest = (context) =>
  context.request.method === 'GET' ? onRequestGet(context) : methodNotAllowed('GET');
