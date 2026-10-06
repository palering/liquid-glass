import {settingPatch} from '../src/settings.js';
import {resolvePerformance} from '../src/performance.js';
import {surfaceUniforms} from '../src/policy.js';
import {looks,opticalFields} from '../src/config.js';
import {validateGeometry} from '../src/geometry.js';
import {normalizeSettings,createPreset} from '../src/preset.js';
import type {Controls,GeometryFrame,PlanningSettings} from '../src/contracts.js';
const controls: Controls=looks.clear;
const patch=settingPatch({controls:{glareFactor:0},performance:{preset:'balanced'}});
const settings: PlanningSettings={controls,...patch};
const plan=resolvePerformance(settings,960,540,2,['card','control']);
const uniforms=surfaceUniforms({x:0,y:0,w:100,h:100,radius:20},960,540,2,'card',controls,'light');
const parsed=normalizeSettings(createPreset('typed',settings).settings);
const frame: unknown={width:100,height:100,surfaces:new Map()};
if(validateGeometry(frame,[])){const valid: GeometryFrame=frame;valid.surfaces.get('card');}
opticalFields[0][2].toFixed(2);
plan.dpr.toFixed(1);uniforms.u_refThickness.toFixed(1);parsed.controls.distance.toFixed(3);
// @ts-expect-error Kind remains a closed rendering contract.
resolvePerformance(settings,960,540,2,['unknown']);
// @ts-expect-error Optical uniforms require numeric bounds.
surfaceUniforms({x:0,y:0,w:'100',h:100,radius:20},960,540,2,'card',controls,'light');
