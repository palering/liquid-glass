// Lab-only synthetic surface movement. Does not simulate React Flow or DOM capture.
export async function runBenchmark(controller, count = 10) {
  if (![10, 50, 100].includes(count))
    throw new Error("Use 10, 50 or 100 surfaces");
  const stage = controller.stage,
    unregister = [],
    nodes = [];
  controller.setAnimation(false);
  const startDraws = controller.draws;
  const rows = Math.ceil(count / 12),
    w = Math.min(66, stage.clientWidth / 12 - 4),
    h = Math.min(42, stage.clientHeight / rows - 4);
  try {
    for (let i = 0; i < count; i++) {
      const e = document.createElement("div");
      e.className = "bench-surface";
      e.style.cssText = `position:absolute;width:${w}px;height:${h}px;left:${(i % 12) * (w + 4)}px;top:${Math.floor(i / 12) * (h + 4)}px;pointer-events:none`;
      stage.append(e);
      nodes.push(e);
      unregister.push(
        controller.register(e, {
          id: "bench-" + i,
          kind: ["card", "control", "panel"][i % 3],
          radius: 12,
        }),
      );
    }
    const deltas = [];
    let last;
    for (let frame = 0; frame < 32; frame++) {
      const t = await new Promise(requestAnimationFrame);
      if (last !== undefined && frame > 2) deltas.push(t - last);
      last = t;
      nodes.forEach((e, i) => {
        e.style.transform = `translate(${Math.sin(frame * 0.3 + i) * 3}px,${Math.cos(frame * 0.3 + i) * 3}px)`;
      });
      controller.render();
    }
    const sorted = [...deltas].sort((a, b) => a - b);
    return {
      backend: controller.status.activeBackend,
      syntheticSurfaces: count,
      existingSurfaces: controller.surfaces.size - count,
      viewport: [stage.clientWidth, stage.clientHeight],
      dpr: controller.dpr(),
      frames: 32,
      meanRafMs: deltas.reduce((a, b) => a + b, 0) / deltas.length,
      p95RafMs: sorted[Math.floor(sorted.length * 0.95)],
      cpuRecentMs: controller.getState().cpuMs,
      sourceTextures: controller.renderer?.textures?.size ?? null,
      blurTextures: controller.renderer?.imagePass
        ? [...controller.renderer.imagePass.items.values()].reduce(
            (n, x) => n + 2 + x.pyramid.length,
            0,
          )
        : null,
      compositeTextures: controller.renderer?.layers?.length ?? 0,
      surfaceUniformBuffers: controller.renderer?.buffers?.size ?? null,
      draws: controller.draws - startDraws,
    };
  } finally {
    unregister.forEach((fn) => fn());
    nodes.forEach((e) => e.remove());
    controller.render();
  }
}
