import {GlassController}from '../../src/controller.js';import {looks}from '../../src/config.js';
const button=document.querySelector('#run'),status=document.querySelector('[role=status]'),host=document.querySelector('#host'),output=document.querySelector('textarea'),raf=()=>new Promise(requestAnimationFrame);
button.onclick=async()=>{
 button.disabled=true;const fingerprint=await(await fetch('/benchmark-source.json')).json(),e={source:fingerprint.sourceSha256,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,rows:[],errors:[],cleanup:[]};
 try{for(const backend of ['webgpu','webgl','svg','css','solid']){
  status.textContent='Checking '+backend;const stage=document.createElement('div');stage.className='lg-stage';const card=document.createElement('div');card.className='sample';card.innerHTML='<div class="lg-content"><h2>Clear glass / 清透玻璃</h2><input aria-label="Kept input" value="keep-me"><button>DOM button</button></div>';stage.append(card);host.replaceChildren(stage);
  const c=new GlassController(stage,{backend,theme:'light',background:'testchart',controls:looks.clear});await c.ready;const off=c.register(card,{id:'sample',radius:30});const field=card.querySelector('input');
  try{for(const theme of ['light','dark']){await c.setSettings({theme});c.render();await raf();field.focus();const identity=field;const before=c.draws;let invalidRejected=false;try{await c.setSettings({background:'checker',controls:{ior:NaN}});}catch{invalidRejected=true;}
   const current=c.getState();e.rows.push({requested:backend,active:current.activeBackend,theme,native:current.activeCapture,phase:current.phase,surfaces:c.surfaces.size,canvasCount:stage.querySelectorAll('canvas').length,invalidRejected,backgroundRetained:c.settings.background==='testchart',inputKept:card.querySelector('input')===identity&&identity.value==='keep-me',focusKept:document.activeElement===identity,drawsBefore:before,drawsAfter:c.draws,fallbackReason:current.fallbackReason,passed:current.phase==='ready'&&invalidRejected&&c.settings.background==='testchart'&&document.activeElement===identity});}
  }finally{off();c.render();const renderer=c.renderer;c.dispose();e.cleanup.push({backend,surfaces:c.surfaces.size,listeners:c.listeners.size,canvases:stage.querySelectorAll('canvas').length,buffers:renderer?.buffers?.size??0,blurRadii:renderer?.imagePass?.items.size??0});}
 }
 }catch(error){e.errors.push(error.stack);}
 e.passed=e.rows.length===10&&e.rows.every(r=>r.passed)&&e.cleanup.every(r=>!r.surfaces&&!r.listeners&&!r.canvases&&!r.buffers&&!r.blurRadii)&&!e.errors.length;output.value=JSON.stringify(e,null,2);status.textContent=`Complete: ${e.passed}; ${e.rows.length} cases`;button.disabled=false;
};
