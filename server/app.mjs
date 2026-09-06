import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Chess } from 'chess.js';
import * as engine from './engine.mjs';
import { lessons, puzzles, catalog } from './content.mjs';

const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const uci = move => move.from + move.to + (move.promotion || '');
function moveOn(chess, value) {
 if (typeof value !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)) fail(400, 'Choose a legal move, including the promotion piece when needed.');
 try { return chess.move({ from:value.slice(0,2), to:value.slice(2,4), promotion:value[4] }); }
 catch { fail(400, 'That move is not legal in this position.'); }
}
const replay = engine.replay;
const gameResult = chess => chess.isCheckmate() ? (chess.turn() === 'w' ? '0-1' : '1-0') : chess.isDraw() ? '1/2-1/2' : null;
function validateStudy(study, game) {
 if (!study || study.version !== 1 || !Array.isArray(study.branches) || study.branches.length > 40) fail(400, 'This study format is invalid or too large.');
 const ids = new Set(); let total = 0;
 const branches = study.branches.map(b => {
  if (!b || typeof b.id !== 'string' || !/^[\w-]{1,80}$/.test(b.id) || ids.has(b.id)) fail(400, 'Each branch needs a unique identifier.');
  ids.add(b.id);
  if (!Number.isInteger(b.anchorPly) || b.anchorPly < 0 || !Array.isArray(b.moves) || b.anchorPly > b.moves.length) fail(400, 'A branch has an invalid starting point.');
  total += b.moves.length;
  if (total > 5000) fail(400, 'This study has too many moves. Export or split the study before adding more.');
  replay(b.moves, game.initialFen);
  if (b.question !== undefined && (typeof b.question !== 'string' || b.question.length > 2000)) fail(400, 'Keep each question under 2000 characters.');
  if (b.parentId !== null && b.parentId !== undefined && typeof b.parentId !== 'string') fail(400, 'Invalid branch parent.');
  return {id:b.id,parentId:b.parentId || null,anchorPly:b.anchorPly,moves:b.moves,question:b.question || ''};
 });
 const byId = new Map(branches.map(b=>[b.id,b]));
 for (const b of branches) {
  const parent = b.parentId ? byId.get(b.parentId) : null;
  if (b.parentId && !parent) fail(400, 'A branch refers to a missing parent.');
  const original = parent ? parent.moves : game.moves;
  if (b.anchorPly > original.length || b.moves.slice(0,b.anchorPly).some((m,i)=>m !== original[i])) fail(400, 'A branch must preserve the moves before its starting point.');
  const visited = new Set([b.id]); let p = parent;
  while (p) { if (visited.has(p.id)) fail(400, 'Branch parents cannot form a loop.'); visited.add(p.id); p = p.parentId ? byId.get(p.parentId) : null; }
 }
 const selected = study.selectedBranchId ?? null;
 if (selected !== null && !byId.has(selected)) fail(400, 'The selected branch does not exist.');
 if (!Number.isInteger(study.anchorPly) || study.anchorPly < 0 || study.anchorPly > game.moves.length) fail(400, 'The return point is outside the actual game.');
 return {version:1,branches,selectedBranchId:selected,anchorPly:study.anchorPly};
}

