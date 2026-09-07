import { createApp } from './app.mjs';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { closeEngine } from './engine.mjs';
import { closeOpponentEngines } from './opponent-engines.mjs';

const { app, close } = createApp();
let vite;
if (process.env.NODE_ENV === 'production') {
 const folder=resolve('web/dist');
 if(!existsSync(resolve(folder,'index.html'))) throw new Error('Build the web app first with npm run build.');
 app.use(express.static(folder,{index:false}));
 app.use((req,res)=>{if(req.method==='GET'&&req.accepts('html'))res.sendFile(resolve(folder,'index.html'));else res.status(404).end();});
} else {
 const { createServer } = await import('vite');
 vite=await createServer({server:{middlewareMode:true},appType:'spa'});
 app.use(vite.middlewares);
}
const host=process.env.HOST||'127.0.0.1'; const port=Number(process.env.PORT||8770);
const server=app.listen(port,host,()=>console.log(`ChessLab ready at http://${host}:${port}`));
async function shutdown(){server.close();await vite?.close();closeEngine();closeOpponentEngines();close();process.exit(0);}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
