// clamp(pow(x, 5), 0, 1) for positive x, extended to all finite x.
// WGSL/GLSL pow on a negative base is undefined even with exponent 5.0.
// Clamping first also bounds the polynomial intermediates to [0, 1].
fn positiveFifth(x: f32) -> f32 {
  let t = clamp(x, 0.0, 1.0);
  let square = t * t;
  return square * square * t;
}
