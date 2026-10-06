# Current status

Audience: public

2026-10-06：v0.4 独立 Git / GitHub 工程基线，核心库、React 薄适配、实验室与性能 harness 分开管理。本地已接入 React Flow 无限画布的建筑卡片、加号和工作区侧栏；尚未完成生产稳定性验收。公开仓库和 Pages 展示站已发布并通过本次线上交互检查；发布记录见 [deployment.md](deployment.md)。

公开入口为英文 [README](../README.md) 和 [中文版本](../README.zh-CN.md)，共用两张实际 Clear / WebGPU 效果图。详细接口与运行步骤见 [api.md](api.md) / [development.md](development.md)；实验室、性能页与 React 示例支持 EN / 中文原地切换和携带语言的导航。后续提交使用 Conventional Commits。

当前发布策略：2026-10-06 后续迭代先在本地实施、验证和保留，待用户授权阶段发布后再推送或部署；之前逐轮发布的授权已被此要求覆盖。以下第二、第三轮、WGSL 单源码及光学/TS 准备阶段结果尚未上传。

**最新状态（2026-10-07）：核心库完整TS迁移已完成并通过当前Chrome范围的本地验收。** 来源、五后端renderer、controller、React和全部作者运行模块都使用strict TS；公开声明从实现生成，公开ESM/CSS入口不变。33个Node测试、本地Node22/26、140个双GPU精确像素、30项策略、1350帧生命周期、8项异步生命周期、Chrome10项、实际消费20项及生产图交互通过。最新事实以[完整迁移验收](ts-migration-complete.md)为准；下文各轮为历史记录，第一阶段不再是最新继续点。未推送、部署或发布npm。

## 已实现

Studio 固定 MIT 光学模型，以 WGSL 为作者源码、Naga 生成 GLSL ES 300；WebGPU → WebGL2 → SVG → CSS → solid。共享 renderer/context；GPU 降采样低通 + 25 tap 横/纵高斯模糊；纹理按半径缓存并回收，GPU 路径不调用 Canvas 2D 模糊。shader 保持透明输出与逐 surface bounds，未执行上游 demo/utils。

20 个独立滑块、染色、边缘模糊、连续清透度；七个外观预设。光学样片/业务卡片/三层材质场景、效果 on/off、指针/键盘移动。GPU 可选按 zIndex 逐层折射**材质纹理**，不采集前景 DOM 或其文字/照片；默认不叠层。

预设定义与 schema v1 是核心导出；实验室命名保存/更新/恢复，JSON 校验、生成、复制和可选下载。有限数值/选项/版本/颜色校验与未知字段剔除；图片不进入 JSON。深浅主题、测试图/网格/棋盘/渐变/图片背景、故障恢复和减少动态效果仍保留。

## 已验证

双语迭代本地构建、14 个契约测试（含语言解析/动态状态/20 参数标签）、类型与打包消费检查通过。实际浏览器确认切换语言保留 21 px 厚度、image 背景、中文自定义预设名和 JSON；坏 JSON 被拒绝。性能归档 147 / 147 与 WebGPU 11 行筛选保留，React 输入与计数/solid 后端在两次语言切换后保留，十次挂载/卸载后 11 个 controller 释放。中英 390 px 页面均无水平溢出，未新增 GPU/跨浏览器性能结论。

双语版本已部署，线上三个页面的切换、携带语言的导航、归档加载、React 输入/计数保留与 README 图文入口均已实际检查；对应源码与工作流见 [deployment.md](deployment.md)。

源码与实际浏览器证据见 [validation.md](validation.md)。本次 GitHub Pages 已实际验证 GPU 渲染、实时参数、预设 JSON、图片、导航、完整故障降级与 React 生产构建交互，见 [deployment.md](deployment.md)。已确认 GPU 透明/毛玻璃与叠层呈现、WebGL 的叠层像素差异和模糊低通效果、预设保存/刷新恢复/JSON 生成与导入、坏 JSON 拒绝、真实设备/上下文故障降级。v0.4 构建、10 个契约测试、TypeScript 消费、实际打包/本地安装/无 DOM 导入/React SSR 通过。React 19 开发模式 StrictMode 输入、点击、后端更新与十次挂载/卸载已测；11 个可观察 controller 最终释放，fixture 无遗留子节点，控制台无 error/warn。

