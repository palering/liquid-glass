// Shared downsample / Gaussian / blit shader. Original implementation here.
struct U {
  step: vec2f,
  size: vec2f,
  sigma: f32,
  mode: f32,
  pad: vec2f,
  weights0: vec4f,
  weights1: vec4f,
  weights2: vec4f,
  total: f32,
};
@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var sampling: sampler;
@group(0) @binding(2) var<uniform> u: U;

@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  // Textures and framebuffer use their backend's native row order.
  // This ratio serves top-left WebGPU and bottom-left WebGL alike.
  let uv = position.xy / u.size;
  if (u.mode == 1.0) {
    return textureSampleLevel(image, sampling, uv, 0);
  }
  if (u.mode == 2.0) {
    return (
      textureSampleLevel(image, sampling, uv + u.step, 0) +
      textureSampleLevel(image, sampling, uv - u.step, 0) +
      textureSampleLevel(image, sampling, uv + vec2f(u.step.x, -u.step.y), 0) +
      textureSampleLevel(image, sampling, uv + vec2f(-u.step.x, u.step.y), 0)
    ) * 0.25;
  }
  var color = textureSampleLevel(image, sampling, uv, 0);
  let weights = array<f32, 12>(u.weights0.x, u.weights0.y, u.weights0.z, u.weights0.w, u.weights1.x, u.weights1.y, u.weights1.z, u.weights1.w, u.weights2.x, u.weights2.y, u.weights2.z, u.weights2.w);
  for (var i = 1; i <= 12; i++) {
    let t = f32(i);
    let weight = weights[i - 1];
    let delta = u.step * t;
    color += (
      textureSampleLevel(image, sampling, uv + delta, 0) +
      textureSampleLevel(image, sampling, uv - delta, 0)
    ) * weight;
  }
  return color / u.total;
}
