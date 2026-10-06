import {WebGPURenderer as BaselineGPU} from '/.local/performance-baseline/src/renderers/webgpu.js';
import {WebGLRenderer as BaselineGL} from '/.local/performance-baseline/src/renderers/webgl.js';
import {WebGPURenderer as PairedGPU} from '/.local/performance-paired/src/renderers/webgpu.js';
import {WebGLRenderer as PairedGL} from '/.local/performance-paired/src/renderers/webgl.js';
import {GPUImagePass as BaseImage} from '/.local/performance-baseline/src/renderers/blur-wgpu.js';
import {GPUImagePass as PairImage} from '/.local/performance-paired/src/renderers/blur-wgpu.js';
import {looks} from '/.local/performance-baseline/src/config.js';
import {summarize} from '../../benchmarks/statistics.js';
const classes={webgpu:{baseline:BaselineGPU,paired:PairedGPU},webgl:{baseline:BaselineGL,paired:PairedGL}};
const output=document.querySelector('#results'),status=document.querySelector('[role=status]'),host=document.querySelector('#host'),pair=document.querySelector('#pair');
const raf=()=>new Promise(requestAnimationFrame),hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
let version=0;
const selected=()=> 'paired';
const provenance=await (await fetch('/.local/performance-candidates.json')).json();
function baseEvidence(kind){return{schema:'liquid-glass-performance-research',version:1,kind,candidate:'paired-gaussian',candidateArtifact:provenance,baselineSource:provenance.baselineSource,productionChanged:false,environment:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio},rows:[],errors:[]};}
function scene(width,height,dpr,background){
 const canvas=document.createElement('canvas');canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const x=canvas.getContext('2d');
 const image=x.createImageData(canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let px=0;px<canvas.width;px++){
  const k=(y*canvas.width+px)*4;
  const rgb=background==='gradient'?[px/canvas.width*255,y/canvas.height*255,(1-px/canvas.width)*180]:background==='image'?[(px*17+y*7)%256,(px*3+y*19)%256,(px^y)%256]:[(Math.floor(px/(11*dpr))%2)*210+30,(Math.floor(y/(9*dpr))%2)*190+40,(Math.floor((px+y)/(19*dpr))%2)*180+50];
  image.data.set([...rgb,background==='alpha'?(px*13+y*23)%256:255],k);
 }
 x.putImageData(image,0,0);return{canvas,version:++version};
}
function surfaces(shape='normal',scale=1,count=3){
 return Array.from({length:count},(_,i)=>({id:`surface-${i}`,kind:['card','control','panel'][i%3],bounds:count===3?{x:shape==='edge'?-35:35+i*130,y:30+i*35,w:(shape==='thin'?140:180)*scale,h:(shape==='thin'?4:110)*scale,radius:Math.min(20*scale,(shape==='thin'?2:55)*scale),...(scale!==1?{scale}:{})}:{x:17+(i%10)*45,y:12+Math.floor(i/10)*26,w:40,h:22,radius:8}}));
}
async function renderer(backend,variant){const canvas=document.createElement('canvas');host.append(canvas);const errors=[];const r=await classes[backend][variant].create(canvas,e=>errors.push(e));return{r,canvas,errors};}
async function readback(r,source,s,settings,dpr){
 const w=source.canvas.width,h=source.canvas.height;
 if(r.gl){r.render(source,s,settings,dpr);const g=r.gl,raw=new Uint8Array(w*h*4),data=new Uint8Array(raw.length);g.bindFramebuffer(g.FRAMEBUFFER,null);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,raw);if(g.getError())throw Error('WebGL readPixels failed');for(let y=0;y<h;y++)data.set(raw.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);return data;}
 const d=r.device;r.canvas.width=w;r.canvas.height=h;
 r.context.configure({device:d,format:r.format,alphaMode:'premultiplied',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
 const stride=Math.ceil(w*4/256)*256,buffer=d.createBuffer({size:stride*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
 const originalTexture=r.context.getCurrentTexture,originalSubmit=d.queue.submit;let texture,copied=false;
 r.context.getCurrentTexture=function(){texture=originalTexture.call(this);return texture;};
 d.queue.submit=function(commands){if(!texture)throw Error('No submitted presentation texture');const e=d.createCommandEncoder();e.copyTextureToBuffer({texture},{buffer,bytesPerRow:stride,rowsPerImage:h},[w,h]);copied=true;return originalSubmit.call(this,[...commands,e.finish()]);};
 try{r.render(source,s,settings,dpr);}finally{r.context.getCurrentTexture=originalTexture;d.queue.submit=originalSubmit;}
 try{if(!copied)throw Error('Readback was not submitted');await buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange()),data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)data.set(raw.subarray(y*stride,y*stride+w*4),y*w*4);if(r.format.startsWith('bgra'))for(let k=0;k<data.length;k+=4)[data[k],data[k+2]]=[data[k+2],data[k]];return data;}finally{buffer.unmap();buffer.destroy();}
}
function compare(a,b){let changed=0,maxDelta=0,alphaMax=0,opaque=0,min=255,max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);changed+=d>0;sum+=d;maxDelta=Math.max(maxDelta,d);if(i%4===3){alphaMax=Math.max(alphaMax,d);opaque+=a[i]>0;}else if(a[i-i%4+3]>0){min=Math.min(min,a[i]);max=Math.max(max,a[i]);}}return{bytes:a.length,changedChannels:changed,maxDelta,alphaMax,meanDelta:sum/a.length,nonblank:opaque>0&&max-min>8,nonzeroAlphaPixels:opaque};}
function picture(bytes,w,h,title){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),w,h),0,0);const section=document.createElement('section');const h2=document.createElement('h2');h2.textContent=title;const img=new Image();img.alt=title;img.src=c.toDataURL();section.append(h2,img);pair.append(section);}
function instrument(r){const counts={bindGroups:0,views:0,buffers:0,textures:0,attributeQueries:0};const undo=[];const wrap=(obj,name,key)=>{if(!obj?.[name])return;const fn=obj[name];obj[name]=function(...args){counts[key]++;return fn.apply(this,args);};undo.push(()=>obj[name]=fn);};if(r.device){wrap(r.device,'createBindGroup','bindGroups');wrap(r.device,'createBuffer','buffers');wrap(r.device,'createTexture','textures');wrap(GPUTexture.prototype,'createView','views');}else{wrap(r.gl,'getAttribLocation','attributeQueries');wrap(r.gl,'createTexture','textures');wrap(r.gl,'createBuffer','buffers');}return{counts,stop:()=>undo.reverse().forEach(fn=>fn())};}
async function quality(){
 const evidence=baseEvidence('quality'),cases=[];host.replaceChildren();pair.replaceChildren();
 for(const dpr of [1,2])for(const look of ['clear','frosted','reading'])for(const background of ['testchart','gradient','image'])cases.push({dpr,look,background,shape:'normal'});
 for(const dpr of [1,2])for(const shape of ['thin','edge','zero-size'])for(const controls of [{dispersion:0},{dispersion:0,blurPx:0,blurEdge:false},{dispersion:5,thickness:.5,distance:.05,ior:2.5,roundness:8}])cases.push({dpr,look:'clear',background:'testchart',shape,controls});
 for(const scale of [.2,.85,2])cases.push({dpr:2,look:'clear',background:'gradient',shape:'normal',scale});
 // Resource invalidation: resize, source, radius, layered and unregister transitions.
 cases.push({dpr:1,look:'reading',background:'image',shape:'normal',layered:true,width:503,height:291},{dpr:2,look:'clear',background:'image',shape:'normal',layered:true},{dpr:1,look:'clear',background:'gradient',shape:'normal',count:1});
 const pixels=new Map();
 for(const backend of ['webgpu','webgl']){
  const before=await renderer(backend,'baseline'),after=await renderer(backend,selected());
  try{for(const [index,c] of cases.entries()){
   status.textContent=`Quality ${backend} ${index+1}/${cases.length}`;
   const source=scene(c.width??480,c.height??280,c.dpr,c.background),s=surfaces(c.shape,c.scale??1,c.count??3);if(c.shape==='zero-size')s.forEach(v=>{v.bounds.w=0;v.bounds.h=0;});
   const settings={theme:'light',layered:c.layered??false,controls:{...looks[c.look],...c.controls,...(c.scale?{radius:20*c.scale}:{})}};
   const a=await readback(before.r,source,s,settings,c.dpr),b=await readback(after.r,source,s,settings,c.dpr),delta=compare(a,b);
   evidence.rows.push({backend,...c,...delta,baselineHash:await hash(a),currentHash:await hash(b),passed:delta.alphaMax===0&&delta.maxDelta<=1&&(c.shape==='zero-size'||delta.nonblank)});
   const previous=pixels.get(index);if(previous)evidence.crossBackend??=[],evidence.crossBackend.push({...c,...compare(previous,b)});else pixels.set(index,b);
   if(index===5&&backend==='webgpu'){picture(a,source.canvas.width,source.canvas.height,'BC2 baseline · Frosted');picture(b,source.canvas.width,source.canvas.height,`Paired · Frosted (max Δ ${delta.maxDelta}/255)`);}
   await raf();
  }
  for(const variant of ['baseline',selected()]){
   const item=variant==='baseline'?before:after,source=scene(480,280,1,'gradient'),s=surfaces(),settings={theme:'light',layered:false,controls:looks.clear};item.r.render(source,s,settings,1);
   const count=instrument(item.r);for(let frame=0;frame<30;frame++){s[0].bounds.x=30+frame;item.r.render(source,s,settings,1);}count.stop();
   evidence.allocations??=[];evidence.allocations.push({backend,variant,frames:30,surfaces:s.length,...count.counts});
   item.r.render(source,[],settings,1);evidence.cleanup??=[];evidence.cleanup.push({backend,variant,uniformBuffers:item.r.buffers?.size??0,groups:item.r.groups?.size??0,blurRadii:item.r.imagePass.items.size});
  }
  evidence.errors.push(...before.errors,...after.errors);
  }finally{before.r.dispose();after.r.dispose();before.canvas.remove();after.canvas.remove();}
 }
 evidence.passed=evidence.rows.every(r=>r.passed)&&!evidence.errors.length&&evidence.cleanup.every(r=>!r.uniformBuffers&&!r.groups&&!r.blurRadii);
 output.value=JSON.stringify(evidence,null,2);status.textContent=`Quality complete: ${evidence.rows.filter(r=>r.passed).length}/${evidence.rows.length}; overall ${evidence.passed}`;
}
async function blurTiming(fullPipeline=false){
 const e=baseEvidence(fullPipeline?'full-pipeline-timing':'blur-gpu-timing');
 e.protocol={width:960,height:540,dpr:1,radii:[.5,3,18],warmup:10,samples:40,repeats:3,background:'testchart',metric:fullPipeline?'Sum of all renderer GPU render passes plus CPU submission/rAF':'Sum of downsample and horizontal/vertical GPU image passes only; upload excluded',staticInput:true,forceBlurEachFrame:true};
 const viewport=[innerWidth,innerHeight];
 for(let repeat=1;repeat<=3;repeat++)for(const radius of e.protocol.radii)for(const variant of repeat%2?['baseline','paired']:['paired','baseline']){
  status.textContent=`${fullPipeline?'Full pipeline':'Blur GPU'} ${repeat}/3 radius ${radius} ${variant}`;
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter?.features.has('timestamp-query')){e.unavailable='timestamp-query unavailable';e.passed=false;output.value=JSON.stringify(e,null,2);status.textContent=e.unavailable;return;}
  const device=await adapter.requestDevice({requiredFeatures:['timestamp-query']}),errors=[];
  const errorListener=event=>errors.push(String(event.error.message));device.addEventListener('uncapturederror',errorListener);
  const queries=device.createQuerySet({type:'timestamp',count:32}),resolve=device.createBuffer({size:256,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read=device.createBuffer({size:256,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  let count=0,originalEncoder=device.createCommandEncoder,canvas,r,pass,input;
  try{
   if(fullPipeline){
    const originalAdapter=navigator.gpu.requestAdapter;
    navigator.gpu.requestAdapter=async()=>({requestDevice:async()=>device});
    canvas=document.createElement('canvas');host.append(canvas);
    try{r=await classes.webgpu[variant].create(canvas,message=>errors.push(String(message)));}finally{navigator.gpu.requestAdapter=originalAdapter;}
   }else{
    pass=await (variant==='baseline'?BaseImage:PairImage).create(device,'rgba8unorm');
    const source=scene(960,540,1,'testchart');input=device.createTexture({size:[960,540],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
    device.queue.copyExternalImageToTexture({source:source.canvas},{texture:input},[960,540]);
   }
   const source=scene(960,540,1,'testchart'),s=[{id:'panel',kind:'panel',bounds:{x:25,y:25,w:900,h:480,radius:30}}],settings={theme:'light',layered:false,controls:{...looks.frosted,blurPx:radius}},samples=[],cpuSamples=[],rafSamples=[];let last;
   // Timestamp each actual render pass; resolve after all passes, no empty query slots.
   device.createCommandEncoder=function(...args){const encoder=originalEncoder.apply(this,args),begin=encoder.beginRenderPass;encoder.beginRenderPass=function(descriptor){if(count>=16)throw Error('Too many measured passes');const index=count++*2;return begin.call(this,{...descriptor,timestampWrites:{querySet:queries,beginningOfPassWriteIndex:index,endOfPassWriteIndex:index+1}});};return encoder;};
   const originalSubmit=device.queue.submit;
   device.queue.submit=function(commands){const encoder=originalEncoder.call(device);encoder.resolveQuerySet(queries,0,count*2,resolve,0);encoder.copyBufferToBuffer(resolve,0,read,0,count*16);return originalSubmit.call(this,[...commands,encoder.finish()]);};
   let passCount;
   try{for(let frame=0;frame<50;frame++){
    await raf();if(document.visibilityState!=='visible'||innerWidth!==viewport[0]||innerHeight!==viewport[1])throw Error('Run hidden or resized');
    const now=performance.now();if(frame>=10&&last!==undefined)rafSamples.push(now-last);last=now;count=0;
    const start=performance.now();if(fullPipeline){source.version++;r.render(source,s,settings,1);}else{const encoder=device.createCommandEncoder();pass.blur(encoder,input,radius,1,frame,960,540,true);device.queue.submit([encoder.finish()]);}const cpu=performance.now()-start;
    if(!count)throw Error('No GPU passes measured');passCount=count;
    await read.mapAsync(GPUMapMode.READ);const values=new BigUint64Array(read.getMappedRange());let duration=0;for(let i=0;i<count;i++){if(values[i*2+1]<values[i*2])throw Error('Invalid GPU timestamp order');duration+=Number(values[i*2+1]-values[i*2])/1e6;}read.unmap();if(frame>=10){samples.push(duration);cpuSamples.push(cpu);}
   }}finally{device.queue.submit=originalSubmit;device.createCommandEncoder=originalEncoder;}
   e.rows.push({repeat,radius,variant,passCount,gpu:summarize(samples),cpu:summarize(cpuSamples),raf:summarize(rafSamples),gpuSamples:samples,cpuSamples,rafSamples,errors});
  }finally{
   r?.dispose();pass?.dispose();input?.destroy();canvas?.remove();queries.destroy();resolve.destroy();read.destroy();device.removeEventListener('uncapturederror',errorListener);device.destroy();
  }
 }
 e.passed=!e.errors.length&&e.rows.every(row=>!row.errors.length&&row.gpu.samples===40);output.value=JSON.stringify(e,null,2);status.textContent=`${e.kind} complete: ${e.passed}`;
}
async function directBlur(r,source,radius){
 const w=source.canvas.width,h=source.canvas.height,input=r.upload('bg',source.canvas,source.version),p=r.imagePass;
 if(r.gl){const g=r.gl,t=p.blur(input,radius,1,source.version,w,h,true),item=p.items.get(String(radius)),raw=new Uint8Array(item.tw*item.th*4),data=new Uint8Array(raw.length);p.target(t,item.tw,item.th);g.readPixels(0,0,item.tw,item.th,g.RGBA,g.UNSIGNED_BYTE,raw);if(g.getError())throw Error('Direct blur GL readback failed');for(let y=0;y<item.th;y++)data.set(raw.subarray((item.th-1-y)*item.tw*4,(item.th-y)*item.tw*4),y*item.tw*4);return{data,w:item.tw,h:item.th};}
 const d=r.device,encoder=d.createCommandEncoder(),t=p.blur(encoder,input,radius,1,source.version,w,h,true),stride=Math.ceil(t.width*4/256)*256,buffer=d.createBuffer({size:stride*t.height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});encoder.copyTextureToBuffer({texture:t},{buffer,bytesPerRow:stride,rowsPerImage:t.height},[t.width,t.height]);d.queue.submit([encoder.finish()]);
 try{await buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange()),data=new Uint8Array(t.width*t.height*4);for(let y=0;y<t.height;y++)data.set(raw.subarray(y*stride,y*stride+t.width*4),y*t.width*4);return{data,w:t.width,h:t.height};}finally{buffer.unmap();buffer.destroy();}
}
async function directQuality(){
 const e=baseEvidence('isolated-blur-quality');e.protocol={dimensions:[[37,29],[127,65],[1,17]],backgrounds:['image','testchart','alpha'],radii:[.5,3,18],dpr:1,threshold:1,output:'RGBA8 blur texture before optics; alpha included'};pair.replaceChildren();
 for(const backend of ['webgpu','webgl']){const a=await renderer(backend,'baseline'),b=await renderer(backend,'paired');try{for(const [w,h]of e.protocol.dimensions)for(const background of e.protocol.backgrounds)for(const radius of e.protocol.radii){status.textContent=`Isolated blur ${backend} ${w}×${h} ${background} ${radius}`;const source=scene(w,h,1,background),before=await directBlur(a.r,source,radius),after=await directBlur(b.r,source,radius),delta=compare(before.data,after.data);e.rows.push({backend,width:w,height:h,background,radius,outputWidth:before.w,outputHeight:before.h,...delta,baselineHash:await hash(before.data),currentHash:await hash(after.data),passed:delta.maxDelta<=1});if(backend==='webgpu'&&w===127&&background==='testchart'&&radius===3){picture(before.data,before.w,before.h,'BC2 · isolated blur');picture(after.data,after.w,after.h,`Paired · isolated blur (max Δ ${delta.maxDelta}/255)`);}a.r.imagePass.prune(new Set());b.r.imagePass.prune(new Set());await raf();}e.errors.push(...a.errors,...b.errors);}finally{a.r.dispose();b.r.dispose();a.canvas.remove();b.canvas.remove();}}
 e.passed=!e.errors.length&&e.rows.every(row=>row.passed);output.value=JSON.stringify(e,null,2);status.textContent=`Isolated blur complete: ${e.rows.filter(row=>row.passed).length}/${e.rows.length}; overall ${e.passed}`;
}
for(const [id,run]of [['quality',quality],['direct',directQuality],['timing',()=>blurTiming(false)],['pipeline',()=>blurTiming(true)]])document.querySelector('#'+id).onclick=async()=>{
 document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await run();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({failed:true,error:error.stack},null,2);}finally{document.querySelectorAll('button').forEach(b=>b.disabled=false);}
};
