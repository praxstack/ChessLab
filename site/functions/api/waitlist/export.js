// GET /api/waitlist/export — admin CSV download. Requires: Authorization: Bearer <ADMIN_TOKEN>
import { handleExportGet } from '../../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../../src/lib/http.js';

export const onRequestGet = ({ request, env }) => handleExportGet(request, env);

export const onRequest = (context) =>
  context.request.method === 'GET' ? onRequestGet(context) : methodNotAllowed('GET');
