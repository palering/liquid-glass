import { t, pageUrl, localizeHtml, installLanguageSwitcher } from "./i18n.js";
import { labUrl } from "./url.js";
import {
  GlassController,
  createPreset,
  parsePreset,
  serializePreset,
  clarityControls,
} from "../src/index.js";
import "../src/glass.css";
import "./style.css";
import { runBenchmark } from "./benchmark.js";
import { opticalFields, looks, formatValue } from "./optics.js";
const icon = (s) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s}</svg>`;
const plus = icon('<path d="M12 5v14M5 12h14"/>');
document.querySelector("#app").innerHTML = localizeHtml(`
<header class="topbar"><a class="brand" href="${pageUrl("")}" aria-label="Liquid lab home"><span class="brand-symbol">◒</span>liquid<span class="brand-slash">/</span><span class="brand-sub">material lab</span></a><div class="edition">EXPERIMENT 001 <span class="edition-dot"></span> STUDIO</div><a class="app-link" href="${pageUrl("benchmark.html")}">Performance ↗</a></header>
<main><section class="intro"><div><p class="eyebrow">OPTICAL SURFACES / INTERACTIVE STUDY</p><h1>Light, with a little<br><em>less solidity.</em></h1></div><p class="intro-copy">同一种材质，三种表面。<br> 探索折射、散射与边缘光，<br> 让内容保持清晰，让背景流动。</p></section>
<div class="workbench"><section class="preview-wrap"><div class="preview-label"><span><i></i> LIVE MATERIAL PREVIEW</span><span id="render-label">INITIALIZING</span></div>
<div class="experiment-toolbar"><div class="view-buttons" role="group" aria-label="预览场景"><button class="selected" data-view="optics">光学样片</button><button data-view="workflow">业务卡片</button><button data-view="layers">玻璃叠层</button></div><label><input id="effect-enabled" type="checkbox" checked> 玻璃效果 <span>关闭看原背景</span></label></div>
<div id="stage" class="lg-stage optics-view" data-theme="light">
<button id="optical-sample" class="surface optical-sample" style="border-radius:78px" aria-label="拖动光学样片" title="拖动样片或使用方向键"><span class="lg-content">⠿</span></button><button id="layer-a" class="surface layer-pane layer-a" aria-label="拖动下层玻璃"><span class="lg-content">⠿</span></button><button id="layer-b" class="surface layer-pane layer-b" aria-label="拖动中层玻璃"><span class="lg-content">⠿</span></button><span class="sample-caption">OPTICAL SAMPLE · DRAG TO INSPECT</span>
<div class="scene-note">DRAG THE SAMPLE.<br>WATCH THE EDGES.</div>
<article id="review-card" class="surface review-card" style="border-radius:22px"><div class="lg-content"><div class="card-title"><span class="pixel-mark">✣</span><span>Building Review</span><span class="grip" aria-label="拖动卡片" role="button" tabindex="0" title="拖动，或用方向键移动">⠿</span></div><img src="${labUrl("assets/storefront.png")}" alt="建筑审核的餐厅店面" draggable="false"><div class="card-body"><p><span class="muted">Info:</span> Additional info needed</p><div class="inset">Missing structural blueprints for the kitchen area. Applicant notified to upload updated floor plans.</div><div class="tags"><span>Missing Docs</span><span>Medium Priority</span></div></div></div><div class="warm-rim"></div></article>
<button id="liquid-button" class="surface liquid-button" style="border-radius:50%" aria-label="添加审核步骤"><span class="lg-content">${plus}</span></button><span class="button-caption">LIQUID CONTROL</span>
<aside id="frosted-panel" class="surface frosted-panel" style="border-radius:25px"><div class="lg-content"><div class="panel-heading"><h2>Weekly Activity</h2><span>↗</span></div><div class="metric"><p>Total Permit Fees</p><strong>$12,279<span>↗ 12.8%</span></strong><div class="bars">${Array.from({ length: 40 }, (_, i) => `<i style="height:${20 + Math.sin(i * 0.16) * 32 + ((i * 17) % 29)}px"></i>`).join("")}</div><div class="week"><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div></div><div class="tasks"><div><i class="status-dot"></i><span>Completed Tasks<small>4 tasks closed · Last: Zoning Review</small></span><span>⌄</span></div><div><i class="pending-dot"></i><span>In progress<small>2 active reviews · Due in 3 days</small></span><span>⌄</span></div></div><div class="panel-foot"><span>112 permits completed</span><span>THIS WEEK</span></div></div></aside>
<div class="scene-footer"><span id="interaction-note">卡片可拖动 · 加号可点击</span><span>01 / GLASS SYSTEM</span></div></div>
<div class="preview-bottom"><span id="capture-label">BACKDROP / OWNED SCENE</span><span id="draw-label">—</span></div><p class="scene-boundary">测试图上的线条、文字与色块都属于场景纹理，可以被折射；业务卡片内容保持真实 DOM，尚不参与背景采集。叠层模式仅叠加玻璃材质纹理；不采集前景 DOM，业务界面建议避免过多玻璃覆盖。</p></section>
<aside class="controls"><div class="controls-title"><span>Surface controls</span><button id="reset" aria-label="恢复默认" title="恢复默认">↺</button></div>
<div class="control-section"><p class="section-label">01 / ENVIRONMENT</p><div class="theme-buttons" role="group" aria-label="主题"><button class="selected" data-theme="dark">◐ 深色</button><button data-theme="light">◑ 浅色</button></div><label class="field">背景<select id="background" aria-label="背景"><option value="testchart">光学测试图</option><option value="gradient">环境渐变</option><option value="grid">点阵网格</option><option value="checker">棋盘测试</option><option value="image">示例图片</option></select></label><label class="upload-label">导入本地图片 <span>↗</span><input type="file" id="image-file" accept="image/*"></label></div>
<div class="control-section"><p class="section-label">02 / MATERIAL</p><label class="field">材质预设<select id="look" aria-label="材质预设"><option value="studio">Studio · 光学基准</option><option value="clear">Clear · 厚边透明</option><option value="frosted">Frosted · 磨砂</option><option value="subtle">Subtle · 业务克制</option><option value="regular">Regular · 均衡可读</option><option value="tinted">Tinted · 降低干扰</option><option value="reading">Reading · 阅读优先</option><option value="custom" disabled>Custom · 自定义</option></select></label><p class="control-hint">20 个独立参数，另有染色和连续清透度。先用「光学基准 + 测试图」看折射，再切业务卡片。不同后端会禁用不支持的参数。</p><div class="clarity-control"><label class="slider-label" for="clarity">清透 → 浓染 <output id="clarity-value">自定义光学</output></label><input id="clarity" aria-label="清透至浓染" type="range" min="0" max="100" step="1" value="0"><p class="control-hint">联动折射、散射与遮罩；借鉴 Apple 可读性原则，非系统参数复刻。</p></div><div class="optical-fields">${opticalFields.map((f) => `<div><label class="slider-label" for="${f[0]}">${f[1]} <output id="${f[0]}-value">${formatValue(f, f[5])}</output></label><input aria-label="${f[1]}" id="${f[0]}" type="range" min="${f[2]}" max="${f[3]}" step="${f[4]}" value="${f[5]}"></div>`).join("")}</div><label class="field tint-field">玻璃染色 <input id="tint-color" type="color" aria-label="玻璃染色" value="#d8e6cc"></label><label class="toggle-row"><span>跟随主题染色</span><input id="auto-tint" type="checkbox" checked></label><label class="toggle-row"><span>同时模糊折射边缘</span><input id="blur-edge" type="checkbox" checked></label></div>
<div class="control-section preset-section"><p class="section-label">03 / PRESETS</p><label class="field">我的预设<select id="saved-preset" aria-label="我的预设"><option value="">选择已保存预设</option></select></label><label class="field">名称<input id="preset-name" aria-label="预设名称" maxlength="80" placeholder="例如：柔光侧栏"></label><div class="preset-actions"><button id="save-preset">保存为预设</button><button id="export-preset">生成 JSON</button></div><details class="preset-json"><summary>JSON 导入 / 查看</summary><textarea id="preset-json" aria-label="预设 JSON" spellcheck="false" placeholder="粘贴预设 JSON"></textarea><div class="preset-actions"><button id="import-preset">校验并导入</button><button id="copy-preset">复制 JSON</button></div><a id="download-preset" class="download-preset" hidden download="liquid-glass-preset.json">下载 JSON 文件 ↓</a><label class="upload-label">导入 JSON 文件<input type="file" id="preset-file" accept=".json,application/json"></label></details><p id="preset-status" class="control-hint" aria-live="polite">预设保存在本浏览器；JSON 不包含本地图片。</p></div>
<div class="control-section"><p class="section-label">04 / RENDERING</p><label class="field">后端<select id="backend" aria-label="后端"><option value="auto">Auto · GPU 优先</option><option value="webgpu">WebGPU</option><option value="webgl">WebGL 2</option><option value="svg">SVG · 位移近似</option><option value="css">CSS · 毛玻璃</option><option value="solid">Solid · 实色</option></select></label><label class="field">背景采集<select id="capture" aria-label="背景采集"><option value="scene">Scene · 场景纹理</option><option value="native-dom">HTML-in-Canvas · 实验</option></select></label><label class="field">质量<select id="quality" aria-label="质量"><option value="high">High · DPR ≤ 2</option><option value="medium">Medium · DPR ≤ 1.5</option><option value="low">Low · DPR 1</option></select></label><label class="toggle-row"><span>玻璃材质相互折射</span><input id="layered" type="checkbox"></label><p class="control-hint" id="layer-note">GPU 逐层合成；SVG/CSS 保留各自的降级效果。</p><label class="toggle-row"><span>背景流动</span><input id="animation" type="checkbox" role="switch"></label>
<div class="runtime-status" aria-live="polite"><div><i></i><span id="active-backend">Initializing…</span></div><p id="status-detail">检测渲染能力与首帧。</p></div><details class="native-info"><summary>HTML-in-Canvas 能力诊断</summary><pre id="native-report"></pre><p class="control-hint">页面参数无法启用原生 API。普通 Chrome 可在 chrome://flags/#canvas-draw-element 实验；内置浏览器暂无已确认的启动参数入口。</p><a href="https://developer.chrome.com/blog/html-in-canvas-ot-changes" target="_blank" rel="noopener">Chrome 实验 API 变更 ↗</a></details><button class="fault-button" id="simulate-loss">模拟当前后端故障 ↘</button></div>
</aside></div><div class="reference-links">参考演示 <a href="https://liquid-glass-studio.vercel.app/" target="_blank" rel="noopener">Studio ↗</a><a href="https://liquid-glass.ybouane.com/" target="_blank" rel="noopener">ybouane ↗</a><a href="https://liquid-dom-showcase.vercel.app/" target="_blank" rel="noopener">Liquid DOM ↗</a><span>不同背景 / 采集方式，不作为性能排名。</span></div><footer class="page-footer"><span>SEVEN LOOKS. ONE MATERIAL LANGUAGE.</span><span>GPU OPTICS / DOM CONTENT</span></footer></main>`);
const $ = (s) => document.querySelector(s),
  stage = $("#stage");
document.documentElement.dataset.theme = "light";
let activeLook = "studio",
  activeView = "optics";
const controller = new GlassController(stage, {
  background: "testchart",
  theme: "light",
  controls: { ...looks.studio },
});
controller.register($("#optical-sample"), {
  id: "sample",
  kind: "control",
  radius: 78,
  zIndex: 30,
});
controller.register($("#layer-a"), {
  id: "layer-a",
  kind: "panel",
  radius: 45,
  zIndex: 10,
});
controller.register($("#layer-b"), {
  id: "layer-b",
  kind: "card",
  radius: 55,
  zIndex: 20,
});
window.glassLab = {
  controller,
  getState: () => controller.getState(),
  benchmark: (count) => runBenchmark(controller, count),
};
controller.register($("#review-card"), {
  id: "review",
  kind: "card",
  radius: 22,
});
controller.register($("#liquid-button"), {
  id: "plus",
  kind: "control",
  radius: 100,
});
controller.register($("#frosted-panel"), {
  id: "panel",
  kind: "panel",
  radius: 25,
});
let imageUrl = null;
controller.subscribe((state) => {
  $("#background").value = state.settings.background;
  $("#backend").value = state.settings.backend;
  $("#capture").value = state.settings.capture;
  $("#quality").value = state.settings.quality;
  $("#animation").checked = state.animating;
  $("#animation").disabled = state.reducedMotion;
  const backend = state.activeBackend?.toUpperCase() ?? "INITIALIZING";
  $("#active-backend").textContent = t(backend + " / " + state.phase);
  $("#render-label").textContent = t(backend);
  $("#capture-label").textContent =
    t("BACKDROP / " + state.activeCapture.toUpperCase());
  $("#status-detail").textContent =
    t([state.fallbackReason, state.captureReason, state.imageReason]
      .filter(Boolean)
      .join(" · ") || "场景纹理取样 · 共享渲染器 · 清晰 DOM 内容");
  $("#draw-label").textContent =
    t(`${state.draws} draws · CPU ${state.cpuMs.toFixed(1)} ms`);
  $("#draw-label").title = t("CPU 提交与场景生成时间，不是 GPU 耗时或帧率");
  const gpu = ["webgpu", "webgl"].includes(state.activeBackend),
    svg = state.activeBackend === "svg";
  for (const f of opticalFields) {
    const input = $("#" + f[0]),
      value = state.settings.controls[f[0]] ?? f[5];
    input.value = value;
    $("#" + f[0] + "-value").textContent = t(formatValue(f, value));
    input.disabled = !{
      gpu,
      "gpu-svg": gpu || svg,
      blur: state.activeBackend !== "solid",
      tint: state.activeBackend !== "solid",
      rim: true,
      shape: true,
      shadow: true,
    }[f[7]];
  }
  $("#layered").checked = state.settings.layered;
  $("#layered").disabled = !gpu;
  $("#layer-note").textContent = t(gpu
    ? "GPU 逐层合成；不采集前景 DOM。"
    : "当前后端不支持材质相互折射；所选偏好仍会保留。");
  $("#auto-tint").checked =
    !state.settings.controls.tintColor ||
    state.settings.controls.tintColor === "auto";
  $("#tint-color").disabled = $("#auto-tint").checked;
  if (!$("#auto-tint").checked)
    $("#tint-color").value = state.settings.controls.tintColor;
  document.documentElement.dataset.theme = state.settings.theme;
  $("#effect-enabled").checked = state.settings.enabled;
  $("#blur-edge").disabled = !gpu;
  $("#blur-edge").checked = state.settings.controls.blurEdge !== false;
  for (const b of document.querySelectorAll(".theme-buttons button"))
    b.classList.toggle("selected", b.dataset.theme === state.settings.theme);
  for (const option of $("#backend").options)
    option.disabled = state.capabilities[option.value] === false;
  const nativeOption = $('#capture option[value="native-dom"]');
  nativeOption.disabled = !state.nativeSupported;
  nativeOption.textContent = t(state.nativeSupported
    ? "HTML-in-Canvas · 实验"
    : "HTML-in-Canvas · 当前未开放");
});
for (const button of document.querySelectorAll("[data-theme]"))
  if (button.tagName === "BUTTON")
    button.onclick = () => {
      document.documentElement.dataset.theme = button.dataset.theme;
      for (const b of document.querySelectorAll(".theme-buttons button"))
        b.classList.toggle("selected", b === button);
      void controller.setSettings({ theme: button.dataset.theme });
    };
for (const f of opticalFields)
  $("#" + f[0]).oninput = (e) => {
    activeLook = "custom";
    $("#look").value = activeLook;
    $("#clarity-value").textContent = t("自定义光学");
    void controller.setSettings({
      controls: { [f[0]]: Number(e.target.value) },
    });
  };
$("#look").onchange = (e) => {
  activeLook = e.target.value;
  $("#clarity-value").textContent = t("预设光学");
  void controller.setSettings({
    controls: { ...looks[activeLook], blurEdge: true },
  });
};
$("#blur-edge").onchange = (e) => {
  activeLook = "custom";
  $("#look").value = activeLook;
  void controller.setSettings({ controls: { blurEdge: e.target.checked } });
};
$("#effect-enabled").onchange = (e) =>
  void controller.setSettings({ enabled: e.target.checked });
function setView(view) {
  activeView = view;
  stage.classList.toggle("optics-view", view !== "workflow");
  stage.classList.toggle("layers-view", view === "layers");
  for (const b of document.querySelectorAll("[data-view]"))
    b.classList.toggle("selected", b.dataset.view === view);
  controller.invalidate();
}
for (const button of document.querySelectorAll("[data-view]"))
  button.onclick = () => {
    setView(button.dataset.view);
    if (activeView === "layers") void controller.setSettings({ layered: true });
  };
$("#layered").onchange = (e) =>
  void controller.setSettings({ layered: e.target.checked });
$("#clarity").oninput = (e) => {
  const value = Number(e.target.value);
  $("#clarity-value").textContent = t(`${value}%`);
  activeLook = "custom";
  $("#look").value = activeLook;
  void controller.setSettings({ controls: clarityControls(value / 100) });
};
$("#tint-color").oninput = (e) =>
  void controller.setSettings({ controls: { tintColor: e.target.value } });
$("#auto-tint").onchange = (e) =>
  void controller.setSettings({
    controls: { tintColor: e.target.checked ? "auto" : $("#tint-color").value },
  });
for (const id of ["backend", "quality", "capture"])
  $("#" + id).onchange = (e) =>
    void controller.setSettings({ [id]: e.target.value });
$("#background").onchange = async (e) => {
  if (e.target.value === "image")
    await controller.setImage(imageUrl || labUrl("assets/insights.png"));
  else await controller.setSettings({ background: e.target.value });
};
$("#image-file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(f);
  await controller.setImage(imageUrl);
  $("#background").value = controller.settings.background;
};
$("#animation").onchange = (e) => controller.setAnimation(e.target.checked);
$("#simulate-loss").onclick = () => controller.simulateLoss();
$("#reset").onclick = async () => {
  document.querySelector('.theme-buttons button[data-theme="light"]').click();
  for (const el of [card, $("#optical-sample"), $("#layer-a"), $("#layer-b")]) {
    el.style.left = "";
    el.style.top = "";
  }
  document.querySelector('[data-view="optics"]').click();
  activeLook = "studio";
  $("#look").value = activeLook;
  $("#clarity").value = 0;
  $("#clarity-value").textContent = t("预设光学");
  controller.setAnimation(false);
  await controller.setSettings({
    backend: "auto",
    capture: "scene",
    background: "testchart",
    quality: "high",
    enabled: true,
    layered: false,
    controls: { ...looks.studio, blurEdge: true },
  });
  await controller.retry();
};
let clicks = 0;
$("#liquid-button").onclick = () => {
  $("#interaction-note").textContent = t(`已添加示例审核步骤 · ${++clicks}`);
};
const card = $("#review-card");
function bindDrag(card, grip) {
  let drag = null;
  grip.onpointerdown = (e) => {
    const r = card.getBoundingClientRect(),
      s = stage.getBoundingClientRect();
    drag = {
      x: e.clientX,
      y: e.clientY,
      left: r.left - s.left,
      top: r.top - s.top,
    };
    grip.setPointerCapture(e.pointerId);
    card.classList.add("dragging");
  };
  grip.onpointermove = (e) => {
    if (!drag) return;
    card.style.left =
      Math.max(
        6,
        Math.min(
          stage.clientWidth - card.offsetWidth - 6,
          drag.left + e.clientX - drag.x,
        ),
      ) + "px";
    card.style.top =
      Math.max(
        6,
        Math.min(
          stage.clientHeight - card.offsetHeight - 6,
          drag.top + e.clientY - drag.y,
        ),
      ) + "px";
    controller.invalidate();
  };
  grip.onpointerup = grip.onpointercancel = () => {
    drag = null;
    card.classList.remove("dragging");
  };
  grip.onkeydown = (e) => {
    const offsets = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, -10],
      ArrowDown: [0, 10],
    };
    if (!offsets[e.key]) return;
    e.preventDefault();
    const [x, y] = offsets[e.key];
    card.style.left =
      Math.max(
        6,
        Math.min(stage.clientWidth - card.offsetWidth - 6, card.offsetLeft + x),
      ) + "px";
    card.style.top =
      Math.max(
        6,
        Math.min(
          stage.clientHeight - card.offsetHeight - 6,
          card.offsetTop + y,
        ),
      ) + "px";
    controller.invalidate();
  };
}
bindDrag(card, $(".grip"));
bindDrag($("#optical-sample"), $("#optical-sample"));
bindDrag($("#layer-a"), $("#layer-a"));
bindDrag($("#layer-b"), $("#layer-b"));
const storageKey = "workspace-liquid-glass.presets.v1";
let savedPresets = [];
const presetStatus = (message) => ($("#preset-status").textContent = t(message));
function refreshPresets() {
  $("#saved-preset").replaceChildren(
    new Option(t("选择已保存预设"), ""),
    ...savedPresets.map((p, i) => new Option(p.name, String(i))),
  );
}
try {
  const raw = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  if (!Array.isArray(raw) || raw.length > 100)
    throw new Error("预设列表格式错误");
  savedPresets = raw.map(parsePreset);
  refreshPresets();
} catch (e) {
  presetStatus(`本地预设未读取：${e.message}`);
}
function storePreset(p) {
  const next = savedPresets.filter((x) => x.name !== p.name);
  next.push(p);
  if (next.length > 100)
    throw new Error("最多保存 100 个预设，请使用 JSON 导出归档");
  localStorage.setItem(storageKey, JSON.stringify(next));
  savedPresets = next;
  refreshPresets();
  $("#saved-preset").value = String(next.length - 1);
  $("#preset-name").value = p.name;
}
async function applyPreset(p) {
  const validated = parsePreset(p);
  if (validated.settings.background === "image") {
    if (!(await controller.setImage(imageUrl || labUrl("assets/insights.png"))))
      throw new Error("图片请求已取消或加载失败；预设未应用");
  }
  await controller.setSettings(validated.settings);
  activeLook = "custom";
  $("#look").value = activeLook;
  $("#preset-name").value = validated.name;
  $("#clarity-value").textContent = t("自定义光学");
}
$("#saved-preset").onchange = async (e) => {
  if (e.target.value === "") return;
  try {
    await applyPreset(savedPresets[Number(e.target.value)]);
    presetStatus("已应用预设；不支持的后端会沿降级链运行。");
  } catch (e) {
    presetStatus(e.message);
  }
};
$("#save-preset").onclick = () => {
  try {
    storePreset(createPreset($("#preset-name").value, controller.settings));
    presetStatus("已保存；相同名称会更新为当前参数。");
  } catch (e) {
    presetStatus(`保存失败：${e.message}`);
  }
};
let downloadUrl = null;
$("#export-preset").onclick = () => {
  try {
    const p = createPreset(
        $("#preset-name").value || t("自定义材质"),
        controller.settings,
      ),
      json = serializePreset(p);
    $("#preset-json").value = json;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    $(".preset-json").open = true;
    $("#download-preset").href = downloadUrl;
    $("#download-preset").hidden = false;
    presetStatus(
      "JSON 已生成，可复制或下载；文件下载取决于浏览器支持。图片需另行导入。",
    );
  } catch (e) {
    presetStatus(`导出失败：${e.message}`);
  }
};
$("#copy-preset").onclick = async () => {
  try {
    parsePreset($("#preset-json").value);
    await navigator.clipboard.writeText($("#preset-json").value);
    presetStatus("JSON 已复制。");
  } catch (e) {
    presetStatus(`复制未完成：${e.message}，可从文本框手动复制。`);
  }
};
async function importPreset(json) {
  try {
    const p = parsePreset(json);
    await applyPreset(p);
    try {
      storePreset(p);
      presetStatus("已校验、导入并保存。");
    } catch (e) {
      presetStatus(`已应用；本地保存失败：${e.message}`);
    }
  } catch (e) {
    presetStatus(`导入失败：${e.message}`);
  }
}
$("#import-preset").onclick = () => void importPreset($("#preset-json").value);
$("#preset-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 64000) {
    presetStatus("导入失败：预设超过 64 KB");
    return;
  }
  try {
    const json = await file.text();
    $("#preset-json").value = json;
    await importPreset(json);
  } catch (e) {
    presetStatus(e.message);
  }
};
const apis = {
  "2D drawElementImage":
    typeof CanvasRenderingContext2D.prototype.drawElementImage === "function",
  "canvas requestPaint":
    typeof HTMLCanvasElement.prototype.requestPaint === "function",
  "content drawable": "content" in HTMLCanvasElement.prototype,
  "GPU drawElementImageToTexture":
    typeof GPUQueue !== "undefined" &&
    typeof GPUQueue.prototype.drawElementImageToTexture === "function",
  "GPU copyElementImageToTexture":
    typeof GPUQueue !== "undefined" &&
    typeof GPUQueue.prototype.copyElementImageToTexture === "function",
  "GL texElementSubImage2D":
    typeof WebGL2RenderingContext !== "undefined" &&
    typeof WebGL2RenderingContext.prototype.texElementSubImage2D === "function",
};
$("#native-report").textContent = Object.entries(apis)
  .map(([name, supported]) => `${supported ? "✓" : "—"} ${name}`)
  .join("\n");
window.addEventListener("pagehide", () => {
  controller.dispose();
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  if (imageUrl) URL.revokeObjectURL(imageUrl);
});

installLanguageSwitcher();
