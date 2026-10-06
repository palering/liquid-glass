const variants=['baseline','zero-lighting','uniform-constants','weights','weights-unrolled','gaussian-recurrence','height-hermite','height-semicircle','height-convex','current'];
const classes={webgpu:{},webgl:{}};
for(const v of variants){const base=v==='current'?'/src/renderers/':`/.local/shader-preparation-${v}/src/renderers/`;classes.webgpu[v]=(await import(base+'webgpu.js')).WebGPURenderer;classes.webgl[v]=(await import(base+'webgl.js')).WebGLRenderer;}
const {GPUImagePass:BaseImage}=await import('/.local/shader-preparation-baseline/src/renderers/blur-wgpu.js');
const {looks}=await import('/.local/shader-preparation-baseline/src/config.js');
const {summarize}=await import('../../benchmarks/statistics.js');
const output=document.querySelector('#results'),status=document.querySelector('[role=status]'),host=document.querySelector('#host'),pair=document.querySelector('#pair');
const raf=()=>new Promise(requestAnimationFrame),hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
let version=0;
const selected=()=> document.querySelector('#variant').value;
const provenance=await (await fetch('/.local/shader-preparation-candidates.json')).json();
const currentSource=await(await fetch('/benchmark-source.json')).json();
function baseEvidence(kind){return{schema:'liquid-glass-performance-research',version:1,kind,candidate:selected(),candidateArtifact:provenance,baselineSource:provenance.baselineSource,productionChanged:selected()==='current',productionSource:currentSource,environment:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio},rows:[],errors:[]};}
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
 for(const controls of [{glareFactor:0,fresnelFactor:0},{glareFactor:0},{fresnelFactor:0},{glareFactor:1e-5,fresnelFactor:1e-5},{glareFactor:2,fresnelFactor:2,fresnelRange:1,glareRange:1},{fresnelRange:80,glareRange:80}])for(const dpr of [1,2])cases.push({dpr,look:'clear',background:'image',shape:'normal',controls});
 for(const tintColor of ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ff00ff','#123456','#808080'])for(const tintOpacity of [0,.95])cases.push({dpr:1,look:'frosted',background:'gradient',shape:'normal',controls:{tintColor,tintOpacity}});
 const pixels=new Map();
 for(const backend of ['webgpu','webgl']){
  const before=await renderer(backend,'baseline'),after=await renderer(backend,selected());
  try{for(const [index,c] of cases.entries()){
   status.textContent=`Quality ${backend} ${index+1}/${cases.length}`;
   const source=scene(c.width??480,c.height??280,c.dpr,c.background),s=surfaces(c.shape,c.scale??1,c.count??3);if(c.shape==='zero-size')s.forEach(v=>{v.bounds.w=0;v.bounds.h=0;});
   const settings={theme:'light',layered:c.layered??false,controls:{...looks[c.look],...c.controls,...(c.scale?{radius:20*c.scale}:{})}};
   const a=await readback(before.r,source,s,settings,c.dpr),b=await readback(after.r,source,s,settings,c.dpr),delta=compare(a,b);
   evidence.rows.push({backend,...c,...delta,baselineHash:await hash(a),currentHash:await hash(b),passed:delta.alphaMax===0&&(selected().startsWith('height-')||delta.maxDelta<=1)&&(c.shape==='zero-size'||delta.nonblank)});
   const previous=pixels.get(index);if(previous)evidence.crossBackend??=[],evidence.crossBackend.push({...c,...compare(previous,b)});else pixels.set(index,b);
   if(index===5&&backend==='webgpu'){picture(a,source.canvas.width,source.canvas.height,'Frozen profile baseline · Frosted');picture(b,source.canvas.width,source.canvas.height,`Candidate · Frosted (max Δ ${delta.maxDelta}/255)`);}
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
 for(let repeat=1;repeat<=3;repeat++)for(const radius of e.protocol.radii)for(const variant of repeat%2?['baseline',selected()]:[selected(),'baseline']){
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
    pass=await (variant==='baseline'?BaseImage:(await import(`/.local/shader-preparation-${selected()}/src/renderers/blur-wgpu.js`)).GPUImagePass).create(device,'rgba8unorm');
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
 const e=baseEvidence('isolated-blur-quality');e.protocol={dimensions:[[37,29],[127,65],[1,17]],backgrounds:['image','testchart','alpha'],radii:[.1,.5,2.99,3,3.01,18,35],dpr:1,threshold:1,output:'RGBA8 blur texture before optics; alpha included'};pair.replaceChildren();
 for(const backend of ['webgpu','webgl']){const a=await renderer(backend,'baseline'),b=await renderer(backend,selected());try{for(const [w,h]of e.protocol.dimensions)for(const background of e.protocol.backgrounds)for(const radius of e.protocol.radii){status.textContent=`Isolated blur ${backend} ${w}×${h} ${background} ${radius}`;const source=scene(w,h,1,background),before=await directBlur(a.r,source,radius),after=await directBlur(b.r,source,radius),delta=compare(before.data,after.data);e.rows.push({backend,width:w,height:h,background,radius,outputWidth:before.w,outputHeight:before.h,...delta,baselineHash:await hash(before.data),currentHash:await hash(after.data),passed:delta.maxDelta<=1});if(backend==='webgpu'&&w===127&&background==='testchart'&&radius===3){picture(before.data,before.w,before.h,'BC2 · isolated blur');picture(after.data,after.w,after.h,`Candidate · isolated blur (max Δ ${delta.maxDelta}/255)`);}a.r.imagePass.prune(new Set());b.r.imagePass.prune(new Set());await raf();}e.errors.push(...a.errors,...b.errors);}finally{a.r.dispose();b.r.dispose();a.canvas.remove();b.canvas.remove();}}
 e.passed=!e.errors.length&&e.rows.every(row=>row.passed);output.value=JSON.stringify(e,null,2);status.textContent=`Isolated blur complete: ${e.rows.filter(row=>row.passed).length}/${e.rows.length}; overall ${e.passed}`;
}
for(const [id,run]of [['quality',quality],['direct',directQuality],['timing',()=>blurTiming(false)],['pipeline',()=>blurTiming(true)]])document.querySelector('#'+id).onclick=async()=>{
 document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await run();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({failed:true,error:error.stack},null,2);}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}
};

async function gpuTiming(){
 const e=baseEvidence('gpu-timing');e.protocol={width:1920,height:1080,dpr:2,surfaces:12,warmup:10,samples:40,repeats:3,metric:'Main optical pass GPU duration; separate from CPU/rAF benchmark'};
 e.protocol.lighting=document.querySelector('#timing-mode').value;
 const adapter=await navigator.gpu?.requestAdapter();e.capabilities={webgpuTimestamp:adapter?.features.has('timestamp-query')??false};
 if(!e.capabilities.webgpuTimestamp){e.unavailable='WebGPU adapter does not expose timestamp-query';output.value=JSON.stringify(e,null,2);status.textContent='GPU timing unavailable';return;}
 for(let repeat=1;repeat<=3;repeat++)for(const variant of repeat%2?['baseline',selected()]:[selected(),'baseline']){
  const freshAdapter=await navigator.gpu.requestAdapter(),d=await freshAdapter.requestDevice({requiredFeatures:['timestamp-query']}),canvas=document.createElement('canvas');host.append(canvas);const errors=[],r=new classes.webgpu[variant](canvas,d,msg=>errors.push(msg));
  const query=d.createQuerySet({type:'timestamp',count:2}),resolve=d.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),mapped=d.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),samples=[];
  try{await r.init();const source=scene(960,540,2,'testchart'),s=Array.from({length:12},(_,k)=>({id:'timing-'+k,kind:'card',bounds:{x:10+k%4*232,y:12+Math.floor(k/4)*176,w:220,h:164,radius:30}})),settings={theme:'light',layered:false,controls:{...looks.clear,blurPx:0,thickness:45,...(document.querySelector('#timing-mode').value==='zero'?{glareFactor:0,fresnelFactor:0}: {})}};
   const encoderFn=d.createCommandEncoder.bind(d),submitFn=d.queue.submit.bind(d.queue);let marked=0;
   d.createCommandEncoder=function(...args){const encoder=encoderFn(...args),begin=encoder.beginRenderPass.bind(encoder);encoder.beginRenderPass=function(descriptor){marked++;return begin({...descriptor,timestampWrites:{querySet:query,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}});};return encoder;};
   d.queue.submit=function(commands){if(marked!==1)throw Error('Timing expected exactly one optical pass');const encoder=encoderFn();encoder.resolveQuerySet(query,0,2,resolve,0);encoder.copyBufferToBuffer(resolve,0,mapped,0,16);return submitFn([...commands,encoder.finish()]);};
   for(let f=0;f<50;f++){await raf();if(document.visibilityState!=='visible')throw Error('Hidden during GPU timing');marked=0;for(let k=0;k<s.length;k++)s[k].bounds.x=10+k%4*232+Math.sin(f*.15+k);r.render(source,s,settings,2);await mapped.mapAsync(GPUMapMode.READ);const ns=new BigUint64Array(mapped.getMappedRange());const ms=Number(ns[1]-ns[0])/1e6;mapped.unmap();if(!Number.isFinite(ms)||ms<=0)throw Error('Invalid GPU duration');if(f>=10)samples.push(ms);if(f%10===0)status.textContent=`GPU timing ${repeat}/3 ${variant} ${f}/50`;}
   d.createCommandEncoder=encoderFn;d.queue.submit=submitFn;e.rows.push({repeat,variant,gpu:summarize(samples),gpuSamples:samples,errors});
  }finally{query.destroy();resolve.destroy();mapped.destroy();r.dispose();canvas.remove();}
 }
 e.passed=e.rows.length===6&&e.rows.every(r=>!r.errors.length);output.value=JSON.stringify(e,null,2);status.textContent=`GPU timing complete: ${e.passed}`;
}

