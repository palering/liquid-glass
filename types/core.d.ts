// Generated from src by npm run types:generate. Do not edit.
declare function candidates(requested: Backend, blocked?: Set<string>): ActiveBackend[];
declare const presets: Record<SurfaceKind, Material>;
declare function material(kind: SurfaceKind, controls?: Controls): Material;

type Backend = "auto" | "webgpu" | "webgl" | "svg" | "css" | "solid";
type Capture = "scene" | "native-dom";
type SurfaceKind = "card" | "control" | "panel";
interface Controls {
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
interface Settings {
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
interface State {
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
type PerformancePreset = 'minimal' | 'economy' | 'balanced' | 'full' | 'custom';
interface PerformanceOverrides {
    dprCap?: number;
    textureBudgetMiB?: number;
    maxBlurRadii?: number;
    animationHz?: number;
    dispersion?: 'off' | 'preserve';
    layered?: boolean;
}
interface PerformanceOptions {
    preset: PerformancePreset;
    fidelity?: 'preserve' | 'approximate';
    overrides?: PerformanceOverrides;
    adaptive?: false;
}
interface PerformanceState {
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
interface SurfaceOptions {
    id?: string;
    kind?: SurfaceKind;
    radius?: number;
    zIndex?: number;
}
interface GeometryFrame {
    width: number;
    height: number;
    surfaces: ReadonlyMap<string, {
        x: number;
        y: number;
        w: number;
        h: number;
        scale?: number;
    }>;
}
interface Material {
    blur: number;
    thickness: number;
    refraction: number;
    dispersion: number;
    highlight: number;
    tint: number;
}
interface Preset {
    schema: "workspace-liquid-glass";
    version: 2;
    name: string;
    settings: Settings;
}
type ActiveBackend = Exclude<Backend, 'auto'>;
type OpticalKey = Exclude<keyof Controls, 'blur' | 'refraction' | 'highlight' | 'tint' | 'blurEdge' | 'tintColor'>;
type OpticalField = [OpticalKey, string, number, number, number, number, string, string];
type OpticalControls = Required<Pick<Controls, OpticalKey | 'blurEdge' | 'tintColor'>>;
type LookName = 'studio' | 'clear' | 'frosted' | 'subtle' | 'regular' | 'tinted' | 'reading';
interface NormalizedPerformance extends PerformanceOptions {
    fidelity: 'preserve' | 'approximate';
    overrides: PerformanceOverrides;
    adaptive: false;
}
type PortableSettings = Required<Omit<Settings, 'controls' | 'performance'>> & {
    controls: OpticalControls;
    performance: NormalizedPerformance | null;
};
interface TextureChain {
    radius: number;
    width: number;
    height: number;
    levels: number;
    bytes: number;
    passes: number;
}
interface TextureInventory {
    width: number;
    height: number;
    bytes: number;
    chains: TextureChain[];
}
type ControllerSettings = Required<Omit<Settings, 'performance'>> & {
    performance: NormalizedPerformance | null;
};
type GeometryProvider = () => GeometryFrame | null;
type ScenePainter = (context: CanvasRenderingContext2D, frame: {
    width: number;
    height: number;
    dpr: number;
    settings: Settings;
    phase: number;
}) => void;

declare class GlassController {
    readonly stage: HTMLElement;
    settings: ControllerSettings;
    ready: Promise<void>;
    private listeners;
    private surfaces;
    private blocked;
    private scene;
    private generation;
    private draws;
    private times;
    private disposed;
    private phase;
    private needsBackground;
    private capabilities;
    private status;
    private ro;
    private scroll;
    private motion;
    private motionChange;
    private performanceState;
    private renderer;
    private canvas;
    private native;
    private nativeScene;
    private geometryProvider;
    private raf;
    private animationRaf;
    private animating;
    private animationDirty;
    private lastScenePaint;
    private sourceGeneration;
    private imageGeneration;
    private budgetBlocked;
    private budgetBackend;
    private budgetMaxDimension;
    constructor(stage: HTMLElement, options?: Settings);
    subscribe(fn: (state: State) => void): () => void;
    getState(): State;
    private emit;
    register(element: HTMLElement, { id, kind, radius, zIndex }?: SurfaceOptions): () => void;
    invalidate(): void;
    setGeometryProvider(provider?: GeometryProvider | null): void;
    setScenePainter(painter?: ScenePainter | null): void;
    invalidateScene(): void;
    setSettings(patch: Settings): Promise<void>;
    private selectRenderer;
    private failBackend;
    private selectSource;
    private dpr;
    render(): void;
    setImage(url: string | null): Promise<boolean>;
    setAnimation(enabled: boolean): void;
    retry(): Promise<void>;
    simulateLoss(): void;
    dispose(): void;
}

declare function nativeCapability(): boolean;

declare const opticalFields: OpticalField[];
declare const looks: Record<LookName, OpticalControls>;
declare function clarityControls(amount: number): Controls;

declare const PRESET_VERSION = 2;
declare function normalizeSettings(input?: unknown): PortableSettings;
declare function createPreset(name: string, settings: unknown): {
    schema: "workspace-liquid-glass";
    version: number;
    name: string;
    settings: PortableSettings;
};
declare function serializePreset(preset: unknown): string;
declare function parsePreset(raw: unknown): {
    schema: "workspace-liquid-glass";
    version: number;
    name: string;
    settings: PortableSettings;
};

declare const performanceProfiles: Readonly<Record<PerformancePreset, Readonly<Required<PerformanceOverrides>>>>;
declare function textureInventory(width: number, height: number, dpr: number, radii?: number[], layered?: boolean): TextureInventory;

export { GlassController, PRESET_VERSION, candidates, clarityControls, createPreset, looks, material, nativeCapability, normalizeSettings, opticalFields, parsePreset, performanceProfiles, presets, serializePreset, textureInventory };
export type { Backend, Capture, Controls, GeometryFrame, Material, PerformanceOptions, PerformanceOverrides, PerformancePreset, PerformanceState, Preset, Settings, State, SurfaceKind, SurfaceOptions };
