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
