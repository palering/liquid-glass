import type {Controls,LookName,OpticalControls,OpticalField,OpticalKey} from './contracts.js';
// Units mirror the Studio shader inputs; range/hardness stay shader controls,
// not claimed physical millimetres or measured optical quantities.
export const opticalFields: OpticalField[] = [
  ["distance", "折射距离", 0, 0.15, 0.001, 0.05, "", "gpu-svg"],
  ["thickness", "边缘厚度", 1, 65, 1, 20, "px", "gpu-svg"],
  ["ior", "折射率", 1.01, 2.5, 0.01, 1.4, "", "gpu"],
  ["dispersion", "色散增益", 0, 20, 0.1, 7, "", "gpu"],
  ["blurPx", "模糊半径", 0, 35, 0.5, 1, "px", "blur"],
  ["tintOpacity", "遮罩浓度", 0, 0.9, 0.01, 0, "", "tint"],
  ["fresnelRange", "菲涅尔范围", 1, 80, 1, 30, "", "gpu"],
  ["fresnelHardness", "菲涅尔硬度", 0, 1, 0.01, 0.2, "", "gpu"],
  ["fresnelFactor", "菲涅尔强度", 0, 1, 0.01, 0.2, "", "gpu"],
  ["glareRange", "高光范围", 1, 80, 1, 30, "", "gpu"],
  ["glareHardness", "高光硬度", 0, 1, 0.01, 0.2, "", "gpu"],
  ["glareFactor", "高光强度", 0, 1, 0.01, 0.9, "", "rim"],
  ["glareAngle", "光源角度", -180, 180, 1, -45, "°", "gpu"],
  ["glareConvergence", "高光聚拢", 0, 1, 0.01, 0.5, "", "gpu"],
  ["glareOpposite", "对侧高光", 0, 1, 0.01, 0.8, "", "gpu"],
  ["radius", "圆角半径", 0, 160, 1, 78, "px", "shape"],
  ["roundness", "超椭圆系数", 2, 8, 0.1, 2.6, "", "gpu"],
  ["shadowOpacity", "投影浓度", 0, 0.6, 0.01, 0.16, "", "shadow"],
  ["shadowBlur", "投影柔化", 0, 80, 1, 32, "px", "shadow"],
  ["shadowY", "投影偏移", -30, 50, 1, 14, "px", "shadow"],
];
export const looks = {
  studio: {
    ...Object.fromEntries(opticalFields.map((f) => [f[0], f[5]])),
    blurEdge: true,
    tintColor: "auto",
  },
} as Record<LookName, OpticalControls>;
looks.clear = {
  ...looks.studio,
  distance: 0.075,
  thickness: 30,
  dispersion: 10,
  glareFactor: 0.75,
  glareHardness: 0.05,
  fresnelFactor: 0.35,
  blurPx: 0,
};
looks.frosted = {
  ...looks.studio,
  distance: 0.028,
  thickness: 18,
  dispersion: 2,
  blurPx: 18,
  tintOpacity: 0.15,
  glareFactor: 0.4,
  fresnelFactor: 0.16,
  radius: 30,
};
looks.subtle = {
  ...looks.studio,
  distance: 0.009,
  thickness: 10,
  dispersion: 1,
  blurPx: 5,
  tintOpacity: 0.28,
  glareFactor: 0.28,
  glareRange: 15,
  fresnelRange: 12,
  radius: 22,
};
export const formatValue = (field: OpticalField, value: unknown) =>
  Number(value).toFixed(field[4] < 1 ? (field[4] < 0.01 ? 3 : 2) : 0) +
  field[6];
// Inspired by Apple's clear/regular guidance, not measured Apple shader values.
looks.regular = {
  ...looks.studio,
  distance: 0.017,
  thickness: 16,
  dispersion: 1.5,
  blurPx: 12,
  tintOpacity: 0.22,
  glareFactor: 0.38,
  fresnelFactor: 0.16,
  radius: 28,
};
looks.tinted = {
  ...looks.regular,
  distance: 0.007,
  dispersion: 0.6,
  blurPx: 22,
  tintOpacity: 0.64,
  glareFactor: 0.24,
  fresnelFactor: 0.1,
};
looks.reading = {
  ...looks.tinted,
  distance: 0.002,
  dispersion: 0,
  blurPx: 26,
  tintOpacity: 0.82,
  glareFactor: 0.12,
  fresnelFactor: 0.06,
  shadowOpacity: 0.08,
};
export function clarityControls(amount: number): Controls {
  const t = Math.max(0, Math.min(1, amount));
  const keys: OpticalKey[] = [
    "distance",
    "thickness",
    "dispersion",
    "blurPx",
    "tintOpacity",
    "fresnelRange",
    "fresnelHardness",
    "fresnelFactor",
    "glareRange",
    "glareHardness",
    "glareFactor",
    "glareConvergence",
    "glareOpposite",
  ];
  return Object.fromEntries(
    keys.map((k) => [k, looks.clear[k] * (1 - t) + looks.tinted[k] * t]),
  );
}
