import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),directory=resolve(root,'.local/performance-baseline');
const hash=b=>createHash('sha256').update(b).digest('hex');
const frozen=JSON.parse(await readFile(resolve(root,'benchmarks/results/optical-refinement/current-source.json')));
if(frozen.sourceSha256!=='bc2a5ad508a4350aac24d05a9c3519188573ee974398a39322f839ee46434bb7')throw Error('Unexpected BC2 baseline');
const fingerprint=createHash('sha256');
for(const name of frozen.inputs){const entry=frozen.files[name];if(!entry||hash(entry.source)!==entry.sha256)throw Error('Invalid frozen input '+name);fingerprint.update(name+'\0').update(entry.source).update('\0');}
if(fingerprint.digest('hex')!==frozen.sourceSha256)throw Error('Frozen source fingerprint mismatch');
let count=0;
for(const [name,entry]of Object.entries(frozen.files)){
 if(!/^(src|vendor)\//.test(name))continue;
 const target=resolve(directory,name);
 if(!target.startsWith(directory+'/')||hash(entry.source)!==entry.sha256)throw Error('Invalid frozen source '+name);
 let existing;try{existing=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing&&hash(existing)!==entry.sha256)throw Error('Preserve differing baseline '+name);
 if(!existing){await mkdir(dirname(target),{recursive:true});await writeFile(target,entry.source);}count++;
}
console.log(JSON.stringify({baselineSource:frozen.sourceSha256,files:count,compilerRequired:false}));
