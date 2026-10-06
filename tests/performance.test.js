import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePerformance,resolvePerformance,textureInventory}from '../src/performance.js';
import {settingPatch}from '../src/settings.js';import {parsePreset,createPreset,serializePreset}from '../src/preset.js';
const settings={quality:'high',controls:{},layered:true};
test('profiles preserve requested materials and enforce explicit approximations',()=>{
 const request=normalizePerformance({preset:'economy'}),raw={...settings,performance:request};
 const plan=resolvePerformance(raw,960,540,2,['card','control','panel']);
 assert.equal(plan.dpr,1);assert.equal(plan.layered,false);assert.deepEqual(plan.blurRadii,[9]);
 assert.equal(plan.controlsByKind.card.dispersion,0);assert.deepEqual(raw.controls,{});assert.equal(raw.layered,true);
 const exact=resolvePerformance({...raw,performance:normalizePerformance({preset:'custom',overrides:{maxBlurRadii:1}})},320,180,2,['card','control','panel']);
 assert.deepEqual(exact.blurRadii,[9,3,20]);assert.ok(exact.adjustmentReasons.includes('blur-radius-limit-unmet'));
 assert.equal(exact.budgetExceeded,true);
 const restored=resolvePerformance(settings,320,180,2,['card']);assert.equal(restored.preset,'legacy');assert.equal(restored.dpr,2);assert.equal(restored.layered,true);
});
test('texture inventory counts actual odd dimensions, shared radii and layered allocations',()=>{
 const small=textureInventory(37,29,1,[3,3],true);assert.equal(small.bytes,37*29*4*5);assert.equal(small.chains.length,1);
 const chain=textureInventory(37,29,1,[18]);assert.equal(chain.chains[0].levels,3);assert.deepEqual([chain.chains[0].width,chain.chains[0].height],[5,4]);
 assert.equal(chain.bytes,4*(37*29+19*15+10*8+5*4+2*5*4));
 assert.throws(()=>textureInventory(NaN,29,1));assert.throws(()=>textureInventory(1,2,1,[-1]));
});
test('budget planning reduces DPR before allocation and reports impossible fits',()=>{
 const raw={...settings,performance:normalizePerformance({preset:'custom',overrides:{textureBudgetMiB:1}})};
 const blocked=resolvePerformance(raw,960,540,2,['card','control','panel']);assert.equal(blocked.dpr,.5);assert.equal(blocked.budgetExceeded,true);
 const fitted=resolvePerformance({...raw,layered:false},320,180,2,['card','control','panel']);assert.equal(fitted.budgetExceeded,false);assert.ok(fitted.estimatedTextureBytes<=2**20);
 const dimension=resolvePerformance({...raw,layered:false},320,180,2,['card'],'webgpu',256);assert.ok(dimension.sourceWidth<=256);
 assert.equal(resolvePerformance(raw,960,540,2,['card'],'solid').estimatedTextureBytes,0);
 assert.equal(resolvePerformance({...raw,performance:normalizePerformance({preset:'custom',overrides:{maxBlurRadii:1}})},960,540,2,['card','control','panel'],'css',1).budgetExceeded,false);
});
test('invalid performance settings reject atomically and portable v1 restores legacy',()=>{
 for(const value of [{preset:'bogus'},{preset:'custom',adaptive:true},{preset:'custom',overrides:{dprCap:NaN}},{preset:'custom',overrides:{maxBlurRadii:1.5}},{preset:'full',overrides:null}])assert.throws(()=>settingPatch({performance:value}));
 const p=createPreset('Budget',{performance:{preset:'economy',overrides:{textureBudgetMiB:12}}});assert.equal(p.version,2);assert.deepEqual(parsePreset(serializePreset(p)),p);
 const old=parsePreset({schema:'workspace-liquid-glass',version:1,name:'Old',settings:{controls:{blurPx:5},performance:{preset:'minimal'}}});assert.equal(old.settings.performance,null);assert.equal(old.settings.controls.blurPx,5);
 assert.deepEqual(settingPatch({performance:null}),{performance:null});
 for(const settings of [null,[],true,'invalid'])assert.throws(()=>parsePreset({schema:'workspace-liquid-glass',version:1,name:'Old',settings}));
});
