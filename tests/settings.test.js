import test from 'node:test';import assert from 'node:assert/strict';
import {settingPatch}from '../src/settings.js';import {material}from '../src/policy.js';import {GlassController}from '../src/controller.js';
test('partial controller settings preserve per-kind defaults and unrelated controls',()=>{
 const patch=settingPatch({controls:{glareAngle:0}});assert.deepEqual(patch,{controls:{glareAngle:0}});assert.equal(material('panel',patch.controls).blur,20);assert.equal(material('card',patch.controls).thickness,18);
 const previous={blur:2,distance:.04};const merged={...previous,...settingPatch({controls:{glareAngle:90}}).controls};assert.equal(merged.blur,2);assert.equal(merged.distance,.04);
});
test('invalid controller input rejects before DOM mutation and before replacing existing settings',async()=>{
 let writes=0;const stage={prepend(){writes++;}};assert.throws(()=>new GlassController(stage,{backend:'bogus'}),TypeError);assert.equal(writes,0);
 const existing={backend:'webgpu',controls:{distance:.075}};const c={disposed:false,settings:existing,imageGeneration:4};await assert.rejects(GlassController.prototype.setSettings.call(c,{background:'grid',controls:{distance:NaN}}),TypeError);assert.strictEqual(c.settings,existing);assert.equal(c.imageGeneration,4);
 for(const value of [NaN,Infinity,-Infinity,'20'])assert.throws(()=>settingPatch({controls:{blurPx:value}}),TypeError);
});
test('controller optical bounds produce finite values and preserve legacy aliases',()=>{
 const controls=settingPatch({controls:{thickness:0,fresnelRange:-3,roundness:99,blur:9,tintColor:'#ABCDEF',unknown:4}}).controls;assert.deepEqual(controls,{thickness:.5,fresnelRange:1,roundness:8,blur:4,tintColor:'#abcdef'});assert.deepEqual(settingPatch({capture:'auto'}),{capture:'auto'});assert.throws(()=>settingPatch({controls:null}),TypeError);
});