document.querySelector('#optical-timing').onclick=async()=>{document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await gpuTiming();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({failed:true,error:error.stack});}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}};

// Alternate order within each frame on two persistent devices. Batched draws
// reduce timestamp quantization; retain raw paired values and CPU submission.
async function interleavedTiming(){
 const e=baseEvidence('interleaved-gpu-timing'),workload=document.querySelector('#workload').value;
 const optical=workload.startsWith('optical'),batch=optical?4:2,radii=optical?[0]:[.5,3,18];
 e.protocol={workload,batch,radii,repeats:3,warmup:10,samples:40,width:optical?960:960,height:optical?540:540,dpr:optical?2:1,metric:'Sum of actual render-pass timestamp intervals divided by batch; copies/upload excluded. CPU submission reported separately. Alternating baseline/candidate order each frame.'};
 const viewport=[innerWidth,innerHeight];
 for(const radius of radii){
  const items=[];
  try{for(const variant of ['baseline',selected()]){
   const adapter=await navigator.gpu?.requestAdapter();if(!adapter?.features.has('timestamp-query'))throw Error('timestamp-query unavailable');
   const device=await adapter.requestDevice({requiredFeatures:['timestamp-query']}),canvas=document.createElement('canvas'),errors=[];host.append(canvas);
   const r=new classes.webgpu[variant](canvas,device,message=>errors.push(String(message)));await r.init();
   const queries=device.createQuerySet({type:'timestamp',count:32}),resolve=device.createBuffer({size:256,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read=device.createBuffer({size:256,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
   const originalEncoder=device.createCommandEncoder,originalSubmit=device.queue.submit;
   const item={variant,device,canvas,r,errors,queries,resolve,read,originalEncoder,originalSubmit,count:0};items.push(item);
   device.createCommandEncoder=function(...args){const encoder=originalEncoder.apply(this,args),begin=encoder.beginRenderPass;encoder.beginRenderPass=function(desc){if(item.count>=16)throw Error('Query capacity exceeded');const i=item.count++*2;return begin.call(this,{...desc,timestampWrites:{querySet:queries,beginningOfPassWriteIndex:i,endOfPassWriteIndex:i+1}});};return encoder;};
   device.queue.submit=function(commands){const encoder=originalEncoder.call(device);encoder.resolveQuerySet(queries,0,item.count*2,resolve,0);encoder.copyBufferToBuffer(resolve,0,read,0,item.count*16);return originalSubmit.call(this,[...commands,encoder.finish()]);};
  }
  const source=scene(960,540,e.protocol.dpr,'testchart'),s=optical?Array.from({length:12},(_,i)=>({id:'opt-'+i,kind:'card',bounds:{x:10+i%4*232,y:12+Math.floor(i/4)*176,w:220,h:164,radius:30}})):[{id:'panel',kind:'panel',bounds:{x:25,y:25,w:900,h:480,radius:30}}];
  const settings={theme:'light',layered:false,controls:{...(optical?looks.clear:looks.frosted),blurPx:radius,...(optical?{thickness:45}:{}),...(workload==='optical-zero'?{fresnelFactor:0,glareFactor:0}:{})}};
  for(let repeat=1;repeat<=3;repeat++){
   const samples=items.map(()=>[]),cpu=items.map(()=>[]),pairs=[];
   for(let frame=0;frame<50;frame++){
    await raf();if(document.visibilityState!=='visible'||innerWidth!==viewport[0]||innerHeight!==viewport[1])throw Error('Hidden or resized measurement');
    const order=(frame+repeat)%2?[0,1]:[1,0],durations=[];
    for(const index of order){const item=items[index];item.count=0;const begin=performance.now();
     for(let j=0;j<batch;j++){if(!optical)source.version++;item.r.render(source,s,settings,e.protocol.dpr);}
     const submit=(performance.now()-begin)/batch;await item.read.mapAsync(GPUMapMode.READ);const timestamps=new BigUint64Array(item.read.getMappedRange());let ms=0;
     for(let i=0;i<item.count;i++){if(timestamps[2*i+1]<timestamps[2*i])throw Error('Invalid timestamps');ms+=Number(timestamps[2*i+1]-timestamps[2*i])/1e6;}
     item.read.unmap();ms/=batch;durations[index]=ms;if(frame>=10){samples[index].push(ms);cpu[index].push(submit);}
    }
    if(frame>=10)pairs.push({baseline:durations[0],candidate:durations[1],difference:durations[1]-durations[0],order:order.join(',')});
    if(frame%10===0)status.textContent=`Interleaved ${selected()} ${workload} radius=${radius} repeat=${repeat} frame=${frame}`;
   }
   items.forEach((item,index)=>e.rows.push({radius,repeat,variant:item.variant,passCount:item.count,gpu:summarize(samples[index]),cpu:summarize(cpu[index]),gpuSamples:samples[index],cpuSamples:cpu[index],errors:item.errors}));
   e.pairs??=[];e.pairs.push({radius,repeat,samples:pairs});
  }
  }finally{for(const item of items){item.device.createCommandEncoder=item.originalEncoder;item.device.queue.submit=item.originalSubmit;item.queries.destroy();item.resolve.destroy();item.read.destroy();item.r.dispose();item.canvas.remove();}}
 }
 e.passed=e.rows.length===radii.length*6&&e.rows.every(r=>!r.errors.length&&r.gpu.samples===40);output.value=JSON.stringify(e,null,2);status.textContent=`Interleaved timing complete: ${e.passed}`;
}
document.querySelector('#paired-timing').onclick=async()=>{document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await interleavedTiming();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({failed:true,error:error.stack});}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}};

async function profileGallery(){
 const e=baseEvidence('bounded-profile-gallery');e.boundary='New artistic models: mask/finite/resource checks, not old-look pixel equivalence or accepted production visual quality.';pair.replaceChildren();
 for(const theme of ['light','dark']){
  const source=scene(480,280,1,'gradient'),x=source.canvas.getContext('2d');x.fillStyle=theme==='light'?'#e9eef5':'#192636';x.fillRect(0,0,480,280);
  x.strokeStyle=theme==='light'?'#8494a9':'#647891';x.lineWidth=1;for(let k=0;k<480;k+=12){x.beginPath();x.moveTo(k,0);x.lineTo(k,280);x.stroke();}for(let k=0;k<280;k+=12){x.beginPath();x.moveTo(0,k);x.lineTo(480,k);x.stroke();}
  x.fillStyle=theme==='light'?'#192b41':'#ecf4ff';x.font='bold 22px system-ui';x.fillText('Liquid Glass · 玻璃轮廓',16,48);x.font='16px system-ui';for(let k=0;k<4;k++)x.fillText('Refraction / 012345 / 清晰与折射',20,102+k*42);source.version=++version;
  const s=[{id:'profile',kind:'card',bounds:{x:70,y:25,w:340,h:230,radius:35}}],settings={theme,layered:false,controls:{...looks.clear,thickness:45,distance:.035,dispersion:0,radius:35}};
  for(const variant of ['baseline','height-hermite','height-semicircle','height-convex']){
   const item=await renderer('webgpu',variant);try{
    const bytes=await readback(item.r,source,s,settings,1),canvas=document.createElement('canvas');canvas.width=480;canvas.height=280;const cx=canvas.getContext('2d');cx.drawImage(source.canvas,0,0);const raw=document.createElement('canvas');raw.width=480;raw.height=280;const data=new Uint8ClampedArray(bytes);
    for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;if(a>0)for(let j=0;j<3;j++)data[i+j]=Math.min(255,Math.round(data[i+j]/a));}
    raw.getContext('2d').putImageData(new ImageData(data,480,280),0,0);cx.drawImage(raw,0,0);picture(cx.getImageData(0,0,480,280).data,480,280,theme+' · '+variant);
    e.rows.push({theme,variant,hash:await hash(bytes),errors:item.errors});
   }finally{item.r.dispose();item.canvas.remove();}
  }
 }
 e.passed=e.rows.length===8&&e.rows.every(r=>!r.errors.length);output.value=JSON.stringify(e,null,2);status.textContent=`Profile gallery complete: ${e.passed}`;
}
document.querySelector('#profiles').onclick=async()=>{document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await profileGallery();}catch(error){status.textContent='Failed: '+error.message;output.value=JSON.stringify({failed:true,error:error.stack});}finally{document.querySelectorAll('button,select').forEach(b=>b.disabled=false);}};
status.textContent='Ready';
