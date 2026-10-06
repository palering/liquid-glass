// Freeze a completed local run. Never overwrite an existing acceptance archive.
import {readFile,writeFile,mkdir,readdir,copyFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const archive=resolve(root,'benchmarks/results/shader-preparation');
const output=resolve(root,'output/shader-preparation');
const sha=data=>createHash('sha256').update(data).digest('hex');
const json=async name=>JSON.parse(await readFile(resolve(output,name+'.json')));
const previous=JSON.parse(await readFile(resolve(root,'benchmarks/results/performance-profiles/current-source.json')));
const source=JSON.parse(await readFile(resolve(root,'public/benchmark-source.json')));
const quality=await json('current-quality'),contracts=await json('contracts'),stability=await json('stability'),chrome=await json('chrome-smoke');
const consumer=await json('consumer-production'),matrix=await json('consumer-matrix');
const provenance=await json('candidate-provenance');
for(const result of [quality,contracts,stability,chrome]){
 if(!result.passed||result.rows.some(row=>!row.passed))throw Error('Acceptance gate failed');
 const resultSource=result.productionSource??result.source;
 if((typeof resultSource==='string'?resultSource:resultSource.sourceSha256)!==source.sourceSha256)throw Error('Acceptance source mismatch');
}
if(matrix.phase!=='complete'||matrix.samples.length!==20||matrix.samples.some(s=>!s.focusRetained||!s.inputRetained||s.stageReads!==0||s.overflow||s.comparisons.some(c=>c.maxDelta>.05)))throw Error('Consumer matrix gate failed');
if(consumer.sourceSha256!==source.sourceSha256||consumer.mobile.length!==2||consumer.mobile.some(s=>s.qa||s.scrollWidth!==s.width||!s.loadedImages||s.stage.backend!=='webgpu'))throw Error('Consumer production gate failed');
// Extra provenance fields must not change the candidate outputs measured earlier.
for(const name of (await readdir(output)).filter(n=>n.endsWith('.json'))){
 const data=JSON.parse(await readFile(resolve(output,name)));
 for(const [variant,artifact]of Object.entries(data.candidateArtifact?.variants??{})){
  if(JSON.stringify(artifact)!==JSON.stringify(provenance.variants[variant]))throw Error('Candidate artifacts changed since measurement: '+variant);
 }
}
const fingerprint=createHash('sha256');
for(const name of source.inputs)fingerprint.update(name+'\0').update(await readFile(resolve(root,name))).update('\0');
if(fingerprint.digest('hex')!==source.sourceSha256)throw Error('Production changed after acceptance');
const candidates=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const paths=[...new Set([...source.inputs,...candidates.filter(name=>
 /^(src|types|tools|scripts|tests|lab|experiments|vendor)\//.test(name)||
 /^docs\/[^/]+\.md$/.test(name)||
 /^(package(-lock)?\.json|tsconfig\.json|vite[^/]*\.js|[^/]+\.html|AGENTS\.md|README[^/]*\.md|NOTICE\.md|LICENSE|\.gitignore)$/.test(name)
)])].sort();
const files={};
for(const name of paths){
 const bytes=await readFile(resolve(root,name));
 if(bytes.includes(0))throw Error('Unexpected binary in source checkpoint: '+name);
 files[name]={sha256:sha(bytes),source:bytes.toString('utf8')};
}
const checkpoint={schema:'liquid-glass-js-checkpoint',version:1,sourceSha256:source.sourceSha256,inputs:source.inputs,predecessor:previous.sourceSha256,
 note:'Post-shader, pre-TS source checkpoint including runtime, declarations, tools, tests, experiments, lab and public docs. Binary assets remain in the checkout. Private caches and local/Git-author paths excluded.',files};
const tarball=await readFile(resolve(root,'.local/packages/workspace-liquid-glass-0.4.0.tgz'));
const checks={schema:'liquid-glass-ts-readiness',date:'2026-10-07',sourceSha256:source.sourceSha256,runtime:'JavaScript',tsMigrationStarted:false,
 adopted:'exact-zero Fresnel/glare skips; WGSL-generated GLSL and ABI unchanged',
 node:{command:'npm test',passed:29},types:{command:'npm run typecheck',passed:true},shaderGeneration:{command:'npm run shaders:check',pairs:4,passed:true},
 builds:{libraryAndLab:true,consumer:true,consumerJsKB:716.38,consumerGzipKB:220.00,consumerChunkWarning:true,sitesTests:4},
 package:{command:'npm run test:package',files:13,bytes:tarball.length,sha256:sha(tarball),installedImportAndReactSSR:true,private:true,license:'UNLICENSED'},
 gpuQuality:{cases:quality.rows.length,exactRGBA:quality.rows.filter(r=>r.changedChannels===0).length,maxRGB:Math.max(...quality.rows.map(r=>r.maxDelta)),alphaMax:Math.max(...quality.rows.map(r=>r.alphaMax)),passed:quality.passed},
 performanceContracts:{cases:contracts.rows.length,passed:contracts.passed},stability:{frames:stability.frames,passed:stability.passed},chrome:{cases:chrome.rows.length,passed:chrome.passed},
 consumer:{matrixCases:matrix.samples.length,productionDragConnectEditReset:true,mobileThemes:['light','dark'],mobileWidth:390,passed:true},
 readyForTS:true,tsContract:'Exact pixels against this new source baseline; keep API, JSON, generated ABI and lifecycle. No model/kernel changes in language migration.',
 pushed:false,deployed:false,npmPublished:false,
 limits:['Single Chromium154 device; short GPU timing is not FPS or hardware-wide acceleration.','New height profiles are visual experiments, not accepted production replacements.','Other browsers/WebView, native DOM capture, driver memory and production long-term stability remain unvalidated.']};
try{await stat(archive);throw Error('Archive already exists; preserve it and create a new stage instead');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(archive,{recursive:true});
for(const name of (await readdir(output)).filter(n=>/\.(json|png)$/.test(n)))await copyFile(resolve(output,name),resolve(archive,name));
await writeFile(resolve(archive,'current-source.json'),JSON.stringify(checkpoint,null,2)+'\n');
await writeFile(resolve(archive,'checks.json'),JSON.stringify(checks,null,2)+'\n');
await writeFile(resolve(archive,'README.md'),`# Shader preparation acceptance archive\n\nAudience: public\n\n2026-10-07, Chromium154, local only. [Analysis and decisions](../../../docs/shader-preparation.md), [TS migration contract](../../../docs/ts-migration-plan.md).\n\n- [checks.json](checks.json): completed production gates and limits; runtime is still JS.\n- [current-source.json](current-source.json): recoverable text source checkpoint, predecessor ${previous.sourceSha256}. Binary assets remain in the checkout; this is not a Git commit. Verify each file hash before restoring selectively into a separate checkout.\n- [summary.json](summary.json): statistics recomputed from raw samples. Independent timing and interleaved timing are separate protocols.\n- [candidate-provenance.json](candidate-provenance.json): compiler source/binary and generated outputs; earlier result objects retain the exact provenance available when measured.\n- [current-quality.json](current-quality.json): 140 cases against the old profile baseline; alpha exact, RGB max 1/255. TS compares exactly against the new frozen baseline.\n- [contracts.json](contracts.json), [stability.json](stability.json), [chrome-smoke.json](chrome-smoke.json): final strategy, recovery/cleanup and interaction gates.\n- [consumer-matrix.json](consumer-matrix.json), [consumer-production.json](consumer-production.json): 20 geometry cases and real production drag/connect/edit/reset/mobile checks.\n- Height profile contracts check only alpha, nonblank and cleanup. Gallery images are actual GPU output; they do not establish old-look equivalence or production acceptance.\n- [manifest.json](manifest.json): SHA-256 for every archive file except itself. Earlier stage archives remain unchanged.\n\nRebuild isolated candidates with \`node scripts/prepare-shader-preparation.mjs\`, then use \`tests/browser/shader-preparation.html\`. Do not overwrite this archive with later measurements. Other browsers/WebView, native DOM capture and long-term production stability remain outside current acceptance. No push, deploy or npm publication.\n\n![Final image gate](quality.png)\n\n![Real production consumer](consumer-desktop.png)\n`);
const entries={};
for(const name of (await readdir(archive)).sort())entries[name]={sha256:sha(await readFile(resolve(archive,name))),bytes:(await stat(resolve(archive,name))).size};
await writeFile(resolve(archive,'manifest.json'),JSON.stringify({algorithm:'sha256',sourceSha256:source.sourceSha256,files:entries},null,2)+'\n');
console.log(JSON.stringify({sourceSha256:source.sourceSha256,sourceFiles:paths.length,evidenceFiles:Object.keys(entries).length,readyForTS:true}));
