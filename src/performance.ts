import type {ActiveBackend,Controls,NormalizedPerformance,PerformanceOverrides,PerformancePreset,PerformanceState,PlanningSettings,SurfaceKind,TextureInventory} from './contracts.js';
import {material} from './policy.js';

// First release uses validated dense25 optics. Approximate kernels and automatic
// calibration remain experiments; a profile never selects them implicitly.
export const performanceProfiles = Object.freeze(Object.fromEntries(Object.entries({
 minimal: {dprCap:1,textureBudgetMiB:32,maxBlurRadii:1,animationHz:30,dispersion:'off',layered:false},
 economy: {dprCap:1,textureBudgetMiB:32,maxBlurRadii:1,animationHz:30,dispersion:'off',layered:false},
 balanced:{dprCap:1.5,textureBudgetMiB:64,maxBlurRadii:3,animationHz:60,dispersion:'preserve',layered:true},
 full:{dprCap:2,textureBudgetMiB:128,maxBlurRadii:3,animationHz:60,dispersion:'preserve',layered:true},
 custom:{dprCap:2,textureBudgetMiB:64,maxBlurRadii:3,animationHz:60,dispersion:'preserve',layered:true},
}).map(([key,value])=>[key,Object.freeze(value)]))) as Readonly<Record<PerformancePreset,Readonly<Required<PerformanceOverrides>>>>;

export function normalizePerformance(value: unknown): NormalizedPerformance | null{
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('performance must be an object or null');
 const request=value as Record<string,unknown>;
 if(!Object.hasOwn(performanceProfiles,request.preset as PropertyKey))throw new TypeError('Invalid performance preset');
 if(request.adaptive!==undefined&&request.adaptive!==false)throw new TypeError('Adaptive performance is not supported');
 const fidelity=request?.fidelity??(request.preset==='economy'||request.preset==='minimal'?'approximate':'preserve');
 if(!['preserve','approximate'].includes(fidelity as string))throw new TypeError('Invalid performance fidelity');
 const overrides: PerformanceOverrides={};
 if(request.overrides!==undefined){
  if(!request.overrides||typeof request.overrides!=='object'||Array.isArray(request.overrides))throw new TypeError('Invalid performance overrides');
  for(const [key,[min,max]]of Object.entries({dprCap:[.5,2],textureBudgetMiB:[1,512],maxBlurRadii:[1,3],animationHz:[15,60]})){
   const n=(request.overrides as Record<string,unknown>)[key];if(n===undefined)continue;
   if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(key==='maxBlurRadii'&&!Number.isInteger(n)))throw new TypeError(`Invalid performance ${key}`);
   overrides[key as "dprCap" | "textureBudgetMiB" | "maxBlurRadii" | "animationHz"]=n;
  }
  if((request.overrides as Record<string,unknown>).dispersion!==undefined){if(!['off','preserve'].includes((request.overrides as Record<string,unknown>).dispersion as string))throw new TypeError('Invalid performance dispersion');overrides.dispersion=(request.overrides as Record<string,unknown>).dispersion as "off" | "preserve";}
  if((request.overrides as Record<string,unknown>).layered!==undefined){if(typeof (request.overrides as Record<string,unknown>).layered!=='boolean')throw new TypeError('Invalid performance layered');overrides.layered=(request.overrides as Record<string,unknown>).layered as boolean;}
 }
 return{preset:request.preset as PerformancePreset,fidelity:fidelity as "preserve" | "approximate",overrides,adaptive:false};
}

export function textureInventory(width: number,height: number,dpr: number,radii: number[]=[],layered=false): TextureInventory{
 if(![width,height,dpr].every(Number.isFinite)||width<0||height<0||dpr<=0)throw new TypeError('Invalid texture dimensions');
 const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr)),chains=[];
 for(const radius of new Set(radii)){
  if(!Number.isFinite(radius)||radius<0)throw new TypeError('Invalid blur radius');if(!radius)continue;
  let tw=w,th=h,scale=1,texels=0,levels=0;
  while(radius*dpr/scale>3&&tw>2&&th>2){tw=Math.ceil(tw/2);th=Math.ceil(th/2);scale*=2;texels+=tw*th;levels++;}
  texels+=2*tw*th;chains.push({radius,width:tw,height:th,levels,bytes:texels*4,passes:levels+2});
 }
 const bytes=4*w*h+(layered?8*w*h:0)+chains.reduce((sum,c)=>sum+c.bytes,0);
 return{width:w,height:h,bytes,chains};
}

