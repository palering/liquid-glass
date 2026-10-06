import type {Controls,NumericControlKey,SettingsPatch} from './contracts.js';
import {opticalFields} from './config.js';
import {normalizePerformance} from './performance.js';
const enums: Record<string,readonly unknown[]>={
 backend:['auto','webgpu','webgl','svg','css','solid'],capture:['scene','native-dom','auto'],
 theme:['dark','light'],background:['grid','gradient','checker','testchart','image'],quality:['high','medium','low'],
};
const ranges=new Map<NumericControlKey,[number,number]>(opticalFields.map(([key,,min,max])=>[key,[min,max]]));
// Preserve the controller's existing half-pixel thickness floor and legacy
// relative controls. Partial patches never insert Studio's absolute defaults.
ranges.set('thickness',[.5,65]);
for(const key of ['blur','refraction','highlight'] as const)ranges.set(key,[0,4]);
ranges.set('tint',[-1,1]);
function object(value: unknown,label: string): asserts value is Record<string,unknown> {if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);}
export function settingPatch(input: unknown={}): SettingsPatch{
 object(input,'settings');const result: Record<string,unknown>={};
 if(input.performance!==undefined)result.performance=normalizePerformance(input.performance);
 for(const [key,values]of Object.entries(enums))if(input[key]!==undefined){if(!values.includes(input[key]))throw new TypeError(`Invalid ${key}`);result[key]=input[key];}
 for(const key of ['enabled','layered'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw new TypeError(`${key} must be boolean`);result[key]=input[key];}
 if(input.controls!==undefined){object(input.controls,'controls');const controls: Controls={};
  for(const [key,[min,max]]of ranges){const value=input.controls[key];if(value===undefined)continue;if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${key} must be finite`);controls[key]=Math.max(min,Math.min(max,value));}
  if(input.controls.blurEdge!==undefined){if(typeof input.controls.blurEdge!=='boolean')throw new TypeError('blurEdge must be boolean');controls.blurEdge=input.controls.blurEdge;}
  if(input.controls.tintColor!==undefined){const color=input.controls.tintColor;if(typeof color!=='string'||(color!=='auto'&&!/^#[0-9a-f]{6}$/i.test(color)))throw new TypeError('Invalid tintColor');controls.tintColor=color.toLowerCase() as Controls["tintColor"];}
  result.controls=controls;
 }
 return result as SettingsPatch;
}
