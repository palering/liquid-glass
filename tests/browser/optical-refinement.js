import {WebGPURenderer as boundedGPU} from '/.local/optics-bounded/src/renderers/webgpu.js';
import {WebGLRenderer as boundedGL} from '/.local/optics-bounded/src/renderers/webgl.js';
import {WebGPURenderer as analyticGPU} from '/.local/optics-analytic/src/renderers/webgpu.js';
import {WebGLRenderer as analyticGL} from '/.local/optics-analytic/src/renderers/webgl.js';
import {WebGPURenderer as hybridGPU} from '/.local/optics-hybrid/src/renderers/webgpu.js';
import {WebGLRenderer as hybridGL} from '/.local/optics-hybrid/src/renderers/webgl.js';
import {WebGPURenderer as heightGPU} from '/.local/optics-height/src/renderers/webgpu.js';
import {WebGLRenderer as heightGL} from '/.local/optics-height/src/renderers/webgl.js';
import {WebGPURenderer as CurrentGPU} from '../../src/renderers/webgpu.js';
import {WebGLRenderer as CurrentGL} from '../../src/renderers/webgl.js';
import {WebGPURenderer as BaselineGPU} from '/.local/optics-baseline/src/renderers/webgpu.js';
import {WebGLRenderer as BaselineGL} from '/.local/optics-baseline/src/renderers/webgl.js';
import {looks} from '../../src/config.js';
import {summarize} from '../../benchmarks/statistics.js';
const classes={webgpu:{baseline:BaselineGPU,current:CurrentGPU,analytic:analyticGPU,hybrid:hybridGPU,height:heightGPU,bounded:boundedGPU},webgl:{baseline:BaselineGL,current:CurrentGL,analytic:analyticGL,hybrid:hybridGL,height:heightGL,bounded:boundedGL}};
const output=document.querySelector('#results'),status=document.querySelector('[role=status]'),host=document.querySelector('#host'),pair=document.querySelector('#pair');
const raf=()=>new Promise(requestAnimationFrame),hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
let version=0;
const selected=()=>document.querySelector('#candidate').value;
const provenance=await (await fetch('/.local/optical-candidates.json')).json();
const fingerprint=await (await fetch('/benchmark-source.json')).json();
function scene(width,height,dpr,background){
 const canvas=document.createElement('canvas');canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const x=canvas.getContext('2d');
 const image=x.createImageData(canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let px=0;px<canvas.width;px++){
  const k=(y*canvas.width+px)*4;
  const rgb=background==='gradient'?[px/canvas.width*255,y/canvas.height*255,(1-px/canvas.width)*180]:background==='image'?[(px*17+y*7)%256,(px*3+y*19)%256,(px^y)%256]:[(Math.floor(px/(11*dpr))%2)*210+30,(Math.floor(y/(9*dpr))%2)*190+40,(Math.floor((px+y)/(19*dpr))%2)*180+50];
  image.data.set([...rgb,255],k);
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
function baseEvidence(kind){return{schema:'liquid-glass-gpu-experiment',version:1,kind,candidate:selected(),candidateArtifact:provenance.candidates[selected()]??null,currentSource:fingerprint.sourceSha256,baselineSource:'e5d574cc22f21762df39fbd2a795259915c9382d5016a19c446bf342ae635d25',environment:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio},rows:[],errors:[]};}
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
   evidence.rows.push({backend,...c,...delta,baselineHash:await hash(a),currentHash:await hash(b),passed:delta.alphaMax===0&&(selected()==='height'||delta.maxDelta<=1)&&(c.shape==='zero-size'||delta.nonblank)});
   const previous=pixels.get(index);if(previous)evidence.crossBackend??=[],evidence.crossBackend.push({...c,...compare(previous,b)});else pixels.set(index,b);
   if(index===0&&backend==='webgpu'){picture(a,source.canvas.width,source.canvas.height,'Studio baseline · Clear');picture(b,source.canvas.width,source.canvas.height,`${selected()} · Clear`);}
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
async function resourcePerformance(){
 const e=baseEvidence('resource-performance');e.protocol={width:480,height:280,dpr:1,warmup:30,samples:90,repeats:3,count:100,metric:'CPU submission and rAF; no GPU timing'};
 const resized=()=>e.errors.push('viewport resized');window.addEventListener('resize',resized);const visible=()=>{if(document.visibilityState!=='visible')e.errors.push('hidden during run');};document.addEventListener('visibilitychange',visible);
 try{for(let repeat=1;repeat<=3;repeat++)for(const backend of ['webgpu','webgl'])for(const variant of repeat%2?['baseline',selected()]:[selected(),'baseline']){
  status.textContent=`GPU performance ${repeat}/3 ${backend} ${variant}`;const item=await renderer(backend,variant),source=scene(480,280,1,'testchart'),s=surfaces('normal',1,100),settings={theme:'light',layered:false,controls:looks.clear},cpu=[],interval=[];let last;
  try{for(let frame=0;frame<120;frame++){await raf();const now=performance.now();if(frame>=30&&last!==undefined)interval.push(now-last);last=now;for(let i=0;i<s.length;i++)s[i].bounds.x=17+(i%10)*45+Math.sin(frame*.3+i)*2;const start=performance.now();item.r.render(source,s,settings,1);if(frame>=30)cpu.push(performance.now()-start);}e.rows.push({repeat,backend,variant,cpu:summarize(cpu),raf:summarize(interval),cpuSamples:cpu,rafSamples:interval,errors:item.errors});}finally{item.r.dispose();item.canvas.remove();}
 }}finally{window.removeEventListener('resize',resized);document.removeEventListener('visibilitychange',visible);}
 e.passed=!e.errors.length&&e.rows.every(r=>!r.errors.length);output.value=JSON.stringify(e,null,2);status.textContent=`GPU performance complete: ${e.passed}`;
}
async function stress(){
 const e=baseEvidence('bounded-stress');e.protocol={frames:18000,resizeEvery:1000,blurRadii:[0,9,18,35],instances:4,maxSurfaces:50,dpr:2,note:'About 300 seconds of foreground rAF; bounded soak, not production lifetime or driver memory'};
 const {GlassController}=await import('../../src/controller.js');const controllers=[];
 try{for(const backend of ['webgpu','webgl'])for(let i=0;i<2;i++){
  const stage=document.createElement('div');stage.style.cssText='position:relative;width:400px;height:240px';host.append(stage);const c=new GlassController(stage,{backend,theme:'light',controls:looks.frosted});c.dpr=()=>2;await c.ready;const off=[],nodes=[];
  for(let k=0;k<50;k++){const node=document.createElement('div');stage.append(node);nodes.push(node);off.push(c.register(node,{id:`s-${k}`}));}
  let frame=0;let width=400,height=240;c.setGeometryProvider(()=>({width,height,surfaces:new Map(nodes.map((node,k)=>[`s-${k}`,{x:10+(k%10)*38+Math.sin(frame*.1+k),y:15+Math.floor(k/10)*40,w:32,h:28}]))}));
  controllers.push({c,stage,off,nodes,backend,setFrame:f=>frame=f,setSize:(w,h)=>{width=w;height=h;stage.style.width=w+'px';stage.style.height=h+'px';}});
 }
 for(let frame=0;frame<18000;frame++){await raf();for(const item of controllers){item.setFrame(frame);if(frame%1000===0){const odd=(frame/1000)%2;item.setSize(odd?503:400,odd?291:240);await item.c.setSettings({controls:{blurPx:[0,9,18,35][(frame/1000)%4]}});}cancelAnimationFrame(item.c.raf);item.c.raf=0;if(frame%10===0)item.c.needsBackground=true;item.c.render();if(frame%500===499)e.rows.push({frame,backend:item.backend,active:item.c.getState().activeBackend,surfaces:item.c.surfaces.size,buffers:item.c.renderer.buffers?.size??0,groups:item.c.renderer.groups?.size??0,blurRadii:item.c.renderer.imagePass?.items.size??0,canvases:item.stage.querySelectorAll('canvas').length,geometryMode:item.c.getState().geometryMode});}if(frame%60===0)status.textContent=`DPR 2 stress ${frame}/18000`;if(document.visibilityState!=='visible')e.errors.push('hidden');}
 const c=controllers[0].c,backend=c.getState().activeBackend;c.setScenePainter(()=>{throw Error('QA scene callback failed');});cancelAnimationFrame(c.raf);c.raf=0;c.render();e.sourceFailure={backendBefore:backend,backendAfter:c.getState().activeBackend,sceneReason:c.getState().sceneReason,version:c.scene.version};c.setScenePainter(null);c.render();e.sourceRecovery={backend:c.getState().activeBackend,sceneReason:c.getState().sceneReason};
 }finally{e.cleanup=[];for(const item of controllers){item.off.forEach(off=>off());item.c.render();const renderer=item.c.renderer;item.c.dispose();e.cleanup.push({backend:item.backend,disposed:item.c.disposed,surfaces:item.c.surfaces.size,listeners:item.c.listeners.size,canvasCount:item.stage.querySelectorAll('canvas').length,buffers:renderer.buffers?.size??0,groups:renderer.groups?.size??0,blurRadii:renderer.imagePass?.items.size??0});item.stage.remove();}}
 e.passed=!e.errors.length&&e.rows.every(r=>r.backend===r.active&&r.geometryMode==='provided'&&r.buffers<=50&&r.groups<=50&&r.blurRadii<=3&&r.canvases===2)&&e.cleanup.every(r=>r.disposed&&!r.surfaces&&!r.listeners&&!r.canvasCount&&!r.buffers&&!r.groups&&!r.blurRadii)&&e.sourceFailure.backendBefore===e.sourceFailure.backendAfter&&e.sourceFailure.sceneReason==='QA scene callback failed'&&e.sourceRecovery.sceneReason===null;
 output.value=JSON.stringify(e,null,2);status.textContent=`DPR 2 stress complete: ${e.passed}`;
}
for(const [id,run] of [['quality',quality],['perf',resourcePerformance],['stress',stress]])document.querySelector(`#${id}`).onclick=async()=>{document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await run();}catch(error){status.textContent=`Failed: ${error.message}`;output.value=JSON.stringify({phase:'failed',reason:error.stack},null,2);}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}};
async function gallery(){
 host.replaceChildren();pair.replaceChildren();const background=document.querySelector('#visual-scene').value,theme=document.querySelector('#visual-theme').value,look=document.querySelector('#visual-look').value;
 const source=scene(480,280,1,'gradient'),x=source.canvas.getContext('2d');
 x.fillStyle=theme==='light'?'#edf0f4':'#15202b';x.fillRect(0,0,480,280);
 if(background==='photo'){const photo=new Image();photo.src='/assets/storefront.png';await photo.decode();x.drawImage(photo,0,0,480,280);}else{
  x.strokeStyle=theme==='light'?'#718398':'#506078';x.lineWidth=1;for(let k=0;k<480;k+=12){x.beginPath();x.moveTo(k,0);x.lineTo(k,280);x.stroke();}for(let k=0;k<280;k+=12){x.beginPath();x.moveTo(0,k);x.lineTo(480,k);x.stroke();}
  x.fillStyle=theme==='light'?'#1b293c':'#e6efff';x.font='bold 25px system-ui';x.fillText('Liquid Glass · 玻璃',18,50);x.font='16px system-ui';for(let k=0;k<4;k++)x.fillText('Text / 0123456789 / 清晰与折射',20,105+k*42);
 }
 source.version=++version;const s=[{id:'sample',kind:'card',bounds:{x:90,y:35,w:300,h:210,radius:40}}],settings={theme,layered:false,controls:{...looks[look],radius:40}};
 const results=[];for(const variant of ['baseline',selected()]){const item=await renderer('webgpu',variant);try{const bytes=await readback(item.r,source,s,settings,1),canvas=document.createElement('canvas');canvas.width=480;canvas.height=280;const cx=canvas.getContext('2d');cx.drawImage(source.canvas,0,0);const raw=document.createElement('canvas');raw.width=480;raw.height=280;const data=new Uint8ClampedArray(bytes);for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;if(a>0)for(let j=0;j<3;j++)data[i+j]=Math.min(255,Math.round(data[i+j]/a));}raw.getContext('2d').putImageData(new ImageData(data,480,280),0,0);cx.drawImage(raw,0,0);picture(cx.getImageData(0,0,480,280).data,480,280,variant==='baseline'?'Studio baseline':selected());results.push({variant,hash:await hash(bytes),errors:item.errors});}finally{item.r.dispose();item.canvas.remove();}}
 output.value=JSON.stringify({...baseEvidence('visual-comparison'),background,theme,look,rows:results},null,2);status.textContent='Visual comparison complete';
}
async function gpuTiming(){
 const e=baseEvidence('gpu-timing');e.protocol={width:960,height:560,dpr:2,surfaces:12,warmup:10,samples:40,repeats:3,metric:'Main optical pass GPU duration; separate from CPU/rAF benchmark'};
 const adapter=await navigator.gpu?.requestAdapter();e.capabilities={webgpuTimestamp:adapter?.features.has('timestamp-query')??false};
 if(!e.capabilities.webgpuTimestamp){e.unavailable='WebGPU adapter does not expose timestamp-query';output.value=JSON.stringify(e,null,2);status.textContent='GPU timing unavailable';return;}
 for(let repeat=1;repeat<=3;repeat++)for(const variant of repeat%2?['baseline',selected()]:[selected(),'baseline']){
  const freshAdapter=await navigator.gpu.requestAdapter(),d=await freshAdapter.requestDevice({requiredFeatures:['timestamp-query']}),canvas=document.createElement('canvas');host.append(canvas);const errors=[],r=new classes.webgpu[variant](canvas,d,msg=>errors.push(msg));
  const query=d.createQuerySet({type:'timestamp',count:2}),resolve=d.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),mapped=d.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),samples=[];
  try{await r.init();const source=scene(480,280,2,'testchart'),s=Array.from({length:12},(_,k)=>({id:'timing-'+k,kind:'card',bounds:{x:10+k%4*116,y:12+Math.floor(k/4)*88,w:108,h:78,radius:20}})),settings={theme:'light',layered:false,controls:{...looks.clear,blurPx:0}};
   const encoderFn=d.createCommandEncoder.bind(d),submitFn=d.queue.submit.bind(d.queue);let marked=0;
   d.createCommandEncoder=function(...args){const encoder=encoderFn(...args),begin=encoder.beginRenderPass.bind(encoder);encoder.beginRenderPass=function(descriptor){marked++;return begin({...descriptor,timestampWrites:{querySet:query,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}});};return encoder;};
   d.queue.submit=function(commands){if(marked!==1)throw Error('Timing expected exactly one optical pass');const encoder=encoderFn();encoder.resolveQuerySet(query,0,2,resolve,0);encoder.copyBufferToBuffer(resolve,0,mapped,0,16);return submitFn([...commands,encoder.finish()]);};
   for(let f=0;f<50;f++){await raf();if(document.visibilityState!=='visible')throw Error('Hidden during GPU timing');marked=0;for(let k=0;k<s.length;k++)s[k].bounds.x=10+k%4*116+Math.sin(f*.15+k);r.render(source,s,settings,2);await mapped.mapAsync(GPUMapMode.READ);const ns=new BigUint64Array(mapped.getMappedRange());const ms=Number(ns[1]-ns[0])/1e6;mapped.unmap();if(!Number.isFinite(ms)||ms<=0)throw Error('Invalid GPU duration');if(f>=10)samples.push(ms);if(f%10===0)status.textContent=`GPU timing ${repeat}/3 ${variant} ${f}/50`;}
   d.createCommandEncoder=encoderFn;d.queue.submit=submitFn;e.rows.push({repeat,variant,gpu:summarize(samples),gpuSamples:samples,errors});
  }finally{query.destroy();resolve.destroy();mapped.destroy();r.dispose();canvas.remove();}
 }
 e.passed=e.rows.length===6&&e.rows.every(r=>!r.errors.length);output.value=JSON.stringify(e,null,2);status.textContent=`GPU timing complete: ${e.passed}`;
}
for(const [id,run]of [['gallery',gallery],['timing',gpuTiming]])document.querySelector('#'+id).onclick=async()=>{document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await run();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({phase:'failed',reason:error.stack});}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}};
async function calibration(){
 const e=baseEvidence('neutral-calibration'),cases=[];
 for(const dpr of [1,2])for(const range of [1,2,30,80])for(const roundness of [2,8])cases.push({dpr,range,roundness});
 for(const backend of ['webgpu','webgl'])for(const variant of ['baseline',selected()]){
  const item=await renderer(backend,variant);
  try{for(const c of cases){status.textContent=`Neutral ${backend} ${variant} range=${c.range} DPR=${c.dpr}`;
   const source=scene(480,280,c.dpr,'testchart'),s=surfaces(),settings={theme:'light',layered:false,controls:{...looks.clear,distance:0,blurPx:0,blurEdge:false,tintOpacity:0,dispersion:0,fresnelFactor:0,glareFactor:0,fresnelRange:c.range,glareRange:c.range,roundness:c.roundness,thickness:65}};
   const bytes=await readback(item.r,source,s,settings,c.dpr),original=source.canvas.getContext('2d').getImageData(0,0,source.canvas.width,source.canvas.height).data;let opaque=0,changed=0,maxDelta=0;
   for(let i=0;i<bytes.length;i+=4)if(bytes[i+3]===255){opaque++;for(let channel=0;channel<3;channel++){const delta=Math.abs(bytes[i+channel]-original[i+channel]);changed+=delta>1;maxDelta=Math.max(maxDelta,delta);}}
   e.rows.push({backend,variant,...c,opaquePixels:opaque,changedChannelsOverOne:changed,maxDelta,passed:opaque>0&&changed===0});await raf();
  }e.errors.push(...item.errors);}finally{item.r.dispose();item.canvas.remove();}
 }
 // Baseline failures are observations, not candidate acceptance.
 e.passed=e.rows.filter(r=>r.variant===selected()).every(r=>r.passed)&&!e.errors.length;output.value=JSON.stringify(e,null,2);status.textContent=`Neutral calibration complete: ${e.passed}`;
}
document.querySelector('#calibration').onclick=async()=>{document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await calibration();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({phase:'failed',reason:error.stack});}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}};
