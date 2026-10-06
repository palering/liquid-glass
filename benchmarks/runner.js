import { GlassController, looks, nativeCapability } from "../src/index.js";
import { BACKENDS } from "../src/policy.js";
import { summarize } from "./statistics.js";

export const PROTOCOL = {
  version: 1, width: 960, height: 540, quality: "low", warmup: 12, frames: 60,
  repeats: 3, theme: "light", background: "testchart", capture: "scene",
  note: "Synthetic DOM surfaces, no React Flow. CPU update/submission and rAF cadence; not GPU timestamps or presented FPS. CSS/solid have reduced optics.",
};
const raf = () => new Promise(requestAnimationFrame);

export function cases() {
  const result = [];
  for (let repeat = 1; repeat <= PROTOCOL.repeats; repeat++) {
    // Rotate backend order to reduce a fixed ordering advantage.
    const order = [...BACKENDS.slice(repeat - 1), ...BACKENDS.slice(0, repeat - 1)];
    for (const backend of order) {
      for (const look of ["studio", "frosted"])
        for (const count of [10, 50, 100])
          result.push({ backend, look, count, workload: "move", layered: false, repeat });
      for (const look of ["studio", "frosted"])
        result.push({ backend, look, count: 50, workload: "background", layered: false, repeat });
      result.push({ backend, look: "studio", count: 50, workload: "idle", layered: false, repeat });
      if (["webgpu", "webgl"].includes(backend))
        for (const layered of [false, true])
          result.push({ backend, look: "frosted", count: 10, workload: "overlap", layered, repeat });
    }
  }
  return result;
}

export function resources(renderer) {
  const gpu = renderer?.imagePass;
  return {
    sourceTextures: renderer?.textures?.size ?? null,
    blurTextures: gpu ? [...gpu.items.values()].reduce((n, x) => n + 2 + x.pyramid.length, 0) : null,
    compositeTextures: Array.isArray(renderer?.layers) ? renderer.layers.length : 0,
    uniformBuffers: renderer?.buffers?.size ?? null,
    domMaterialLayers: renderer?.layers instanceof Map ? renderer.layers.size : null,
    // Counts are live JS-owned allocations, not driver memory measurements.
  };
}

