# Liquid Glass

Audience: public

独立的玻璃材质库与交互实验室。2026-10-06：v0.4 独立工程基线，包含框架无关核心、React 19 薄适配、类型声明、包验收与可复跑性能矩阵。当前消费范围是实验室；尚未接入无限画布或完成生产稳定性验收。

[GitHub 仓库](https://github.com/palering/liquid-glass) · [在线实验室](https://palering.github.io/liquid-glass/) · [性能页](https://palering.github.io/liquid-glass/benchmark.html) · [React fixture](https://palering.github.io/liquid-glass/react-smoke.html)。GitHub Pages 部署流程与实际验证见 [部署说明](docs/deployment.md)。

## 运行

```sh
npm ci --cache .local/npm-cache
npm run dev
npm run build
npm test
npm run typecheck
npm run test:package
# 固定构建测试，避免热更新干扰
npm run preview
```

开发实验室：http://127.0.0.1:4174/ 。固定构建：http://127.0.0.1:4175/ 。`/benchmark.html` 是独立性能页，`/react-smoke.html` 是 React 交互契约页。构建分别输出 `dist/lab/`（多入口网站）和 `dist/lib/`（ESM 核心及 React 绑定）。不依赖相邻工程即可运行。包保持 private / UNLICENSED，公开许可待选；上游 MIT 声明保留。Git、包文件白名单与兼容边界见 [package contract](docs/package-contract.md)。

性能页可查看归档数据或运行 147 组测试，支持 JSON 导出与后端筛选；运行时需让 960 × 540 测试区域完全出现在视口内，保留当前标签页。把导出结果保存为 `benchmarks/results/latest.json`，运行 `npm run bench:report` 生成汇总 CSV 和报告。复跑条件及实测结论见 [性能说明](docs/performance.md)，验收入口见 [验收清单](docs/acceptance.md)。

## 已实现

- WebGPU 优先，实际初始化失败/设备丢失时降级 WebGL2 → SVG → CSS → solid；可全局选择后端、重试和模拟故障。
- 卡片、圆形控件、磨砂面板三类基础材质；实验室额外提供 Studio 光学基准、厚边透明、磨砂、业务克制以及 Regular / Tinted / Reading 七种全局外观。20 个独立滑块、连续清透度、染色及边缘模糊开关，前景内容保持 DOM。
- 默认用独立可拖动光学样片与彩色线条/文字测试图；可切业务卡片，开关玻璃效果对照原背景。默认实验室参数更强调折射，库本身默认仍保留克制材质。
- 一个共享 renderer/context，GPU 降采样 + 双向高斯模糊，按半径复用并回收纹理；视口外剔除，静态 dirty 重绘，注销及切换释放资源。
- 深色/灰白浅色；网格、渐变、棋盘、示例图片及本地图片背景；失败回到网格。
- 光学叠层场景、GPU 可选材质相互折射；按 register 的 zIndex 排序，不采集前景 DOM。
- 可命名保存、更新和恢复预设；校验 JSON 导入/生成/复制及可选文件下载。
- 可指针/键盘移动的卡片，真实按钮点击，减少动态效果时停用背景动画。
- 实验性 HTML-in-Canvas 2D 采集桥；当前内置浏览器没有开放 API，因此入口禁用，原生采集未验证。

## 核心使用

```js
import { GlassController } from '@workspace/liquid-glass';
import '@workspace/liquid-glass/styles.css';

const glass = new GlassController(stage, {
  backend: 'auto', capture: 'scene', theme: 'dark', background: 'grid'
});
const unregister = glass.register(cardElement, {
  id: 'building-review', kind: 'card', radius: 22
});
const unsubscribe = glass.subscribe(state => {
  // requestedBackend / activeBackend / activeCapture / fallbackReason
});
await glass.ready;
await glass.setSettings({ controls: { refraction: 1.2, blur: 0.8 } });
// 平移/transform 不会触发 ResizeObserver；消费方在视口变化时调用。
glass.invalidate();
// 卸载：unsubscribe(); unregister(); glass.dispose();
```

`stage` 必须有明确尺寸且带 `lg-stage` 类，surface 位置和大小由消费方 CSS 管理。内容需使用 `lg-content` 容器分层；不要给整个 surface 设置 opacity/filter。当前 API：

| 设置 | 值 |
| --- | --- |
| backend | auto / webgpu / webgl / svg / css / solid |
| capture | scene / native-dom（实验；不可用时报告并回到 scene） |
| theme | dark / light |
| background | grid / gradient / checker / testchart / image |
| layered | true / false；仅 GPU 逐层合成材质，默认 false |
| enabled | true / false；关闭仅移除材质层，保留场景及 DOM |
| quality | low（DPR ≤ 1）/ medium（≤ 1.5）/ high（≤ 2） |
| controls | blur / refraction / highlight 为预设倍率，tint 为遮罩增量 |

`controls` 另支持绝对参数覆盖（未提供时继续使用原预设与倍率）：`distance`（shader 归一化距离）、`thickness` / `blurPx` / `radius`（CSS px）、`ior`、`dispersion`、`tintOpacity`、`roundness`、`fresnelRange` / `fresnelHardness` / `fresnelFactor`、`glareRange` / `glareHardness` / `glareFactor` / `glareConvergence` / `glareOpposite`、`glareAngle`（度），`shadowOpacity` / `shadowBlur` / `shadowY`（CSS 投影）、`tintColor`（auto 或 #rrggbb），及 `blurEdge`（boolean）。范围/硬度是 Studio shader 参数，不能当作实测物理量；glareFactor 也控制 CSS 细亮边。GPU 支持完整光学参数；SVG 只近似位移、厚度、模糊、遮罩与圆角，CSS/solid 会禁用其余无对应效果的入口。

预设及参数定义在 `src/config.js`，核心导出 `looks` / `opticalFields` / `clarityControls`。它覆盖所有可调项，不代表三个参考项目已达到像素一致，也没有实现它们的全部能力：形状融合、显微扰动、多灯光和完整 DOM 采集仍未接入；相互折射当前只包含自有材质纹理。

`setImage(url)` 加载图片并切换 image 背景，失败切到 grid；`retry()` 重新从所选优先级初始化。`simulateLoss()` 是实验室故障入口。实验室显式命名预设存入 localStorage；不会自动保存所有临时操作。system theme、视频及更通用背景 source 接口仍是后续目标。

```js
import { createPreset, serializePreset, parsePreset, looks } from "@workspace/liquid-glass";
const preset = createPreset("柔光侧栏", { ...glass.settings, controls: looks.regular });
const json = serializePreset(preset);
await glass.setSettings(parsePreset(json).settings);
```

预设 schema v1 校验选项、有限数值、范围、颜色和版本，保留请求后端偏好；运行时仍按实际能力降级。JSON 不包含图片；重新载入 image look 时需消费方提供图片。文件下载依赖浏览器支持，实验室始终提供可复制 JSON。

React 绑定导出 `GlassProvider`、`GlassSurface` 和 `useGlass`，位于 `@workspace/liquid-glass/react`，需要消费方 React 19；TypeScript 项目需要 React 类型。Provider 接受 div 的 style/DOM 属性，Surface 接受 `kind`、`radius`、注册用 `id`、`zIndex` 及 DOM 属性。一个 Provider 共享一个 controller；不要逐节点创建 Provider。已通过开发模式 StrictMode 输入/点击/切换/十次卸载，以及打包消费者的无 DOM 导入与 React SSR ；React Flow、hydration、跨浏览器尚未验收。Svelte 适配仍为后续计划。

## 取样与边界

GPU 和 SVG 当前取样的是库绘制的场景纹理，不会自动折射页面任意 DOM、卡片照片或 SVG 连线。SVG 使用裁切背景图和位移贴图，属于 scene 位移近似，尚未实现跨浏览器 SVG backdrop filter 路径。CSS 只提供浏览器背景模糊，不宣称有折射。

GPU 模糊使用降采样低通与双向高斯 pass；可选 layered 对材质纹理逐层合成。原生实验桥使用 `drawElementImage` → Canvas 2D → GPU texture，新旧属性与 2D 几何分支尚未通过实测；直接 WebGPU queue DOM 上传和 GPU 命中几何尚未实现。

上游 Studio 的光学着色器固定版本与 MIT 声明保存在 `vendor/studio/`。库自己的资源管理、controller 和组件不依赖其演示应用。Lab 图片来自第一版无限画布的生成素材，来源记录保存在 `public/assets/README.md`；库 tarball 不包含图片或实验室，未复制上游演示素材。

## 文档与证据

- [当前状态、验证与下一步](docs/status.md)
- [目标架构及本版差异](docs/architecture.md)
- [上游选型](docs/upstream-review.md)
- [浏览器验收](docs/validation.md)
- [性能说明及原始数据](docs/performance.md)
- [独立包与框架边界](docs/package-contract.md)
- [待讨论的验收清单](docs/acceptance.md)
- [文档索引](docs/README.md)

独立 Git/发布、可选 Acrylic / Frosted 和 React/Svelte 路线见 [library-roadmap](docs/library-roadmap.md)；原生 API 和浏览器开关边界见 [native-capture](docs/native-capture.md)。
