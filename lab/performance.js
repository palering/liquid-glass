import "../src/glass.css";
import "./performance.css";
import { runSuite } from "../benchmarks/runner.js";
import { summarizeRuns } from "../benchmarks/statistics.js";

document.querySelector("#app").innerHTML = `
<header><a href="/">← Material studio</a><span>LIQUID GLASS / ENGINEERING</span><a href="/react-smoke.html">React fixture ↗</a></header>
<main><p class="eyebrow">BENCHMARK PROTOCOL 01</p><h1>性能，需要有据可查。</h1>
<p class="intro">同一场景，五种后端。保留原始样本、三次重复和资源清理结果，让下一次调整有可比较的起点。</p>
<div class="specs"><span>960 × 540</span><span>DPR ≤ 1</span><span>10 / 50 / 100 surfaces</span><span>12 warmup + 60 frames</span><span>3 repeats</span></div>
<section class="actions"><button id="run">运行完整测试</button><button id="cancel" disabled>停止</button><button id="export" disabled>导出 JSON</button><button id="saved">查看已归档数据</button><label>后端 <select id="backend"><option value="all">全部</option><option>webgpu</option><option>webgl</option><option>svg</option><option>css</option><option>solid</option></select></label></section>
<p id="progress" role="status">准备就绪。测试时请保留当前标签页，避免切换或改变窗口尺寸。</p>
<div class="metrics" id="metrics"><article><strong>—</strong><span>有效测试</span></article><article><strong>—</strong><span>CPU 提交 p95</span></article><article><strong>—</strong><span>空载 rAF 间隔</span></article><article><strong>—</strong><span>资源清理</span></article></div>
<p class="boundary">CPU 包含节点更新与绘制提交；rAF 是回调间隔，不是实际呈现 FPS。没有采集 GPU 时间或驱动显存。CSS / solid 光学能力较少，速度不能作为相同视觉效果的排名。</p>
<div id="table"></div><details><summary>原始 JSON / 复制保存</summary><textarea id="raw" readonly aria-label="原始 JSON"></textarea></details>
<section class="fixture"><div class="fixture-label"><span>LIVE FIXTURE</span><span id="case-label">固定场景 / 每个测试独立创建与销毁</span></div><div class="fixture-scroll"><div id="host"></div></div></section>
</main>`;
let result = null,
  abort = null,
  progress = null;
const $ = (x) => document.querySelector(x);
const fmt = (n) => (n == null ? "—" : n.toFixed(2));
function show(data) {
  result = data;
  $("#raw").value = JSON.stringify(data, null, 2);
  $("#export").disabled = false;
  const ok = data.runs.filter((r) => r.status === "ok");
  $("#metrics").innerHTML =
    `<article><strong>${ok.length} / ${data.totalCases}</strong><span>有效测试</span></article><article><strong>${data.environment.nativeCapture ? "实验 API" : "未开放"}</strong><span>原生 DOM 采集</span></article><article><strong>${fmt(data.calibration.raf.p50)} ms</strong><span>空载 rAF 中位数</span></article><article><strong>${ok.every((r) => r.cleanup.remainingChildren === 0) ? "PASS" : "FAIL"}</strong><span>DOM 清理</span></article>`;
  const rows = summarizeRuns(data.runs).filter(
    (r) => $("#backend").value === "all" || r.backend === $("#backend").value,
  );
  $("#table").innerHTML =
    `<div class="table-scroll"><table><thead><tr><th>后端 / 预设</th><th>场景</th><th>表面</th><th>CPU p50 / p95 ms</th><th>rAF p50 / p95 ms</th><th>纹理 源/模糊/合成</th><th>重复</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r.backend}</b><small>${r.look}${r.layered ? " · layered" : ""}</small></td><td>${r.workload}</td><td>${r.count}</td><td>${fmt(r.cpu?.p50)} / <b>${fmt(r.cpu?.p95)}</b></td><td>${fmt(r.raf?.p50)} / ${fmt(r.raf?.p95)}</td><td>${r.resources.sourceTextures ?? "—"} / ${r.resources.blurTextures ?? "—"} / ${r.resources.compositeTextures}</td><td>${r.repeats}</td></tr>`).join("")}</tbody></table></div>`;
}
$("#run").onclick = async () => {
  if (abort) return;
  abort = new AbortController();
  $("#run").disabled = true;
  $("#cancel").disabled = false;
  $("#saved").disabled = true;
  try {
    const fingerprint = await fetch("/benchmark-source.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const data = await runSuite($("#host"), {
      signal: abort.signal,
      sourceFingerprint: fingerprint,
      onProgress(p) {
        progress = p;
        $("#progress").textContent =
          `${p.completed} / ${p.total}${p.done ? " · 采样结束" : " · 测试中，请保留当前标签页"}`;
        if (p.spec)
          $("#case-label").textContent =
            `${p.spec.backend} / ${p.spec.look} / ${p.spec.workload} / ${p.spec.count} / repeat ${p.spec.repeat}`;
      },
    });
    show(data);
    $("#progress").textContent +=
      ` · ${data.runs.filter((r) => r.status === "failed").length} 失败 / ${data.runs.filter((r) => r.status === "skipped").length} 跳过`;
  } catch (e) {
    $("#progress").textContent = e.message;
  } finally {
    abort = null;
    $("#run").disabled = false;
    $("#cancel").disabled = true;
    $("#saved").disabled = false;
  }
};
$("#cancel").onclick = () => abort?.abort();
$("#backend").onchange = () => {
  if (result) show(result);
};
$("#export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "liquid-glass-benchmark.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#saved").onclick = async () => {
  try {
    const r = await fetch("/benchmarks/results/latest.json");
    if (!r.ok) throw new Error("尚未生成归档数据；先运行完整测试。");
    show(await r.json());
    $("#progress").textContent =
      `归档采样 ${result.startedAt} · ${result.environment.userAgent}`;
  } catch (e) {
    $("#progress").textContent = e.message;
  }
};
// App-owned automation seam. Never stores browser or user data outside this page.
window.performanceLab = {
  get result() {
    return result;
  },
  get progress() {
    return progress;
  },
  get running() {
    return !!abort;
  },
};