async function runCase(host, spec, signal) {
  const stage = document.createElement("div");
  stage.className = "lg-stage benchmark-stage";
  stage.style.cssText = `width:${PROTOCOL.width}px;height:${PROTOCOL.height}px`;
  host.replaceChildren(stage);
  host.scrollIntoView({ block: "center" });
  const controls = { ...looks[spec.look], radius: 12, shadowOpacity: 0 };
  const controller = new GlassController(stage, {
    backend: spec.backend, capture: PROTOCOL.capture, theme: PROTOCOL.theme,
    background: PROTOCOL.background, quality: PROTOCOL.quality,
    layered: spec.layered, controls,
  });
  const nodes = [], unregister = [];
  const result = { ...spec, requestedBackend: spec.backend, capture: PROTOCOL.capture,
    width: PROTOCOL.width, height: PROTOCOL.height, dpr: controller.dpr(), controls,
    cpuSamples: [], rafSamples: [], gpuTimeMs: null, status: "pending" };
  let observer;
  const longTasks = [];
  let measureStart, measureEnd;
  let invalidVisibility = document.visibilityState !== "visible";
  let invalidSize = false;
  const resize = () => { invalidSize = true; };
  const visibility = () => { if (document.visibilityState !== "visible") invalidVisibility = true; };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("resize", resize);
  try {
    await controller.ready;
    result.backend = controller.getState().activeBackend;
    if (result.backend !== spec.backend) {
      result.status = "skipped";
      result.reason = controller.getState().fallbackReason ?? "Requested backend unavailable";
      return result;
    }
    for (let i = 0; i < spec.count; i++) {
      const e = document.createElement("div");
      e.className = "benchmark-surface";
      const overlap = spec.workload === "overlap";
      e.style.cssText = `position:absolute;width:${overlap ? 230 : 82}px;height:${overlap ? 135 : 38}px;left:${overlap ? 160 + i * 28 : 17 + (i % 10) * 94}px;top:${overlap ? 90 + i * 18 : 15 + Math.floor(i / 10) * 50}px`;
      e.innerHTML = `<span class="lg-content">${String(i + 1).padStart(2, "0")}</span>`;
      stage.append(e); nodes.push(e);
      unregister.push(controller.register(e, { id: `perf-${i}`, kind: "card", radius: 12, zIndex: i }));
    }
    if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((x) => ({ startTime: x.startTime, duration: x.duration }))));
      observer.observe({ type: "longtask" });
    }
    // Let resize/register invalidations settle before owning the draw loop.
    await raf(); await raf();
    const bounds = stage.getBoundingClientRect();
    if (bounds.left < 0 || bounds.top < 0 || bounds.right > innerWidth || bounds.bottom > innerHeight)
      throw new Error("Entire fixture must be in viewport (minimum 1040 × 600)");
    cancelAnimationFrame(controller.raf); controller.raf = 0;
    const initialVersion = controller.scene.version, initialDraws = controller.draws;
    let last;
    for (let frame = 0; frame <= PROTOCOL.warmup + PROTOCOL.frames; frame++) {
      if (signal?.aborted) throw new Error("Cancelled");
      const time = await raf();
      if (frame === PROTOCOL.warmup) measureStart = performance.now();
      // Each delta belongs to the preceding measured draw, including the last one.
      if (frame > PROTOCOL.warmup) result.rafSamples.push(time - last);
      last = time;
      if (frame === PROTOCOL.warmup + PROTOCOL.frames) break;
      if (spec.workload !== "idle") {
        const start = performance.now();
        if (spec.workload === "move" || spec.workload === "overlap")
          nodes.forEach((e, i) => { e.style.transform = `translate(${Math.sin(frame * 0.3 + i) * 3}px,${Math.cos(frame * 0.3 + i) * 3}px)`; });
        if (spec.workload === "background") {
          controller.phase += 0.022;
          controller.needsBackground = true;
        }
        controller.render();
        const elapsed = performance.now() - start;
        if (frame >= PROTOCOL.warmup) result.cpuSamples.push(elapsed);
      }
      if (controller.getState().activeBackend !== spec.backend || controller.getState().phase !== "ready")
        throw new Error("Backend changed during measurement");
    }
    measureEnd = performance.now();
    result.draws = controller.draws - initialDraws;
    result.sourceUpdates = controller.scene.version - initialVersion;
    result.resources = resources(controller.renderer);
    result.cpu = summarize(result.cpuSamples); result.raf = summarize(result.rafSamples);
    if (invalidVisibility) throw new Error("Tab was hidden; cadence data is invalid");
    if (invalidSize) throw new Error("Viewport resized during measurement");
    result.status = "ok";
  } catch (e) {
    result.status = signal?.aborted ? "cancelled" : "failed";
    result.reason = e.message;
  } finally {
    if (observer) {
      longTasks.push(...observer.takeRecords().map((x) => ({ startTime: x.startTime, duration: x.duration })));
      observer.disconnect();
    }
    result.longTasks = observer ? longTasks.filter((x) => x.startTime >= measureStart && x.startTime <= measureEnd) : null;
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", resize);
    unregister.forEach((fn) => fn()); nodes.forEach((e) => e.remove());
    controller.render();
    result.afterUnregister = resources(controller.renderer);
    controller.dispose();
    result.cleanup = { disposed: controller.disposed, surfaces: controller.surfaces.size,
      listeners: controller.listeners.size, remainingChildren: stage.children.length };
    if (result.status === "ok" && stage.children.length) {
      result.status = "failed"; result.reason = "Cleanup left DOM children";
    }
  }
  return result;
}

export async function runSuite(host, { signal, onProgress = () => {}, sourceFingerprint = null } = {}) {
  const startedAt = new Date().toISOString();
  const idle = [];
  let previous;
  for (let i = 0; i < 32; i++) {
    const t = await raf(); if (previous !== undefined && i > 2) idle.push(t - previous); previous = t;
  }
  const result = {
    schema: "liquid-glass-benchmark", version: 1, startedAt, sourceFingerprint,
    protocol: PROTOCOL, environment: {
      userAgent: navigator.userAgent, platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio: devicePixelRatio,
      viewport: [innerWidth, innerHeight], visibility: document.visibilityState,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      nativeCapture: nativeCapability(),
    }, calibration: { rawRafMs: idle, raf: summarize(idle) }, runs: [],
  };
  const specs = cases();
  for (const spec of specs) {
    if (signal?.aborted) break;
    onProgress({ completed: result.runs.length, total: specs.length, spec });
    result.runs.push(await runCase(host, spec, signal));
  }
  result.finishedAt = new Date().toISOString();
  result.complete = result.runs.length === specs.length && !signal?.aborted;
  result.totalCases = specs.length;
  onProgress({ completed: result.runs.length, total: specs.length, done: true });
  return result;
}
