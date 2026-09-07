import {cp,mkdir,rm} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await cp('server/sites-worker.mjs','dist/server/index.js');
await rm('dist/client',{recursive:true,force:true});
await cp('web/dist','dist/client',{recursive:true});
console.log('Sites worker and web assets prepared.');
