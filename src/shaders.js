// Generated at build preparation from the WGSL sources in src/shaders/.
// Studio optical adaptations retain their MIT attribution; see NOTICE.md.
import optics from './shaders/generated/optics.json' with { type: 'json' };
import vertex from './shaders/generated/optics-vertex.json' with { type: 'json' };
import image from './shaders/generated/image.json' with { type: 'json' };
import imageVertex from './shaders/generated/image-vertex.json' with { type: 'json' };
export const glVertex = vertex.glsl;
export const gpuVertex = vertex.wgsl;
export const glFragment = optics.glsl;
export const gpuFragment = optics.wgsl;
export const opticalBindings = optics;
export const imageBindings = image;
export const glImageVertex = imageVertex.glsl;
export const gpuImageVertex = imageVertex.wgsl;
export const glImageFragment = image.glsl;
export const gpuImageFragment = image.wgsl;
