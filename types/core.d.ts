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
export const performanceProfiles: Readonly<Record<PerformancePreset, Readonly<Required<PerformanceOverrides>>>>;
export function textureInventory(width:number,height:number,dpr:number,radii?:number[],layered?:boolean):{
  width:number;height:number;bytes:number;
  chains:{radius:number;width:number;height:number;levels:number;bytes:number;passes:number}[];
};
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
export class GlassController {
  constructor(stage: HTMLElement, options?: Settings);
  readonly stage: HTMLElement;
  readonly ready: Promise<void>;
  readonly settings: Settings;
  register(element: HTMLElement, options?: SurfaceOptions): () => void;
  subscribe(fn: (state: State) => void): () => void;
  getState(): State;
  setSettings(patch: Settings): Promise<void>;
  setImage(url: string | null): Promise<boolean>;
  setAnimation(enabled: boolean): void;
  invalidate(): void;
  invalidateScene(): void;
  setGeometryProvider(provider?: (() => GeometryFrame | null) | null): void;
  setScenePainter(painter?: ((context: CanvasRenderingContext2D, frame: {width:number; height:number; dpr:number; settings:Settings; phase:number}) => void) | null): void;
  render(): void;
  retry(): Promise<void>;
  simulateLoss(): void;
  dispose(): void;
}
export interface Material {
  blur: number;
  thickness: number;
  refraction: number;
  dispersion: number;
  highlight: number;
  tint: number;
}
export const presets: Record<SurfaceKind, Material>;
export function material(kind: SurfaceKind, controls?: Controls): Material;
export function candidates(
  requested: Backend,
  blocked?: Set<string>,
): Exclude<Backend, "auto">[];
export function nativeCapability(): boolean;
export const looks: Record<
  "studio" | "clear" | "frosted" | "subtle" | "regular" | "tinted" | "reading",
  Controls
>;
export const opticalFields: [
  keyof Controls,
  string,
  number,
  number,
  number,
  number,
  string,
  string,
][];
export function clarityControls(amount: number): Controls;
export const PRESET_VERSION: 2;
export interface Preset {
  schema: "workspace-liquid-glass";
  version: 2;
  name: string;
  settings: Settings;
}
export function normalizeSettings(input?: unknown): Settings;
export function createPreset(name: string, settings: Settings): Preset;
export function parsePreset(raw: string | unknown): Preset;
export function serializePreset(preset: Preset): string;
