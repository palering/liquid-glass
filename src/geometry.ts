import type {GeometryFrame} from './contracts.js';
// Supplied geometry is an entire stage-local CSS-pixel snapshot, not a cache of
// earlier DOM reads. Fall back atomically if even one live surface is missing.
export function validateGeometry(frame: unknown, surfaces: readonly {id: string}[]): frame is GeometryFrame {
  if (!frame) return false;
  const candidate = frame as GeometryFrame;
  if (!Number.isFinite(candidate.width) || !Number.isFinite(candidate.height) ||
      candidate.width <= 0 || candidate.height <= 0 || !(candidate.surfaces instanceof Map))
    return false;
  for (const s of surfaces) {
    const b = candidate.surfaces.get(s.id);
    if (!b || ![b.x, b.y, b.w, b.h, b.scale ?? 1].every(Number.isFinite) ||
        b.w < 0 || b.h < 0 || (b.scale ?? 1) <= 0) return false;
  }
  return true;
}
