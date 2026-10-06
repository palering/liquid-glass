import test from 'node:test';
import assert from 'node:assert/strict';
import * as config from '../src/config.js';
import * as policy from '../src/policy.js';
import * as settings from '../src/settings.js';
import * as preset from '../src/preset.js';
import * as performance from '../src/performance.js';
import * as geometry from '../src/geometry.js';
import * as oldConfig from '../.local/ts-baseline/src/config.js';
import * as oldPolicy from '../.local/ts-baseline/src/policy.js';
import * as oldSettings from '../.local/ts-baseline/src/settings.js';
import * as oldPreset from '../.local/ts-baseline/src/preset.js';
import * as oldPerformance from '../.local/ts-baseline/src/performance.js';
import * as oldGeometry from '../.local/ts-baseline/src/geometry.js';
// This is a language-migration gate against an immutable implementation,
// including error messages, undefined/NaN and property order in portable JSON.
function outcome(fn,args){try{return{value:fn(...args)};}catch(error){return{error:{name:error.name,message:error.message}};}}
function same(current,previous,args){assert.deepEqual(outcome(current,args),outcome(previous,args));}
test('TS pure functions preserve the frozen JS values, normalization and errors',()=>{
 assert.deepEqual(config.opticalFields,oldConfig.opticalFields);
 assert.deepEqual(config.looks,oldConfig.looks);
 assert.deepEqual(policy.presets,oldPolicy.presets);
 assert.deepEqual(performance.performanceProfiles,oldPerformance.performanceProfiles);
 for(const x of [-1,0,.125,.5,.999,1,2,NaN,Infinity])same(config.clarityControls,oldConfig.clarityControls,[x]);
 for(const x of [undefined,null,false,[],0,{}, {backend:'invalid'}, {capture:'auto'}, {controls:null},
  {controls:{distance:NaN}}, {controls:{blurPx:100,thickness:0,roundness:99,tintColor:'#ABCDEF'}},
  {enabled:'yes'}, {performance:{preset:'custom',adaptive:true}}, {performance:{preset:'economy'}},
  {controls:{unknown:4,__proto__:{glareFactor:.8}}}]){
  same(settings.settingPatch,oldSettings.settingPatch,[x]);same(preset.normalizeSettings,oldPreset.normalizeSettings,[x]);
 }
 for(const field of config.opticalFields)for(const value of [field[2]-1,field[2],field[3],field[3]+1,NaN,Infinity,'1']){
  same(settings.settingPatch,oldSettings.settingPatch,[{controls:{[field[0]]:value}}]);
  same(preset.normalizeSettings,oldPreset.normalizeSettings,[{controls:{[field[0]]:value}}]);
 }
 for(const backend of ['auto',...policy.BACKENDS,'invalid'])same(policy.candidates,oldPolicy.candidates,[backend,new Set(['webgl'])]);
 for(const capture of ['auto','scene','native-dom','invalid'])for(const supported of [true,false])same(policy.resolveCapture,oldPolicy.resolveCapture,[capture,supported]);
 for(const raw of [null,'bad json','x'.repeat(64001),{}, {schema:'workspace-liquid-glass',version:1,name:'Old',settings:{controls:{blurPx:5},performance:{preset:'minimal'}}},
  {schema:'workspace-liquid-glass',version:2,name:'New',settings:{performance:{preset:'economy'}}}]){
  same(preset.parsePreset,oldPreset.parsePreset,[raw]);same(preset.serializePreset,oldPreset.serializePreset,[raw]);
 }
 for(const name of ['', ' x ', 'x'.repeat(81),null])same(preset.createPreset,oldPreset.createPreset,[name,{}]);
 for(const x of [null,{width:1,height:1,surfaces:new Map()}, {width:1,height:1,surfaces:new Map([['a',{x:0,y:0,w:1,h:1}]])},
  {width:1,height:1,surfaces:new Map([['a',{x:NaN,y:0,w:1,h:1}]])}])same(geometry.validateGeometry,oldGeometry.validateGeometry,[x,[{id:'a'}]]);
 // Keep accessor reads and thrown exceptions unchanged at untrusted boundaries.
 for(const throwAt of [0,2,8]){
  const run=fn=>{let reads=0;const input={preset:'custom',get overrides(){reads++;if(reads===throwAt)throw new Error('getter failed');return{dprCap:1+reads/100,layered:true};}};return{result:outcome(fn,[input]),reads};};
  assert.deepEqual(run(performance.normalizePerformance),run(oldPerformance.normalizePerformance));
 }
});
test('TS budgets, uniforms and portable JSON remain exact across fixed boundary combinations',()=>{
 for(const request of [null,...Object.keys(performance.performanceProfiles).map(preset=>({preset})),
  {preset:'custom',overrides:{maxBlurRadii:1,textureBudgetMiB:1}}, {preset:'custom',fidelity:'approximate',overrides:{maxBlurRadii:2}}]){
  const normalized=performance.normalizePerformance(request);same(performance.normalizePerformance,oldPerformance.normalizePerformance,[request]);
  for(const dimensions of [[1,1],[37,29],[320,180],[960,540]])for(const dpr of [.5,1,1.5,2,3])for(const kinds of [[],['card'],['card','control','panel']])for(const backend of policy.BACKENDS){
   const input={quality:'high',layered:true,controls:{},performance:normalized};
   same(performance.resolvePerformance,oldPerformance.resolvePerformance,[input,...dimensions,dpr,kinds,backend,512]);
  }
  const raw={performance:request,controls:{glareFactor:0,fresnelFactor:0,tintColor:'#abcdef'}};
  assert.equal(preset.serializePreset(preset.createPreset('Exact',raw)),oldPreset.serializePreset(oldPreset.createPreset('Exact',raw)));
 }
 for(const kind of ['card','control','panel'])for(const theme of ['dark','light'])for(const controls of [undefined,{},...Object.values(config.looks),{glareFactor:0,fresnelFactor:0,blurPx:0}])for(const scale of [undefined,.2,1,2]){
  same(policy.surfaceUniforms,oldPolicy.surfaceUniforms,[{x:13,y:-7,w:117,h:49,radius:20,scale},960,540,2,kind,controls,theme]);
 }
 for(const dims of [[1,1],[37,29],[320,180]])for(const radius of [0,.5,3,3.01,18,35])for(const dpr of [1,2])same(performance.textureInventory,oldPerformance.textureInventory,[...dims,dpr,[radius,radius],true]);
});
