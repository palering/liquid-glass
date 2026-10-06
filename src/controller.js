import { uniqueId } from "./id.js";
import { SceneSource } from "./capture/scene.js";
import { createNativeSource, nativeCapability } from "./capture/native-dom.js";
import { WebGPURenderer } from "./renderers/webgpu.js";
import { WebGLRenderer } from "./renderers/webgl.js";
import { DOMRenderer } from "./renderers/dom.js";
import { candidates, material, resolveCapture } from "./policy.js";
export class GlassController {
  constructor(stage, options = {}) {
    this.stage = stage;
    this.settings = {
      backend: "auto",
      capture: "scene",
      theme: "dark",
      background: "grid",
      quality: "high",
      enabled: true,
      layered: false,
      controls: { blur: 1, refraction: 1, highlight: 1, tint: 0 },
      ...options,
    };
    this.listeners = new Set();
    this.surfaces = new Map();
    this.blocked = new Set();
    this.scene = new SceneSource();
    this.scene.canvas.className = "lg-backdrop";
    stage.prepend(this.scene.canvas);
    this.generation = 0;
    this.draws = 0;
    this.times = [];
    this.disposed = false;
    this.phase = 0;
    this.needsBackground = true;
    this.capabilities = {
      webgpu: typeof navigator.gpu !== "undefined",
      webgl: null,
      svg: null,
      css: CSS.supports("backdrop-filter", "blur(1px)"),
      solid: true,
    };
    this.status = {
      requestedBackend: this.settings.backend,
      activeBackend: null,
      activeCapture: "scene",
      nativeSupported: nativeCapability(),
      phase: "initializing",
      fallbackReason: null,
    };
    this.ro = new ResizeObserver(() => {
      this.needsBackground = true;
      this.invalidate();
    });
    this.ro.observe(stage);
    this.scroll = () => this.invalidate();
    window.addEventListener("scroll", this.scroll, true);
    window.addEventListener("resize", this.scroll);
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.motionChange = () => {
      if (this.motion.matches) this.setAnimation(false);
    };
    this.motion.addEventListener("change", this.motionChange);
    this.stage.dataset.theme = this.settings.theme;
    this.ready = this.selectRenderer().then(() => this.selectSource());
  }
  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }
  getState() {
    return {
      ...this.status,
      animating: this.animating ?? false,
      reducedMotion: this.motion.matches,
      capabilities: { ...this.capabilities },
      settings: structuredClone(this.settings),
      draws: this.draws,
      cpuMs: this.times.length
        ? this.times.reduce((a, b) => a + b, 0) / this.times.length
        : 0,
    };
  }
  emit() {
    for (const fn of this.listeners) fn(this.getState());
  }
  register(
    element,
    { id = uniqueId(), kind = "card", radius = 20, zIndex = 0 } = {},
  ) {
    element.dataset.glassSurface = id;
    element.classList.add("lg-surface");
    this.surfaces.set(id, { id, element, kind, radius, zIndex });
    this.ro.observe(element);
    this.invalidate();
    return () => {
      this.surfaces.delete(id);
      this.ro.unobserve(element);
      this.invalidate();
    };
  }
  invalidate() {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  async setSettings(patch, { preserveImageRequest = false } = {}) {
    if (this.disposed) return;
    if (patch.background !== undefined && !preserveImageRequest) {
      this.imageGeneration = (this.imageGeneration ?? 0) + 1;
      this.scene.imageToken++;
    }
    const backendChanged =
      patch.backend !== undefined && patch.backend !== this.settings.backend;
    const captureChanged =
      patch.capture !== undefined && patch.capture !== this.settings.capture;
    this.settings = {
      ...this.settings,
      ...patch,
      controls: { ...this.settings.controls, ...patch.controls },
    };
    this.stage.dataset.theme = this.settings.theme;
    if (["theme", "background", "quality"].some((k) => patch[k] !== undefined))
      this.needsBackground = true;
    if (backendChanged) {
      this.blocked.clear();
      this.ready = this.selectRenderer();
      await this.ready;
    }
    if (captureChanged) await this.selectSource();
    this.invalidate();
    this.emit();
  }
  async selectRenderer(reason = null) {
    this.times = [];
    const token = ++this.generation;
    this.renderer?.dispose();
    this.renderer = null;
    this.canvas?.remove();
    this.canvas = null;
    this.status = {
      ...this.status,
      requestedBackend: this.settings.backend,
      activeBackend: null,
      phase: "initializing",
      fallbackReason: reason,
    };
    this.emit();
    const failures = reason ? [reason] : [];
    for (const backend of candidates(this.settings.backend, this.blocked)) {
      const canvas = document.createElement("canvas");
      canvas.className = "lg-gpu";
      canvas.setAttribute("aria-hidden", "true");
      let renderer;
      try {
        renderer =
          backend === "webgpu"
            ? await WebGPURenderer.create(canvas, (r) =>
                this.failBackend(backend, r),
              )
            : backend === "webgl"
              ? await WebGLRenderer.create(canvas, (r) =>
                  this.failBackend(backend, r),
                )
              : await DOMRenderer.create(canvas, null, backend);
        if (token !== this.generation || this.disposed) {
          renderer.dispose();
          return;
        }
        this.capabilities[backend] = true;
        this.renderer = renderer;
        this.canvas = canvas;
        if (backend === "webgpu" || backend === "webgl")
          this.stage.prepend(canvas);
        this.status = {
          ...this.status,
          activeBackend: backend,
          phase: "ready",
          fallbackReason: failures.join(" · ") || null,
        };
        this.stage.dataset.backend = backend;
        this.emit();
        this.needsBackground = true;
        this.invalidate();
        return;
      } catch (e) {
        this.capabilities[backend] = false;
        renderer?.dispose();
        canvas.remove();
        failures.push(`${backend}: ${e.message}`);
      }
    }
    this.status.phase = "failed";
    this.status.fallbackReason = failures.join(" · ");
    this.emit();
  }
  failBackend(backend, reason) {
    if (this.disposed || this.status.activeBackend !== backend) return;
    this.blocked.add(backend);
    this.ready = this.selectRenderer(`${backend}: ${reason}`);
  }
  async selectSource() {
    const token = (this.sourceGeneration ?? 0) + 1;
    this.sourceGeneration = token;
    this.native?.dispose();
    this.native = null;
    this.nativeScene?.dispose();
    this.nativeScene = null;
    this.scene.canvas.style.visibility = "visible";
    this.status.activeCapture = "scene";
    this.status.captureReason = null;
    if (this.settings.capture !== "native-dom") {
      this.needsBackground = true;
      this.invalidate();
      return;
    }
    const choice = resolveCapture(this.settings.capture, nativeCapability());
    if (choice.active !== "native-dom") {
      this.status.captureReason = choice.reason;
      this.emit();
      return;
    }
    let native, source;
    try {
      const r = this.stage.getBoundingClientRect(),
        dpr = this.dpr();
      source = new SceneSource();
      native = await createNativeSource(r.width, r.height, dpr, () => {
        if (this.disposed || this.sourceGeneration !== token) return;
        source.version++;
        source.blurs.clear();
        this.invalidate();
      });
      source.canvas = native.canvas;
      source.ctx = native.canvas.getContext("2d");
      this.stage.prepend(native.canvas);
      native.start();
      await native.ready;
      if (this.disposed || this.sourceGeneration !== token) {
        native.dispose();
        source.dispose();
        return;
      }
      this.native = native;
      this.nativeScene = source;
      this.scene.canvas.style.visibility = "hidden";
      this.status.activeCapture = "native-dom";
      this.status.captureReason =
        "原生 2D 采集 → GPU 纹理上传；GPU 直接 DOM 采集尚未接入。";
    } catch (e) {
      native?.dispose();
      source?.dispose();
      if (this.disposed || this.sourceGeneration !== token) return;
      this.status.captureReason = e.message;
    }
    this.emit();
    this.invalidate();
  }
  dpr() {
    return Math.min(
      window.devicePixelRatio || 1,
      this.settings.quality === "low"
        ? 1
        : this.settings.quality === "medium"
          ? 1.5
          : 2,
    );
  }
  render() {
    if (!this.renderer || this.disposed) return;
    try {
      const start = performance.now(),
        r = this.stage.getBoundingClientRect(),
        dpr = this.dpr();
      const w = Math.round(r.width * dpr),
        h = Math.round(r.height * dpr);
      if (
        this.needsBackground ||
        this.scene.canvas.width !== w ||
        this.scene.canvas.height !== h
      ) {
        this.scene.paint(r.width, r.height, dpr, this.settings, this.phase);
        this.needsBackground = false;
      }
      const source = this.nativeScene ?? this.scene;
      const surfaces = (
        this.settings.enabled
          ? [...this.surfaces.values()].sort((a, b) => a.zIndex - b.zIndex)
          : []
      ).map((s) => {
        const b = s.element.getBoundingClientRect();
        return {
          ...s,
          bounds: {
            x: b.left - r.left,
            y: b.top - r.top,
            w: b.width,
            h: b.height,
            radius: Math.min(
              this.settings.controls.radius ?? s.radius,
              b.width / 2,
              b.height / 2,
            ),
          },
        };
      });
      this.stage.classList.toggle("glass-disabled", !this.settings.enabled);
      for (const s of surfaces) {
        const c = this.settings.controls;
        s.element.style.setProperty(
          "--lg-shadow-opacity",
          c.shadowOpacity ?? 0.16,
        );
        s.element.style.setProperty(
          "--lg-shadow-blur",
          `${c.shadowBlur ?? 32}px`,
        );
        s.element.style.setProperty("--lg-shadow-y", `${c.shadowY ?? 14}px`);
        s.element.style.borderRadius = `${s.bounds.radius}px`;
        s.element.style.setProperty(
          "--lg-highlight",
          material(s.kind, this.settings.controls).highlight,
        );
      }
      if (
        this.nativeScene &&
        (source.canvas.width !== w || source.canvas.height !== h)
      ) {
        void this.selectSource();
        return;
      }
      this.renderer.render(source, surfaces, this.settings, dpr);
      this.draws++;
      this.times.push(performance.now() - start);
      if (this.times.length > 60) this.times.shift();
      this.emit();
    } catch (e) {
      this.failBackend(this.status.activeBackend, e.message);
    }
  }
  async setImage(url) {
    const token = (this.imageGeneration ?? 0) + 1;
    this.imageGeneration = token;
    try {
      await this.scene.setImage(url);
      if (token !== this.imageGeneration || this.disposed) return false;
      await this.setSettings(
        { background: url ? "image" : "grid" },
        { preserveImageRequest: true },
      );
      this.status.imageReason = null;
    } catch (e) {
      if (token !== this.imageGeneration || this.disposed) return false;
      this.status.imageReason = `图片加载失败：${e.message}，已回退网格`;
      await this.scene.setImage(null);
      await this.setSettings(
        { background: "grid" },
        { preserveImageRequest: true },
      );
      this.emit();
      return false;
    }
    this.emit();
    return true;
  }
  setAnimation(enabled) {
    this.animating = enabled && !this.motion.matches;
    cancelAnimationFrame(this.animationRaf);
    const tick = () => {
      if (!this.animating || this.disposed) return;
      this.phase += 0.022;
      this.needsBackground = true;
      this.invalidate();
      this.animationRaf = requestAnimationFrame(tick);
    };
    if (this.animating) tick();
    this.emit();
  }
  async retry() {
    this.blocked.clear();
    this.ready = this.selectRenderer();
    await this.ready;
  }
  simulateLoss() {
    if (this.renderer?.lose) this.renderer.lose();
    else this.failBackend(this.status.activeBackend, "实验室模拟后端故障");
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.sourceGeneration = (this.sourceGeneration ?? 0) + 1;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.animationRaf);
    this.ro.disconnect();
    window.removeEventListener("scroll", this.scroll, true);
    window.removeEventListener("resize", this.scroll);
    this.motion.removeEventListener("change", this.motionChange);
    this.renderer?.dispose();
    this.native?.dispose();
    this.nativeScene?.dispose();
    this.scene.dispose();
    this.canvas?.remove();
    this.scene.canvas.remove();
    this.listeners.clear();
    this.surfaces.clear();
  }
}
