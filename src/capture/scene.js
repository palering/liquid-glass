export class SceneSource {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.version = 0;
    this.image = null;
    this.imageToken = 0;
    this.blurs = new Map();
  }
  async setImage(url) {
    const token = ++this.imageToken;
    if (!url) {
      this.image = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    if (token === this.imageToken) this.image = img;
  }
  paint(w, h, dpr, settings, phase = 0) {
    const c = this.canvas;
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const x = this.ctx;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const light = settings.theme === "light";
    x.fillStyle = light ? "#e9eaed" : "#090b0c";
    x.fillRect(0, 0, w, h);
    if (settings.background === "image" && this.image) {
      const s = Math.max(w / this.image.width, h / this.image.height);
      x.drawImage(
        this.image,
        (w - this.image.width * s) / 2,
        (h - this.image.height * s) / 2,
        this.image.width * s,
        this.image.height * s,
      );
    } else if (settings.background === "testchart") {
      x.fillStyle = light ? "#f1f0e9" : "#172329";
      x.fillRect(0, 0, w, h);
      const shift = Math.sin(phase) * 35;
      const stripe = Math.max(12, w / 45);
      const colors = ["#e86645", "#e5b745", "#80ae81", "#64aabb", "#a891c8"];
      for (let i = 0; i < 16; i++) {
        x.fillStyle = colors[i % colors.length];
        x.fillRect(w * 0.25 + i * stripe + shift, 70, stripe * 0.58, h - 160);
      }
      x.strokeStyle = light ? "#253039" : "#f4eadb";
      x.lineWidth = 2;
      for (let y = h * 0.3; y < h * 0.72; y += 17) {
        x.beginPath();
        x.moveTo(0, y);
        x.lineTo(w, y);
        x.stroke();
      }
      x.fillStyle = light ? "#172c30" : "#ffffff";
      x.font = `600 ${Math.max(48, Math.min(110, w * 0.14))}px -apple-system, sans-serif`;
      x.textAlign = "center";
      x.fillText("LIQUID", w * 0.5 + shift, h * 0.52);
      x.font = "12px ui-monospace, monospace";
      x.fillText("EDGE / REFRACTION / CHROMATIC DISPERSION", w * 0.5, h * 0.84);
      x.textAlign = "start";
    } else if (settings.background === "checker") {
      const s = 32;
      for (let i = 0; i < w / s; i++)
        for (let j = 0; j < h / s; j++) {
          x.fillStyle =
            (i + j) % 2
              ? light
                ? "#c9ccd2"
                : "#252c30"
              : light
                ? "#f5f5f7"
                : "#080b0c";
          x.fillRect(i * s, j * s, s, s);
        }
    } else if (settings.background === "gradient") {
      const g = x.createLinearGradient(0, h, w, 0);
      g.addColorStop(0, light ? "#eee1c3" : "#725332");
      g.addColorStop(0.42, light ? "#b8cad5" : "#203a46");
      g.addColorStop(0.7, light ? "#d3d7ce" : "#46654b");
      g.addColorStop(1, light ? "#e5e3f1" : "#333240");
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    } else {
      x.fillStyle = light ? "#b9bdc5" : "#282e32";
      for (let i = 16; i < w; i += 20)
        for (let j = 16; j < h; j += 20) {
          x.beginPath();
          x.arc(i, j, 0.8, 0, Math.PI * 2);
          x.fill();
        }
    }
    // These paths and discs belong to the owned scene, not captured editor DOM.
    const shift = Math.sin(phase) * 45;
    const colors = light ? ["#76a36a", "#7b91c0"] : ["#55cc39", "#8e7adb"];
    for (let i = 0; i < 2; i++) {
      x.strokeStyle = colors[i];
      x.lineWidth = i ? 1 : 1.5;
      x.beginPath();
      x.moveTo(-20, h * (0.3 + i * 0.36) + shift);
      x.bezierCurveTo(
        w * 0.35,
        h * (0.15 + i * 0.5),
        w * 0.55,
        h * (0.8 - i * 0.4),
        w + 20,
        h * (0.47 + i * 0.2) - shift,
      );
      x.stroke();
    }
    if (!["grid", "testchart", "checker"].includes(settings.background)) {
      for (const [px, py, r, color] of [
        [0.17, 0.6, 75, light ? "#bdc8ef" : "#575186"],
        [0.72, 0.28, 120, light ? "#efe0b9" : "#a27647"],
        [0.86, 0.72, 85, light ? "#b7d9c5" : "#295a45"],
      ]) {
        const g = x.createRadialGradient(
          w * px + shift,
          h * py,
          0,
          w * px + shift,
          h * py,
          r,
        );
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
      }
    }
    this.version++;
    this.blurs.clear();
  }
  getBlur(radius, dpr) {
    const key = Math.round(radius * dpr);
    if (this.blurs.has(key)) return this.blurs.get(key);
    const c = document.createElement("canvas");
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const x = c.getContext("2d");
    x.filter = `blur(${key}px)`;
    x.drawImage(this.canvas, 0, 0);
    this.blurs.set(key, c);
    return c;
  }
  dispose() {
    this.blurs.clear();
    this.canvas.width = this.canvas.height = 1;
    this.image = null;
    this.imageToken++;
  }
}
