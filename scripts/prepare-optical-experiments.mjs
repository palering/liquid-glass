import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),base=resolve(root,'.local/optics-baseline');
const snapshot=JSON.parse(await readFile(resolve(root,'benchmarks/results/optical-refinement/baseline-source.json')));
const hash=s=>createHash('sha256').update(s).digest('hex');
for(const [name,entry] of Object.entries(snapshot.files)){
 const p=resolve(base,name);if(!/^(src|vendor)\//.test(name)||!p.startsWith(base+'/')||hash(entry.source)!==entry.sha256)throw Error('Invalid snapshot '+name);
 let existing;try{existing=await readFile(p);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing&&hash(existing)!==entry.sha256)throw Error('Preserve differing baseline '+name);
 if(!existing){await mkdir(dirname(p),{recursive:true});await writeFile(p,entry.source);}
}
execFileSync('cargo',['build','--release','--locked','--manifest-path','tools/shader-translator/Cargo.toml'],{cwd:root,stdio:'inherit',env:{...process.env,CARGO_HOME:process.env.CARGO_HOME??resolve(root,'.local/cargo-home'),CARGO_TARGET_DIR:resolve(root,'.local/shader-translator-target')}});
async function expand(source,dir){for(const m of source.matchAll(/#include '([^']+)'/g)){const file=resolve(dir,m[1]);if(!file.startsWith(base+'/'))throw Error('Invalid include');source=source.replace(m[0],await expand(await readFile(file,'utf8'),dirname(file)));}return source;}
const original=snapshot.files['src/shaders/optics.wgsl'].source;
const begin=original.indexOf('fn getNormal('),end=original.indexOf('// Safe normalize');
const finite=original.slice(begin,end).replace('fn getNormal(','fn finiteNormal(');
const gradient=await readFile(resolve(root,'experiments/optics/gradient.wgsl'),'utf8');
const manifest={baselineSource:snapshot.sourceSha256,compiler:'naga-30.0.0',candidates:{}};
for(const variant of ['analytic','hybrid','height','bounded']){
 const directory=resolve(root,`.local/optics-${variant}`);
 for(const [name,entry]of Object.entries(snapshot.files)){await mkdir(dirname(resolve(directory,name)),{recursive:true});await writeFile(resolve(directory,name),entry.source);}
 const body=await readFile(resolve(root,`experiments/optics/${variant}.wgsl`),'utf8');
 let source=original.slice(0,begin)+gradient+(variant==='hybrid'?finite:'')+(variant==='height'?'':body)+original.slice(end);
 if(variant==='bounded'){source=original+body;source=source.replace(/pow\(\s*(1\.0 \+ merged[\s\S]*?),\s*5\.0\s*\)/g, (_,base)=>`positiveFifth(${base})`);if((source.match(/positiveFifth\(/g)??[]).length!==3)throw Error('Expected two bounded fifth-power replacements');}
 if(variant==='height')source=source.slice(0,source.indexOf('// ---- Main fragment shader'))+body;
 source=await expand(source,resolve(base,'src/shaders'));
 const input=resolve(directory,'candidate.wgsl'),output=resolve(directory,'src/shaders/generated/optics.json');await writeFile(input,source);
 execFileSync(resolve(root,'.local/shader-translator-target/release/glass-shader-translator'),[input,'fragment','fs_main',output],{stdio:'inherit'});
 const data=JSON.parse(await readFile(output)),previous=JSON.parse(snapshot.files['src/shaders/generated/optics.json'].source);
 if(JSON.stringify(data.uniforms)!==JSON.stringify(previous.uniforms))throw Error('Candidate changed uniform ABI');
 manifest.candidates[variant]={wgslSha256:hash(source),artifactSha256:hash(await readFile(output))};
}
await writeFile(resolve(root,'.local/optical-candidates.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared immutable baseline and four compiled optical candidates');
