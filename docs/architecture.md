# 材质库架构与演进边界

Audience: public

2026-10-06 v0.4：实际目录职责及导出见 [package-contract.md](package-contract.md)，实现与证据见 [status.md](status.md)。下文保留早期目标接口和演进方案，`system` theme、snapshot、任意 DOM SVG backdrop、采集要求驱动后端选择仍未实现；现有 API 是 [api.md](api.md) 中的 flat settings。

当前数据流：消费方 DOM / React → 共享 GlassController → 独立 capture source + renderer policy → scene texture / surface bounds → WebGPU、WebGL2 或 DOMRenderer → 装饰层；前景保持 DOM。config / preset 位于核心；localStorage、下载、benchmark UI 属于 lab。React 用 effect 创建/释放、注册/注销和订阅；Svelte 没有实现。性能 runner 独立创建固定 stage，不复用用户效果页状态。

当前 capture 请求失败时回到 scene，并公开原因；它不会因业务 DOM 采集缺失自动跳到 CSS。下文的需求约束式策略是后续提案。SVG 当前取 scene 图裁切位移，不是浏览器任意背景的 SVG backdrop 路径。

历史 0.1 实现差异：WebGPU/WebGL 光学着色器已运行；模糊使用缓存 Canvas 2D 纹理。SVG 使用 scene 图裁切位移，不是任意 DOM 的 SVG backdrop。原生桥先做 2D 采集→GPU 纹理，当前浏览器未开放，直接 GPU DOM 上传尚未实现。v0.2 新增独立光学 controls、enabled、testchart 及光学样片/业务视图对照，基础库默认保持克制。实际 flat settings/API 见 [api.md](api.md)；下文 system theme、通用 source 等仍是目标方案。

v0.3 当前差异：GPU 已使用降采样低通 + 横纵高斯 pass；半径缓存按可见 surface 回收。可选 layered 使用双纹理 ping-pong，按 zIndex 顺序让上层读取下层材质；前景 DOM、CSS 投影与 rim 不进入采集。GPU 支持相互材质折射，SVG/CSS 不等价。增加核心 config / preset schema、20 参数与实验室命名持久化。原生桥仍未验证，其他目标方案保持提案状态。

当前 SVG renderer 按 surface 保留 filter/image/tint 节点，按宽、高、有效圆角和厚度复用 80×80 位移图；位置与背景更新独立处理。缓存只保留本帧活跃形状，注销及 dispose 释放。该优化不改变 SVG 光学公式，也不新增 DOM 背景采集能力。证据见 [optimization-experiment.md](optimization-experiment.md)。

## 两条独立能力轴

`Renderer` 决定如何绘制玻璃；`BackdropSource` 决定哪里来的背景像素。HTML-in-Canvas 属于后者，也涉及 DOM 命中几何，并不等于一种高于 WebGPU 的渲染器。

| 渲染后端 | 背景来源 | 能表达什么 |
| --- | --- | --- |
| WebGPU / WebGL | 自有 scene：网格、渐变、图片，未来视频 | 折射这些纹理；不自动包含 DOM 卡片和 SVG 连线 |
| WebGPU / WebGL | 原生 HTML-in-Canvas | 支持时采集合资格 DOM；需要 API 和几何同步适配 |
| WebGPU / WebGL | 可选 snapshot | 受支持内容的异步快照；存在延迟、样式和更新限制 |
| SVG backdrop filter | 浏览器背景取样 | 位移近似；滤镜语法可用不等于任意浏览器真实生效 |
| CSS backdrop blur / solid | 浏览器取样 / 实色 | 磨砂和可读性保底；不宣称包含折射 |

Auto 优先 `WebGPU → WebGL → SVG → CSS → solid`，但先约束所需背景类型。例如业务要求实时 DOM 折射而原生采集不可用，不能仅因 GPU 可用就显示只有网格纹理的效果并报告成功；默认退回可用的浏览器材质路径。Snapshot 默认关闭，仅在实验室明确开启。

## 全局设置与状态

拟议统一配置，不是已存在 API：

```ts
type BackendPreference = 'auto' | 'webgpu' | 'webgl' | 'svg' | 'css' | 'solid';
type CapturePreference = 'auto' | 'scene' | 'native-dom' | 'snapshot';
type ThemePreference = 'dark' | 'light' | 'system';

interface GlassSettings {
  backend: BackendPreference;
  capture: CapturePreference;
  theme: ThemePreference;
  quality: 'auto' | 'low' | 'medium' | 'high';
  background: { kind: 'grid' } | { kind: 'image'; src: string; fit: 'cover' | 'contain' };
}
```

一个共享 Provider/controller 给所有组件分发设置，React 只是薄绑定。开发实验室提供切换入口，消费应用可接入自己的全局设置。Material preset 和后端选择分开，不能切换 renderer 就清空用户调参。