export function resolvePerformance(settings: PlanningSettings,width: number,height: number,deviceDpr: number,kinds: SurfaceKind[]=[],backend: ActiveBackend='webgpu',maxDimension=Infinity): PerformanceState{
 const request=settings.performance??null,profile=request?{...performanceProfiles[request.preset],...request.overrides}:null;
 const controlsByKind: Record<string,Controls>=Object.create(null),reasons: string[]=[],activeKinds=[...new Set(kinds)];
 const radii=activeKinds.map(kind=>material(kind,settings.controls).blur);
 let selected=[...new Set(radii.filter(r=>r>0))].sort((a,b)=>a-b);
 if(profile&&selected.length>profile.maxBlurRadii){
  if(request?.fidelity==='approximate'){
   const original=selected;selected=Array.from({length:profile.maxBlurRadii},(_,i)=>original[Math.floor((i+.5)*original.length/profile.maxBlurRadii)]);
   reasons.push('blur-radius-consolidation');
  }else reasons.push('blur-radius-limit-unmet');
 }
 for(const kind of activeKinds){
  const c={...settings.controls},radius=material(kind,c).blur;
  if(profile?.dispersion==='off')c.dispersion=0;
  if(profile&&request?.fidelity==='approximate'&&radius>0)c.blurPx=selected.reduce((best,r)=>Math.abs(r-radius)<Math.abs(best-radius)?r:best,selected[0]);
  controlsByKind[kind]=c;
 }
 if(profile?.dispersion==='off')reasons.push('dispersion-disabled');
 const layered=Boolean(settings.layered&&(!profile||profile.layered));
 if(settings.layered&&!layered)reasons.push('layered-disabled');
 const legacyCap={low:1,medium:1.5,high:2}[settings.quality??'high'];
 let dpr=Math.min(deviceDpr||1,profile?.dprCap??legacyCap),inventory: TextureInventory | undefined;
 const gpu=['webgpu','webgl'].includes(backend)&&request?.preset!=='minimal';
 const effectiveRadii=activeKinds.map(kind=>material(kind,controlsByKind[kind]).blur);
 const budget=profile?profile.textureBudgetMiB*2**20:Infinity;
 const fits=()=>{inventory=textureInventory(width,height,dpr,effectiveRadii,layered&&activeKinds.length>0);return !gpu||(inventory.width<=maxDimension&&inventory.height<=maxDimension&&inventory.bytes<=budget);};
 if(profile&&gpu){
  const initial=dpr;for(const lower of [1.75,1.5,1.25,1,.75,.5]){if(fits())break;if(lower<dpr)dpr=lower;}
  if(dpr!==initial)reasons.push('dpr-budget-reduction');
 }
 const texturesFit=fits();
 const budgetExceeded=!texturesFit||Boolean(gpu&&profile&&new Set(effectiveRadii.filter(r=>r>0)).size>profile.maxBlurRadii);
 if(!texturesFit)reasons.push('texture-budget-exceeded');
 if(request?.preset==='minimal')reasons.push('minimal-solid');
 return{dpr,controlsByKind,layered,requested:request,preset:request?.preset??'legacy',blurKernel:'dense25',animationHz:profile?.animationHz??60,estimatedTextureBytes:gpu?(inventory as TextureInventory).bytes:0,sourceWidth:(inventory as TextureInventory).width,sourceHeight:(inventory as TextureInventory).height,textureBudgetBytes:profile?budget:null,blurRadii:[...new Set(effectiveRadii.filter(r=>r>0))],adjustmentReasons:reasons,budgetExceeded};
}
