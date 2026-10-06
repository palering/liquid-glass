import { uniqueId } from "../id.js";
import { material, tintRGB } from "../policy.js";
const ns = "http://www.w3.org/2000/svg";
function make(name, attrs = {}) {
  const el = document.createElementNS(ns, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function update(el, attrs) {
  for (const [key, value] of Object.entries(attrs))
    if (el.getAttribute(key) !== String(value)) el.setAttribute(key, value);
}
function displacementImage(r, thickness) {
  const map = document.createElement("canvas");
  map.width = map.height = 80;
  const ctx = map.getContext("2d"), data = ctx.createImageData(80, 80);
  for (let y = 0; y < 80; y++)
    for (let x = 0; x < 80; x++) {
      const px = (x / 79 - 0.5) * r.w,
        py = (y / 79 - 0.5) * r.h,
        rr = Math.min(r.radius, r.w / 2, r.h / 2),
        qx = Math.abs(px) - (r.w / 2 - rr),
        qy = Math.abs(py) - (r.h / 2 - rr),
        dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
      let nx = Math.max(qx, 0) * Math.sign(px),
        ny = Math.max(qy, 0) * Math.sign(py);
      if (nx === 0 && ny === 0) {
        if (qx > qy) nx = Math.sign(px);
        else ny = Math.sign(py);
      }
      const len = Math.hypot(nx, ny) || 1,
        edge = Math.exp(-Math.abs(dist) / thickness), i = (y * 80 + x) * 4;
      data.data.set([128 + (nx / len) * edge * 105, 128 + (ny / len) * edge * 105, 128, 255], i);
    }
  ctx.putImageData(data, 0, 0);
  return map.toDataURL();
}
export class DOMRenderer {
  static async create(canvas, onFailure, backend) {
    if (backend === "css" && !CSS.supports("backdrop-filter", "blur(1px)"))
      throw new Error("CSS backdrop-filter 不可用");
    if (
      backend === "svg" &&
      typeof SVGFEdisplacementMapElement === "undefined" &&
      typeof SVGFEDisplacementMapElement === "undefined"
    )
      throw new Error("SVG displacement 不可用");
    return new DOMRenderer(backend);
  }
  constructor(backend) {
    this.prefix = uniqueId();
    this.backend = backend;
    this.layers = new Map();
    this.svgEntries = new Map();
    this.maps = new Map();
  }
  render(scene, surfaces, settings, dpr) {
    const alive = new Set();
    const usedMaps = new Set();
    let bg;
    if (this.backend === "svg") {
      if (this.source !== scene || this.version !== scene.version) {
        this.source = scene;
        this.bg = scene.canvas.toDataURL();
        this.version = scene.version;
      }
      bg = this.bg;
    }
    for (const s of surfaces) {
      if (s.bounds.w <= 0 || s.bounds.h <= 0) continue;
      alive.add(s.id);
      let layer = this.layers.get(s.id);
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "lg-dom-material";
        layer.setAttribute("aria-hidden", "true");
        s.element.prepend(layer);
        this.layers.set(s.id, layer);
      }
      const p = material(s.kind, settings.controls),
        light = settings.theme === "light";
      layer.style.borderRadius = `${s.bounds.radius}px`;
      const rgb = tintRGB(settings.controls.tintColor, light)
        .map((v) => Math.round(v * 255))
        .join(" ");
      layer.style.background = `rgb(${rgb} / ${this.backend === "solid" ? 1 : p.tint})`;
      layer.style.backdropFilter =
        this.backend === "css" ? `blur(${p.blur}px) saturate(1.12)` : "none";
      if (this.backend === "svg") {
        const r = s.bounds;
        let entry = this.svgEntries.get(s.id);
        if (!entry) {
          const svg = make("svg", {
            width: "100%",
            height: "100%",
            viewBox: `0 0 ${r.w} ${r.h}`,
            preserveAspectRatio: "none",
          });
          const defs = make("defs");
          const id = `${this.prefix}-${s.id}`;
          const filter = make("filter", {
            id,
            filterUnits: "userSpaceOnUse",
            x: -30,
            y: -30,
            width: r.w + 60,
            height: r.h + 60,
            "color-interpolation-filters": "sRGB",
          });
          const mapImage = make("feImage", {
            x: 0, y: 0, width: r.w, height: r.h,
            preserveAspectRatio: "none", result: "map",
          });
          const displacement = make("feDisplacementMap", {
            in: "SourceGraphic", in2: "map",
            xChannelSelector: "R", yChannelSelector: "G", result: "displaced",
          });
          const blur = make("feGaussianBlur", { in: "displaced" });
          filter.append(mapImage, displacement, blur);
          defs.append(filter);
          svg.append(defs);
          const image = make("image", { filter: `url(#${id})` });
          svg.append(image);
          const tint = make("rect");
          svg.append(tint);
          layer.replaceChildren(svg);
          entry = { svg, filter, mapImage, displacement, blur, image, tint };
          this.svgEntries.set(s.id, entry);
        }
        // Position and backdrop are separate from the local shape field. Share
        // only identical fields; keep at most the keys needed by live surfaces.
        const key = JSON.stringify([r.w, r.h, r.radius, p.thickness]);
        usedMaps.add(key);
        if (!this.maps.has(key)) this.maps.set(key, displacementImage(r, p.thickness));
        update(entry.svg, { viewBox: `0 0 ${r.w} ${r.h}` });
        update(entry.filter, { width: r.w + 60, height: r.h + 60 });
        update(entry.mapImage, { href: this.maps.get(key), width: r.w, height: r.h });
        update(entry.displacement, {
          scale: settings.controls.distance === undefined
            ? p.refraction * 55 : settings.controls.distance * 1600,
        });
        update(entry.blur, { stdDeviation: p.blur * 0.3 });
        update(entry.image, {
          href: bg, x: -r.x, y: -r.y,
          width: scene.canvas.width / dpr, height: scene.canvas.height / dpr,
        });
        update(entry.tint, { width: r.w, height: r.h, fill: `rgb(${rgb})`, opacity: p.tint });
      }
    }
    for (const [id, layer] of this.layers)
      if (!alive.has(id)) {
        layer.remove();
        this.layers.delete(id);
        this.svgEntries.delete(id);
      }
    for (const key of this.maps.keys()) if (!usedMaps.has(key)) this.maps.delete(key);
  }
  dispose() {
    for (const layer of this.layers.values()) layer.remove();
    this.layers.clear();
    this.svgEntries.clear();
    this.maps.clear();
  }
}
