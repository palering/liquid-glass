import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),sha=b=>createHash('sha256').update(b).digest('hex');
const frozen=JSON.parse(await readFile(resolve(root,'benchmarks/results/performance-profiles/current-source.json')));
const fingerprint=createHash('sha256');
for(const [name,entry]of Object.entries(frozen.files))if(sha(entry.source)!==entry.sha256)throw Error('Corrupt checkpoint '+name);
for(const name of frozen.inputs)fingerprint.update(name+'\0').update(frozen.files[name].source).update('\0');
if(fingerprint.digest('hex')!==frozen.sourceSha256)throw Error('Checkpoint fingerprint mismatch');
const toolInputs={};
for(const name of ['tools/shader-translator/Cargo.toml','tools/shader-translator/Cargo.lock','tools/shader-translator/src/main.rs']){
 const hash=sha(await readFile(resolve(root,name)));
 if(hash!==frozen.files[name]?.sha256)throw Error('Compiler differs from frozen experiment: '+name);
 toolInputs[name]=hash;
}
const compiler=resolve(root,'.local/shader-translator-target/release/glass-shader-translator');
const variants=['baseline','zero-lighting','uniform-constants','weights','weights-unrolled','gaussian-recurrence','height-hermite','height-semicircle','height-convex'];
const manifest={baselineSource:frozen.sourceSha256,compiler:'naga-30.0.0',toolInputs,compilerBinarySha256:sha(await readFile(compiler)),variants:{}};
const specs=[['optics-vertex','vertex','vs_main'],['optics','fragment','fs_main'],['image-vertex','vertex','main'],['image','fragment','main']];
async function expand(file){let source=await readFile(file,'utf8');for(const m of source.matchAll(/#include '([^']+)'/g))source=source.replace(m[0],await expand(resolve(dirname(file),m[1])));return source;}
for(const variant of variants){
 const dir=resolve(root,`.local/shader-preparation-${variant}`);
 for(const [name,e]of Object.entries(frozen.files)){
  if(!/^(src|vendor)\//.test(name))continue;
  if(sha(e.source)!==e.sha256)throw Error('Corrupt checkpoint '+name);
  const target=resolve(dir,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,e.source);
 }
 if(variant!=='baseline'){
  const stem=(variant.startsWith('weights')||variant==='gaussian-recurrence')?'image':'optics';
  await writeFile(resolve(dir,`src/shaders/${stem}.wgsl`),await readFile(resolve(root,`experiments/shader-preparation/${variant}.wgsl`)));
  if(variant==='uniform-constants'){
   await writeFile(resolve(dir,'src/optical-constants.js'),await readFile(resolve(root,'experiments/shader-preparation/constants.js')));
   const path=resolve(dir,'src/policy.js');let source=await readFile(path,'utf8');source="import {prepareOpticalConstants} from './optical-constants.js';\n"+source;
   source=source.replace('  const light = theme === "light";\n  return {','  const light = theme === "light";\n  const values = {');
   const end=source.lastIndexOf('  };\n}');if(end<0||!source.includes('  const values = {'))throw Error('Frozen optical policy no longer matches');
   source=source.slice(0,end)+source.slice(end).replace('  };\n}','  };\n  return {...values,...prepareOpticalConstants(values.u_tint,values.u_refFresnelRange,values.u_glareRange)};\n}');
   await writeFile(path,source);
  }
  if(variant.startsWith('weights')){
   await writeFile(resolve(dir,'src/gaussian-weights.js'),await readFile(resolve(root,'experiments/shader-preparation/weights.js')));
   for(const backend of ['wgpu','webgl']){
    const path=resolve(dir,`src/renderers/blur-${backend}.js`);let source=await readFile(path,'utf8');source="import {prepareGaussian} from '../gaussian-weights.js';\n"+source;
    source=source.replace('{ step: [x, y], size: [w, h], sigma, mode }','{ ...prepareGaussian(sigma), step: [x, y], size: [w, h], sigma, mode }');
    await writeFile(path,source);
   }
  }
  let packers='// Generated from candidate Naga reflection.\n';const outputs={};
  for(const [name,stage,entry]of specs){
   const source=await expand(resolve(dir,`src/shaders/${name}.wgsl`)),input=resolve(dir,`${name}.wgsl`),output=resolve(dir,`src/shaders/generated/${name}.json`);await writeFile(input,source);
   execFileSync(compiler,[input,stage,entry,output]);
   const data=JSON.parse(await readFile(output)),stem=name.replace(/(^|-)([a-z])/g,(_,p,c)=>c.toUpperCase());
   for(const [uniform,layout]of Object.entries(data.uniforms)){
    packers+=`export function pack${stem}${uniform[0].toUpperCase()+uniform.slice(1)}(data,values){const {f32,i32,u32}=data;\n`;
    for(const [field,info]of Object.entries(layout.fields))for(let i=0;i<info.count;i++)packers+=`${info.kind}[${info.offset/4+i}]=values[${JSON.stringify(field)}]${info.count===1?'':`?.[${i}]`}??0;\n`;
    packers+='return data.buffer;}\n';
   }
   outputs[name]=sha(await readFile(output));
  }
  await writeFile(resolve(dir,'src/shaders/generated/packers.js'),packers);
  manifest.variants[variant]={outputs,packersSha256:sha(packers)};
 }
}
await writeFile(resolve(root,'.local/shader-preparation-candidates.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
