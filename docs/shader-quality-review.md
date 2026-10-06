# Shader quality and optimization review

Audience: public

本轮当前实施与取舍见 [光学报告](optical-refinement.md)：解析/混合梯度、高度场已有实际试验，有界高光与输入校验已保留。追加的逐函数分析、轮廓推导、合并采样试验及外部算法依据见 [Shader 深入研究](shader-design-research.md)，后续档位规范见 [性能档位](performance-profiles.md)。下文固定上游质量复核与早期建议仍用于说明来源；未保留候选不能视为生产功能。其他浏览器兼容留到后续 WebView 阶段。

2026-10-06。复核本库 `8f6b9ff` 的光学、两种 GPU renderer、模糊、公共 controller 和 SVG 路径；重新读取另外两个项目的固定版本源码。本文记录源码观察、既有运行证据和待验证提案，不把静态复杂度当作质量或性能排名。本轮没有安装或运行上游项目，没有生成新的 GPU 基准，也没有修改渲染行为。

本文主体是试验前的源码复核记录，后面的 shader 调用描述和提案状态以该检查点为准。后续已经完成三轮实施及试验，当前落地映射如下；不可再将原提案表全部视为尚未实施。固定源码、原始数据和阶段差异见 [consumer-gpu-experiment.md](consumer-gpu-experiment.md) 与 [continuation-plan.md](continuation-plan.md)。

## 复核后落地映射

| 原建议 | 当前实现 / 实验结果 | 证据 |
| --- | --- | --- |
| P0 统一质量 fixture | 已建立双 GPU 独立 readback，84 个案例；同后端改动前后 alpha 精确，颜色最大差 1/255。三种上游实现仍未进行同条件运行对比 | [第三轮报告](consumer-gpu-experiment.md) |
| P0 真实消费接入 | React Flow 实际使用同一 controller 与模型几何/场景绘制接口；20 个缩放/后端案例和实际输入、端口、故障验证。任意 DOM 背景采集仍未实现 | [第三轮报告](consumer-gpu-experiment.md) |
| P1 公共更新 profiler / 条件样式缓存 | profiler 完成；样式缓存 54 组无稳定收益，候选撤回。后续完整几何供给减少同步 DOM 测量 | [第二轮](shared-update-experiment.md)、[第三轮](consumer-gpu-experiment.md) |
| P1 SVG / GPU 稳定资源复用 | SVG 位移图及节点缓存、WebGPU bind group/view/uniform data 复用和 GL attribute location 缓存已保留 | [第一轮](optimization-experiment.md)、[第三轮](consumer-gpu-experiment.md) |
| P1 局部输入 / blur ROI | ROI 36 个像素案例完全一致，24 组性能无稳定收益，生产未启用。局部裁切图集、资源尺寸分桶和渐进上采样仍未实施 | [第三轮报告](consumer-gpu-experiment.md) |
| P2 shader 精确快路径 | 零色散与 sharp/blur 端点采样减少已保留；与资源复用共同测量，没有独立 GPU 时间结论 | [第三轮报告](consumer-gpu-experiment.md) |
| P2 数值 / 类型契约 | 几何/部分设置校验、异常恢复和消费类型检查已实施；WGSL最终分支与反射ABI/packer已实施；解析/混合梯度已试验但未保留，有界高光已保留；完整物理模型未验收 | [光学报告](optical-refinement.md)、[WGSL单源码](wgsl-single-source.md) |
| P2 新光学模型 / 滤波 | 高度场独立试验，未进生产；形状融合、多灯光/微扰仍拟议；合并高斯候选54纹理案例通过，但三轮完整光学各79/84，不替换默认 | [深入研究](shader-design-research.md) |

这些实施主要来自对本库的测量与改造。局部输入、变更驱动更新、共享资源等与另两个项目的设计相互印证，但没有移植它们的运行时代码，也没有因此获得它们的 DOM 采集或完整光学能力。

## WGSL 单一源码可行性复核（历史调研）

以下为实施前判断；后续已完成转换与实际验证，当前事实以 [单源码报告](wgsl-single-source.md) 为准。运行时已不再手动维护 GLSL，两 API 的资源层继续分开。

