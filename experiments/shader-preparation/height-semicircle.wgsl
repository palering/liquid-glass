// Adapted from Liquid Glass Studio, Charles Yin, MIT. See NOTICE.md.
// Main glass effect composition shader for WebGPU
// Ported from fragment-main.glsl (STEP==9 branch only)

const PI: f32 = 3.14159265359;
const N_R: f32 = 0.98; // 1.0 - 0.02
const N_G: f32 = 1.0;
const N_B: f32 = 1.02; // 1.0 + 0.02

struct Uniforms {
  u_resolution: vec2f,
  u_dpr: f32,
  // Host coordinate convention: 0 = WebGPU top-left, 1 = WebGL bottom-left.
  u_glOrigin: f32,
  u_mouse: vec2f,
  u_mouseSpring: vec2f,
  u_shapeWidth: f32,
  u_shapeHeight: f32,
  u_shapeRadius: f32,
  u_shapeRoundness: f32,
  u_mergeRate: f32,
  u_glareAngle: f32,
  u_shadowExpand: f32,
  u_shadowFactor: f32,
  u_shadowPosition: vec2f,
  u_bgTextureRatio: f32,
  u_bgType: i32,
  u_bgTextureReady: i32,
  u_showShape1: i32,
  u_blurRadius: i32,
  u_blurEdge: i32,
  u_tint: vec4f,
  u_refThickness: f32,
  u_refFactor: f32,
  u_refDispersion: f32,
  u_refFresnelRange: f32,
  u_refFresnelHardness: f32,
  u_refFresnelFactor: f32,
  u_glareRange: f32,
  u_glareHardness: f32,
  u_glareConvergence: f32,
  u_glareOppositeFactor: f32,
  u_glareFactor: f32,
  u_refDistance: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var u_blurredBg: texture_2d<f32>;
@group(0) @binding(2) var u_bg: texture_2d<f32>;
@group(0) @binding(3) var u_sampler: sampler;

#include '../../vendor/studio/src/shaders-wgsl/lib/sdf.wgsl'
#include '../../vendor/studio/src/shaders-wgsl/lib/math.wgsl'

fn getNormal(p1: vec2f, p2: vec2f, p: vec2f) -> vec2f {
  // dFdx(gl_FragCoord.x) = 1.0 on a fullscreen quad, so eps = 1.0
  let h = vec2f(1.0, 1.0);
  let grad = vec2f(
    mainSDF(p1, p2, p + vec2f(h.x, 0.0)) - mainSDF(p1, p2, p - vec2f(h.x, 0.0)),
    mainSDF(p1, p2, p + vec2f(0.0, h.y)) - mainSDF(p1, p2, p - vec2f(0.0, h.y))
  ) / (2.0 * h);
  return grad * 1.414213562 * 1000.0;
}

// Safe normalize: returns zero vector instead of NaN when length is near zero
fn safeNormalize(v: vec2f) -> vec2f {
  let len = length(v);
  if (len < 1e-8) {
    return vec2f(0.0);
  }
  return v / len;
}

#include '../../vendor/studio/src/shaders-wgsl/lib/color.wgsl'

fn vec2ToAngle(v: vec2f) -> f32 {
  var angle = atan2(v.y, v.x);
  if (angle < 0.0) { angle += 2.0 * PI; }
  return angle;
}

// ---- Texture dispersion ----

fn getTextureDispersion(v_uv: vec2f, mixRate: f32, offset: vec2f, factor: f32) -> vec4f {

  if (factor == 0.0) {
    let uv = v_uv + offset;
    if (mixRate == 1.0) { return vec4f(textureSampleLevel(u_blurredBg,u_sampler,uv,0).rgb,1); }
    if (mixRate == 0.0) { return vec4f(textureSampleLevel(u_bg,u_sampler,uv,0).rgb,1); }
    return vec4f(mix(textureSampleLevel(u_bg,u_sampler,uv,0).rgb,textureSampleLevel(u_blurredBg,u_sampler,uv,0).rgb,mixRate),1);
  }
  if (mixRate == 1.0) { return vec4f(
    textureSampleLevel(u_blurredBg,u_sampler,v_uv+offset*(1.0-(N_R-1.0)*factor),0).r,
    textureSampleLevel(u_blurredBg,u_sampler,v_uv+offset*(1.0-(N_G-1.0)*factor),0).g,
    textureSampleLevel(u_blurredBg,u_sampler,v_uv+offset*(1.0-(N_B-1.0)*factor),0).b,1); }
  if (mixRate == 0.0) { return vec4f(
    textureSampleLevel(u_bg,u_sampler,v_uv+offset*(1.0-(N_R-1.0)*factor),0).r,
    textureSampleLevel(u_bg,u_sampler,v_uv+offset*(1.0-(N_G-1.0)*factor),0).g,
    textureSampleLevel(u_bg,u_sampler,v_uv+offset*(1.0-(N_B-1.0)*factor),0).b,1); }
  var pixel = vec4f(1.0);

  let bgR = textureSampleLevel(u_bg, u_sampler, v_uv + offset * (1.0 - (N_R - 1.0) * factor), 0.0).r;
  let bgG = textureSampleLevel(u_bg, u_sampler, v_uv + offset * (1.0 - (N_G - 1.0) * factor), 0.0).g;
  let bgB = textureSampleLevel(u_bg, u_sampler, v_uv + offset * (1.0 - (N_B - 1.0) * factor), 0.0).b;

  let blurR = textureSampleLevel(u_blurredBg, u_sampler, v_uv + offset * (1.0 - (N_R - 1.0) * factor), 0.0).r;
  let blurG = textureSampleLevel(u_blurredBg, u_sampler, v_uv + offset * (1.0 - (N_G - 1.0) * factor), 0.0).g;
  let blurB = textureSampleLevel(u_blurredBg, u_sampler, v_uv + offset * (1.0 - (N_B - 1.0) * factor), 0.0).b;

  pixel.r = mix(bgR, blurR, mixRate);
  pixel.g = mix(bgG, blurG, mixRate);
  pixel.b = mix(bgB, blurB, mixRate);

  return pixel;
}

// Original analytic derivative of the pinned Studio rounded/superellipse field.
// The distance remains the upstream p-norm approximation, not a Euclidean SDF.
// Returns derivative with respect to physical pixels, including Studio's
// legacy amplitude (sqrt(2) * 1000). A unit normal is not interchangeable here.
fn analyticNormal(p: vec2f) -> vec2f {
  let q = (p - u.u_mouseSpring) / u.u_resolution.y;
  let halfSize = vec2f(u.u_shapeWidth, u.u_shapeHeight) * u.u_dpr / u.u_resolution.y * 0.5;
  let radius = u.u_shapeRadius * u.u_dpr / u.u_resolution.y;
  let delta = abs(q) - halfSize;
  var gradient: vec2f;
  if (delta.x > -radius && delta.y > -radius) {
    let corner = q - sign(q) * (halfSize - vec2f(radius));
    let a = abs(corner);
    // Scale before powers to avoid underflow for n=8 and tiny corners.
    let scale = max(max(a.x, a.y), 1e-20);
    let v = a / scale;
    let norm = pow(pow(v.x, u.u_shapeRoundness) + pow(v.y, u.u_shapeRoundness), 1.0 / u.u_shapeRoundness);
    gradient = sign(corner) * pow(v / max(norm, 1e-20), vec2f(u.u_shapeRoundness - 1.0));
  } else {
    let outside = max(delta, vec2f(0.0));
    let len = length(outside);
    if (len > 0.0) { gradient = sign(q) * outside / len; }
    else if (delta.x == delta.y) { gradient = sign(q) * 0.5; }
    else if (delta.x > delta.y) { gradient = vec2f(sign(q.x), 0.0); }
    else { gradient = vec2f(0.0, sign(q.y)); }
  }
  return gradient / u.u_resolution.y * 1.414213562 * 1000.0;
}
// Original bounded height-field candidate, informed by the reviewed slope-field
// and bevel approaches. No third-party height-model source is copied here.
// Dimensions are CSS pixels; distance remains an artistic gain, not metres.
@fragment
fn fs_main(@builtin(position) frag_coord: vec4f, @location(0) v_uv: vec2f) -> @location(0) vec4f {
  let resolutionCSS = u.u_resolution / u.u_dpr;
  let pixel = vec2f(frag_coord.x, select(u.u_resolution.y - frag_coord.y, frag_coord.y, u.u_glOrigin == 1.0));
  let p1 = -u.u_resolution * 0.5 / u.u_resolution.y;
  let p2 = -u.u_mouseSpring / u.u_resolution.y;
  let distance = mainSDF(p1, p2, pixel);
  let depth = max(-distance * resolutionCSS.y, 0.0);
  let bevel = max(min(u.u_refThickness, min(u.u_shapeWidth, u.u_shapeHeight) * 0.5), 0.25);
  let t = clamp(depth / bevel, 0.0, 1.0);
  let height = 0.5 * bevel * sqrt(max(t * (2.0 - t), 0.0));
  let slope = min(4.0, 0.5 * (1.0 - t) / sqrt(max(t * (2.0 - t), 1e-6)));
  let grad = analyticNormal(pixel) * u.u_resolution.y / (1.414213562 * 1000.0);
  let normal = normalize(vec3f(grad * slope, 1.0));
  let ray = refract(vec3f(0.0, 0.0, -1.0), normal, 1.0 / max(u.u_refFactor, 1.01));
  // Single transmitted segment to the background plane; bounded denominator.
  let offsetCSS = ray.xy / max(-ray.z, 0.05) * height * (u.u_refDistance / 0.035) * 1.162096314168;
  let offset = offsetCSS / resolutionCSS;
  let uvOffset = vec2f(offset.x, select(-offset.y, offset.y, u.u_glOrigin == 1.0));
  let blurMix = select(t, 1.0, u.u_blurEdge > 0);
  var color = getTextureDispersion(v_uv, blurMix, uvOffset, u.u_refDispersion).rgb;
  color = mix(color, u.u_tint.rgb, clamp(u.u_tint.a * 0.8, 0.0, 1.0));
  let f0 = pow((u.u_refFactor - 1.0) / (u.u_refFactor + 1.0), 2.0);
  let fresnel = f0 + (1.0 - f0) * pow(1.0 - normal.z, 5.0);
  let angle = u.u_glareAngle;
  let light = normalize(vec3f(cos(angle), sin(angle), 1.5));
  let halfVector = normalize(light + vec3f(0.0, 0.0, 1.0));
  let specular = pow(max(dot(normal, halfVector), 0.0), 8.0 + 56.0 * u.u_glareConvergence);
  let highlight = clamp(fresnel * u.u_refFresnelFactor + specular * u.u_glareFactor * slope, 0.0, 0.85);
  color = mix(color, vec3f(1.0), highlight);
  let alpha = 1.0 - smoothstep(-0.5 / resolutionCSS.y, 0.5 / resolutionCSS.y, distance);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), alpha);
}
