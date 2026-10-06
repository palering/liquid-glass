// Stage-one internal contracts. Public package declarations remain stable until
// implementation-driven declaration generation is introduced in a later stage.
import type {Backend,Capture,Controls,GeometryFrame,Material,PerformanceOptions,PerformanceOverrides,PerformancePreset,PerformanceState,Settings,SurfaceKind} from '../types/core.js';
export type {Backend,Controls,GeometryFrame,Material,PerformanceOverrides,PerformancePreset,PerformanceState,Settings,SurfaceKind};
export type ActiveBackend=Exclude<Backend,'auto'>;
export type CaptureRequest=Capture|'auto';
export type OpticalKey=Exclude<keyof Controls,'blur'|'refraction'|'highlight'|'tint'|'blurEdge'|'tintColor'>;
export type NumericControlKey=OpticalKey|'blur'|'refraction'|'highlight'|'tint';
export type OpticalField=[OpticalKey,string,number,number,number,number,string,string];
export type OpticalControls=Required<Pick<Controls,OpticalKey|'blurEdge'|'tintColor'>>;
export type LookName='studio'|'clear'|'frosted'|'subtle'|'regular'|'tinted'|'reading';
export interface NormalizedPerformance extends PerformanceOptions {
 fidelity:'preserve'|'approximate';overrides:PerformanceOverrides;adaptive:false;
}
export type SettingsPatch=Omit<Settings,'capture'|'performance'>&{capture?:CaptureRequest;performance?:NormalizedPerformance|null};
export type PortableSettings=Required<Omit<Settings,'controls'|'performance'>>&{controls:OpticalControls;performance:NormalizedPerformance|null};
export type PlanningSettings=Omit<Settings,'capture'|'performance'>&{capture?:CaptureRequest;performance?:NormalizedPerformance|null};
export interface EffectiveSettings extends PlanningSettings {controlsByKind?:Record<string,Controls>}
export interface SurfaceBounds {x:number;y:number;w:number;h:number;radius:number;scale?:number}
export interface TextureChain {radius:number;width:number;height:number;levels:number;bytes:number;passes:number}
export interface TextureInventory {width:number;height:number;bytes:number;chains:TextureChain[]}
export type OpticalUniforms=ReturnType<typeof import('./policy.js').surfaceUniforms>;