2026-10-06：**仅完成工具文档与当前代码检查，未运行本项目转换实验、未改动运行时。** 正确名称为 WGSL。Naga 支持 WGSL 输入与 GLSL ES 300 输出，并提供 WebGL 目标标记、绑定映射与纹理/uniform reflection；可作为构建期候选。[Naga](https://github.com/gfx-rs/wgpu/tree/trunk/naga)、[GLSL 支持](https://docs.rs/naga/30.0.1/naga/back/glsl/index.html)、[目标版本](https://docs.rs/naga/30.0.1/naga/back/glsl/enum.Version.html)、[reflection](https://docs.rs/naga/30.0.1/naga/back/glsl/struct.ReflectionInfo.html)。

拟议流程为维护 WGSL → 构建时解析/校验 → 保留 WGSL 给 WebGPU，生成 GLSL ES 300 给 WebGL2。目标包含主光学、顶点和自有 blur/blit passes；仅统一主片元 shader 还不能宣称全部 GPU shader 单一源码。生成 GLSL 应由工具产出，禁止人工维护补丁；保留上游原件、许可和固定基线。

转换不能替代 WebGPU/WebGL 两套资源/API 适配。当前 WebGL 是独立 uniform 上传与翻转 Canvas 纹理，WGSL 使用 uniform struct/分离 texture+sampler，并显式转换 frag_coord 与折射偏移 Y；GLSL 输出需要统一坐标/上传约定和绑定元数据，而非转换后直接替换字符串。编译器的顶点坐标调整选项也不能单独证明 fragment/UV/纹理输入已对齐。

当前 shader 主要使用两目标共有的浮点、片元与纹理功能，源码检查未见必须依赖 compute 的主光学逻辑，因此适合先尝试转换；这仍是推断，实际 parser/validator、WebGL compile/link、像素及成本结果尚未获得。后续先用固定版本 Naga 转换顶点与主光学并完成像素验收，再逐步统一自有 passes；不能以生成成功代替可运行和视觉一致。

## 评估深度与结论

此前已做固定版本选型、接口/采集路线检查、演示对照和本库浏览器验证，足以支持先采用 Studio 的 shader。但未在同一设备、背景、尺寸、材质目标、DPR 和节点布局下比较三个实现；没有上游三方的像素回归、GPU 时间、显存峰值或长期压力证据。因此选择是首版工程取舍，不是证明 Studio 质量最高。

复用光学源码减少了首版实现成本；应保留出处，并掌握算法、假设、参数语义、资源所有权和失败路径。当前产品能力来自上游光学适配与本库工程实现的组合，不声称原创全部光学算法或具备三个项目的全部能力。

## 固定来源及此次核对范围

| 项目 | 固定版本 | 本次读到的关键实现 |
| --- | --- | --- |
| Liquid Glass Studio | `f7b28c36305a862f5cffed3ddd51511cf1204f56` | 本地保留的 GLSL/WGSL 主 shader、SDF/math/color；本库 shader 适配、uniform 映射、renderer 和 GPU blur |
| AndrewPrifer/liquid-dom | `dd342ab663d718e8b4edf4cd39983b9a873360a7` | core README、renderer/core、DOM 内容同步、WGSL shader、自适应模糊及其层级选择测试；Git 树中的测试布局 |
| ybouane/liquidglass | `59af227103795f06421a96e2c7d3dceb081decd2` | README、HtmlCapture、GlassRenderer、LiquidGlass、shader 和 defaults |

此次核对是 scoped source review，并非逐文件审计整个上游仓库。下载副本仅在本地忽略的工作目录，固定 commit、URL、字节数和 SHA-256 已记录；外部源码没有加入运行时或公开库包。

## 三个方案的优点与代价

以下逐项描述保留最初固定版本的检查结果；后续已实施项以开头的当前落地表、[WGSL 报告](wgsl-single-source.md) 和 [光学报告](optical-refinement.md) 为准。

### Studio：材质调试基础

优点：同一光学方案有 WGSL/GLSL 两套实现；边缘厚度、折射距离、折射率、色散、亮边和方向高光能独立控制。阶段可视化分支方便理解距离场、法线与折射。固定 shader 已在本库 WebGPU/WebGL2 路径中实际运行。

代价：输入模型原本围绕演示形状和背景纹理，需要改成逐 DOM surface bounds、透明输出、共享资源及生命周期。GLSL 保留多种 STEP 调试分支；本库固定 STEP=9，但尚未实测专用最终分支是否有收益。WGSL 与 GLSL 各自维护，已有数值防护差异，缺少系统像素对照。

算法局限：超椭圆角是 p-norm 距离近似；折射以边缘距离和厚度构造入射角，使用 Snell 形式求折射角，再映射为二维纹理位移。色散按通道缩放位移；Fresnel/glare 使用距离幂函数、方向权重和 LCH 亮度/色度调整。它是面向视觉的光学近似，没有完整三维几何、路径追踪或能量守恒保证。

### Liquid DOM：DOM 场景和内容合成

优点：renderer 与可复用 WebGpuGlassCore/内容源分开；管理场景变换、背景层和玻璃内容。DOM 同步根据 paint/场景变更更新纹理，纹理尺寸分桶、内容图集、结构化 GPU buffer 和资源销毁都有明确实现。自适应模糊包含降采样、横纵 pass 和逐级上采样，并有纯函数层级选择测试。

光学结构比当前本库更完整：SDF sample 同时携带距离和梯度；支持多形状平滑融合及重叠控制；先绘制并平滑表面斜率场，再重建三维法线；按 RGB 折射率分别调用 refract，将高度与射线转换成像素位移，内容图集也有独立折射深度。应将这些列为候选增强，而不把“功能更多”直接等同于“画面更好或更快”。

代价：固定版本 DOM renderer 依赖实验 HTML-in-Canvas 的旧 copyElementImageToTexture/layoutsubtree 调用；普通 WebGPU 可用并不保证这个采集 API 可用。该 renderer 没有本库的 WebGL/SVG/CSS 降级链。场景树、DOM host 和交互/变换体系接入现有编辑器需要验收；其中 core 可独立接收内容源，不能把 DOM renderer 的 API 限制泛化成 core 对所有纹理输入都不可用。

证据边界：上述结构已读源码；测试文件只核对了内容，没有执行。此前演示在本轮浏览器显示 HTML-in-Canvas 未启用，因此没有它的运行光学质量、DOM 采集性能或真实编辑器集成结论。

### ybouane：普通 DOM 的快照路线

优点：HtmlCapture 对静态元素缓存，异步采集去重；共用字体嵌入缓存并按元素字体/字重/字符范围过滤，图片/canvas/video 有直接绘制路径。LiquidGlass 将变更映射到相关玻璃，GlassRenderer 使用一个 WebGL context、局部面板输入和按尺寸缓存的 FBO。它已经做了局部采集和更新控制，不能将它描述为简单的全屏逐帧截图方案。

光学候选：shader 包含倒角高度场、有限差分法线、双表面位移近似、圆顶放大模式、微扰和多个方向光的 Blinn-Phong 高光。虽然注释使用 physically-based 描述，具体位移仍有经验系数，不能据此认定严格物理正确或优于 Studio。

代价：普通 HTML 依赖异步 html-to-image 快照，背景可能暂时使用旧缓存；字体、样式、跨域资源和复杂 DOM 保真仍需真实页面检查。玻璃要求是 root 直接子元素，嵌套 root 和 React Flow 变换需适配。GPU 输出再经 drawImage 写入逐元素 2D canvas，存在额外复制路径。FBO 按精确尺寸缓存，在所查代码中 resize/destroy 时释放，持续产生新尺寸的增长值得压力测试；这不是已验证的泄漏。

## 原基线 shader 如何工作（后续修改见光学报告）

1. Controller 读 stage/surface 的 DOM bounds；surfaceUniforms 映射屏幕位置、DPR、材质与参数，关闭上游第一形状并固定最终绘制阶段。
2. shader 用圆角/超椭圆距离近似求内外与边缘深度。边缘像素通过四次距离场采样求梯度；当前梯度带经验缩放，不是直接的三维表面法线。
3. 厚度与边缘深度决定折射边缘系数，乘梯度和 distance 后得到 UV 偏移。GPU 在自己的 sharp/blurred 背景纹理中分别采样 RGB，再做染色、亮边和方向高光。
4. WGSL 翻转 frag_coord 与偏移 Y，和 GLSL 的上下坐标约定对应；uniform packing、设备像素/CSS 像素和画布 alpha 约定均属于需要维护的契约。
5. 本库将上游形状外输出改为透明，并裁切 surface 绘制区域。layered 模式用双纹理按 zIndex 合成下层材质供上层取样；前景文字、图片和普通 DOM 不会自动进入这些纹理。

目前“理解”的可核对依据是这些具体调用与参数映射；尚缺独立的公式边界测试和固定像素回归，不能将源码可解释等同于所有极端参数、浏览器和 DPR 均已验证。

## 已实施的优化及证据

| 改动 | 已有依据 | 仍不能宣称 |
| --- | --- | --- |
| 一个 controller 共享 renderer/context、背景纹理，视口外 GPU surface 剔除 | 两个 GPU renderer 的实际代码；资源计数与清理检查 | 任意设备最优，或驱动显存完全无泄漏 |
| scene/source version 决定重新上传，静态 dirty 重绘 | upload signature、controller invalidate；147 组归档中的 idle 没有额外 draw | 所有业务场景都无需重绘 |
| GPU 降采样低通 + 25 tap 横纵高斯，按半径复用和回收 | 两种 image pass；既有条纹修正和模糊视觉检查 | 与所有上游相比更快，或跨 DPR 的模糊半径已标定 |
| 非叠层 WebGPU 共享 surface render pass、复用 uniform buffer | WebGPURenderer；既有有限压力与固定矩阵 | layered 同样便宜，或已测 GPU execution time |
| 材质纹理 ping-pong 叠层、后端故障清理/降级 | 实际浏览器故障链与层间像素差异；注销后资源计数 | 真实 DOM 相互折射、长期稳定、跨浏览器等价 |

完整基线见 [performance.md](performance.md)。960×540、DPR 1、固定短窗口下，100 个移动表面的 WebGPU CPU 提交 p95 48.90 ms，solid 也有 42.80 ms 长尾。公共 bounds/样式/布局更新是值得 profiler 验证的瓶颈候选；不能将全部成本归咎于 shader。SVG 每次重绘重建 80×80 位移图与 filter，也有与其高成本相符的代码证据。

## 最初建议清单（部分已完成，当前状态见落地表）

| 优先级 | 工作 | 验收方式 |
| --- | --- | --- |
| P0 | 建立统一质量 fixture：线条、文字、照片、渐变；固定材质目标、尺寸、背景、DPR 和后端；增加边缘、角部、零模糊/零色散、薄表面及参数边界 | 保留原图和设置；WebGPU/WebGL 对齐坐标、mask、alpha、折射方向及参数响应；逐项解释允许的差异 |
| P0 | 明确真实项目的背景要求，补一个消费方接入；原生 DOM 采集单独实验 | pan/zoom 后对齐，输入/焦点/端口无退化；native-dom 不可用时用户得到可理解的实际能力状态 |
| P1 | profiler 分离 DOM bounds 读取、样式写入、排序、状态通知与 GPU 提交；缓存未变化样式，批量读后写 | 原条件下 10/50/100 表面各重复采样，保存 p50/p95/长任务和正确性；同时跑 solid 隔离公共成本 |
| P1 | SVG 缓存位移图/filter；WebGPU 复用稳定 bind group，GL 缓存 attribute location | 背景/尺寸/材质变化正确失效；重复拖动后无陈旧图像；记录 CPU 和对象创建数量 |
| P1 | 借鉴局部输入与资源分桶，评估 blur ROI、分层局部复制和渐进上采样 | ROI 必须带最大折射位移及模糊采样的外扩，避免边缘缺像素；分别测少量大面板与大量小表面，记录显存估算与 GPU 时间（支持时） |
| P2 | shader 快路径：色散为零合并 RGB 采样，blur/sharp 不混合时只采样需要的纹理；评估单形状解析梯度与专用最终分支 | 修改前后像素对照及 GPU 时间；不能仅凭源码采样数量承诺提速；WGSL/GLSL 同步验证 |
| P2 | 增强数值与类型契约：归一化防护、无效参数、CPU/WGSL uniform layout、自动声明和后端接口 | 当前 WGSL 有 safeNormalize，GLSL 使用普通 normalize，是待验证差异；先构造退化用例再判定 bug，不以全仓 TS 改名替代契约检查 |
| P2 | 分离可选光学模型：高度/法线场、连续倒角、可控方向光、微扰、形状融合 | 先单一变量效果对照，再测成本与可读性；与 DOM 内容采集分开验收，避免通过新增滑块声称能力已实现 |

建议先完成 P0 质量基线与真实消费验收，再通过 profiler 选择 P1 的首个改动。当前 CPU 长尾不能证明解析法线会解决主要性能问题，也不能证明更复杂 shader 会改善用户所见。TS 迁移可支持接口与布局约束，但不替代上述视觉、采集和性能验证。

## 可核对源码

- 本库：[shader 适配](../src/shaders.ts)、[参数映射](../src/policy.ts)、[controller](../src/controller.ts)、[WebGPU](../src/renderers/webgpu.ts)、[WebGL](../src/renderers/webgl.ts)、[GPU blur](../src/renderers/blur-wgpu.ts)、[GL blur](../src/renderers/blur-webgl.ts)、[SVG/CSS](../src/renderers/dom.ts)、[固定 Studio 来源](../vendor/studio/UPSTREAM.md)。
- Liquid DOM：[core](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/src/renderer/core.ts)、[shader](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/src/shaders.ts)、[DOM 同步](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/src/renderer/dom-content-sync.ts)、[自适应模糊](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/src/renderer/adaptive-blur.ts)、[层级测试](https://github.com/AndrewPrifer/liquid-dom/blob/dd342ab663d718e8b4edf4cd39983b9a873360a7/packages/core/tests/adaptive-blur.test.ts)。
- ybouane：[shader](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/src/shaders.ts)、[局部 renderer](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/src/GlassRenderer.ts)、[HTML capture](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/src/HtmlCapture.ts)、[变更与合成](https://github.com/ybouane/liquidglass/blob/59af227103795f06421a96e2c7d3dceb081decd2/src/LiquidGlass.ts)。
