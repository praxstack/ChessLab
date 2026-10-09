// POST /api/waitlist/unsubscribe — leave every list. Needs the manage-link token,
// in the body or the query. Also the RFC 8058 one-click unsubscribe target.
import { handleUnsubscribePost } from '../../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../../src/lib/http.js';

export const onRequestPost = ({ request, env }) => handleUnsubscribePost(request, env);

export const onRequest = (context) =>
  context.request.method === 'POST' ? onRequestPost(context) : methodNotAllowed('POST');
