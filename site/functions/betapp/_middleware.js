// Everything under /betapp: the beta app, only for signed-in testers. See src/lib/betapp.js.
import { handleBetapp } from '../../src/lib/betapp.js';

export const onRequest = (context) => handleBetapp(context);
