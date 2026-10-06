# 上游实现评估

Audience: public

历史选型检查日期：2026-10-05。当时通过公开 README、package.json、GitHub 元数据和源码进行静态检查，未运行上游项目。以下保留当时的推断与选择依据。

2026-10-06 已固定并改造 Studio 光学着色器，在自己的 renderer/lab 中实际运行；未运行它的 demo，也未安装其他两个项目。当前实现及有限浏览器证据见 [status.md](status.md) 和 [validation.md](validation.md)，不要将历史静态检查与当前验证混为一谈。

## 固定评估版本

| 项目 | 分支 / commit | 最近 push（UTC，检查时元数据） | 许可信息 |
| --- | --- | --- | --- |
| iyinchao/liquid-glass-studio | main / `f7b28c36305a862f5cffed3ddd51511cf1204f56` | 2026-09-11 | 根目录 MIT LICENSE |
| AndrewPrifer/liquid-dom | master / `dd342ab663d718e8b4edf4cd39983b9a873360a7` | 2026-09-06 | MIT LICENSE |
| ybouane/liquidglass | main / `59af227103795f06421a96e2c7d3dceb081decd2` | 2026-09-30 | README 和 package.json 声明 MIT；所查树未见独立 LICENSE 文件 |

Push 时间只是活动证据，不代表成熟度或兼容性。复用时保存完整许可和版权声明；示例图片、视频等素材单独核实，不默认沿用其许可。

## liquid-glass-studio

定位是 Vite/React 材质调试应用，package 标记 private；不是通用 DOM 组件包。固定版本的 README 已勾选 WebGPU，不能沿用旧网页缓存中的未完成标记。

源码有 WGSL 与 GLSL 两套多通道渲染，包含背景模糊、折射、色散、Fresnel、高光等参数；`RendererInterface.ts` 为两种后端提供统一接口。输入重点是图片/视频背景和示例形状，README 的形状内 UI 内容仍未完成。

**适合做双后端材质和着色器的首选改造基础。** 仍需将示例的形状参数模型改造成任意位置、多元素、逐元素材质，补充共享资源、DOM 边界同步和内容采集。不能把演示程序包装成组件就宣称支持我们的编辑器。

