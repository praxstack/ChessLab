import {positionKey} from '../shared/game-review.js';
import {beginPractice,practiceView,advancePractice} from '../shared/review-practice.js';
export {beginPractice,practiceView,advancePractice};
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function installReviewPractice(app,db,{owned,savedReview,analyze,limit}){
 db.exec('CREATE TABLE IF NOT EXISTS review_practice (game_id TEXT PRIMARY KEY REFERENCES games(id), data TEXT NOT NULL)');
 const read=game=>{const row=db.prepare('SELECT data FROM review_practice WHERE game_id=?').get(game.id);return row?{raw:row.data,value:JSON.parse(row.data)}:null;};
 const save=(game,next,old)=>{const saved=db.prepare('INSERT INTO review_practice VALUES (?,?) ON CONFLICT(game_id) DO UPDATE SET data=excluded.data WHERE review_practice.data=?').run(game.id,JSON.stringify(next),old?.raw??null);if(!saved.changes)fail(409,'Practice changed in another tab. Reload its saved progress.');};
 app.get('/api/games/:id/practice-review',(req,res)=>{const game=owned(req),stored=read(game);if(stored&&stored.value.sourceKey!==positionKey(game))return res.json({practice:null,stale:true,revision:stored.value.revision});res.json({practice:practiceView(stored?.value,game)});});
 app.post('/api/games/:id/practice-review/start',(req,res)=>{
  const game=owned(req),stored=read(game);if(stored&&(!Number.isInteger(req.body.revision)||req.body.revision!==stored.value.revision))fail(409,'Reload the saved practice before starting again.');
  const next=beginPractice(game,savedReview(game),req.body.side);if(stored)next.revision=stored.value.revision+1;save(game,next,stored);res.status(201).json({practice:practiceView(next,game)});
 });
 app.post('/api/games/:id/practice-review/action',async(req,res)=>{
  const game=owned(req),stored=read(game);if(!stored)fail(404,'Start practice from a completed game review.');if(!Number.isInteger(req.body.revision)||stored.value.revision!==req.body.revision)fail(409,'Practice changed in another tab. Reload its saved progress.');
  limit(`review-practice:${req.user.id}`,1500,3600000);const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};res.on('close',abort);
  try{const next=await advancePractice(stored.value,game,req.body,input=>analyze(input,{signal:controller.signal}));if(controller.signal.aborted)fail(499,'Practice paused. Your previous progress is saved.');const fresh=owned(req);if(positionKey(fresh)!==positionKey(game))fail(409,'The game history changed during this attempt. Reload it.');save(game,next,stored);res.json({practice:practiceView(next,game)});}finally{res.off('close',abort);}
 });
}
