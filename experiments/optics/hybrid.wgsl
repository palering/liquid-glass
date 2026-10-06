// Preserve finite differences near corners, branch seams and axis ties.
// Use the analytic derivative only on locally linear straight edges.
fn getNormal(p1: vec2f, p2: vec2f, p: vec2f) -> vec2f {
  let q = (p - u.u_mouseSpring) / u.u_resolution.y;
  let halfSize = vec2f(u.u_shapeWidth, u.u_shapeHeight) * u.u_dpr / u.u_resolution.y * 0.5;
  let radius = u.u_shapeRadius * u.u_dpr / u.u_resolution.y;
  let delta = abs(q) - halfSize;
  let epsilon = 2.0 / u.u_resolution.y;
  if ((delta.x > -radius - epsilon && delta.y > -radius - epsilon) ||
      abs(delta.x - delta.y) < epsilon || min(abs(q.x), abs(q.y)) < epsilon) {
    return finiteNormal(p1, p2, p);
  }
  return analyticNormal(p);
}
