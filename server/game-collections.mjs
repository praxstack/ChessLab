import {randomUUID} from 'node:crypto';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function installCollections(app,db){
 db.exec(`CREATE TABLE IF NOT EXISTS game_collections (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL COLLATE NOCASE, description TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL, UNIQUE(user_id,name));
 CREATE TABLE IF NOT EXISTS collection_games (
  collection_id TEXT NOT NULL REFERENCES game_collections(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES games(id), PRIMARY KEY(collection_id,game_id));`);
 const read=(id,userId)=>{
  const row=db.prepare('SELECT id,name,description,revision,updated_at AS updatedAt FROM game_collections WHERE id=? AND user_id=?').get(id,userId);
  if(!row)fail(404,'This collection was not found.');
  return {...row,gameIds:db.prepare('SELECT game_id FROM collection_games WHERE collection_id=? ORDER BY rowid').all(id).map(x=>x.game_id)};
 };
 const details=body=>{
  if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>80||/[\u0000-\u001f\u007f]/.test(body.name))fail(400,'Use a collection name of 1–80 characters.');
  if(body.description!==undefined&&(typeof body.description!=='string'||body.description.length>1000))fail(400,'Keep the description under 1000 characters.');
  return {name:body.name.trim(),description:(body.description||'').trim()};
 };
 const transaction=fn=>{
  db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}
  catch(error){db.exec('ROLLBACK');if(String(error.message).includes('UNIQUE constraint failed: game_collections.user_id'))fail(409,'You already have a collection with that name.');throw error;}
 };
 const current=req=>{
  const c=read(req.params.id,req.user.id);
  if(!Number.isInteger(req.body.revision)||c.revision!==req.body.revision)fail(409,'This collection changed. Refresh the library and try again.');
  return c;
 };
 const touch=(c,userId)=>db.prepare('UPDATE game_collections SET revision=revision+1,updated_at=? WHERE id=? AND user_id=?').run(new Date().toISOString(),c.id,userId);
 app.get('/api/collections',(req,res)=>res.json({collections:db.prepare('SELECT id FROM game_collections WHERE user_id=? ORDER BY updated_at DESC,rowid DESC').all(req.user.id).map(c=>read(c.id,req.user.id))}));
 app.post('/api/collections',(req,res)=>{
  const value=details(req.body),id=randomUUID();
  transaction(()=>{
   if(db.prepare('SELECT COUNT(*) n FROM game_collections WHERE user_id=?').get(req.user.id).n>=100)fail(409,'This account has reached the 100-collection limit.');
   db.prepare('INSERT INTO game_collections(id,user_id,name,description,updated_at) VALUES(?,?,?,?,?)').run(id,req.user.id,value.name,value.description,new Date().toISOString());
  });res.status(201).json({collection:read(id,req.user.id)});
 });
 app.post('/api/collections/:id',(req,res)=>{
  transaction(()=>{const c=current(req),value=details(req.body);db.prepare('UPDATE game_collections SET name=?,description=? WHERE id=? AND user_id=?').run(value.name,value.description,c.id,req.user.id);touch(c,req.user.id);});
  res.json({collection:read(req.params.id,req.user.id)});
 });
 app.post('/api/collections/:id/games',(req,res)=>{
  transaction(()=>{
   const c=current(req),{gameIds,present}=req.body;
   if(!Array.isArray(gameIds)||!gameIds.length||gameIds.length>500||gameIds.some(id=>typeof id!=='string'||id.length>80)||typeof present!=='boolean')fail(400,'Select 1–500 saved games and an add or remove action.');
   const ids=[...new Set(gameIds)];
   for(const id of ids)if(!db.prepare('SELECT 1 FROM games WHERE id=? AND user_id=?').get(id,req.user.id))fail(404,'A selected saved game was not found.');
   const update=db.prepare(present?'INSERT OR IGNORE INTO collection_games VALUES(?,?)':'DELETE FROM collection_games WHERE collection_id=? AND game_id=?');
   for(const id of ids)update.run(c.id,id);
   touch(c,req.user.id);
  });res.json({collection:read(req.params.id,req.user.id)});
 });
 app.post('/api/collections/:id/delete',(req,res)=>{
  transaction(()=>{const c=current(req);db.prepare('DELETE FROM game_collections WHERE id=? AND user_id=?').run(c.id,req.user.id);});res.json({deleted:true});
 });
}
