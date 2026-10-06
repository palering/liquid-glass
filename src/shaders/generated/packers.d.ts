// Generated from Naga reflection by scripts/shader-types.mjs. Do not edit.
export interface UniformData { buffer:ArrayBuffer; bytes:Uint8Array<ArrayBuffer>; f32:Float32Array<ArrayBuffer>; i32:Int32Array<ArrayBuffer>; u32:Uint32Array<ArrayBuffer> }
export interface OpticsU {
 "u_bgTextureRatio"?:number|null;
 "u_bgTextureReady"?:number|null;
 "u_bgType"?:number|null;
 "u_blurEdge"?:number|null;
 "u_blurRadius"?:number|null;
 "u_dpr"?:number|null;
 "u_glOrigin"?:number|null;
 "u_glareAngle"?:number|null;
 "u_glareConvergence"?:number|null;
 "u_glareFactor"?:number|null;
 "u_glareHardness"?:number|null;
 "u_glareOppositeFactor"?:number|null;
 "u_glareRange"?:number|null;
 "u_mergeRate"?:number|null;
 "u_mouse"?:ArrayLike<number>|null;
 "u_mouseSpring"?:ArrayLike<number>|null;
 "u_refDispersion"?:number|null;
 "u_refDistance"?:number|null;
 "u_refFactor"?:number|null;
 "u_refFresnelFactor"?:number|null;
 "u_refFresnelHardness"?:number|null;
 "u_refFresnelRange"?:number|null;
 "u_refThickness"?:number|null;
 "u_resolution"?:ArrayLike<number>|null;
 "u_shadowExpand"?:number|null;
 "u_shadowFactor"?:number|null;
 "u_shadowPosition"?:ArrayLike<number>|null;
 "u_shapeHeight"?:number|null;
 "u_shapeRadius"?:number|null;
 "u_shapeRoundness"?:number|null;
 "u_shapeWidth"?:number|null;
 "u_showShape1"?:number|null;
 "u_tint"?:ArrayLike<number>|null;
}
export function packOpticsU(data:UniformData,values:OpticsU):ArrayBuffer;
export interface ImageU {
 "mode"?:number|null;
 "pad"?:ArrayLike<number>|null;
 "sigma"?:number|null;
 "size"?:ArrayLike<number>|null;
 "step"?:ArrayLike<number>|null;
}
export function packImageU(data:UniformData,values:ImageU):ArrayBuffer;
