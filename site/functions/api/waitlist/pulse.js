// POST /api/waitlist/pulse — the market-pulse answers and optional opt-ins. Needs the manage-link token.
import { handlePulsePost } from '../../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../../src/lib/http.js';

export const onRequestPost = ({ request, env }) => handlePulsePost(request, env);

export const onRequest = (context) =>
  context.request.method === 'POST' ? onRequestPost(context) : methodNotAllowed('POST');