状态必须分别公开 `requestedBackend`、`activeBackend`、`activeCapture`、能力检查结果和 `fallbackReason`。不支持的强制模式在 UI 禁用并说明原因；初始化失败时保留用户偏好，报告实际退回的模式。后续重试由用户操作或明确的恢复策略触发，避免不断失败和切换。

检测不能只查 `navigator.gpu`：请求 adapter/device、创建资源和试绘；原生 DOM 采集另外检查 API、合法 canvas/子树、paint/首帧上传。新旧 HTML-in-Canvas 方法和属性封装在兼容层中。SVG/CSS 做语法预检和实际浏览器呈现验收，不能用 CSS.supports 单独证明视觉正确。

Device lost / WebGL context lost / shader 初始化失败需要释放资源、维持 DOM 可读，并降级。更换后端时创建对应的新 canvas/context，显式清理旧纹理、监听器、Observer 和 RAF；避免在一个 canvas 上混用不同 context 类型。

## 材质和主题

同一套参数，三种主要预设：`FrostedPanel`（散射较强、弱折射）、`GlassCard`（细亮边、暖色局部高光）、`LiquidControl`（边缘厚度和局部折射较明显）。内容密集区域使用实色 inset。

统一设计参数：blur（CSS px）、折射强度、厚度/倒角、圆角、Fresnel/高光、色散、tint 与 alpha、阴影、动效强度。各后端映射到自己的 uniform/filter；相同数字不保证像素一致，需要在固定背景、尺寸、DPR 上校准。降低能力时保留预设的亮边、色调与清晰正文，公开不支持的参数。

主题决定环境、正文/次级文字、边框、阴影、材料色调和可读性遮罩；renderer 不硬编码业务颜色。dark 保留原黑色点阵，light 为灰白点阵，颜色自动跟随 theme。light 不能只是把背景改白后继续使用白字。`system` 是可选策略，默认仍是 dark。

背景接口先实现网格/渐变，再接图片。环境背景须延伸到大面板下方才能提供可见取样，但这不自动表示图节点已经滑到面板背后。图片需要加载完成、尺寸/DPR/fit 坐标统一，同源或可授权跨域读取；失败时回到主题网格。未来视频可扩展独立 source，不在本轮宣称支持。

## 图编辑器集成边界

前景保持真实 DOM：文字、照片、表单、端口和按钮不经过整层模糊。GPU 视觉装饰不接管指针事件。原生 HTML-in-Canvas 实验涉及 DOM 承载位置和 geometry；不能假定可直接采集当前页面任何元素，也不能未经验证把 React Flow 重挂载到 canvas 内。

共享 scene/controller 注册 surface 的 bounds、圆角、preset、z-order、clip 和交互状态。按真实屏幕位置同步 React Flow pan/zoom/节点移动，以及浏览器滚动、resize、DPR。材料裁切不裁掉端口；折射采样只看该 surface 背后的层，排除自身与前景，避免递归采样。

优先一个 workspace 共享 GPU context 和纹理/模糊资源，视口外 surface 剔除，静态时按 dirty 更新；拖动时可降低采样质量，停下后恢复。先不实现全屏每帧 DOM 快照、跨 root 任意相互折射或大量 GPU context。

## 实施顺序与通过条件

1. **独立实验室。** 暗色/浅色、棋盘格/渐变背景，圆形加号、一张卡片、一块面板。基于 Studio 固定版本证明 WebGPU 能绘制任意 bounds，再改造 WebGL 对照。保留版权声明并记录实际修改；先不连接业务页面。
2. **材质与策略。** 三种 preset、全局选择、实际能力显示、切换释放、CSS/solid 基础回退；SVG 位移逐浏览器验证后才进入 auto 候选。GPU 同样必须有完整初始化和错误恢复流程。
3. **原生 DOM 采集专项。** 新旧接口适配，真实 HTML 文本/按钮、拖动、焦点、缩放命中；明确实验浏览器和开启条件，未支持时不显示空白纹理。与 scene source 独立验收。
4. **背景与主题。** 深浅主题所有前景检查，图片加载/fit/失败回退。测量平移缩放后背景与玻璃是否对齐。
5. **消费应用。** 先接建筑卡片、插入加号和侧栏；验证 React Flow 端口、节点/边层级、锁定、编辑、搜索、窄屏。再逐类扩展。

每阶段验证正常渲染、强制后端、故障回退、减少动态效果、390 px 和桌面；GPU 输入输出、切换清理和 DOM 命中需功能证据，截图只用于视觉。

性能比较使用同一背景、视口、DPR、节点数和设备，记录静态/拖动/pan/zoom 的帧时间及尾部卡顿。10/50/100 个节点是首轮规模；不预设 WebGPU 一定快于 WebGL，也不在测量前承诺 60 fps。首次浏览器清单与版本由实验时记录，不能用上游 README 代替实测。
