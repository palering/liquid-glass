import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {summarize} from '../benchmarks/statistics.js';
const directory=resolve(process.argv[2]??'benchmarks/results/shader-performance-research');
const files=['paired-quality.json','paired-quality-repeat.json','paired-quality-final.json','paired-direct-blur.json','paired-blur-timing.json','paired-pipeline-timing.json'];
const result={method:'Nearest-rank; all raw samples retained; three repeats pooled within each workload/radius/variant',quality:[],timing:[]};
for(const file of files){
 const e=JSON.parse(await readFile(resolve(directory,file)));
 if(e.rows.length!==(/timing/.test(file)?18:file.includes('direct')?54:84))throw Error('Incomplete '+file);
 if(e.errors.length||e.rows.some(row=>row.errors?.length))throw Error('Failed execution '+file);
 if(!/timing/.test(file)){result.quality.push({file,cases:e.rows.length,passed:e.rows.filter(r=>r.passed).length,maxDelta:Math.max(...e.rows.map(r=>r.maxDelta)),alphaMax:Math.max(...e.rows.map(r=>r.alphaMax)),failures:e.rows.filter(r=>!r.passed)});continue;}
 for(const radius of e.protocol.radii)for(const variant of ['baseline','paired']){
  const rows=e.rows.filter(row=>row.radius===radius&&row.variant===variant);
  if(rows.length!==3||rows.some(row=>row.gpuSamples.length!==40))throw Error('Incomplete timing group');
  result.timing.push({file,radius,variant,gpu:summarize(rows.flatMap(r=>r.gpuSamples)),cpu:summarize(rows.flatMap(r=>r.cpuSamples)),raf:summarize(rows.flatMap(r=>r.rafSamples)),perRepeatGpu:rows.map(r=>({repeat:r.repeat,...summarize(r.gpuSamples)}))});
 }
}
console.log(JSON.stringify(result,null,2));
