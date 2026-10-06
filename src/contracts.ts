export type Backend = "auto" | "webgpu" | "webgl" | "svg" | "css" | "solid";
export type Capture = "scene" | "native-dom";
export type SurfaceKind = "card" | "control" | "panel";
export interface Controls {
  blur?: number;
  refraction?: number;
  highlight?: number;
  tint?: number;
  distance?: number;
  thickness?: number;
  ior?: number;
  dispersion?: number;
  blurPx?: number;
  tintOpacity?: number;
  fresnelRange?: number;
  fresnelHardness?: number;
  fresnelFactor?: number;
  glareRange?: number;
  glareHardness?: number;
  glareFactor?: number;
  glareAngle?: number;
  glareConvergence?: number;
  glareOpposite?: number;
  radius?: number;
  roundness?: number;
  shadowOpacity?: number;
  shadowBlur?: number;
  shadowY?: number;
  blurEdge?: boolean;
  tintColor?: "auto" | `#${string}`;
}
export interface Settings {
  performance?: PerformanceOptions | null;
  backend?: Backend;
  capture?: Capture;
  theme?: "dark" | "light";
  background?: "grid" | "gradient" | "checker" | "testchart" | "image";
  quality?: "low" | "medium" | "high";
  enabled?: boolean;
  layered?: boolean;
  controls?: Controls;
}
export interface State {
  performance: PerformanceState | null;
  sceneReason?: string | null;
  geometryMode?: "dom" | "provided";
  geometryReason?: string | null;
  requestedBackend: Backend;
  activeBackend: Exclude<Backend, "auto"> | null;
  activeCapture: Capture;
  nativeSupported: boolean;
  phase: "initializing" | "ready" | "failed";
  fallbackReason: string | null;
  captureReason?: string | null;
  imageReason?: string | null;
  animating: boolean;
  reducedMotion: boolean;
  capabilities: Record<Exclude<Backend, "auto">, boolean | null>;
  settings: Settings;
  draws: number;
  cpuMs: number;
}
export type PerformancePreset = 'minimal' | 'economy' | 'balanced' | 'full' | 'custom';
export interface PerformanceOverrides {
  dprCap?: number;
  textureBudgetMiB?: number;
  maxBlurRadii?: number;
  animationHz?: number;
  dispersion?: 'off' | 'preserve';
  layered?: boolean;
}
export interface PerformanceOptions {
  preset: PerformancePreset;
  fidelity?: 'preserve' | 'approximate';
  overrides?: PerformanceOverrides;
  adaptive?: false;
}
export interface PerformanceState {
  preset: PerformancePreset | 'legacy';
  requested: PerformanceOptions | null;
  dpr: number;
  blurKernel: 'dense25';
  animationHz: number;
  layered: boolean;
  sourceWidth: number;
  sourceHeight: number;
  estimatedTextureBytes: number;
  requiredTextureBytes?: number;
  textureBudgetBytes: number | null;
  blurRadii: number[];
  adjustmentReasons: string[];
  budgetExceeded: boolean;
  controlsByKind: Record<string, Controls>;
}
export interface SurfaceOptions {
  id?: string;
  kind?: SurfaceKind;
  radius?: number;
  zIndex?: number;
}
export interface GeometryFrame {
  width: number;
  height: number;
  surfaces: ReadonlyMap<string, { x: number; y: number; w: number; h: number; scale?: number }>;
}
export interface Material {
  blur: number;
  thickness: number;
  refraction: number;
  dispersion: number;
  highlight: number;
  tint: number;
}
export interface Preset {
  schema: "workspace-liquid-glass";
  version: 2;
  name: string;
  settings: Settings;
}
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

export type ControllerSettings=Required<Omit<Settings,'performance'>>&{performance:NormalizedPerformance|null};
export type GeometryProvider=()=>GeometryFrame|null;
export type ScenePainter=(context:CanvasRenderingContext2D,frame:{width:number;height:number;dpr:number;settings:Settings;phase:number})=>void;
export interface SceneTexture {canvas:HTMLCanvasElement;version:number}
export interface RegisteredSurface {id:string;element:HTMLElement;kind:SurfaceKind;radius:number;zIndex:number}
export interface RenderSurface extends RegisteredSurface {bounds:SurfaceBounds;cssRadius?:number}
export interface Renderer {maxTextureDimension?:number;render(scene:SceneTexture,surfaces:RenderSurface[],settings:ControllerSettings&EffectiveSettings,dpr:number):void;dispose():void;lose?:()=>void}
export type FailureCallback=(reason:string)=>void;
export interface UniformLayout {size:number;block:string;fields:Record<string,{offset:number;count:number;kind:string}>}
export interface BlurItem<T,L> {w:number;h:number;dpr:number;pyramid:L[];a:T;b:T;signature?:string}
