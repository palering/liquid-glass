import {GlassController}from '../../src/controller.js';
import {parsePreset,createPreset,serializePreset}from '../../src/preset.js';
const raf=()=>new Promise(requestAnimationFrame),host=document.querySelector('#host'),status=document.querySelector('[role=status]'),output=document.querySelector('#results');
const check=(condition,message)=>{if(!condition)throw Error(message);};
async function settle(c){for(let i=0;i<8;i++){await c.ready;await raf();}c.render();await c.ready;await raf();}
function owned(r,c){if(!r.imagePass)return 0;let n=c.scene.canvas.width*c.scene.canvas.height*4;for(const item of r.imagePass.items.values()){for(const p of item.pyramid)n+=(p.w??p.texture.width)*(p.h??p.texture.height)*4;n+=r.gl?item.tw*item.th*8:item.a.width*item.a.height*8;}if(r.layers)n+=c.scene.canvas.width*c.scene.canvas.height*8;return n;}
document.querySelector('#contracts').onclick=async()=>{
 document.querySelectorAll('button').forEach(b=>b.disabled=true);
 const fingerprint=await(await fetch('/benchmark-source.json')).json(),e={source:fingerprint.sourceSha256,userAgent:navigator.userAgent,dpr:devicePixelRatio,rows:[],cleanup:[],errors:[]};
 try{for(const backend of ['webgpu','webgl']){
  const stage=document.createElement('div');stage.className='lg-stage';Object.assign(stage.style,{position:'relative',width:'640px',height:'360px'});host.replaceChildren(stage);
  const c=new GlassController(stage,{backend,theme:'light',background:'testchart',layered:true}),offs=[],cards=[];
  for(const [i,kind]of ['card','control','panel'].entries()){const card=document.createElement('div');card.innerHTML='<div class="lg-content"><input value="retained" aria-label="Fixture input"><button>Button</button></div>';Object.assign(card.style,{position:'absolute',left:10+i*150+'px',top:'20px',width:'130px',height:'90px'});stage.append(card);offs.push(c.register(card,{id:kind,kind,radius:15}));cards.push(card);}
  await settle(c);const field=cards[0].querySelector('input');field.focus();
  try{
   for(const preset of [null,'full','economy','balanced','minimal','custom',null]){
    status.textContent=`Contracts ${backend} ${preset??'legacy'}`;
    await c.setSettings({performance:preset?{preset}:null});await settle(c);
    const p=c.getState().performance,actual=owned(c.renderer,c),expected=preset==='minimal'?'solid':backend;
    check(c.status.activeBackend===expected,'Unexpected backend '+preset);check(actual===p.estimatedTextureBytes,'Resource estimate disagrees with allocations');
    check(field.value==='retained'&&document.activeElement===field,'DOM focus/input lost');check(c.settings.layered===true&&!Object.hasOwn(c.settings.controls,'dispersion'),'Requested controls overwritten');
    if(preset==='economy'){check(p.dpr<=1&&p.blurRadii.length===1&&!p.layered,'Economy not applied');check(p.controlsByKind.card.dispersion===0,'Dispersion not disabled');}
    e.rows.push({backend,preset:preset??'legacy',active:c.status.activeBackend,...p,actualOwnedTextureBytes:actual,inputKept:true,passed:true});
   }
   const before=JSON.stringify(c.settings);let rejected=false;try{await c.setSettings({background:'image',performance:{preset:'custom',overrides:{dprCap:NaN}}});}catch{rejected=true;}check(rejected&&JSON.stringify(c.settings)===before,'Invalid patch was not atomic');
   const saved=createPreset('Performance',{...c.settings,performance:{preset:'economy'}}),round=parsePreset(serializePreset(saved));check(round.version===2&&round.settings.performance.preset==='economy','v2 roundtrip failed');
   const old=parsePreset({schema:'workspace-liquid-glass',version:1,name:'Old',settings:{controls:{blurPx:3}}});check(old.settings.performance===null,'v1 changed performance');
   await c.setSettings({performance:{preset:'custom',overrides:{maxBlurRadii:1}}});await settle(c);check(c.status.activeBackend==='solid'&&c.performanceState.adjustmentReasons.includes('blur-radius-limit-unmet'),'Exact radius budget not enforced');e.rows.push({backend,case:'exact-radius-budget',...c.performanceState,active:c.status.activeBackend,passed:true});
   Object.assign(stage.style,{width:'960px',height:'540px'});await c.setSettings({layered:true,performance:{preset:'custom',overrides:{textureBudgetMiB:1}}});await settle(c);check(c.status.activeBackend==='solid'&&c.performanceState.budgetExceeded,'Impossible budget allocated GPU');
   e.rows.push({backend,case:'budget-blocked',...c.performanceState,active:c.status.activeBackend,passed:true});
   Object.assign(stage.style,{width:'320px',height:'180px'});c.invalidate();await settle(c);check(c.status.activeBackend===backend&&!c.performanceState.budgetExceeded,'Budget recovery failed');check(owned(c.renderer,c)===c.performanceState.estimatedTextureBytes,'Recovered texture estimate failed');
   e.rows.push({backend,case:'budget-recovered',...c.performanceState,active:c.status.activeBackend,passed:true});
   await c.setSettings({performance:{preset:'economy'}});await settle(c);
   const start=c.scene.version;let submitted=0;
   // Explicit frames keep geometry moving at rAF cadence. Only animation's
   // background is throttled; public invalidateScene remains immediate.
   c.setAnimation(true);for(let i=0;i<90;i++){cards[0].style.left=10+i%20+'px';await raf();submitted++;}c.setAnimation(false);await settle(c);const paints=c.scene.version-start;
   check(paints>10&&paints<submitted*.8,'Economy animation cadence not reduced');
   const v=c.scene.version;c.invalidateScene();await settle(c);check(c.scene.version>v,'Explicit scene invalidation throttled');
   await settle(c);const draws=c.draws;for(let i=0;i<15;i++)await raf();check(c.draws===draws,'Idle redraws');
   e.rows.push({backend,case:'animation-and-idle',frames:submitted,scenePaints:paints,draws,explicitInvalidation:true,idle:true,passed:true});
   // Fixed source lifetime workload: compare legacy/full/economy at their actual
   // policy resolution; CPU and rAF do not imply GPU duration or equal quality.
   Object.assign(stage.style,{width:'960px',height:'540px'});await c.setSettings({layered:false});
   for(const preset of [null,'full','economy','balanced']){await c.setSettings({performance:preset?{preset}:null});await settle(c);const cpu=[],intervals=[];let last;for(let i=0;i<50;i++){await raf();const now=performance.now();if(i>=10&&last)intervals.push(now-last);last=now;cards[0].style.left=10+i%30+'px';c.needsBackground=true;const t=performance.now();c.render();if(i>=10)cpu.push(performance.now()-t);}e.rows.push({backend,case:'dynamic-source-cost',preset:preset??'legacy',performance:c.getState().performance,cpuSamples:cpu,rafSamples:intervals,actualOwnedTextureBytes:owned(c.renderer,c),passed:true});}
  }finally{offs.forEach(off=>off());c.render();const r=c.renderer;c.dispose();e.cleanup.push({backend,surfaces:c.surfaces.size,listeners:c.listeners.size,canvases:stage.querySelectorAll('canvas').length,blurRadii:r.imagePass?.items.size??0,buffers:r.buffers?.size??0});stage.remove();}
 }
 }catch(error){e.errors.push(error.stack);}
 e.passed=!e.errors.length&&e.rows.length===30&&e.rows.every(r=>r.passed)&&e.cleanup.every(r=>!r.surfaces&&!r.listeners&&!r.canvases&&!r.blurRadii&&!r.buffers);output.value=JSON.stringify(e,null,2);status.textContent=`Profile contracts complete: ${e.passed}; ${e.rows.length} rows`;document.querySelectorAll('button').forEach(b=>b.disabled=false);
};
