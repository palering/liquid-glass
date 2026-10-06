# API reference

Audience: public

当前 v0.4 的核心、预设与 React 接口。这里只描述实际导出；开发路线见 [library-roadmap.md](library-roadmap.md)，实验能力与验证状态见 [status.md](status.md)。包未发布到 npm，请先按 [本地包使用](development.md#本地包使用) 构建并安装。

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
| quality | low（DPR ≤ 1）/ medium（≤ 1.5）/ high（≤ 2）；performance 为 null 时生效 |
| performance | null（默认旧行为）或 minimal/economy/balanced/full/custom 配置；见 [性能档位](performance-profiles.md) |
| controls | blur / refraction / highlight 为预设倍率，tint 为遮罩增量 |

`controls` 另支持绝对参数覆盖（未提供时继续使用原预设与倍率）：`distance`（shader 归一化距离）、`thickness` / `blurPx` / `radius`（CSS px）、`ior`、`dispersion`、`tintOpacity`、`roundness`、`fresnelRange` / `fresnelHardness` / `fresnelFactor`、`glareRange` / `glareHardness` / `glareFactor` / `glareConvergence` / `glareOpposite`、`glareAngle`（度），`shadowOpacity` / `shadowBlur` / `shadowY`（CSS 投影）、`tintColor`（auto 或 #rrggbb），及 `blurEdge`（boolean）。范围/硬度是 Studio shader 参数，不能当作实测物理量；glareFactor 也控制 CSS 细亮边。GPU 支持完整光学参数；SVG 只近似位移、厚度、模糊、遮罩与圆角，CSS/solid 会禁用其余无对应效果的入口。

constructor / setSettings 现在在改变 DOM、状态或图片请求前校验设置：非法选项、非布尔开关、非有限数字和非法颜色抛出 TypeError（setSettings 返回 rejected promise）。有效光学参数按 opticalFields 范围夹取，thickness 保留 0.5 px 下限；相对 blur/refraction/highlight 为 0–4，tint 增量为 -1–1。未知字段不进入设置，部分更新只合并提供的字段，不注入 Studio 绝对参数，因此 card/control/panel 的默认差异保留。直接修改公开 settings 对象不是受支持更新方式；通过 setSettings 应用。

预设及参数定义在 `src/config.js`，核心导出 `looks` / `opticalFields` / `clarityControls`。它覆盖所有可调项，不代表三个参考项目已达到像素一致，也没有实现它们的全部能力：形状融合、显微扰动、多灯光和完整 DOM 采集仍未接入；相互折射当前只包含自有材质纹理。

`setImage(url)` 加载图片并切换 image 背景，失败切到 grid；`retry()` 重新从所选优先级初始化。`simulateLoss()` 是实验室故障入口。实验室显式命名预设存入 localStorage；不会自动保存所有临时操作。

```js
import { createPreset, serializePreset, parsePreset, looks } from "@workspace/liquid-glass";
const preset = createPreset("柔光侧栏", { ...glass.settings, controls: looks.regular });
const json = serializePreset(preset);
await glass.setSettings(parsePreset(json).settings);
```

新预设 schema v2 保存 performance 并校验选项、有限数值、范围、颜色和版本；兼容读取 v1，恢复 performance:null 的旧行为。保留请求后端偏好，运行时仍按实际能力降级。JSON 不包含图片；重新载入 image look 时需消费方提供图片。文件下载依赖浏览器支持，实验室始终提供可复制 JSON。

React 绑定导出 `GlassProvider`、`GlassSurface` 和 `useGlass`，位于 `@workspace/liquid-glass/react`，需要消费方 React 19；TypeScript 项目需要 React 类型。Provider 接受 div 的 style/DOM 属性，Surface 接受 `kind`、`radius`、注册用 `id`、`zIndex` 及 DOM 属性。一个 Provider 共享一个 controller；不要逐节点创建 Provider。已通过开发模式 StrictMode 输入/点击/切换/十次卸载，以及打包消费者的无 DOM 导入与 React SSR ；React Flow 接入已有本地验收，见下文；hydration、跨浏览器尚未验收。

## 取样与边界

GPU 和 SVG 当前取样的是库绘制的场景纹理，不会自动折射页面任意 DOM、卡片照片或 SVG 连线。SVG 使用裁切背景图和位移贴图，属于 scene 位移近似，尚未实现跨浏览器 SVG backdrop filter 路径。CSS 只提供浏览器背景模糊，不宣称有折射。

GPU 模糊使用降采样低通与双向高斯 pass；可选 layered 对材质纹理逐层合成。原生实验桥使用 `drawElementImage` → Canvas 2D → GPU texture，新旧属性与 2D 几何分支尚未通过实测；直接 WebGPU queue DOM 上传和 GPU 命中几何尚未实现。

上游 Studio 的光学着色器固定版本与 MIT 声明保存在 `vendor/studio/`。库自己的资源管理、controller 和组件不依赖其演示应用。Lab 图片来自第一版无限画布的生成素材，来源记录保存在 `public/assets/README.md`；库 tarball 不包含图片或实验室，未复制上游演示素材。

## Model geometry and an owned scene

`setGeometryProvider(provider)` optionally supplies a complete snapshot on every render. Use a standard `Map` keyed by the registered IDs. Width/height and x/y/w/h are **stage-local, displayed CSS pixels**, before renderer DPR multiplication. The stage itself must be untransformed and axis-aligned; rotations, skew and nonuniform transforms are not supported by this interface. Each surface may specify a positive uniform `scale`: its configured DOM radius is logical pixels and the shader radius becomes `logicalRadius * scale`. GPU thickness/blur remain screen CSS pixels; DOM fallback filters compensate for the ancestor scale. `setGeometryProvider()` or `null` restores live DOM measurement.

```js
glass.setGeometryProvider(() => ({
  width: viewportWidth, height: viewportHeight,
  surfaces: new Map([
    ['building-review', {
      x: canvasOffsetX + panX + nodeX * zoom,
      y: canvasOffsetY + panY + nodeY * zoom,
      w: measuredWidth * zoom, h: measuredHeight * zoom, scale: zoom
    }]
  ])
}));
```

Every active surface must be present, with finite coordinates, nonnegative dimensions and positive scale. Zero-sized/offscreen surfaces are allowed. Invalid, incomplete or throwing snapshots fall back atomically to DOM bounds for that frame and report `geometryMode` / `geometryReason`; they do not demote the renderer. The provider owns freshness: update node size with ResizeObserver, stage/flow offsets on resize/scroll, and invalidate on pan/zoom/drag. Do not return cached positions after their model changes. The complete path performs no stage/surface `getBoundingClientRect()` inside render; browsers still perform style/layout/compositing later, so CPU submission savings are not equivalent to FPS savings.

`setScenePainter((context, {width,height,dpr,settings,phase}) => ...)` replaces the built-in scene with consumer-owned Canvas 2D painting. The context is already scaled to logical CSS pixels. Fill the background explicitly; keep its coordinates consistent with the geometry provider. Calling this setter invalidates the background; call `invalidateScene()` whenever the underlying scene model changes. Set `null` or omit the argument to restore the built-in scene. A throwing painter resets its partial canvas, draws the built-in fallback and reports `sceneReason`, preserving the GPU backend. This callback is for the scene source; it is not arbitrary DOM capture and does not replace an active native capture source. Both callbacks stay outside serializable Settings/preset JSON.

The adjacent React Flow consumer now uses one controller for building cards, connection controls and the workspace sidebar; its foreground remains React DOM. Its own adapter translates React Flow model coordinates and supplies the dot-grid scene. See [consumer and GPU validation](consumer-gpu-experiment.md) for the tested limits. Hydration and other browsers remain unverified.
