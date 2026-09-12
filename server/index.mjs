import { createApp } from './app.mjs';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { closeEngine } from './engine.mjs';
import { closeOpponentEngines } from './opponent-engines.mjs';

const { app, close } = createApp();
app.use('/research', express.static(resolve('report'), {dotfiles:'deny'}));
app.use('/design', express.static(resolve('design'), {dotfiles:'deny'}));
let vite;
if (process.env.NODE_ENV === 'production') {
 const folder=resolve('web/dist');
 if(!existsSync(resolve(folder,'index.html'))) throw new Error('Build the web app first with npm run build.');
 app.use(express.static(folder,{index:false}));
 app.use((req,res)=>{if(req.method==='GET'&&req.accepts('html'))res.sendFile(resolve(folder,'index.html'));else res.status(404).end();});
} else {
 const { createServer } = await import('vite');
 vite=await createServer({server:{middlewareMode:true,host:'127.0.0.1',hmr:{host:'127.0.0.1'}},appType:'spa'});
 app.use(vite.middlewares);
}
const host=process.env.HOST||'127.0.0.1'; const port=Number(process.env.PORT||8770);
const server=app.listen(port,host,()=>console.log(`ChessLab ready at http://${host}:${server.address().port}`));
server.on('error',error=>{console.error(`ChessLab could not start: ${error.message}`);shutdown();process.exitCode=1;});
async function shutdown(){server.close();await vite?.close();closeEngine();closeOpponentEngines();close();}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
