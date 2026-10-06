import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { summarizeRuns } from "../benchmarks/statistics.js";
const input = process.argv[2] ?? "benchmarks/results/latest.json";
const data = JSON.parse(await readFile(input, "utf8"));
if (data.schema !== "liquid-glass-benchmark" || data.version !== 1)
  throw new Error("Unknown benchmark schema");
if (!data.complete || data.runs.length !== data.totalCases)
  throw new Error("Incomplete suite cannot become an acceptance baseline");
for (const r of data.runs.filter((r) => r.status === "ok")) {
  if (r.backend !== r.requestedBackend || r.capture !== "scene")
    throw new Error("Incompatible backend/capture mislabeled");
  if (
    r.rafSamples.length !== data.protocol.frames ||
    (r.workload !== "idle" && r.cpuSamples.length !== data.protocol.frames)
  )
    throw new Error("Incomplete sample window");
  if (
    !r.cleanup.disposed ||
    r.cleanup.surfaces ||
    r.cleanup.listeners ||
    r.cleanup.remainingChildren
  )
    throw new Error("Cleanup contract failed");
  if (r.workload === "idle" && r.draws !== 0)
    throw new Error("Idle scene drew unexpectedly");
}
const groups = summarizeRuns(data.runs);
const output = dirname(input);
const round = (x) => (x == null ? "" : x.toFixed(3));
const columns = [
  "backend",
  "capture",
  "look",
  "workload",
  "count",
  "layered",
  "repeats",
  "cpu_p50_ms",
  "cpu_p95_ms",
  "cpu_p99_ms",
  "raf_p50_ms",
  "raf_p95_ms",
  "raf_max_ms",
  "source_textures",
  "blur_textures",
  "composite_textures",
];
const rows = groups.map((g) => [
  g.backend,
  g.capture,
  g.look,
  g.workload,
  g.count,
  g.layered,
  g.repeats,
  round(g.cpu?.p50),
  round(g.cpu?.p95),
  round(g.cpu?.p99),
  round(g.raf?.p50),
  round(g.raf?.p95),
  round(g.raf?.max),
  g.resources.sourceTextures ?? "",
  g.resources.blurTextures ?? "",
  g.resources.compositeTextures,
]);
await writeFile(
  `${output}/summary.csv`,
  [columns, ...rows].map((r) => r.join(",")).join("\n") + "\n",
);
const runRows = data.runs.map((r) => [
  r.requestedBackend,
  r.backend,
  r.look,
  r.workload,
  r.count,
  r.layered,
  r.repeat,
  r.status,
  round(r.cpu?.p95),
  round(r.raf?.p95),
  r.draws ?? "",
  r.sourceUpdates ?? "",
]);
await writeFile(
  `${output}/runs.csv`,
  [
    [
      "requested_backend",
      "active_backend",
      "look",
      "workload",
      "count",
      "layered",
      "repeat",
      "status",
      "cpu_p95_ms",
      "raf_p95_ms",
      "draws",
      "source_updates",
    ],
    ...runRows,
  ]
    .map((r) => r.join(","))
    .join("\n") + "\n",
);
const ok = data.runs.filter((r) => r.status === "ok"),
  failed = data.runs.filter((r) => r.status === "failed");
const report = `# Performance baseline\n\nAudience: public\n\nGenerated from [raw samples](latest.json) and [summary CSV](summary.csv). Protocol ${data.protocol.version}.\n\n- Started: ${data.startedAt}; finished: ${data.finishedAt}.\n- Source SHA-256: \`${data.sourceFingerprint?.sourceSha256 ?? "unrecorded"}\`.\n- Browser: ${data.environment.userAgent}.\n- Platform: ${data.environment.platform}; logical CPUs: ${data.environment.hardwareConcurrency}; device DPR: ${data.environment.devicePixelRatio}; test DPR cap: 1.\n- Viewport: ${data.environment.viewport.join(" × ")}; stage: 960 × 540 CSS px; light testchart; scene capture.\n- Warmup 12 frames, measured 60 frames, 3 repetitions; backend order rotated per repetition.\n- Valid ${ok.length}/${data.totalCases}; failed ${failed.length}; skipped ${data.runs.filter((r) => r.status === "skipped").length}.\n- Native capture supported: ${data.environment.nativeCapture}; native capture is outside this baseline.\n- Initial empty-page rAF p50: ${round(data.calibration.raf.p50)} ms.\n\n## Moving surfaces\n\nPooled nearest-rank p95 across all three repetitions. Units ms. No samples discarded.\n\n| Backend | Look | Surfaces | CPU p50 / p95 | rAF p50 / p95 |\n| --- | --- | ---: | ---: | ---: |\n${groups
  .filter((g) => g.workload === "move")
  .map(
    (g) =>
      `| ${g.backend} | ${g.look} | ${g.count} | ${round(g.cpu?.p50)} / ${round(g.cpu?.p95)} | ${round(g.raf?.p50)} / ${round(g.raf?.p95)} |`,
  )
  .join(
    "\n",
  )}\n\n## Background updates and overlap\n\n| Backend | Look | Workload | Layered | CPU p95 | rAF p95 | Source / blur / composite textures |\n| --- | --- | --- | --- | ---: | ---: | --- |\n${groups
  .filter((g) => ["background", "overlap"].includes(g.workload))
  .map(
    (g) =>
      `| ${g.backend} | ${g.look} | ${g.workload} | ${g.layered} | ${round(g.cpu?.p95)} | ${round(g.raf?.p95)} | ${g.resources.sourceTextures ?? "n/a"} / ${g.resources.blurTextures ?? "n/a"} / ${g.resources.compositeTextures} |`,
  )
  .join(
    "\n",
  )}\n\n## Interpretation and boundaries\n\nCPU time wraps surface transform updates plus controller.render(), including scene painting and dirty upload submission. Browser paint, compositing and asynchronous GPU execution occur outside this timer. rAF samples are callback cadence, not presented frame timestamps or measured FPS. GPU timestamps and driver memory are not collected. Resource fields count JS-owned live allocations only.\n\nIdle cases issue no explicit draws and verify dirty scheduling stops. All ${ok.length} valid runs disposed controllers, cleared registered surfaces/listeners and removed stage children. afterUnregister records per-surface resource pruning before final disposal; shared scene textures can remain until disposal.\n\nCSS/solid do not implement full GPU optics; SVG is an approximation. These rows describe the cost of each fallback, not visual-equivalent competition. No cross-browser, DPR 2, React Flow, native HTML-in-Canvas or mobile performance claim follows from this run. Device/thermal state and other application load were not controlled. Short 60-frame windows are a baseline, not a soak test.\n\n${failed.length ? `Failures: ${failed.map((r) => `${r.requestedBackend}/${r.workload}: ${r.reason}`).join("; ")}` : "No run failures recorded."}\n`;
await writeFile(`${output}/report.md`, report);
await mkdir("public/benchmarks/results", { recursive: true });
await writeFile("public/benchmarks/results/latest.json", JSON.stringify(data));
console.log(
  JSON.stringify({
    input: resolve(input),
    groups: groups.length,
    valid: ok.length,
    failed: failed.length,
  }),
);
