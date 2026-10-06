// Shared downsample / Gaussian / blit shader. Original implementation here.
struct U {
  step: vec2f,
  size: vec2f,
  sigma: f32,
  mode: f32,
  pad: vec2f,
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
  // Experimental algebraic regrouping: each adjacent texel pair is sampled
  // through linear filtering. Valid for the unit-texel horizontal/vertical
  // step used by our Gaussian passes; arbitrary scaled spacing is different.
  var color = textureSampleLevel(image, sampling, uv, 0);
  var total = 1.0;
  for (var i = 1; i <= 12; i += 2) {
    let t = f32(i);
    let a = exp(-0.5 * t * t / (u.sigma * u.sigma));
    let next = t + 1.0;
    let b = exp(-0.5 * next * next / (u.sigma * u.sigma));
    let weight = a + b;
    // Small sigma can underflow both weights; avoid 0/0 offsets.
    if (weight > 0.0) {
      let delta = u.step * (t + b / weight);
      color += (
        textureSampleLevel(image, sampling, uv + delta, 0) +
        textureSampleLevel(image, sampling, uv - delta, 0)
      ) * weight;
      total += 2.0 * weight;
    }
  }
  return color / total;
}
