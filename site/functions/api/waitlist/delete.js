// POST /api/waitlist/delete — remove a sign-up, its choices and its answers. Needs the manage-link token.
import { handleDeletePost } from '../../../src/lib/waitlist.js';
import { methodNotAllowed } from '../../../src/lib/http.js';

export const onRequestPost = ({ request, env }) => handleDeletePost(request, env);

export const onRequest = (context) =>
  context.request.method === 'POST' ? onRequestPost(context) : methodNotAllowed('POST');
