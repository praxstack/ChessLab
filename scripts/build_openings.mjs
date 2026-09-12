import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';

const source=new URL('../references/openings/',import.meta.url),output=new URL('../server/openings.json',import.meta.url);
const provenance=JSON.parse(readFileSync(new URL('provenance.json',source),'utf8'));
const entries=[],seen=new Set();
for(const volume of 'abcde'){
 const name=volume+'.tsv',data=readFileSync(new URL(name,source));
 if(createHash('sha256').update(data).digest('hex')!==provenance.files[name].sha256)throw new Error('Source hash changed: '+name);
 const [header,...rows]=data.toString('utf8').trimEnd().split('\n');if(header!=='eco\tname\tpgn')throw new Error('Unexpected opening columns.');
 for(const row of rows){
  const fields=row.split('\t');if(fields.length!==3)throw new Error('Invalid opening row.');
  const [eco,title,pgn]=fields;if(!/^[A-E]\d{2}$/.test(eco)||!title||title.length>200)throw new Error('Invalid opening identity.');
  const chess=new Chess();chess.loadPgn(pgn,{strict:true});const moves=chess.history({verbose:true}).map(move=>move.from+move.to+(move.promotion||''));
  if(!moves.length||moves.length>100)throw new Error('Unexpected opening length.');
  const id=createHash('sha256').update(eco+'\t'+title+'\t'+pgn).digest('hex').slice(0,20);if(seen.has(id))throw new Error('Duplicate opening.');seen.add(id);
  entries.push({id,eco,name:title,pgn,moves,fen:chess.fen()});
 }
}
entries.sort((a,b)=>a.eco.localeCompare(b.eco)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
const text=JSON.stringify({source:provenance.source,commit:provenance.commit,license:provenance.license,entries})+'\n';
if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==text)throw new Error('Opening catalogue differs from its source.');}else writeFileSync(output,text);
console.log(JSON.stringify({openings:entries.length,legalReplay:'pass',sourceCommit:provenance.commit,bytes:Buffer.byteLength(text)}));