来源：[README](https://github.com/iyinchao/liquid-glass-studio/blob/f7b28c36305a862f5cffed3ddd51511cf1204f56/README-zh.md)、[统一接口](https://github.com/iyinchao/liquid-glass-studio/blob/f7b28c36305a862f5cffed3ddd51511cf1204f56/src/utils/RendererInterface.ts)、[WGSL](https://github.com/iyinchao/liquid-glass-studio/blob/f7b28c36305a862f5cffed3ddd51511cf1204f56/src/shaders-wgsl/fragment-main.wgsl)、[GLSL](https://github.com/iyinchao/liquid-glass-studio/blob/f7b28c36305a862f5cffed3ddd51511cf1204f56/src/shaders/fragment-main.glsl)。

## liquid-dom

定位最接近 WebGPU + HTML-in-Canvas：提供 DOM 场景、React 布局组件和可独立使用的 `WebGpuGlassCore`。核心可接收 backdrop texture 和自定义 content source，原生 DOM 采集并非核心渲染的唯一输入。

所查 DOM renderer 请求 WebGPU adapter/device，没有 WebGL/SVG 渲染降级。HTML 采集依赖实验 API；`dom-content-sync.ts` 仍调用 `copyElementImageToTexture` 的 dictionary 形式，canvas 使用 `layoutsubtree`。

Chrome 官方 2026-09-29 的更新说明列出 Chrome 155 的新 API：`drawElementImageToTexture`、`content="drawable"`、后代 `drawable`，WebGPU/WebGL 的命中和辅助技术几何需要 `updateElementGeometry`。该能力仍在 Origin Trial，不能等同普遍可用的 WebGPU。

**作为原生采集、分层合成与内容源接口的参考/候选。** 若优先做单一实验浏览器的原生 DOM 玻璃示例，它是三个项目中最直接的候选。我们的多后端库不直接依赖整套 React 布局体系：需适配新旧 API，并验证 React Flow 的 transform、端口、焦点和层级后再决定接入范围。

来源：[Core README](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/README.md)、[采集调用](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/src/renderer/dom-content-sync.ts)、[DOM renderer](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/src/renderer/index.ts)、[Chrome API 更新](https://developer.chrome.com/blog/html-in-canvas-ot-changes)。

## ybouane/liquidglass

这是更容易给 HTML 添加效果的 WebGL 1 库。`HtmlCapture.ts` 使用 `html-to-image`（样式内联 + SVG foreignObject）给普通 HTML 建立快照；图片/canvas/video 有直接绘制路径。静态内容缓存，动态内容重采集，有 dirty tracking 和局部裁切。每个实例共享一个 WebGL context，不是每个元素一个 context。

要求玻璃元素是 root 的直接子元素，嵌套玻璃需要另建实例；不同 root 不能互相折射。对 React Flow 当前的嵌套节点、持续变换与 DOM/SVG 连线，这意味着结构适配与动态采集开销，不能推断有缓存就一定满足拖动帧率。

**作为快照采集的对照方案，暂不选为默认运行时。** 不做整个编辑器每帧截图。后续只在小范围、低更新频率内容中衡量这种路径；没有浏览器实验能力时，也不能把快照称为原生 HTML-in-Canvas。

来源：[README](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/README.md)、[采集](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/src/HtmlCapture.ts)、[WebGL renderer](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/src/GlassRenderer.ts)。

## 建议选择

自己维护薄的库层，优先改造 Studio 的双后端光学渲染，并为原生 HTML-in-Canvas 提供单独适配器。liquid-dom 可借鉴或在实验室作为对照，不默认混装第二套 WebGPU 引擎；ybouane 保留为快照路线的比较对象。

这能共享材质语言与后端策略，但仍有实质开发量：多元素绘制、采集与合成层级、API 演进、坐标/输入同步、资源恢复以及视觉调校。若原型证明 Studio 改造成本过高，先更新本评估，再考虑 liquid-dom core 替代；不在消费应用内累积相互竞争的 renderer。

## 2026-10-06 在线视觉对照与参数修订

首轮仅静态审查三个仓库，只将 Studio 的 shader 在自己的 renderer 中运行；没有做三个 demo 的运行视觉对照。这是首版验收的不足。

本轮访问三个仓库公开链接的在线演示（网站未固定部署 commit，不能冒充上述固定源码版本）：

| 演示 | 当前浏览器所见 | 本库采用 / 尚缺 |
| --- | --- | --- |
| [Studio](https://liquid-glass-studio.vercel.app/) | WebGL 默认棋盘背景，20 厚度、0.05 距离、1.4 折射率、7 色散、1 px 模糊、30 反射/高光范围、独立方向/硬度/强度；厚边形变和色差明确 | 以这组可见输入建立本库 Studio look，开放独立 uniforms；未做形状融合、spring 形变、shadow shader 或逐像素一致验收 |
| [ybouane](https://liquid-glass.ybouane.com/) | 竹林图片/视频背景，普通玻璃折射清楚，与磨砂、深色和放大镜案例区分 | 借鉴 clear/frosted/subtle 的对照呈现；未复用其 DOM 快照、半球放大镜或多光源实现；页面 FPS 数字未作为本库测量 |
| [Liquid DOM](https://liquid-dom-showcase.vercel.app/) | 明确显示 HTML in Canvas is not enabled | 只能确认当前浏览器受能力限制，无法对照其运行视觉；没有启用全局浏览器 flag |

首版效果过弱的具体原因：高级 uniforms 被固定；模糊半径大、材质遮罩强；默认 scene 渐变缺少可折射细节；内容照片遮住卡片大部分取样；距离低于 Studio 默认，光学差异主要只剩模糊和细亮边。GPU 初始化和像素变化证明不等于设计稿视觉验收。

v0.2 开放 17 个独立参数、边缘模糊开关、无遮挡样片、彩色线条/文字测试图、四种外观和效果 on/off。同一控制值传给 WebGPU/WebGL；SVG/CSS 无对应能力的参数在 UI 禁用。源项目的 micro-distortion、glass-on-glass、背景 DOM 捕获等能力继续列为缺口，不用新增无效滑块掩盖。

## 2026-10-06 Apple readability reference

只采用官方资料，不将社区讨论当作参数来源。[iOS 27](https://www.apple.com/os/ios/) 明确描述均匀折射、对比度改进，以及从清透到浓染的 slider；[macOS 27](https://www.apple.com/os/macos/) 强调可读性与跨 app 一致性。[HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) 的 regular 适合含文字的大面板，clear 适合媒体背景；透明度、对比度和动效应回应人的需要。[WWDC Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) 建议避免业务界面大量 glass-on-glass。

本库的 `regular` / `tinted` / `reading` 为**参考这些原则的自定义映射**：逐步减少 distance/dispersion/glare，增加 blur/tint；不声称使用 Apple shader、系统数值或已复刻 iOS/macOS 27。`clarityControls(0..1)` 在自己的 clear 与 tinted 间联动部分参数，保留形状、角度、颜色与投影。阅读预设没有通过所有背景 WCAG 对比度认证，消费应用仍需验收正文。

三层测试场景用于验证渲染能力，非推荐业务设计。Acrylic 独立模型及可访问性系统偏好策略待后续阶段，见 library-roadmap.md。

v0.3 本库自写 renderer 的 GPU blur 已替换 Canvas 2D 模糊，缓存及回收由库管理；Studio 光学 shader 固定来源未变。性能与视觉不据此宣称全面超过或等同三个上游项目。
