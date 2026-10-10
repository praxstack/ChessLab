// GET /manage/?t=<code> — the server-rendered manage page: change lists,
// unsubscribe from everything, answer the market pulse, or delete the sign-up.
// Catches /manage and /manage/ (and anything beneath) so no static copy of the
// page is ever served with a stale state. HEAD is answered like GET, for link
// checkers, with an empty body.
import { handleManageGet } from '../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../src/lib/http.js';

export const onRequestGet = ({ request, env }) => handleManageGet(request, env);
export const onRequestHead = ({ request, env }) => handleManageGet(request, env);

export const onRequest = (context) =>
  context.request.method === 'GET' || context.request.method === 'HEAD' ? handleManageGet(context.request, context.env) : methodNotAllowed('GET, HEAD');