五后端 147 组固定构建性能测试通过，包含两种 look、10/50/100、动态背景、idle 和 GPU 重叠分层，每组 3 次重复。原始 JSON、逐次/汇总 CSV 与报告进入 Git；所有 idle 无额外 draw，最终 DOM/注册/订阅清理通过。100 个移动表面存在长尾；归档版本的 SVG 50/100 表面成本高，后续缓存试验见下文。资源计数不是驱动显存，CPU 提交不是 GPU 时间。详见 [performance.md](performance.md)。

当前 Codex 内置 Chromium 154 的原生 2D/GPU/WebGL DOM API 未开放；能力诊断如实显示。详见 [native-capture.md](native-capture.md)。

SVG 位移图/节点缓存已实施并通过第一轮成对验证：54 / 54 性能组有效；10/50/100 移动表面 CPU p95 为 17.0→5.1、64.5→20.2、140.1→44.9 ms。20 组 SVG / 60 个子树输出逐通道一致，另有 10 组后端 smoke；移动时输入/焦点保留，参数失效与注销清理通过。14 个契约测试、类型、生产构建和打包消费检查通过。GPU shader 未改；CPU/rAF 不是 GPU 时间，100 表面仍有长尾。协议、三方可借鉴部分和原始证据见 [optimization-experiment.md](optimization-experiment.md)。旧 147 组归档保留为历史源码基线，不代表当前完整后端矩阵。

第二轮公共更新 profiler 与五后端 DOM 契约检查已在本地完成。100 表面移动时，当前首次 bounds 读取诊断均值约 22–24 ms，静态强制 render 约 0.02 ms；重复样式写入没有等量 attribute 变更。条件样式缓存经过 54 / 54 无包装成对测量，收益不稳定，已撤回；保留诊断工具、原始样本和候选补丁，不改变第二轮检查点的核心源码。最终五后端输入/焦点、平移缩放、宿主样式修复、隐藏/开关及清理断言全部通过；14 测试、类型、构建、包消费通过。详见 [shared-update-experiment.md](shared-update-experiment.md)。

第三轮已完成本地 React Flow 消费、20 组五后端缩放与交互、54 组模型几何性能、84 组 GPU readback（alpha 精确，颜色差异 ≤1/255）、资源失效/回收、12 组资源性能、四实例 DPR 2 / 600 帧和构建/包消费。保留 GPU 绑定/view/uniform data 复用与零色散/mix 端点快路径；局部 blur 的 36 组像素/24 组性能试验无稳定收益，生产不启用。16 个 Node 契约与类型通过。详细协议、数值、真实画布证据和限制见 [consumer-gpu-experiment.md](consumer-gpu-experiment.md)。

WGSL 单一源码阶段已完成本地验证：四对 shader（光学/顶点/图像 pass）由 WGSL 生成 GLSL ES 300，反射驱动 uniform packing；84/84 像素案例、12 组性能、DPR 2 四实例/600 帧及消费矩阵20/20通过。19 个 Node 契约、类型、构建和包消费通过；实际生产 WebGL 连接/拖动/主题验证通过。普通 npm 构建不要求 Rust。具体实现、撤回的 packing/upload 候选、数值和局限见 [WGSL 单源码报告](wgsl-single-source.md)。

光学与 TS 准备阶段已完成 Chrome/Chromium 下的模型对照和最终回归：全解析梯度超阈值，混合梯度收益不稳定，高度场保留独立实验；生产保留有界高光五次幂与部分 settings 原子校验。最终 25/25 Node、84/84 精确 RGBA、12 组资源性能、Chrome 五后端深浅主题10/10、真实消费20/20及生产 WebGL 连线/拖动/主题通过，构建、声明、shader 漂移与包消费通过。已有单光学 pass GPU timestamp 原始样本，不支持稳定加速结论。四实例、DPR2、18,000前台帧限定运行及失败恢复/最终清理通过；协议与边界见 [光学报告](optical-refinement.md)。最终 JS/声明/工具/测试/配置快照已保留，现在已达到当前范围内开始 TS 的门槛；下一阶段按 [TS 入口](ts-migration-plan.md) 小步迁移，运行时仍为 JS。

Shader 研究阶段（档位接入前）已完成三方逐函数对照、数学检查、54个隔离blur案例、三轮各84材质案例及GPU timestamp。paired候选完整保真各79/84、最高差14，收益混合，未换入生产；当时102个JS快照保持一致。来源与候选取舍见 [深入研究](shader-design-research.md)，研究归档保持不变。

