export { GlassController } from "./controller.js";
export { presets, material, candidates } from "./policy.js";
export { nativeCapability } from "./capture/native-dom.js";
export { opticalFields, looks } from "./config.js";
export {
  PRESET_VERSION,
  normalizeSettings,
  createPreset,
  parsePreset,
  serializePreset,
} from "./preset.js";
export { clarityControls } from "./config.js";
export {performanceProfiles,textureInventory} from './performance.js';

export type {Backend,Capture,SurfaceKind,Controls,Settings,State,PerformancePreset,PerformanceOptions,PerformanceOverrides,PerformanceState,SurfaceOptions,GeometryFrame,Material,Preset} from './contracts.js';
