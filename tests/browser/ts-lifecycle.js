import {GlassController} from '../../src/controller.js';
const raf=()=>new Promise(requestAnimationFrame);
const check=(value,message)=>{if(!value)throw Error(message);};
document.querySelector('#run').onclick=async()=>{
 const output=document.querySelector('textarea'),status=document.querySelector('[role=status]'),button=document.querySelector('#run'),host=document.querySelector('#host');button.disabled=true;
 const e={source:(await(await fetch('/benchmark-source.json')).json()).sourceSha256,userAgent:navigator.userAgent,rows:[],cleanup:[],errors:[]};
 const devices=new Set(),destroyed=new Set(),original=GPUAdapter.prototype.requestDevice;
 // Instrument only devices acquired during this fixture; restore the global method.
 GPUAdapter.prototype.requestDevice=async function(...args){const device=await original.apply(this,args),destroy=device.destroy;devices.add(device);device.destroy=function(){destroyed.add(device);return destroy.call(this);};return device;};
 const controllers=[];
 function make(backend='solid'){
  const stage=document.createElement('div');stage.className='lg-stage';host.append(stage);const c=new GlassController(stage,{backend,background:'testchart'});controllers.push(c);return c;
 }
 async function settled(c){await c.ready;await raf();await raf();c.render();}
 try{
  const cancelled=make('webgpu');cancelled.dispose();await cancelled.ready;check(cancelled.stage.querySelectorAll('canvas').length===0,'Disposed initialization appended a canvas');e.rows.push({case:'dispose-during-webgpu-init',passed:true});
  const racing=make('webgpu'),initial=racing.ready;
  const middle=racing.setSettings({backend:'webgl'}),last=racing.setSettings({backend:'solid'});
  await Promise.all([initial,middle,last]);await settled(racing);check(racing.getState().activeBackend==='solid'&&racing.stage.querySelectorAll('.lg-gpu').length===0,'Stale backend won initialization');e.rows.push({case:'overlapping-backend-init',passed:true});
  const c=make();await settled(c);
  const image=document.createElement('canvas');image.width=image.height=2;image.getContext('2d').fillRect(0,0,2,2);
  const pending=c.setImage(image.toDataURL());await c.setSettings({background:'checker'});check(await pending===false&&c.getState().settings.background==='checker','Stale image request replaced explicit background');e.rows.push({case:'cancel-image-request',passed:true});
  const card=document.createElement('div');card.innerHTML='<div class="lg-content"><input value="retained"></div>';Object.assign(card.style,{position:'absolute',width:'100px',height:'80px'});c.stage.append(card);const off=c.register(card,{id:'card'}),input=card.querySelector('input');input.focus();
  c.setScenePainter(()=>{throw Error('fixture painter failure');});c.render();check(c.getState().activeBackend==='solid'&&c.getState().sceneReason==='fixture painter failure'&&document.activeElement===input,'Scene failure escaped source boundary');c.setScenePainter(null);c.render();check(c.getState().sceneReason===null,'Scene painter failed to recover');e.rows.push({case:'scene-callback-isolation-and-recovery',passed:true});
  c.setGeometryProvider(()=>{throw Error('fixture geometry failure');});c.render();check(c.getState().geometryMode==='dom'&&c.getState().geometryReason==='fixture geometry failure'&&c.getState().activeBackend==='solid','Geometry callback escaped boundary');c.setGeometryProvider(null);e.rows.push({case:'geometry-callback-isolation',passed:true});
  const before=JSON.stringify(c.getState().settings);let rejected=false;try{await c.setSettings({controls:{ior:NaN},backend:'webgpu'});}catch{rejected=true;}check(rejected&&JSON.stringify(c.getState().settings)===before,'Invalid patch was not atomic');e.rows.push({case:'invalid-patch-atomic',passed:true});
  await c.setSettings({capture:'native-dom'});check(c.getState().activeCapture==='scene'&&c.getState().captureReason&&c.getState().activeBackend==='solid','Unavailable native capture changed backend');e.rows.push({case:'unavailable-native-capture',passed:true});
  const unsubscribe=c.subscribe(()=>{});check(unsubscribe()===true&&unsubscribe()===false,'Unsubscribe lost the frozen boolean return');off();c.dispose();c.dispose();e.rows.push({case:'unsubscribe-return-and-idempotent-dispose',passed:true});
 }catch(error){e.errors.push(String(error.stack??error));}
 finally{
  for(const c of controllers){c.dispose();await c.ready;e.cleanup.push({surfaces:c.surfaces.size,listeners:c.listeners.size,canvases:c.stage.querySelectorAll('canvas').length});c.stage.remove();}
  GPUAdapter.prototype.requestDevice=original;
 }
 e.devicesCreated=devices.size;e.devicesDestroyed=destroyed.size;e.passed=e.rows.length===8&&!e.errors.length&&e.cleanup.every(r=>!r.surfaces&&!r.listeners&&!r.canvases)&&devices.size===destroyed.size;
 output.value=JSON.stringify(e,null,2);status.textContent=`Lifecycle complete: ${e.passed}; ${e.rows.length} cases; ${devices.size}/${destroyed.size} GPU devices`;button.disabled=false;
};
