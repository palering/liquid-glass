// Supplied geometry is an entire stage-local CSS-pixel snapshot, not a cache of
// earlier DOM reads. Fall back atomically if even one live surface is missing.
export function validateGeometry(frame, surfaces) {
  if (!frame) return false;
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height) ||
      frame.width <= 0 || frame.height <= 0 || !(frame.surfaces instanceof Map))
    return false;
  for (const s of surfaces) {
    const b = frame.surfaces.get(s.id);
    if (!b || ![b.x, b.y, b.w, b.h, b.scale ?? 1].every(Number.isFinite) ||
        b.w < 0 || b.h < 0 || (b.scale ?? 1) <= 0) return false;
  }
  return true;
}
