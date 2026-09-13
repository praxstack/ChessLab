import test from 'node:test';
import assert from 'node:assert/strict';
import {readAnnotatedPgn,writeAnnotatedPgn,portableStudy,readPortableStudy,validateStudy} from './study-format.mjs';

test('annotated PGN preserves legal nested alternatives, comments, glyphs and black FEN move numbering',()=>{
 const pgn='[White "Learner"]\n[Black "Partner"]\n\n{Opening plan} 1. e4 {Center first} e5 (1... c5 $1 {Sicilian} 2. Nf3 (2. Nc3 $5 {Develop another knight})) 2. Nf3 *';
 const g=readAnnotatedPgn(pgn);assert.deepEqual(g.moves,['e2e4','e7e5','g1f3']);assert.equal(g.study.branches.length,2);assert.equal(g.study.branches[1].parentId,g.study.branches[0].id);assert.equal(g.study.annotations.length,4);
 const out=writeAnnotatedPgn(g,'local');assert.match(out,/\(1\.\.\. c5/);assert.match(out,/\$1/);assert.match(out,/Center first/);
 const copy=readAnnotatedPgn(out);assert.deepEqual(copy.moves,g.moves);assert.deepEqual(copy.study.branches.map(b=>[b.anchorPly,b.moves]),g.study.branches.map(b=>[b.anchorPly,b.moves]));assert.deepEqual(copy.study.annotations.map(a=>[a.ply,a.comment,a.nags]),g.study.annotations.map(a=>[a.ply,a.comment,a.nags]));
 const black=readAnnotatedPgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R b - - 0 9"]\n\n9... Kd7 (9... Kf7 {Other direction}) 10. Rh7+ *');assert.match(writeAnnotatedPgn(black,'local'),/9\.\.\. Kd7/);assert.deepEqual(readAnnotatedPgn(writeAnnotatedPgn(black,'local')).moves,black.moves);
 assert.throws(()=>readAnnotatedPgn('1. e4 e5 (1... c4) 2. Nf3 *'),/illegal|invalid/i);
});

test('portable studies preserve exact tree identity and arbitrary note text without transplanting account or running state',()=>{
 const g=readAnnotatedPgn('1. e4 (1. d4 d5 (1... Nf6)) e5 *');g.title='My study';g.study.selectedBranchId=g.study.branches[1].id;g.study.anchorPly=0;g.study.branches[0].question='What about {this}?\nAnd "that"? ♟';g.user_id='private';g.clock={running:true};
 const portable=portableStudy(g);assert.equal(portable.format,'chesslab-study');assert.ok(!JSON.stringify(portable).includes('private'));assert.ok(!('clock' in portable.game));
 const bot=portableStudy({...g,source:'bot',color:'b',botName:'Martin'},'Local player');assert.equal(bot.game.headers.White,'Martin');assert.equal(bot.game.headers.Black,'Local player');
 const imported=readPortableStudy(JSON.parse(JSON.stringify(portable)));assert.equal(imported.title,g.title);assert.deepEqual(imported.study,g.study);assert.deepEqual(imported.moves,g.moves);assert.equal(imported.source,'import');
 for(const change of [p=>p.version=9,p=>p.game.moves=['e2e5'],p=>p.game.study.branches[0].parentId='missing',p=>p.game.study.annotations=[{branchId:'',ply:0,comment:'bad',nags:[]}],p=>p.game.study.annotations=[{branchId:null,ply:99,comment:'bad',nags:[]}],p=>p.game.study.annotations=[{branchId:null,ply:1,comment:'bad',nags:[-1]}]]){const bad=structuredClone(portable);change(bad);assert.throws(()=>readPortableStudy(bad));}
 const bad=structuredClone(g.study);bad.annotations=[{branchId:g.study.branches[1].id,ply:0,comment:'Wrong branch prefix',nags:[]}];assert.throws(()=>validateStudy(bad,g));
});

test('PGN keeps the original boundary while carrying terminal continuations and adjacent comments',()=>{
 const game=readAnnotatedPgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R b - - 0 9"]\n\n*');
 game.study.branches=[{id:'end',parentId:null,anchorPly:0,moves:['e8d7'],question:'Try this defense'}];game.study.annotations=[{branchId:null,ply:0,comment:'Original setup',nags:[]},{branchId:'end',ply:1,comment:'King moves',nags:[]}];
 const copy=readAnnotatedPgn(writeAnnotatedPgn(game,'local'));assert.deepEqual(copy.moves,[]);assert.deepEqual(copy.study.branches[0].moves,['e8d7']);assert.equal(copy.study.branches[0].anchorPly,0);assert.ok(copy.study.annotations.some(a=>a.comment==='King moves'));
});
