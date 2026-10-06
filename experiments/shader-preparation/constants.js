// Isolated CPU/f32 candidate for the Studio-derived uniform-only color input.
// Formula constants follow the retained MIT color.wgsl; see NOTICE.md.
const f = Math.fround;
const tintCache = new Map();
const mul = (a, b) => f(f(a) * f(b));
const add = (a, b) => f(f(a) + f(b));
const div = (a, b) => f(f(a) / f(b));
function tintLCH(tint) {
  const key = tint.map(f).join(':');
  if (tintCache.has(key)) return tintCache.get(key);
  const alpha = mul(tint[3], 0.5);
  const srgb = tint.slice(0, 3).map(c => add(mul(1, add(1, -alpha)), mul(c, alpha)));
  const rgb = srgb.map(c => c > f(0.04045) ? f(Math.pow(div(add(c, 0.055), 1.055), f(2.4))) : div(c, 12.92));
  const xyz = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]
    .map(row => add(add(mul(rgb[0], row[0]), mul(rgb[1], row[1])), mul(rgb[2], row[2])));
  const white = [0.95045592705, 1, 1.08905775076];
  const labF = xyz.map((v, i) => div(v, white[i])).map(v => v > f(0.00885645167)
    ? f(Math.pow(v, f(0.333333333))) : add(mul(7.78703703704, v), 0.13793103448));
  const L = add(mul(116, labF[1]), -16), a = mul(500, add(labF[0], -labF[1])), b = mul(200, add(labF[1], -labF[2]));
  const value = [L, f(Math.sqrt(add(mul(a, a), mul(b, b)))), mul(f(Math.atan2(b, a)), 57.2957795131), 0];
  if (tintCache.size === 8) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, value);
  return value;
}
export function prepareOpticalConstants(tint, fresnelRange, glareRange) {
  const square = v => { const x = div(500, v); return mul(x, x); };
  return {u_fresnelTintLCH: tintLCH(tint), u_rangeSquares: [square(fresnelRange), square(glareRange)]};
}
