import test from "node:test";
import assert from "node:assert/strict";
import { summarize, summarizeRuns } from "../benchmarks/statistics.js";
test("nearest-rank percentiles preserve stalls and reject invalid input", () => {
  assert.equal(summarize([]), null);
  assert.equal(summarize([1, 2, 3, 4, 100]).p95, 100);
  assert.equal(summarize([1, 2, 3, 4]).p50, 2);
  assert.throws(() => summarize([NaN])); assert.throws(() => summarize([-1]));
});
test("aggregation excludes fallback failures and separates acquisition/resolution", () => {
  const r = { status: "ok", backend: "webgpu", capture: "scene", count: 10, look: "studio", workload: "move", layered: false, width: 960, height: 540, dpr: 1, cpuSamples: [1], rafSamples: [16], repeat: 1 };
  const groups = summarizeRuns([r, { ...r, repeat: 2 }, { ...r, status: "failed", cpuSamples: [999] }, { ...r, dpr: 2 }, { ...r, capture: "native-dom" }]);
  assert.equal(groups.length, 3); assert.equal(groups[0].repeats, 2); assert.equal(groups[0].cpu.max, 1);
});