export function createApp({databasePath = process.env.CHESSLAB_DB || resolve('data/chesslab.sqlite'), engineApi = engine} = {}) {
 if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), {recursive:true});
 const db = new DatabaseSync(databasePath);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL, data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS games_owner ON games(user_id);
 CREATE TABLE IF NOT EXISTS progress (user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, item_id TEXT NOT NULL, PRIMARY KEY(user_id,kind,item_id));`);
 const app = express(); app.disable('x-powered-by');
 const rateWindows = new Map(); const pendingBot = new Set();
 function limit(key, max, period = 60000) {
  const stamp = Date.now(); const bucket = rateWindows.get(key);
  if (!bucket || bucket.until < stamp) {
   if (rateWindows.size > 10000) for (const [id, b] of rateWindows) if (b.until < stamp) rateWindows.delete(id);
   rateWindows.set(key,{count:1,until:stamp+period}); return;
  }
  if (++bucket.count > max) fail(429, 'Too many requests. Wait a minute and try again.');
 }
 app.use((req,res,next)=>{
  res.set('X-Content-Type-Options','nosniff'); res.set('Referrer-Policy','same-origin'); res.set('X-Frame-Options','DENY');
  if (req.path.startsWith('/api/')) res.set('Cache-Control','no-store');
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
   const origin = req.get('origin');
   if (origin) {
    let requestOrigin; try { requestOrigin = new URL(origin).origin; } catch { return res.status(403).json({error:'This request came from an invalid origin.'}); }
    if (requestOrigin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({error:'Cross-origin changes are not allowed.'});
   }
   if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({error:'Cross-site changes are not allowed.'});
   if (!req.is('application/json')) return res.status(415).json({error:'Use JSON for this request.'});
  }
  next();
 });
 app.use(express.json({limit:'256kb',strict:true}));
 app.use('/api',(req,res,next)=>{
  if (req.body && (Array.isArray(req.body) || typeof req.body !== 'object')) return res.status(400).json({error:'Expected a JSON object.'});
  req.body ??= {};
  const token = /(?:^|;\s*)chesslab_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  if (token) req.user = db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token),Date.now());
  next();
 });
 const progress = userId => {
  const rows = userId ? db.prepare('SELECT kind,item_id FROM progress WHERE user_id=?').all(userId) : [];
  return {lessons:rows.filter(x=>x.kind==='lesson').map(x=>x.item_id),puzzles:rows.filter(x=>x.kind==='puzzle').map(x=>x.item_id)};
 };
 const me = user => ({user:user || null,progress:progress(user?.id)});
 function requireUser(req,res,next) { if (!req.user) return res.status(401).json({error:'Sign in to save your game and progress.'}); next(); }
 function setSession(res,userId) {
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),userId,Date.now()+7*86400000);
  res.cookie('chesslab_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='1',maxAge:7*86400000,path:'/'});
 }
 app.get('/api/status',async(req,res)=>res.json({engine:await engineApi.engineStatus(),billingEnabled:false}));
 app.get('/api/me',(req,res)=>res.json(me(req.user)));
 app.post('/api/register',async(req,res)=>{
  limit(`auth:${req.ip}`,15);
  const {username,password} = req.body;
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,32}$/.test(username) || typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400,'Use a 3–32 character username (letters, numbers, _ or -) and a 10–128 character password.');
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409,'That username is already in use.');
  const salt = randomBytes(16).toString('hex'); const secret = (await derive(password,salt,64)).toString('hex');
  const user = {id:randomUUID(),username};
  try { db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(user.id,username,salt,secret,now()); }
  catch (e) { if (String(e.message).includes('UNIQUE')) fail(409,'That username is already in use.'); throw e; }
  setSession(res,user.id);res.status(201).json(me(user));
 });
 app.post('/api/login',async(req,res)=>{
  limit(`auth:${req.ip}`,15);
  const {username,password} = req.body;
  if (typeof username !== 'string' || username.length>32 || typeof password !== 'string' || password.length>128) fail(400,'Enter your username and password.');
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  const secret = await derive(password,user?.salt || 'missing-account-salt',64);
  if (!user || !timingSafeEqual(secret,Buffer.from(user.password_hash,'hex'))) fail(401,'The username or password is incorrect.');
  setSession(res,user.id);res.json(me({id:user.id,username:user.username}));
 });
 app.post('/api/logout',(req,res)=>{
  const token = /(?:^|;\s*)chesslab_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
  res.clearCookie('chesslab_session',{path:'/',httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='1'});res.json(me(null));
 });
 app.get('/api/learn',(req,res)=>res.json(catalog()));
 app.use('/api',requireUser);
 const owned = (req) => {
  const row = db.prepare('SELECT data FROM games WHERE id=? AND user_id=?').get(req.params.id,req.user.id);
  if (!row) fail(404,'This saved game was not found.'); return JSON.parse(row.data);
 };
 const expected = (req,game) => { if (!Number.isInteger(req.body.revision) || req.body.revision !== game.revision) fail(409,'This game has changed. Reload it before moving again.'); };
 const storeGame = (userId,game,oldRevision) => {
  const current = db.prepare('SELECT data FROM games WHERE id=? AND user_id=?').get(game.id,userId);
  if (!current) fail(404,'This game was not found.');
  const next = {...game,study:JSON.parse(current.data).study,studyRevision:JSON.parse(current.data).studyRevision || 0,revision:oldRevision+1,updatedAt:now()};
  if (!db.prepare('UPDATE games SET revision=?,data=? WHERE id=? AND user_id=? AND revision=?').run(next.revision,JSON.stringify(next),next.id,userId,oldRevision).changes) fail(409,'This game changed while the request was running. Reload it to continue.');
  return next;
 };
 const insertGame = (userId,values) => {
  if (db.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id=?').get(userId).n >= 500) fail(409,'This account has reached the 500-game limit for this first version. Export your games before adding more.');
  const game = {id:randomUUID(),title:'Practice game',color:'w',level:2,moves:[],initialFen:null,result:null,revision:0,createdAt:now(),updatedAt:now(),study:null,studyRevision:0,source:'bot',...values};
  db.prepare('INSERT INTO games VALUES (?,?,?,?)').run(game.id,userId,game.revision,JSON.stringify(game)); return game;
 };
 app.get('/api/games',(req,res)=>res.json({games:db.prepare('SELECT data FROM games WHERE user_id=? ORDER BY rowid DESC').all(req.user.id).map(row=>JSON.parse(row.data))}));
 app.post('/api/games',(req,res)=>{
  const {color='w',level=2,title} = req.body;
  if (!['w','b'].includes(color) || !Number.isInteger(level) || level<1 || level>5 || (title!==undefined && (typeof title!=='string'||title.length>100))) fail(400,'Choose White or Black and a bot level from 1 to 5.');
  res.status(201).json({game:insertGame(req.user.id,{color,level,title:title || `Practice · level ${level}`})});
 });
 app.get('/api/games/:id',(req,res)=>res.json({game:owned(req)}));
 app.post('/api/games/:id/move',(req,res)=>{
  const game=owned(req);expected(req,game);
  if (game.result || game.source!=='bot') fail(409,'This game is available for review, not further play.');
  const chess=replay(game.moves,game.initialFen);
  if (chess.turn()!==game.color) fail(409,'Wait for your opponent to move.');
  if (game.moves.length>=1000) fail(400,'This game has reached the move limit.');
  const move=moveOn(chess,req.body.move);game.moves.push(uci(move));game.result=gameResult(chess);
  res.json({game:storeGame(req.user.id,game,game.revision)});
 });
 app.post('/api/games/:id/bot',async(req,res)=>{
  const game=owned(req);expected(req,game);
  if (game.result || game.source!=='bot') fail(409,'This game is available for review, not further play.');
  const chess=replay(game.moves,game.initialFen);
  if (chess.turn()===game.color) fail(409,'It is your turn.');
  if (pendingBot.has(game.id)) fail(409,'The opponent is already thinking.');
  if (game.moves.length>=1000) fail(400,'This game has reached the move limit.');
  pendingBot.add(game.id);
  try {
   const analysis=await engineApi.analyze({moves:game.moves,initialFen:game.initialFen,movetime:[80,150,250,400,700][game.level-1],lines:1,skill:[0,4,8,14,20][game.level-1]});
   if (!analysis.bestmove) fail(503,'The engine returned no move. Retry the opponent turn.');
   const move=moveOn(chess,analysis.bestmove);game.moves.push(uci(move));game.result=gameResult(chess);
   res.json({game:storeGame(req.user.id,game,game.revision)});
  } finally {pendingBot.delete(game.id);}
 });
 app.post('/api/games/:id/resign',(req,res)=>{
  const game=owned(req);expected(req,game);
  if(game.result || game.source!=='bot') fail(409,'This game has already ended or is an imported review.');
  game.result=game.color==='w'?'0-1':'1-0';res.json({game:storeGame(req.user.id,game,game.revision)});
 });
 app.post('/api/import',(req,res)=>{
  const {pgn}=req.body;
  if(typeof pgn!=='string'||pgn.length<3||pgn.length>50000) fail(400,'Paste a PGN between 3 and 50,000 characters.');
  const chess=new Chess();try{chess.loadPgn(pgn,{strict:true});}catch{fail(400,'This PGN contains an invalid position or move. Your other games are unchanged.');}
  const moves=chess.history({verbose:true}).map(uci);
  if(!moves.length||moves.length>1000) fail(400,'Import a game containing 1–1000 legal moves.');
  const headers=chess.getHeaders();const initialFen=headers.FEN || null;replay(moves,initialFen);
  const result=gameResult(chess)||(['1-0','0-1','1/2-1/2'].includes(headers.Result)?headers.Result:null);
  const title=`${headers.White || 'White'} vs ${headers.Black || 'Black'}`.slice(0,100);
  res.status(201).json({game:insertGame(req.user.id,{title,source:'import',moves,initialFen,result,headers:{White:String(headers.White || 'White').slice(0,100),Black:String(headers.Black || 'Black').slice(0,100)}})});
 });
 app.get('/api/games/:id/pgn',(req,res)=>{
  const game=owned(req);const chess=replay(game.moves,game.initialFen);
  for (const [key,value] of Object.entries({Event:'ChessLab study',White:game.color==='w'?req.user.username:'ChessLab bot',Black:game.color==='b'?req.user.username:'ChessLab bot',Result:game.result || '*'})) chess.setHeader(key,value);
  if(game.source==='import') {chess.setHeader('White',game.headers?.White || 'Imported White');chess.setHeader('Black',game.headers?.Black || 'Imported Black');}
  res.type('text/plain').set('Content-Disposition',`attachment; filename="chesslab-${game.id}.pgn"`).send(chess.pgn());
 });
 app.post('/api/games/:id/study',(req,res)=>{
  const game=owned(req);
  if (!Number.isInteger(req.body.studyRevision) || req.body.studyRevision !== (game.studyRevision || 0)) fail(409,'This study changed in another tab. Keep your draft and reload before saving again.');
  game.study=validateStudy(req.body.study,game);game.studyRevision=(game.studyRevision || 0)+1;
  // Study edits keep the move revision stable; storeGame merges the latest saved study after asynchronous engine work.
  db.prepare('UPDATE games SET data=? WHERE id=? AND user_id=?').run(JSON.stringify({...game,updatedAt:now()}),game.id,req.user.id);
  res.json({game});
 });
 app.post('/api/analyze',async(req,res)=>{limit(`analysis:${req.user.id}`,100);res.json(await engineApi.analyze(req.body));});
 app.post('/api/lessons/:id/answer',(req,res)=>{
  const lesson=lessons.find(x=>x.id===req.params.id);if(!lesson)fail(404,'Lesson not found.');
  if(!Number.isInteger(req.body.choice)||req.body.choice<0||req.body.choice>=lesson.choices.length)fail(400,'Choose one of the answers.');
  const correct=req.body.choice===lesson.answer;
  if(correct)db.prepare('INSERT OR IGNORE INTO progress VALUES (?,?,?)').run(req.user.id,'lesson',lesson.id);
  res.json({correct,explanation:lesson.explanation,progress:progress(req.user.id)});
 });
 app.post('/api/puzzles/:id/answer',(req,res)=>{
  const puzzle=puzzles.find(x=>x.id===req.params.id);if(!puzzle)fail(404,'Puzzle not found.');
  const {moves}=req.body;
  if(!Array.isArray(moves)||!moves.length||moves.length>puzzle.solution.length||moves.length%2!==1||!moves.every(m=>typeof m==='string')) fail(400,'Submit your move and the replies already shown in this puzzle.');
  const solvedBoard=replay(moves,puzzle.fen);
  const matingMove=puzzle.theme==='Mate in one'&&moves.length===1&&solvedBoard.isCheckmate();
  const correct=matingMove||moves.every((m,i)=>m===puzzle.solution[i]);const complete=correct&&moves.length===puzzle.solution.length;
  if(complete)db.prepare('INSERT OR IGNORE INTO progress VALUES (?,?,?)').run(req.user.id,'puzzle',puzzle.id);
  res.json({correct,complete,reply:correct&&!complete?puzzle.solution[moves.length]:null,explanation:complete?(matingMove?`${solvedBoard.history().at(-1)} is checkmate: the opposing king has no legal escape from check.`:puzzle.explanation):correct?'Correct. Consider the opponent’s reply and continue.':'That is not the intended solution. Try again or reveal the hint.',progress:progress(req.user.id)});
 });
 app.use('/api',(req,res)=>res.status(404).json({error:'This API route does not exist.'}));
 app.use((error,req,res,next)=>{
  if(res.headersSent)return next(error);
  const status=Number.isInteger(error.status)&&error.status>=400&&error.status<600?error.status:500;
  if(status===500)console.error('Request failed:',error.message);
  res.status(status).json({error:status===500?'The request could not be saved. Retry; your existing games are preserved.':error.type==='entity.parse.failed'?'The request body is not valid JSON.':error.message});
 });
 return {app,db,close:()=>db.close()};
}
