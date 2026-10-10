// POST /api/waitlist/preferences — tick or untick each list. Needs the manage-link token.
import { handlePreferencesPost } from '../../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../../src/lib/http.js';

export const onRequestPost = ({ request, env }) => handlePreferencesPost(request, env);

export const onRequest = (context) =>
  context.request.method === 'POST' ? onRequestPost(context) : methodNotAllowed('POST');
