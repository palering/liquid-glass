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
  let height = 0.5 * bevel * t * t * (3.0 - 2.0 * t);
  let slope = 3.0 * t * (1.0 - t);
  let grad = analyticNormal(pixel) * u.u_resolution.y / (1.414213562 * 1000.0);
  let normal = normalize(vec3f(grad * slope, 1.0));
  let ray = refract(vec3f(0.0, 0.0, -1.0), normal, 1.0 / max(u.u_refFactor, 1.01));
  // Single transmitted segment to the background plane; bounded denominator.
  let offsetCSS = ray.xy / max(-ray.z, 0.05) * height * (u.u_refDistance / 0.035);
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
