// Generated from Naga WGSL reflection. Do not edit.
export function packOpticsU(data, values) {
  const { f32, i32, u32 } = data;
  f32[18] = values["u_bgTextureRatio"] ?? 0;
  i32[20] = values["u_bgTextureReady"] ?? 0;
  i32[19] = values["u_bgType"] ?? 0;
  i32[23] = values["u_blurEdge"] ?? 0;
  i32[22] = values["u_blurRadius"] ?? 0;
  f32[2] = values["u_dpr"] ?? 0;
  f32[3] = values["u_glOrigin"] ?? 0;
  f32[13] = values["u_glareAngle"] ?? 0;
  f32[36] = values["u_glareConvergence"] ?? 0;
  f32[38] = values["u_glareFactor"] ?? 0;
  f32[35] = values["u_glareHardness"] ?? 0;
  f32[37] = values["u_glareOppositeFactor"] ?? 0;
  f32[34] = values["u_glareRange"] ?? 0;
  f32[12] = values["u_mergeRate"] ?? 0;
  f32[4] = values["u_mouse"]?.[0] ?? 0;
  f32[5] = values["u_mouse"]?.[1] ?? 0;
  f32[6] = values["u_mouseSpring"]?.[0] ?? 0;
  f32[7] = values["u_mouseSpring"]?.[1] ?? 0;
  f32[30] = values["u_refDispersion"] ?? 0;
  f32[39] = values["u_refDistance"] ?? 0;
  f32[29] = values["u_refFactor"] ?? 0;
  f32[33] = values["u_refFresnelFactor"] ?? 0;
  f32[32] = values["u_refFresnelHardness"] ?? 0;
  f32[31] = values["u_refFresnelRange"] ?? 0;
  f32[28] = values["u_refThickness"] ?? 0;
  f32[0] = values["u_resolution"]?.[0] ?? 0;
  f32[1] = values["u_resolution"]?.[1] ?? 0;
  f32[14] = values["u_shadowExpand"] ?? 0;
  f32[15] = values["u_shadowFactor"] ?? 0;
  f32[16] = values["u_shadowPosition"]?.[0] ?? 0;
  f32[17] = values["u_shadowPosition"]?.[1] ?? 0;
  f32[9] = values["u_shapeHeight"] ?? 0;
  f32[10] = values["u_shapeRadius"] ?? 0;
  f32[11] = values["u_shapeRoundness"] ?? 0;
  f32[8] = values["u_shapeWidth"] ?? 0;
  i32[21] = values["u_showShape1"] ?? 0;
  f32[24] = values["u_tint"]?.[0] ?? 0;
  f32[25] = values["u_tint"]?.[1] ?? 0;
  f32[26] = values["u_tint"]?.[2] ?? 0;
  f32[27] = values["u_tint"]?.[3] ?? 0;
  return data.buffer;
}
export function packImageU(data, values) {
  const { f32, i32, u32 } = data;
  f32[5] = values["mode"] ?? 0;
  f32[6] = values["pad"]?.[0] ?? 0;
  f32[7] = values["pad"]?.[1] ?? 0;
  f32[4] = values["sigma"] ?? 0;
  f32[2] = values["size"]?.[0] ?? 0;
  f32[3] = values["size"]?.[1] ?? 0;
  f32[0] = values["step"]?.[0] ?? 0;
  f32[1] = values["step"]?.[1] ?? 0;
  return data.buffer;
}
