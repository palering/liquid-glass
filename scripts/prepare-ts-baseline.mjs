import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const baseline=JSON.parse(await readFile(resolve(root,'benchmarks/results/shader-preparation/current-source.json')));
const digest=createHash('sha256');
for(const [name,entry]of Object.entries(baseline.files)){
 if(createHash('sha256').update(entry.source).digest('hex')!==entry.sha256)throw Error('Corrupt TS baseline: '+name);
}
for(const name of baseline.inputs)digest.update(name+'\0').update(baseline.files[name].source).update('\0');
if(digest.digest('hex')!==baseline.sourceSha256)throw Error('TS baseline fingerprint mismatch');
for(const [name,entry]of Object.entries(baseline.files)){
 if(!/^(src|vendor)\//.test(name)&&name!=='package.json')continue;
 const target=resolve(root,'.local/ts-baseline',name);
 await mkdir(dirname(target),{recursive:true});await writeFile(target,entry.source);
}
console.log('Prepared frozen JS reference '+baseline.sourceSha256);
