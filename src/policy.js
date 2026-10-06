export const BACKENDS = ["webgpu", "webgl", "svg", "css", "solid"];
export function controlsFor(settings,kind){return settings.controlsByKind?.[kind]??settings.controls;}
export function candidates(requested, blocked = new Set()) {
  const start = requested === "auto" ? 0 : BACKENDS.indexOf(requested);
  if (start < 0) throw new Error(`Unknown backend: ${requested}`);
  return BACKENDS.slice(start).filter((x) => !blocked.has(x));
}
export function resolveCapture(requested, nativeSupported) {
  if (requested === "native-dom" && !nativeSupported)
    return {
      active: "scene",
      reason: "当前浏览器未开放原生 HTML-in-Canvas；使用场景纹理。",
    };
  if (
    requested !== "scene" &&
    requested !== "native-dom" &&
    requested !== "auto"
  )
    throw new Error(`Unknown capture: ${requested}`);
  return {
    active: requested === "native-dom" ? "native-dom" : "scene",
    reason: null,
  };
}
export const presets = {
  card: {
    blur: 9,
    thickness: 18,
    refraction: 0.16,
    dispersion: 1.8,
    highlight: 0.36,
    tint: 0.28,
  },
  control: {
    blur: 3,
    thickness: 13,
    refraction: 0.3,
    dispersion: 2.5,
    highlight: 0.55,
    tint: 0.12,
  },
  panel: {
    blur: 20,
    thickness: 12,
    refraction: 0.07,
    dispersion: 0.5,
    highlight: 0.19,
    tint: 0.54,
  },
};
export function material(kind, controls = {}) {
  const p = presets[kind] ?? presets.card;
  return {
    ...p,
    blur: Math.max(0, controls.blurPx ?? p.blur * (controls.blur ?? 1)),
    thickness: Math.max(0.5, controls.thickness ?? p.thickness),
    dispersion: Math.max(0, controls.dispersion ?? p.dispersion),
    refraction: Math.max(0, p.refraction * (controls.refraction ?? 1)),
    highlight: Math.max(
      0,
      controls.glareFactor ?? p.highlight * (controls.highlight ?? 1),
    ),
    tint: Math.min(
      0.95,
      Math.max(0, controls.tintOpacity ?? p.tint + (controls.tint ?? 0)),
    ),
  };
}
export function tintRGB(color, light = false) {
  if (/^#[0-9a-f]{6}$/i.test(color ?? ""))
    return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  return light ? [0.96, 0.96, 0.98] : [0.11, 0.12, 0.13];
}
export function surfaceUniforms(r, width, height, dpr, kind, controls, theme) {
  const p = material(kind, controls);
  const light = theme === "light";
  return {
    u_resolution: [width, height],
    u_dpr: dpr,
    u_mouseSpring: [(r.x + r.w / 2) * dpr, height - (r.y + r.h / 2) * dpr],
    u_shapeWidth: r.w,
    u_shapeHeight: r.h,
    u_shapeRadius: Math.min(r.scale === undefined ? controls?.radius ?? r.radius : r.radius, r.w / 2, r.h / 2),
    u_shapeRoundness: controls?.roundness ?? 2.6,
    u_showShape1: 0,
    u_mergeRate: 0.00001,
    u_blurEdge: controls?.blurEdge === false ? 0 : 1,
    STEP: 9,
    u_tint: [...tintRGB(controls?.tintColor, light), p.tint],
    u_refThickness: p.thickness,
    u_refFactor: Math.max(1.01, controls?.ior ?? 1.45),
    u_refDistance: controls?.distance ?? p.refraction * 0.035,
    u_refDispersion: p.dispersion,
    u_refFresnelRange: controls?.fresnelRange ?? 12,
    u_refFresnelHardness: controls?.fresnelHardness ?? 0,
    u_refFresnelFactor: controls?.fresnelFactor ?? p.highlight * 0.65,
    u_glareRange: controls?.glareRange ?? 15,
    u_glareHardness: controls?.glareHardness ?? 0,
    u_glareConvergence: controls?.glareConvergence ?? 0.5,
    u_glareOppositeFactor: controls?.glareOpposite ?? 0.55,
    u_glareFactor: p.highlight,
    u_glareAngle:
      controls?.glareAngle === undefined
        ? 0.65
        : (controls.glareAngle * Math.PI) / 180,
  };
}
