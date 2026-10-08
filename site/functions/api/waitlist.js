// POST /api/waitlist — join the beta waitlist.
import { handleWaitlistPost } from '../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../src/lib/http.js';

export const onRequestPost = ({ request, env }) => handleWaitlistPost(request, env);

// Any other method gets a 405. Checks the method itself so route order never matters.
export const onRequest = (context) =>
  context.request.method === 'POST' ? onRequestPost(context) : methodNotAllowed('POST');
