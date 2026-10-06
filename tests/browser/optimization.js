import { GlassController as Baseline } from "/.local/optimization-baseline/src/controller.js";
import { GlassController as Current } from "../../src/controller.js";
import { looks } from "../../src/config.js";
import { summarize } from "../../benchmarks/statistics.js";
import "../../src/glass.css";

const classes = { baseline: Baseline, current: Current };
const baselineRevision = (await fetch("/.local/optimization-baseline/revision.txt").then(r => r.text())).trim();
const output = document.querySelector("#results"), status = document.querySelector("#status");
const raf = () => new Promise(requestAnimationFrame);
let pair = [];
const evidence = { schema: "liquid-glass-optimization", version: 1, baselineRevision,
  environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio },
  checks: [], performance: [] };
const show = () => { output.value = JSON.stringify(evidence, null, 2); };
const settle = async (c) => { await c.ready; await raf(); await raf(); cancelAnimationFrame(c.raf); c.raf = 0; };
function node(stage, i = 0, count = 3) {
  const e = document.createElement("div"); e.className = "surface";
  e.style.cssText = count === 3
    ? `position:absolute;left:${80+i*130}px;top:${70+i*35}px;width:190px;height:130px`
    : `position:absolute;left:${17+(i%10)*94}px;top:${15+Math.floor(i/10)*50}px;width:82px;height:38px`;
  e.innerHTML = count === 3 ? `<span class="lg-content">Native ${i+1}<input aria-label="Input ${i+1}" value="Glass"></span>` : `<span class="lg-content">${i+1}</span>`;
  stage.append(e); return e;
}
function snapshot(c) {
  // Normalize only generated SVG IDs, preserving displacement image pixels and attributes.
  const markup = [...c.stage.querySelectorAll(".lg-dom-material")].map(e => {
    const clone = e.cloneNode(true);
    for (const node of [clone,...clone.querySelectorAll("*")]) {
      const attributes = [...node.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0]));
      for (const [name] of attributes) node.removeAttribute(name);
      for (const [name,value] of attributes) node.setAttribute(name,value);
    }
    return clone.outerHTML.replace(/id="[^"]+"/g,'id="FILTER"').replace(/url\(#[^)]+\)/g,"url(#FILTER)");
  });
  return { backend: c.getState().activeBackend, phase: c.getState().phase, markup,
    sourceVersion: c.scene.version, surfaces: c.surfaces.size };
}
async function svgPixels(svg, dpr) {
  const copy = svg.cloneNode(true), bounds = svg.getBoundingClientRect();
  const width = Math.round(bounds.width * dpr), height = Math.round(bounds.height * dpr);
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", width); copy.setAttribute("height", height);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  await image.decode();
  const canvas = document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx = canvas.getContext("2d");ctx.drawImage(image,0,0);
  return ctx.getImageData(0,0,width,height).data;
}
async function compareSvg(dpr) {
  const before=[...pair[0].stage.querySelectorAll(".lg-dom-material svg")], after=[...pair[1].stage.querySelectorAll(".lg-dom-material svg")];
  const result=[];
  for(let i=0;i<before.length;i++) {
    const a=await svgPixels(before[i],dpr),b=await svgPixels(after[i],dpr);
    let changed=0,maxDelta=0,min=255,max=0,opaque=0;
    for(let j=0;j<a.length;j++){const delta=Math.abs(a[j]-b[j]);if(delta)changed++;maxDelta=Math.max(maxDelta,delta);if(j%4!==3){min=Math.min(min,a[j]);max=Math.max(max,a[j]);}else if(a[j])opaque++;}
    const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(v=>v.toString(16).padStart(2,"0")).join("");
    result.push({surface:i,bytes:a.length,changedChannels:changed,maxDelta,baselineHash:await hash(a),currentHash:await hash(b),nonblank:max-min>8&&opaque>0});
  }
  return result;
}
async function renderPair() {
  pair.forEach(c => c.dispose()); pair = [];
  const spec = Object.fromEntries(["backend","look","background","dpr","geometry"].map(k => [k,document.querySelector(`#${k}`).value]));
  for (const [variant,Controller] of Object.entries(classes)) {
    const stage = document.querySelector(`#${variant}-stage`); stage.replaceChildren();
    const c = new Controller(stage, { backend: spec.backend, background: spec.background, theme: "light", quality: "high", layered: false, controls: {...looks[spec.look], radius: 24, shadowOpacity: 0} });
    c.dpr = () => Number(spec.dpr); pair.push(c);
    for(let i=0;i<3;i++) { const e=node(stage,i); if(spec.geometry==="thin") e.style.height="12px"; if(spec.geometry==="resize") e.style.width=`${80+i*35}px`; c.register(e,{id:`quality-${i}`,radius:24,zIndex:i}); }
    await settle(c);
    if(spec.background==="image") await c.setImage("/assets/storefront.png");
    cancelAnimationFrame(c.raf); c.raf=0; c.render();
    // Isolate the renderer from small Canvas 2D backdrop-generation variation.
    if (variant === "current") {
      const ctx = c.scene.canvas.getContext("2d");
      ctx.putImageData(pair[0].scene.canvas.getContext("2d").getImageData(0, 0, c.scene.canvas.width, c.scene.canvas.height), 0, 0);
      c.scene.version++; c.render();
    }
    await raf();
  }
  const states=pair.map(snapshot); const equalMarkup=JSON.stringify(states[0].markup)===JSON.stringify(states[1].markup);
  document.querySelector(".pair").dataset.case=JSON.stringify(spec);
  const svgPixels=spec.backend==="svg"?await compareSvg(Number(spec.dpr)):null;
  evidence.quality={spec,states,equalMarkup,svgPixels}; show(); status.textContent=`Pair ready: ${spec.backend} / ${spec.look} / ${spec.background} / DPR ${spec.dpr} / ${spec.geometry}; normalized DOM equal: ${equalMarkup}`;
}
async function checks() {
  pair.forEach(c=>c.dispose()); pair=[]; evidence.checks=[];
  for(const [variant,Controller] of Object.entries(classes)) {
    const stage=document.querySelector(`#${variant}-stage`); stage.replaceChildren();
    const c=new Controller(stage,{backend:"svg",theme:"light",background:"testchart",quality:"low",controls:{...looks.clear,radius:12,shadowOpacity:0}});
    const nodes=[],off=[];
    for(let i=0;i<3;i++){nodes.push(node(stage,i));off.push(c.register(nodes[i],{id:`check-${i}`,radius:12}));}
    await settle(c); pair.push(c);
    const original=document.createElement.bind(document); let canvases=0;
    document.createElement=function(tag,...args){if(tag==="canvas")canvases++;return original(tag,...args);};
    const input=nodes[0].querySelector("input"); input.value="Retained input";input.focus();
    const initialMapCount=c.renderer.maps?.size??null;
    const initial=snapshot(c); const refs=[...stage.querySelectorAll(".lg-dom-material svg")];
    for(let f=0;f<12;f++){nodes.forEach((e,i)=>e.style.transform=`translate(${f+i}px,0)`);c.render();}
    const stable=snapshot(c); const stableCanvases=canvases;
    const inputRetained=nodes[0].querySelector("input")===input&&input.value==="Retained input";
    const focusRetained=document.activeElement===input;
    const reusedNodes=refs.every((r,i)=>r===stage.querySelectorAll(".lg-dom-material svg")[i]);
    let oldMap=stage.querySelector("feImage").getAttribute("href");
    nodes[0].style.width="143px"; c.render(); const resizeChanged=oldMap!==stage.querySelector("feImage").getAttribute("href");
    oldMap=stage.querySelector("feImage").getAttribute("href");
    await c.setSettings({controls:{thickness:40,radius:4}});cancelAnimationFrame(c.raf);c.raf=0;c.render();
    const shapeChanged=oldMap!==stage.querySelector("feImage").getAttribute("href");
    const images=[...stage.querySelectorAll("svg>image")].map(e=>e.getAttribute("href"));
    c.phase=1;c.needsBackground=true;c.render();
    const backgroundChanged=images.every((s,i)=>s!==stage.querySelectorAll("svg>image")[i].getAttribute("href"));
    const currentSnapshot=snapshot(c); document.createElement=original;
    off.forEach(fn=>fn());c.render();const materialLayers=stage.querySelectorAll(".lg-dom-material").length;
    const cacheAfterUnregister=c.renderer.maps?.size??null;nodes.forEach(e=>e.remove());c.dispose();
    evidence.checks.push({variant,initialMapCount,stableCanvases,reusedNodes,focusRetained,resizeChanged,shapeChanged,backgroundChanged,inputRetained,materialLayers,cacheAfterUnregister,remainingChildren:stage.children.length,initial,stable,currentSnapshot});
  }
  show(); status.textContent="Checks complete; evidence JSON contains cache invalidation, input and cleanup results.";
}
async function runPerformance(geometryExperiment = false) {
  pair.forEach(c=>c.dispose());pair=[];evidence.performance=[];
  const host=document.querySelector("#performance-host"); const specs=[];
  const variants=geometryExperiment?["dom","provided"]:["baseline","current"];
  for(let repeat=1;repeat<=3;repeat++) for(const backend of ["svg","webgpu","solid"]) for(const count of [10,50,100]) for(const variant of repeat%2 ? variants : [...variants].reverse()) specs.push({repeat,backend,count,variant});
  const protocol={width:960,height:540,dpr:1,warmup:8,frames:30,repeats:3,look:"studio",background:"testchart",workload:"move",note:"Paired development-source experiment. Not directly comparable with the 60-frame production archive. No measurement wrappers."};
  evidence.protocol=protocol;evidence.performanceStartedAt=new Date().toISOString();
  if(geometryExperiment)protocol.note="Same current source: live DOM geometry vs complete model-provided geometry. CPU submission can defer browser work; rAF is separately reported.";
  for(const [index,spec] of specs.entries()) {
    status.textContent=`Performance ${index+1}/${specs.length}: ${JSON.stringify(spec)}`;
    const stage=document.createElement("div");stage.className="lg-stage";stage.style.cssText="width:960px;height:540px";host.replaceChildren(stage);stage.scrollIntoView({block:"center"});
    const Controller=geometryExperiment?Current:classes[spec.variant]; const c=new Controller(stage,{backend:spec.backend,theme:"light",background:"testchart",quality:"low",controls:{...looks.studio,radius:12,shadowOpacity:0}});
    let geometryFrame=0;
    if(spec.variant==="provided")c.setGeometryProvider(()=>({width:960,height:540,surfaces:new Map(nodes.map((e,i)=>[`perf-${i}`,{x:17+(i%10)*94+Math.sin(geometryFrame*.3+i)*3,y:15+Math.floor(i/10)*50+Math.cos(geometryFrame*.3+i)*3,w:82,h:38,scale:1}]))}));
    const nodes=[],off=[];let hidden=document.visibilityState!=="visible", resized=false;
    const onVisibility=()=>{if(document.visibilityState!=="visible")hidden=true;};const onResize=()=>{resized=true;};
    document.addEventListener("visibilitychange",onVisibility);window.addEventListener("resize",onResize);
    const cpu=[],cadence=[]; let last;
    try {
      for(let i=0;i<spec.count;i++){const e=node(stage,i,spec.count);nodes.push(e);off.push(c.register(e,{id:`perf-${i}`,radius:12,zIndex:i}));}
      await settle(c); if(c.getState().activeBackend!==spec.backend)throw Error("Backend unavailable");
      const rect=stage.getBoundingClientRect();if(rect.left<0||rect.top<0||rect.right>innerWidth||rect.bottom>innerHeight)throw Error("Fixture outside viewport");
      for(let frame=0;frame<=protocol.warmup+protocol.frames;frame++) {
        const time=await raf();if(frame>protocol.warmup)cadence.push(time-last);last=time;
        if(frame===protocol.warmup+protocol.frames)break;
        const start=performance.now();geometryFrame=frame;nodes.forEach((e,i)=>{e.style.transform=`translate(${Math.sin(frame*.3+i)*3}px,${Math.cos(frame*.3+i)*3}px)`;});c.render();
        if(frame>=protocol.warmup)cpu.push(performance.now()-start);
      }
      if(hidden||resized)throw Error("Tab hidden or viewport resized");
      if(c.getState().activeBackend!==spec.backend)throw Error("Backend changed");
      const resourceCounts={maps:c.renderer.maps?.size??null,svgEntries:c.renderer.svgEntries?.size??null};
      evidence.performance.push({...spec,status:"ok",geometryMode:c.getState().geometryMode,cpuSamples:cpu,rafSamples:cadence,cpu:summarize(cpu),raf:summarize(cadence),resourceCounts});
    }catch(e){evidence.performance.push({...spec,status:"failed",reason:e.message});}
    finally {document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("resize",onResize);off.forEach(fn=>fn());nodes.forEach(e=>e.remove());c.render();c.dispose();}
    show();
  }
  evidence.performanceFinishedAt=new Date().toISOString();show();status.textContent=`Performance complete: ${evidence.performance.filter(r=>r.status==="ok").length}/${specs.length} valid`;
  document.querySelector("#status").scrollIntoView();
}
async function profileUpdates() {
  pair.forEach(c => c.dispose()); pair = []; evidence.profiles = [];
  const host = document.querySelector("#performance-host");
  evidence.profileProtocol = { count: 100, warmup: 8, frames: 30, width: 960, height: 540, dpr: 1, workloads:["move","idle"],
    note: "Diagnostic wrappers and MutationObserver add overhead. Compare phases within this run; use uninstrumented paired runs for performance claims." };
  for (const variant of ["baseline", "current"]) for (const backend of ["solid", "webgpu", "svg"]) for (const workload of ["move","idle"]) {
    status.textContent = `Profiling ${variant} / ${backend} / 100 surfaces / ${workload}`;
    const stage = document.createElement("div"); stage.className = "lg-stage";
    stage.style.cssText = "width:960px;height:540px"; host.replaceChildren(stage); stage.scrollIntoView({block: "center"});
    const c = new classes[variant](stage, { backend, theme: "light", background: "testchart", quality: "low", controls: {...looks.studio, radius: 12, shadowOpacity: 0} });
    const nodes = [], off = [], samples = [], restores = [];
    const observer = new MutationObserver(() => {});
    let hidden=document.visibilityState!=="visible",resized=false;
    const onVisibility=()=>{if(document.visibilityState!=="visible")hidden=true;},onResize=()=>{resized=true;};
    document.addEventListener("visibilitychange",onVisibility);window.addEventListener("resize",onResize);
    const freshCounters = () => Object.fromEntries(["stageBounds", "surfaceBounds", "styleProperties", "scenePaint", "renderer", "notifications"].map(k => [k, {ms: 0, calls: 0}]));
    let counters = freshCounters();
    function wrap(target, name, phase) {
      const own = Object.getOwnPropertyDescriptor(target, name), original = target[name];
      target[name] = function(...args) {
        const start = performance.now();
        try { return original.apply(this, args); }
        finally { counters[phase].ms += performance.now() - start; counters[phase].calls++; }
      };
      restores.push(() => own ? Object.defineProperty(target, name, own) : delete target[name]);
    }
    try {
      for (let i = 0; i < 100; i++) { const e = node(stage, i, 100); nodes.push(e); off.push(c.register(e, {id: `profile-${i}`, radius: 12, zIndex: i})); }
      await settle(c);
      if (c.getState().activeBackend !== backend) throw Error("Backend unavailable");
      const rect=stage.getBoundingClientRect();if(rect.left<0||rect.top<0||rect.right>innerWidth||rect.bottom>innerHeight||devicePixelRatio!==1)throw Error("Profile viewport/DPR mismatch");
      wrap(stage, "getBoundingClientRect", "stageBounds");
      nodes.forEach(e => wrap(e, "getBoundingClientRect", "surfaceBounds"));
      wrap(CSSStyleDeclaration.prototype, "setProperty", "styleProperties");
      wrap(c.scene, "paint", "scenePaint"); wrap(c.renderer, "render", "renderer"); wrap(c, "emit", "notifications");
      observer.observe(stage, {subtree: true, attributes: true, attributeFilter: ["style"]});
      for (let frame = 0; frame < 38; frame++) {
        await raf();
        counters = freshCounters();
        observer.takeRecords(); const start = performance.now();
        if(workload==="move")nodes.forEach((e, i) => { e.style.transform = `translate(${Math.sin(frame*.3+i)*3}px,${Math.cos(frame*.3+i)*3}px)`; }); c.render();
        const cpu = performance.now() - start;
        const styleMutations = observer.takeRecords().length;
        if (frame >= 8) samples.push({cpu, styleMutations, ...counters});
      }
      if(hidden||resized||c.getState().activeBackend!==backend)throw Error("Profile environment/backend changed");
      evidence.profiles.push({variant, backend, workload, samples});
    } finally {
      document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("resize",onResize);
      observer.disconnect(); restores.reverse().forEach(fn => fn());
      off.forEach(fn => fn()); nodes.forEach(e => e.remove()); c.render(); c.dispose();
    }
    show();
  }
  status.textContent = "Profile complete: 12 diagnostic cases"; document.querySelector("#status").scrollIntoView();
}
async function styleChecks() {
  pair.forEach(c => c.dispose()); pair = []; evidence.styleChecks = [];
  for (const backend of ["solid", "css", "svg", "webgpu", "webgl"]) {
    const variants = [];
    for (const [variant, Controller] of Object.entries(classes)) {
      status.textContent = `Style contract ${backend} / ${variant}`;
      const stage = document.querySelector(`#${variant}-stage`); stage.replaceChildren();
      const c = new Controller(stage, {backend, theme:"light", background:"testchart", controls:{...looks.clear, radius:24}});
      const nodes = [0,1,2].map(i => node(stage,i));
      const off = nodes.map((e,i) => c.register(e, {id:`style-${i}`,kind:i===1?"reading":"glass",radius:24}));
      const samples = []; let submitted;
      try {
        await settle(c); if (c.getState().activeBackend !== backend) throw Error("Backend unavailable");
        const render = c.renderer.render.bind(c.renderer);
        c.renderer.render = (source,surfaces,...args) => { submitted=surfaces.map(s=>s.bounds); return render(source,surfaces,...args); };
        const input=nodes[0].querySelector("input"); input.value="Native contract"; input.focus();
        const capture = name => {
          cancelAnimationFrame(c.raf); c.raf=0; c.render();
          const properties=["border-radius","--lg-shadow-opacity","--lg-shadow-blur","--lg-shadow-y","--lg-highlight"];
          samples.push({name, backend:c.getState().activeBackend, bounds:submitted,
            sourceSize:[c.scene.canvas.width,c.scene.canvas.height], disabled:stage.classList.contains("glass-disabled"),
            styles:nodes.map(e=>({inline:properties.map(p=>[p,e.style.getPropertyValue(p),e.style.getPropertyPriority(p)]),
              computed:[getComputedStyle(e).borderRadius,getComputedStyle(e).boxShadow],
              layer:[...e.querySelectorAll(".lg-dom-material")].map(l=>[getComputedStyle(l).borderRadius,getComputedStyle(l).background,getComputedStyle(l).backdropFilter])})),
            inputRetained:nodes[0].querySelector("input")===input&&input.value==="Native contract",focusRetained:document.activeElement===input});
        };
        capture("initial");
        nodes.forEach(e=>e.style.transform="translate(27px,-9px)"); capture("move");
        stage.style.transform="translate(11px,4px) scale(.8)";capture("ancestor-pan-zoom");stage.style.transform="";
        nodes[0].style.width="123px";nodes[1].style.height="12px";capture("resize-and-thin");
        await c.setSettings({theme:"dark",controls:{...looks.frosted,radius:7,shadowOpacity:.3,shadowBlur:9,shadowY:2}});capture("theme-material-shadow");
        nodes.forEach(e=>{
          e.style.setProperty("border-radius",e.style.borderRadius,"important");
          e.style.setProperty("--lg-highlight",".99","important");e.style.removeProperty("--lg-shadow-y");
          for(const l of e.querySelectorAll(".lg-dom-material")) {l.style.setProperty("background","red","important");l.style.setProperty("backdrop-filter","blur(99px)","important");}
        });capture("repair-host-edits-and-priority");
        nodes.forEach(e=>{e.style.cssText="position:absolute;left:45px;top:50px;width:150px;height:80px";for(const l of e.querySelectorAll(".lg-dom-material"))l.style.cssText="";});capture("repair-cssText-reset");
        nodes[1].style.display="none";capture("hidden");nodes[1].style.display="";capture("shown");
        await c.setSettings({enabled:false});capture("disabled");await c.setSettings({enabled:true,theme:"light",controls:{...looks.reading,radius:22}});capture("enabled-new-look");
        stage.style.width="560px";capture("stage-resize");stage.style.width="";
        const original = CSSStyleDeclaration.prototype.setProperty; let writes=0;
        CSSStyleDeclaration.prototype.setProperty=function(...args){writes++;return original.apply(this,args);};
        try {for(let frame=0;frame<12;frame++){nodes.forEach(e=>e.style.transform=`translate(${frame}px,0)`);c.render();}}
        finally {CSSStyleDeclaration.prototype.setProperty=original;}
        capture("stable-motion");
        off.forEach(fn=>fn());c.render();
        const cleanup={layers:stage.querySelectorAll(".lg-dom-material").length,maps:c.renderer.maps?.size??null};
        nodes.forEach(e=>e.remove());c.dispose();cleanup.children=stage.children.length;
        variants.push({variant,samples,stableWrites:writes,cleanup});
      } finally {c.dispose();stage.style.width="";stage.style.transform="";stage.replaceChildren();}
    }
    // display:none returns the viewport's (0,0), giving different stage-relative
    // origins in the side-by-side fixture. Empty surfaces do not draw; compare
    // their size/radius, and retain the unmodified coordinates in raw evidence.
    const comparable = samples => samples.map(s=>({...s,bounds:s.bounds.map(b=>Object.fromEntries(Object.entries(b.w===0||b.h===0?{...b,x:0,y:0}:b).map(([k,v])=>[k,Math.round(v*1000)/1000])))}));
    const equal=JSON.stringify(comparable(variants[0].samples))===JSON.stringify(comparable(variants[1].samples));
    const contracts=variants.map(v=>{
      const byName=Object.fromEntries(v.samples.map(s=>[s.name,s]));
      return {variant:v.variant,
        inputAndFocus:v.samples.every(s=>s.inputRetained&&s.focusRetained),
        backendRetained:v.samples.every(s=>s.backend===backend),
        hostEditsRepaired:JSON.stringify(byName["theme-material-shadow"].styles)===JSON.stringify(byName["repair-host-edits-and-priority"].styles),
        thinRadius:byName["resize-and-thin"].bounds[1].radius===6,
        panZoom:Math.abs(byName["ancestor-pan-zoom"].bounds[0].w-152)<.001,
        disabled:byName.disabled.disabled&&byName.disabled.bounds.length===0,
        reenabled:!byName["enabled-new-look"].disabled&&byName["enabled-new-look"].bounds.length===3,
        cleanup:v.cleanup.layers===0&&v.cleanup.children===0&&(v.cleanup.maps===null||v.cleanup.maps===0)};
    });
    const passed=equal&&contracts.every(c=>Object.entries(c).every(([k,v])=>k==="variant"||v===true));
    evidence.styleChecks.push({backend,equal,passed,contracts,geometryComparison:"0.001 CSS px rounding; empty surface origins ignored; raw bounds retained",variants});show();
  }
  status.textContent=`Style checks complete: ${evidence.styleChecks.filter(r=>r.passed).length}/5 passed`;
}
for(const [id,action] of [["render",renderPair],["checks",checks],["benchmark",runPerformance],["profile",profileUpdates],["style-checks",styleChecks],["geometry-benchmark",()=>runPerformance(true)]])document.querySelector(`#${id}`).onclick=async()=>{
  const buttons=[...document.querySelectorAll("button")];buttons.forEach(b=>b.disabled=true);
  try{await action();}catch(e){status.textContent=`Failed: ${e.message}`;console.error(e);}finally{buttons.forEach(b=>b.disabled=false);}
};
const initialButtons=[...document.querySelectorAll("button")];
initialButtons.forEach(b=>b.disabled=true);
try { await renderPair(); } finally { initialButtons.forEach(b=>b.disabled=false); }
