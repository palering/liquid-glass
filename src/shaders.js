// Optical shader adaptations from Charles Yin / liquid-glass-studio (MIT).
// Original sources and full license retained under vendor/studio/.
const raw = import.meta.glob("../vendor/studio/src/shaders*/**/*.{glsl,wgsl}", {
  query: "?raw",
  import: "default",
  eager: true,
});
function expand(path) {
  return raw[path].replace(/#include '\.\/([^']+)'/g, (_, rel) =>
    expand(path.slice(0, path.lastIndexOf("/") + 1) + rel),
  );
}
const base = "../vendor/studio/src/";
export const glVertex = expand(base + "shaders/vertex.glsl");
export const gpuVertex = expand(base + "shaders-wgsl/vertex.wgsl");
export const glFragment = expand(base + "shaders/fragment-main.glsl").replace(
  "fragColor = outColor;",
  "fragColor = vec4(outColor.rgb, 1.0 - smoothstep(-0.5 / u_resolution1x.y, 0.5 / u_resolution1x.y, merged));",
);
export const gpuFragment = expand(
  base + "shaders-wgsl/fragment-main.wgsl",
).replace(
  "return outColor;",
  "return vec4f(outColor.rgb, 1.0 - smoothstep(-0.5 / u_resolution1x.y, 0.5 / u_resolution1x.y, merged));",
);