**性能档位阶段（2026-10-06）：五个手动档位已在JS实现，双语Lab、实际预算诊断、v2预设/v1读取及类型/包同步完成。** 29/29 Node、四对shader、类型/构建/实际包通过；默认双GPU84/84 RGBA完全一致、30项策略契约、五后端10项smoke、1350帧切档与最终零资源清理、真实消费20/20及图交互通过。取舍、成本和边界见 [实施验收](performance-profile-implementation.md)。新 [JS检查点](../benchmarks/results/performance-profiles/current-source.json) 是 TS 起点，旧光学快照保留。当前达到用户范围内开始TS的门槛，停止在入口，运行时仍JS；没有推送、部署或npm发布。自动硬件分档/其他核与照明模型仍未实现。

**迁移前Shader优化阶段（2026-10-07）：** 5个优先优化候选各140案例通过，常量准备、CPU/展开权重和GPU递推未获稳定收益，保持实验；生产采用精确零Fresnel/glare跳过。交错三重复的全零光照GPU mean .871902→.592555 ms（约32%），p95 1.441792→1.032192；正常开启p95持平，不宣称全局加速。最终生产140/140通过（134精确，其余RGB最大1/255，alpha精确），29 Node、类型/四对shader/构建/实际包通过；性能30项、1350生命周期帧、Chrome10项及真实消费检查见[验收](shader-preparation.md)。新半圆/凸/Hermite轮廓各140项掩膜/资源检查与样片保持隔离，不是旧look保真或产品视觉验收。新[完整JS快照](../benchmarks/results/shader-preparation/current-source.json)取代旧性能快照作为TS起点；运行时仍JS，未推送/部署。当前优先实验已完成取舍、接口和ABI稳定、回归及恢复点明确，可开始TS；这不代表Shader已最优。

**最新TS第一阶段（2026-10-07）：** 敏感信息及暂存区检查通过，本地JS基线提交`f6f329e`。六个配置/纯函数模块已迁移为strict TS；31个Node、类型、四对shader、构建与实际包通过，140个双GPU像素哈希与冻结JS精确一致，30项策略通过。renderer/controller/React与公开声明生成尚未迁移，完整状态和下一步见[第一阶段报告](ts-migration-stage1.md)。这是已开始迁移后的检查点，旧快照保留；未推送、部署或npm发布。

## 未验证 / 未实现

原生 HTML-in-Canvas 2D 桥存在，但实际采集、命中、resize、焦点和新旧兼容未通过实测；直接 GPU DOM 采集未接入。内置浏览器没有已确认的 flags/启动参数入口；普通 Chrome 的隔离 profile 命令只作为人工实验路线，未运行。

没有 Svelte、React hydration、任意 DOM 背景折射、跨浏览器验收、生产长期 soak、GPU 驱动显存、视频、形状融合、多灯光、显微扰动或独立 Acrylic 模型。Apple-inspired looks 是自定义参数，没有实测校准为系统像素一致。浏览器文件下载行为尚未确认；JSON 文本路径已验证。

## 继续点

固定源码质量复核及建议验收顺序见 [shader-quality-review.md](shader-quality-review.md)。已核对另外两个项目的局部输入、内容图集/纹理分桶、自适应模糊与光学结构，但未引入其运行时或重跑三方基准。SVG 缓存、公共更新 profiler、真实消费几何、双 GPU 数值与资源/快路径/ROI 已完成三轮本地实施及试验；本轮范围与完成状态见 [continuation-plan.md](continuation-plan.md)。两 GPU 后端之间颜色仍不逐像素相等，原始差异单独保留。

当前 Chrome/Chromium 基线的 TS 前门槛见 [acceptance.md](acceptance.md)；其他浏览器与平台兼容明确延后到 WebView 支持阶段，不提前扩展兼容层。高密度长尾、默认材质选择与生产长期稳定仍按独立需求评估。原生采集独立推进，不把未开放 API 当作已支持。独立 Git 为 main，公开远端为 [palering/liquid-glass](https://github.com/palering/liquid-glass)；当前先本地迭代，阶段发布须等待用户授权，不涉及 npm 发布。整体公开许可待选，上游 MIT 保留；包边界见 [package-contract.md](package-contract.md)。验收稳定后，后续液态玻璃效果统一复用此库。

开发服务 4174，原画布 4173。若服务不存在，按根 README 启动。
