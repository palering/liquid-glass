import {GlassController} from '../../src/controller.js';
const raf=()=>new Promise(requestAnimationFrame);
const check=(condition,message)=>{if(!condition)throw Error(message);};
async function settle(c){for(let i=0;i<6;i++){await c.ready;await raf();}c.render();await c.ready;}
function owned(c){const r=c.renderer;if(!r.imagePass)return 0;let n=c.scene.canvas.width*c.scene.canvas.height*4;for(const item of r.imagePass.items.values()){for(const p of item.pyramid)n+=(p.w??p.texture.width)*(p.h??p.texture.height)*4;n+=r.gl?item.tw*item.th*8:item.a.width*item.a.height*8;}if(r.layers)n+=c.scene.canvas.width*c.scene.canvas.height*8;return n;}
document.querySelector('#stability').onclick=async()=>{
 const buttons=document.querySelectorAll('button'),host=document.querySelector('#host'),status=document.querySelector('[role=status]'),output=document.querySelector('#results');buttons.forEach(b=>b.disabled=true);
 const e={source:(await(await fetch('/benchmark-source.json')).json()).sourceSha256,userAgent:navigator.userAgent,dpr:devicePixelRatio,frames:0,rows:[],cleanup:[],errors:[]};
 try{for(const backend of ['webgpu','webgl','svg','css','solid']){
  const stage=document.createElement('div');stage.className='lg-stage';Object.assign(stage.style,{position:'relative',width:'320px',height:'180px'});host.replaceChildren(stage);
  const c=new GlassController(stage,{backend,background:'testchart',layered:true}),offs=[],cards=[];
  for(const [i,kind]of ['card','control','panel'].entries()){const card=document.createElement('div');card.innerHTML='<div class="lg-content"><input value="stable"></div>';Object.assign(card.style,{position:'absolute',left:10+i*70+'px',top:'20px',width:'65px',height:'90px'});stage.append(card);offs.push(c.register(card,{id:kind,kind}));cards.push(card);}
  try{await settle(c);const field=cards[0].querySelector('input');field.focus();const count=['webgpu','webgl'].includes(backend)?600:50,cycle=['webgpu','webgl'].includes(backend)?60:10;
   for(let i=0;i<count;i++){
    if(i%cycle===0||i===0){const preset=[null,'economy','balanced','full','minimal'][Math.floor(i/cycle)%5];Object.assign(stage.style,{width:(i%120?360:320)+'px'});await c.setSettings({performance:preset?{preset}:null,layered:i%120===0,controls:{blurPx:[0,6,18][Math.floor(i/60)%3]}});await settle(c);}
    cards[0].style.left=10+i%10+'px';c.needsBackground=true;c.render();await raf();await c.ready;
    check(c.status.phase==='ready','Renderer failed');check(document.activeElement===field&&field.value==='stable','Input lost');check(owned(c)===c.performanceState.estimatedTextureBytes,'Texture inventory diverged');check((c.renderer.imagePass?.items.size??0)<=c.performanceState.blurRadii.length,'Obsolete radius cache retained');check((c.renderer.buffers?.size??0)<=3,'Obsolete uniform buffers retained');e.frames++;
    if(i%cycle===0){status.textContent=`Stability ${backend} ${i}/${count}`;e.rows.push({backend,frame:i,preset:c.performanceState.preset,active:c.status.activeBackend,bytes:owned(c),passed:true});}
   }
   // A rejected patch must neither switch backend nor discard the raw controls.
   const before=JSON.stringify(c.settings);let rejected=false;try{await c.setSettings({performance:{preset:'custom',overrides:{animationHz:0}}});}catch{rejected=true;}check(rejected&&JSON.stringify(c.settings)===before,'Rejected patch mutated state');
   if(['webgpu','webgl'].includes(backend)){
    Object.assign(stage.style,{width:'960px',height:'540px'});await c.setSettings({performance:{preset:'custom',overrides:{textureBudgetMiB:1}},layered:true});await settle(c);check(c.status.activeBackend==='solid','Budget fallback failed');
    // Reasserting the same requested backend while blocked re-evaluates policy.
    Object.assign(stage.style,{width:'320px',height:'180px'});await c.setSettings({backend,layered:false});await settle(c);check(c.status.activeBackend===backend,'Same-backend budget recovery failed');
   }
   e.rows.push({backend,case:'atomic-and-recovery',passed:true});
  }finally{offs.forEach(off=>off());c.render();const r=c.renderer;c.dispose();e.cleanup.push({backend,surfaces:c.surfaces.size,listeners:c.listeners.size,canvases:stage.querySelectorAll('canvas').length,radii:r.imagePass?.items.size??0,buffers:r.buffers?.size??0});stage.remove();}
 }
 }catch(error){e.errors.push(error.stack);}
 e.passed=e.frames===1350&&!e.errors.length&&e.cleanup.every(r=>!r.surfaces&&!r.listeners&&!r.canvases&&!r.radii&&!r.buffers);output.value=JSON.stringify(e,null,2);status.textContent=`Stability complete: ${e.passed}; ${e.frames} frames`;buttons.forEach(b=>b.disabled=false);
};
