import { labUrl } from "./url.js";
import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GlassProvider, GlassSurface, useGlass } from "../src/react.js";
import "../src/glass.css";
import "./performance.css";
const h = React.createElement;
const buildMode = import.meta.env.DEV ? "开发模式 StrictMode" : "生产构建";
const controllers = new Set();
let root,
  clicks = 0;
document.querySelector("#app").innerHTML =
  `<header><a href="${labUrl("")}">← Material studio</a><span>REACT / STRICT MODE</span><a href="${labUrl("benchmark.html")}">Performance ↗</a></header><main><h1>DOM 保持原生。</h1><p class="intro">React 19 · ${buildMode}，挂载 / 卸载 / 更新 / 输入契约。</p><div class="actions"><button id="mount">挂载</button><button id="unmount">卸载</button><button id="cycles">重复挂载 10 次</button></div><p id="status" role="status">等待挂载</p><div id="fixture"></div></main>`;
function Capture() {
  const { controller, state } = useGlass();
  useEffect(() => {
    if (controller) controllers.add(controller);
  }, [controller]);
  return h(
    "p",
    {
      className: "lg-content",
      style: { position: "absolute", bottom: 20, left: 24 },
    },
    `${state?.activeBackend ?? "initializing"} · surfaces ${controller?.surfaces.size ?? 0}`,
  );
}
function Example() {
  const [backend, setBackend] = useState("auto");
  const [count, setCount] = useState(0);
  return h(
    GlassProvider,
    {
      style: { width: "100%", height: 380 },
      settings: {
        backend,
        theme: "light",
        background: "testchart",
        controls: { blurPx: 6 },
      },
    },
    h(
      GlassSurface,
      {
        id: "input-card",
        zIndex: 1,
        style: {
          position: "absolute",
          left: 30,
          top: 40,
          width: 270,
          padding: 22,
        },
      },
      h(
        "label",
        null,
        "原生输入",
        h("input", {
          "aria-label": "原生输入",
          defaultValue: "Hello glass",
          style: { display: "block", marginTop: 12, width: "100%" },
        }),
      ),
      h(
        "button",
        {
          onClick: () => {
            clicks++;
            setCount(count + 1);
          },
          style: { marginTop: 16 },
        },
        `点击 ${count}`,
      ),
    ),
    h(
      GlassSurface,
      {
        as: "button",
        id: "backend-button",
        zIndex: 2,
        radius: 22,
        style: {
          position: "absolute",
          left: 340,
          top: 130,
          width: 185,
          height: 80,
        },
        onClick: () => setBackend(backend === "solid" ? "auto" : "solid"),
      },
      `切换后端 ${backend}`,
    ),
    h(Capture),
  );
}
function mount() {
  if (root) return;
  root = createRoot(document.querySelector("#fixture"));
  root.render(h(StrictMode, null, h(Example)));
  document.querySelector("#status").textContent = `已挂载 · ${buildMode}`;
}
function unmount() {
  root?.unmount();
  root = null;
  document.querySelector("#status").textContent =
    `已卸载 · ${controllers.size} 个可观察 controller · ${[...controllers].filter((c) => c.disposed).length} 已释放`;
}
document.querySelector("#mount").onclick = mount;
document.querySelector("#unmount").onclick = unmount;
document.querySelector("#cycles").onclick = async () => {
  unmount();
  for (let i = 0; i < 10; i++) {
    mount();
    await new Promise((r) => setTimeout(r, 100));
    for (const c of controllers) if (!c.disposed) await c.ready;
    unmount();
  }
  document.querySelector("#status").textContent += " · 10 次完成";
};
window.reactFixture = {
  get controllers() {
    return [...controllers].map((c) => ({
      disposed: c.disposed,
      surfaces: c.surfaces.size,
      listeners: c.listeners.size,
      backend: c.getState().activeBackend,
    }));
  },
  get clicks() {
    return clicks;
  },
};
mount();
