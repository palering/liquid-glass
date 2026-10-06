import { uniqueId } from "./id.js";
import { SceneSource } from "./capture/scene.js";
import { createNativeSource, nativeCapability } from "./capture/native-dom.js";
import { WebGPURenderer } from "./renderers/webgpu.js";
import { WebGLRenderer } from "./renderers/webgl.js";
import { DOMRenderer } from "./renderers/dom.js";
import { candidates, material, resolveCapture } from "./policy.js";
import { settingPatch } from "./settings.js";
import { validateGeometry } from "./geometry.js";
import {resolvePerformance} from './performance.js';
export class GlassController {
  constructor(stage, options = {}) {
    options = settingPatch(options);
    this.stage = stage;
    this.settings = {
      backend: "auto",
      capture: "scene",
      theme: "dark",
      background: "grid",
      quality: "high",
      enabled: true,
      layered: false,
      performance: null,
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
      performance: this.performanceState ? structuredClone(this.performanceState) : null,
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
  setGeometryProvider(provider = null) {
    if (provider !== null && typeof provider !== "function")
      throw new TypeError("Geometry provider must be a function or null");
    this.geometryProvider = provider;
    this.invalidate();
  }
  setScenePainter(painter = null) {
    if (painter !== null && typeof painter !== "function")
      throw new TypeError("Scene painter must be a function or null");
    this.scene.painter = painter;
    this.invalidateScene();
  }
  invalidateScene() {
    this.needsBackground = true;
    this.invalidate();
  }
  async setSettings(patch, { preserveImageRequest = false } = {}) {
    if (this.disposed) return;
    patch = settingPatch(patch);
    if (patch.background !== undefined && !preserveImageRequest) {
      this.imageGeneration = (this.imageGeneration ?? 0) + 1;
      this.scene.imageToken++;
    }
    const backendChanged =
      (patch.backend !== undefined && patch.backend !== this.settings.backend) ||
      (this.budgetBlocked && patch.backend !== undefined) ||
      (patch.performance !== undefined && (this.budgetBlocked ||
        (patch.performance?.preset==='minimal') !== (this.settings.performance?.preset==='minimal')));
    const captureChanged =
      patch.capture !== undefined && patch.capture !== this.settings.capture;
    this.settings = {
      ...this.settings,
      ...patch,
      controls: { ...this.settings.controls, ...patch.controls },
    };
    this.stage.dataset.theme = this.settings.theme;
    if (patch.performance!==undefined||patch.backend!==undefined){this.budgetBlocked=false;this.performanceState=null;}
    if (["theme", "background", "quality", "performance"].some((k) => patch[k] !== undefined))
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
    const requested=this.settings.performance?.preset==='minimal'||this.budgetBlocked?'solid':this.settings.backend;
    for (const backend of candidates(requested, this.blocked)) {
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
    if(this.performanceState)return this.performanceState.dpr;
    return Math.min(
      window.devicePixelRatio || 1,
      this.settings.performance
        ? this.settings.performance.overrides.dprCap ?? ({minimal:1,economy:1,balanced:1.5,full:2,custom:2}[this.settings.performance.preset]) :
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
      const start = performance.now();
      const registered = this.settings.enabled
        ? [...this.surfaces.values()].sort((a,b)=>a.zIndex-b.zIndex) : [];
      let frame;
      this.status.geometryReason = null;
      if (this.geometryProvider) {
        try {
          frame = this.geometryProvider();
          if (!validateGeometry(frame, registered)) {
            frame = null;
            this.status.geometryReason = "Geometry snapshot incomplete or invalid; measuring DOM";
          }
        } catch (e) {
          frame = null;
          this.status.geometryReason = String(e.message ?? e);
        }
      }
      this.status.geometryMode = frame ? "provided" : "dom";
      const r = frame ?? this.stage.getBoundingClientRect();
      const surfaces = registered.map((s) => {
        const b = frame ? frame.surfaces.get(s.id) : s.element.getBoundingClientRect();
        const scale = frame ? b.scale ?? 1 : 1;
        const width = frame ? b.w : b.width, height = frame ? b.h : b.height;
        const cssRadius = Math.min(this.settings.controls.radius ?? s.radius, width / scale / 2, height / scale / 2);
        return {
          ...s,
          cssRadius,
          bounds: {
            x: frame ? b.x : b.left - r.left,
            y: frame ? b.y : b.top - r.top,
            w: width, h: height, radius: cssRadius * scale,
            ...(frame ? { scale } : {}),
          },
        };
      });
      const visible=surfaces.filter(s=>s.bounds.w>0&&s.bounds.h>0&&s.bounds.x<r.width&&s.bounds.y<r.height&&s.bounds.x+s.bounds.w>0&&s.bounds.y+s.bounds.h>0);
      const plan=resolvePerformance(this.settings,r.width,r.height,window.devicePixelRatio||1,visible.map(s=>s.kind),this.budgetBlocked?this.budgetBackend:this.status.activeBackend,(this.budgetBlocked?this.budgetMaxDimension:this.renderer.maxTextureDimension)??Infinity);
      if(this.budgetBlocked){plan.requiredTextureBytes=plan.estimatedTextureBytes;plan.estimatedTextureBytes=0;plan.adjustmentReasons.push('budget-solid');}
      this.performanceState=plan;
      if(this.settings.performance&&plan.budgetExceeded&&['webgpu','webgl'].includes(this.status.activeBackend)){
        this.budgetBlocked=true;this.budgetBackend=this.status.activeBackend;this.budgetMaxDimension=this.renderer.maxTextureDimension;
        this.ready=this.selectRenderer('Performance budget exceeded; using solid');return;
      }
      if(this.budgetBlocked&&!plan.budgetExceeded){this.budgetBlocked=false;this.ready=this.selectRenderer();return;}
      const dpr=plan.dpr,w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      const effective=this.settings.performance?{...this.settings,layered:plan.layered,controlsByKind:plan.controlsByKind}:this.settings;
      if(this.needsBackground||this.scene.canvas.width!==w||this.scene.canvas.height!==h||
         (this.animationDirty&&(!this.settings.performance||start-(this.lastScenePaint??-Infinity)>=1000/plan.animationHz-1))){
        this.scene.paint(r.width,r.height,dpr,effective,this.phase);this.needsBackground=false;this.animationDirty=false;this.lastScenePaint=start;
        this.status.sceneReason=this.scene.painterError;
      }
      const source=this.nativeScene??this.scene;
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
        s.element.style.borderRadius = `${s.cssRadius}px`;
        s.element.style.setProperty(
          "--lg-highlight",
          material(s.kind, plan.controlsByKind[s.kind]??this.settings.controls).highlight,
        );
      }
      if (
        this.nativeScene &&
        (source.canvas.width !== w || source.canvas.height !== h)
      ) {
        void this.selectSource();
        return;
      }
      this.renderer.render(source, surfaces, effective, dpr);
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
      this.animationDirty = true;
      this.invalidate();
      this.animationRaf = requestAnimationFrame(tick);
    };
    if (this.animating) tick();
    else {this.needsBackground=true;this.invalidate();}
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
    this.geometryProvider = null;
  }
}
