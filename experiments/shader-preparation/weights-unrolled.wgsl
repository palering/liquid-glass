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
  color += (textureSampleLevel(image, sampling, uv + u.step * 1.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 1.0, 0)) * u.weights0.x;
  color += (textureSampleLevel(image, sampling, uv + u.step * 2.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 2.0, 0)) * u.weights0.y;
  color += (textureSampleLevel(image, sampling, uv + u.step * 3.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 3.0, 0)) * u.weights0.z;
  color += (textureSampleLevel(image, sampling, uv + u.step * 4.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 4.0, 0)) * u.weights0.w;
  color += (textureSampleLevel(image, sampling, uv + u.step * 5.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 5.0, 0)) * u.weights1.x;
  color += (textureSampleLevel(image, sampling, uv + u.step * 6.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 6.0, 0)) * u.weights1.y;
  color += (textureSampleLevel(image, sampling, uv + u.step * 7.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 7.0, 0)) * u.weights1.z;
  color += (textureSampleLevel(image, sampling, uv + u.step * 8.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 8.0, 0)) * u.weights1.w;
  color += (textureSampleLevel(image, sampling, uv + u.step * 9.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 9.0, 0)) * u.weights2.x;
  color += (textureSampleLevel(image, sampling, uv + u.step * 10.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 10.0, 0)) * u.weights2.y;
  color += (textureSampleLevel(image, sampling, uv + u.step * 11.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 11.0, 0)) * u.weights2.z;
  color += (textureSampleLevel(image, sampling, uv + u.step * 12.0, 0) + textureSampleLevel(image, sampling, uv - u.step * 12.0, 0)) * u.weights2.w;
  return color / u.total;
}
