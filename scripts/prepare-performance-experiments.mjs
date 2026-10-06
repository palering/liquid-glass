import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const frozen=JSON.parse(await readFile(resolve(root,'benchmarks/results/optical-refinement/current-source.json')));
const manifest={baselineSource:frozen.sourceSha256,compiler:'naga-30.0.0',candidate:'paired-gaussian'};
manifest.translatorInputs={};
for(const [name,entry]of Object.entries(frozen.files))if(name.startsWith('tools/shader-translator/')){
 const current=await readFile(resolve(root,name));
 if(hash(current)!==entry.sha256)throw Error('Translator differs from frozen baseline: '+name);
 manifest.translatorInputs[name]=entry.sha256;
}
manifest.translatorBinarySha256=hash(await readFile(resolve(root,'.local/shader-translator-target/release/glass-shader-translator')));
for(const variant of ['baseline','paired']){
 const directory=resolve(root,`.local/performance-${variant}`);
 for(const [name,entry]of Object.entries(frozen.files)){
  if(!/^(src|vendor)\//.test(name))continue;
  const target=resolve(directory,name);
  if(!target.startsWith(directory+'/')||hash(entry.source)!==entry.sha256)throw Error('Invalid frozen source '+name);
  let existing;try{existing=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(variant==='baseline'&&existing&&hash(existing)!==entry.sha256)throw Error('Preserve differing baseline '+name);
  await mkdir(dirname(target),{recursive:true});if(!existing||variant!=='baseline')await writeFile(target,entry.source);
 }
 if(variant==='paired'){
  const source=await readFile(resolve(root,'experiments/performance/image-paired.wgsl'),'utf8');
  const input=resolve(directory,'candidate.wgsl'),output=resolve(directory,'src/shaders/generated/image.json');await writeFile(input,source);
  // This experiment uses the already-built, locked translator; build it with
  // npm run shaders:generate once if absent. No production output is replaced.
  execFileSync(resolve(root,'.local/shader-translator-target/release/glass-shader-translator'),[input,'fragment','main',output],{stdio:'inherit'});
  const data=JSON.parse(await readFile(output));
  const before=JSON.parse(frozen.files['src/shaders/generated/image.json'].source);
  if(JSON.stringify(data.uniforms)!==JSON.stringify(before.uniforms))throw Error('Uniform ABI changed');
  manifest.wgslSha256=hash(source);manifest.artifactSha256=hash(await readFile(output));
 }
}
await writeFile(resolve(root,'.local/performance-candidates.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
