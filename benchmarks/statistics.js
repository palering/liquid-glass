// Nearest-rank percentiles; no interpolation or outlier removal.
export function summarize(samples) {
  if (!samples.length) return null;
  if (samples.some((x) => !Number.isFinite(x) || x < 0))
    throw new Error("Samples must be finite nonnegative numbers");
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = (p) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  return {
    samples: sorted.length,
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p50: rank(0.5), p95: rank(0.95), p99: rank(0.99), max: sorted.at(-1),
  };
}

export function summarizeRuns(runs) {
  const groups = new Map();
  for (const r of runs) {
    if (r.status !== "ok") continue;
    // Keep acquisition, density, optics, resolution and workload distinct.
    const key = JSON.stringify([r.backend, r.capture, r.count, r.look, r.workload,
      r.layered, r.width, r.height, r.dpr]);
    const g = groups.get(key) ?? { ...r, repeats: 0, cpuSamples: [], rafSamples: [], runs: [] };
    g.repeats++;
    g.cpuSamples.push(...r.cpuSamples);
    g.rafSamples.push(...r.rafSamples);
    g.runs.push({ repeat: r.repeat, cpu: summarize(r.cpuSamples), raf: summarize(r.rafSamples) });
    groups.set(key, g);
  }
  return [...groups.values()].map(({ cpuSamples, rafSamples, ...g }) => ({
    ...g, cpu: summarize(cpuSamples), raf: summarize(rafSamples),
  }));
}
