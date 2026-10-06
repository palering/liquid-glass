import {WebGPURenderer as CurrentGPU} from '../../src/renderers/webgpu.js';
import {WebGLRenderer as CurrentGL} from '../../src/renderers/webgl.js';
import {WebGPURenderer as BaselineGPU} from '/.local/optimization-baseline/src/renderers/webgpu.js';
import {WebGLRenderer as BaselineGL} from '/.local/optimization-baseline/src/renderers/webgl.js';
import {looks} from '../../src/config.js';
import {summarize} from '../../benchmarks/statistics.js';
const classes={webgpu:{baseline:BaselineGPU,current:CurrentGPU},webgl:{baseline:BaselineGL,current:CurrentGL}};
const output=document.querySelector('#results'),status=document.querySelector('[role=status]'),host=document.querySelector('#host'),pair=document.querySelector('#pair');
const raf=()=>new Promise(requestAnimationFrame),hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
let version=0;
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
function baseEvidence(kind){return{schema:'liquid-glass-gpu-experiment',version:1,kind,baselineRevision:'8cdf48d117d82273c7dd445da5a09cfad7f05569',environment:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio},rows:[],errors:[]};}
async function quality(){
 const evidence=baseEvidence('quality'),cases=[];host.replaceChildren();pair.replaceChildren();
 for(const dpr of [1,2])for(const look of ['clear','frosted','reading'])for(const background of ['testchart','gradient','image'])cases.push({dpr,look,background,shape:'normal'});
 for(const dpr of [1,2])for(const shape of ['thin','edge','zero-size'])for(const controls of [{dispersion:0},{dispersion:0,blurPx:0,blurEdge:false},{dispersion:5,thickness:.5,distance:.05,ior:2.5,roundness:8}])cases.push({dpr,look:'clear',background:'testchart',shape,controls});
 for(const scale of [.2,.85,2])cases.push({dpr:2,look:'clear',background:'gradient',shape:'normal',scale});
 // Resource invalidation: resize, source, radius, layered and unregister transitions.
 cases.push({dpr:1,look:'reading',background:'image',shape:'normal',layered:true,width:503,height:291},{dpr:2,look:'clear',background:'image',shape:'normal',layered:true},{dpr:1,look:'clear',background:'gradient',shape:'normal',count:1});
 const pixels=new Map();
 for(const backend of ['webgpu','webgl']){
  const before=await renderer(backend,'baseline'),after=await renderer(backend,'current');
  try{for(const [index,c] of cases.entries()){
   status.textContent=`Quality ${backend} ${index+1}/${cases.length}`;
   const source=scene(c.width??480,c.height??280,c.dpr,c.background),s=surfaces(c.shape,c.scale??1,c.count??3);if(c.shape==='zero-size')s.forEach(v=>{v.bounds.w=0;v.bounds.h=0;});
   const settings={theme:'light',layered:c.layered??false,controls:{...looks[c.look],...c.controls,...(c.scale?{radius:20*c.scale}:{})}};
   const a=await readback(before.r,source,s,settings,c.dpr),b=await readback(after.r,source,s,settings,c.dpr),delta=compare(a,b);
   evidence.rows.push({backend,...c,...delta,baselineHash:await hash(a),currentHash:await hash(b),passed:delta.alphaMax===0&&delta.maxDelta<=1&&(c.shape==='zero-size'||delta.nonblank)});
   const previous=pixels.get(index);if(previous)evidence.crossBackend??=[],evidence.crossBackend.push({...c,...compare(previous,b)});else pixels.set(index,b);
   if(index===0){picture(b,source.canvas.width,source.canvas.height,`${backend} current · Clear`);}
   await raf();
  }
  for(const variant of ['baseline','current']){
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
 const e=baseEvidence('resource-performance');e.protocol={width:480,height:280,dpr:1,warmup:8,samples:30,repeats:3,count:100,metric:'CPU submission and rAF; no GPU timing'};
 const resized=()=>e.errors.push('viewport resized');window.addEventListener('resize',resized);const visible=()=>{if(document.visibilityState!=='visible')e.errors.push('hidden during run');};document.addEventListener('visibilitychange',visible);
 try{for(let repeat=1;repeat<=3;repeat++)for(const backend of ['webgpu','webgl'])for(const variant of repeat%2?['baseline','current']:['current','baseline']){
  status.textContent=`GPU performance ${repeat}/3 ${backend} ${variant}`;const item=await renderer(backend,variant),source=scene(480,280,1,'testchart'),s=surfaces('normal',1,100),settings={theme:'light',layered:false,controls:looks.clear},cpu=[],interval=[];let last;
  try{for(let frame=0;frame<38;frame++){await raf();const now=performance.now();if(frame>=8&&last!==undefined)interval.push(now-last);last=now;for(let i=0;i<s.length;i++)s[i].bounds.x=17+(i%10)*45+Math.sin(frame*.3+i)*2;const start=performance.now();item.r.render(source,s,settings,1);if(frame>=8)cpu.push(performance.now()-start);}e.rows.push({repeat,backend,variant,cpu:summarize(cpu),raf:summarize(interval),cpuSamples:cpu,rafSamples:interval,errors:item.errors});}finally{item.r.dispose();item.canvas.remove();}
 }}finally{window.removeEventListener('resize',resized);document.removeEventListener('visibilitychange',visible);}
 e.passed=!e.errors.length&&e.rows.every(r=>!r.errors.length);output.value=JSON.stringify(e,null,2);status.textContent=`GPU performance complete: ${e.passed}`;
}
// Experimental scissor only, same full-size intermediate textures. The controlled
// margin includes refraction and the entire finite 12-tap/pyramid support.
// This is deliberately not a production ROI policy or cropped texture allocator.
function roi(r,s,settings,source,dpr){
 const scale=2**Math.max(0,Math.ceil(Math.log2(Math.max(1,(settings.controls.blurPx??9)*dpr/3))));
 const margin=Math.ceil(2000*Math.abs(settings.controls.distance??.0056)*dpr*Math.sqrt((settings.controls.ior??1.45)**2-1)*(1+.02*(settings.controls.dispersion??1.8))+(14*scale)+4);
 const w=source.canvas.width,h=source.canvas.height,box={x:Math.max(0,Math.min(...s.map(v=>v.bounds.x*dpr))-margin),y:Math.max(0,Math.min(...s.map(v=>v.bounds.y*dpr))-margin),right:Math.min(w,Math.max(...s.map(v=>(v.bounds.x+v.bounds.w)*dpr))+margin),bottom:Math.min(h,Math.max(...s.map(v=>(v.bounds.y+v.bounds.h)*dpr))+margin)};
 let fullPixels=0,roiPixels=0;
 const draw=r.imagePass.draw,pass=r.device?.createCommandEncoder;
 r.imagePass.draw=function(...args){
  if(r.gl){const g=r.gl,original=g.drawArrays;g.drawArrays=function(...drawArgs){const targetW=args[4],targetH=args[5],x=Math.floor(box.x*targetW/w),y=Math.floor((h-box.bottom)*targetH/h),right=Math.ceil(box.right*targetW/w),top=Math.ceil((h-box.y)*targetH/h);g.enable(g.SCISSOR_TEST);g.scissor(x,y,Math.max(0,right-x),Math.max(0,top-y));fullPixels+=targetW*targetH;roiPixels+=(right-x)*(top-y);return original.apply(this,drawArgs);};try{return draw.apply(this,args);}finally{g.drawArrays=original;g.disable(g.SCISSOR_TEST);}}
  const encoder=args[0],original=encoder.beginRenderPass;encoder.beginRenderPass=function(descriptor){const p=original.call(this,descriptor),textureView=descriptor.colorAttachments[0].view; // dimensions supplied by the uniform's target in blur() below
   const targetW=r.roiTarget?.[0]??w,targetH=r.roiTarget?.[1]??h,x=Math.floor(box.x*targetW/w),y=Math.floor(box.y*targetH/h),right=Math.min(targetW,Math.ceil(box.right*targetW/w)),bottom=Math.min(targetH,Math.ceil(box.bottom*targetH/h));p.setScissorRect(x,y,right-x,bottom-y);fullPixels+=targetW*targetH;roiPixels+=(right-x)*(bottom-y);return p;};try{return draw.apply(this,args);}finally{encoder.beginRenderPass=original;}
 };
 // Buffer -> target extent for the WebGPU pass, without inspecting mapped GPU data.
 if(r.device){const drawROI=r.imagePass.draw;r.imagePass.draw=function(...args){const buffer=args[4];let extent;for(const item of this.items.values()){for(const level of item.pyramid)if(level.buffer===buffer)extent=[level.texture.width,level.texture.height];if(item.x===buffer||item.y===buffer)extent=[item.a.width,item.a.height];}r.roiTarget=extent??[w,h];return drawROI.apply(this,args);};}
 return{box,margin,stop(){r.imagePass.draw=draw;delete r.roiTarget;return{fullPixels,roiPixels,coverage:fullPixels?roiPixels/fullPixels:1};}};
}
async function roiExperiment(){
 const e=baseEvidence('bounded-roi');e.note='Experimental scissor with conservative finite-support padding; full-sized textures remain. Not enabled in the library.';
 for(const backend of ['webgpu','webgl']){
  const item=await renderer(backend,'current');try{
  for(const dpr of [1,2])for(const count of [1,3,20])for(const blurPx of [3,9,20]){
   status.textContent=`ROI ${backend} ${dpr}x ${count} surfaces blur ${blurPx}`;const source=scene(800,480,dpr,'image'),s=surfaces('normal',1,count),settings={theme:'light',layered:false,controls:{...looks.clear,blurPx}};
   const before=await readback(item.r,source,s,settings,dpr);source.version++;
   const candidate=roi(item.r,s,settings,source,dpr),after=await readback(item.r,source,s,settings,dpr),work=candidate.stop(),delta=compare(before,after);
   e.rows.push({backend,dpr,count,blurPx,box:candidate.box,margin:candidate.margin,...work,...delta,passed:delta.maxDelta===0});await raf();
  }}finally{item.r.dispose();item.canvas.remove();}
 }
 e.passed=e.rows.every(r=>r.passed);output.value=JSON.stringify(e,null,2);status.textContent=`ROI complete: ${e.rows.filter(r=>r.passed).length}/${e.rows.length}`;
}
async function roiPerformance(){
 const e=baseEvidence('roi-performance');e.protocol={width:800,height:480,dpr:2,warmup:8,samples:30,repeats:3,background:'updated every frame',blurPx:20,distance:.075,metric:'CPU submission and rAF; no GPU timing'};
 for(let repeat=1;repeat<=3;repeat++)for(const backend of ['webgpu','webgl'])for(const count of [1,20])for(const variant of repeat%2?['full','roi']:['roi','full']){
  status.textContent=`ROI performance ${repeat}/3 ${backend} ${count} ${variant}`;const item=await renderer(backend,'current'),source=scene(800,480,2,'image'),s=surfaces('normal',1,count),settings={theme:'light',layered:false,controls:{...looks.clear,blurPx:20}},candidate=variant==='roi'?roi(item.r,s,settings,source,2):null,cpu=[],interval=[];let last;
  try{for(let frame=0;frame<38;frame++){await raf();const now=performance.now();if(frame>=8&&last!==undefined)interval.push(now-last);last=now;source.version++;const start=performance.now();item.r.render(source,s,settings,2);if(frame>=8)cpu.push(performance.now()-start);if(document.visibilityState!=='visible')e.errors.push('hidden');}e.rows.push({repeat,backend,count,variant,cpu:summarize(cpu),raf:summarize(interval),cpuSamples:cpu,rafSamples:interval,work:candidate?.stop(),errors:item.errors});}finally{item.r.dispose();item.canvas.remove();}
 }
 e.passed=!e.errors.length&&e.rows.every(r=>!r.errors.length);output.value=JSON.stringify(e,null,2);status.textContent=`ROI performance complete: ${e.passed}`;
}
async function stress(){
 const e=baseEvidence('bounded-stress');e.protocol={frames:600,instances:4,maxSurfaces:50,dpr:2,note:'About ten seconds of foreground rAF; not a long-term soak or driver memory measurement'};
 const {GlassController}=await import('../../src/controller.js');const controllers=[];
 try{for(const backend of ['webgpu','webgl'])for(let i=0;i<2;i++){
  const stage=document.createElement('div');stage.style.cssText='position:relative;width:400px;height:240px';host.append(stage);const c=new GlassController(stage,{backend,theme:'light',controls:looks.frosted});c.dpr=()=>2;await c.ready;const off=[],nodes=[];
  for(let k=0;k<50;k++){const node=document.createElement('div');stage.append(node);nodes.push(node);off.push(c.register(node,{id:`s-${k}`}));}
  let frame=0;c.setGeometryProvider(()=>({width:400,height:240,surfaces:new Map(nodes.map((node,k)=>[`s-${k}`,{x:10+(k%10)*38+Math.sin(frame*.1+k),y:15+Math.floor(k/10)*40,w:32,h:28}]))}));
  controllers.push({c,stage,off,nodes,backend,setFrame:f=>frame=f});
 }
 for(let frame=0;frame<600;frame++){await raf();for(const item of controllers){item.setFrame(frame);cancelAnimationFrame(item.c.raf);item.c.raf=0;if(frame%10===0)item.c.needsBackground=true;item.c.render();if(frame%200===199)e.rows.push({frame,backend:item.backend,active:item.c.getState().activeBackend,surfaces:item.c.surfaces.size,buffers:item.c.renderer.buffers?.size??0,groups:item.c.renderer.groups?.size??0,blurRadii:item.c.renderer.imagePass?.items.size??0,canvases:item.stage.querySelectorAll('canvas').length,geometryMode:item.c.getState().geometryMode});}if(frame%60===0)status.textContent=`DPR 2 stress ${frame}/600`;if(document.visibilityState!=='visible')e.errors.push('hidden');}
 const c=controllers[0].c,backend=c.getState().activeBackend;c.setScenePainter(()=>{throw Error('QA scene callback failed');});cancelAnimationFrame(c.raf);c.raf=0;c.render();e.sourceFailure={backendBefore:backend,backendAfter:c.getState().activeBackend,sceneReason:c.getState().sceneReason,version:c.scene.version};c.setScenePainter(null);c.render();e.sourceRecovery={backend:c.getState().activeBackend,sceneReason:c.getState().sceneReason};
 }finally{e.cleanup=[];for(const item of controllers){item.off.forEach(off=>off());item.c.render();const renderer=item.c.renderer;item.c.dispose();e.cleanup.push({backend:item.backend,disposed:item.c.disposed,surfaces:item.c.surfaces.size,listeners:item.c.listeners.size,canvasCount:item.stage.querySelectorAll('canvas').length,buffers:renderer.buffers?.size??0,groups:renderer.groups?.size??0,blurRadii:renderer.imagePass?.items.size??0});item.stage.remove();}}
 e.passed=!e.errors.length&&e.rows.every(r=>r.backend===r.active&&r.geometryMode==='provided'&&r.buffers<=50&&r.groups<=50&&r.blurRadii<=3&&r.canvases===2)&&e.cleanup.every(r=>r.disposed&&!r.surfaces&&!r.listeners&&!r.canvasCount&&!r.buffers&&!r.groups&&!r.blurRadii)&&e.sourceFailure.backendBefore===e.sourceFailure.backendAfter&&e.sourceFailure.sceneReason==='QA scene callback failed'&&e.sourceRecovery.sceneReason===null;
 output.value=JSON.stringify(e,null,2);status.textContent=`DPR 2 stress complete: ${e.passed}`;
}
for(const [id,run] of [['quality',quality],['perf',resourcePerformance],['roi',roiExperiment],['roi-perf',roiPerformance],['stress',stress]])document.querySelector(`#${id}`).onclick=async()=>{document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await run();}catch(error){status.textContent=`Failed: ${error.message}`;output.value=JSON.stringify({phase:'failed',reason:error.stack},null,2);}finally{document.querySelectorAll('button').forEach(b=>b.disabled=false);}};
