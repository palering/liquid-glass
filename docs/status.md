# Current status

Audience: public

2026-10-06：v0.4 独立 Git / GitHub 工程基线，核心库、React 薄适配、实验室与性能 harness 分开管理。未接入无限画布；尚未完成生产稳定性验收。公开仓库和 Pages 展示站已发布并通过本次线上交互检查；发布记录见 [deployment.md](deployment.md)。

公开入口为英文 [README](../README.md) 和 [中文版本](../README.zh-CN.md)，共用两张实际 Clear / WebGPU 效果图。详细接口与运行步骤见 [api.md](api.md) / [development.md](development.md)；实验室、性能页与 React 示例支持 EN / 中文原地切换和携带语言的导航。后续提交使用 Conventional Commits。

## 已实现

Studio 固定 MIT GLSL/WGSL 光学 shader；WebGPU → WebGL2 → SVG → CSS → solid。共享 renderer/context；GPU 降采样低通 + 25 tap 横/纵高斯模糊；纹理按半径缓存并回收，GPU 路径不调用 Canvas 2D 模糊。shader 保持透明输出与逐 surface bounds，未执行上游 demo/utils。

20 个独立滑块、染色、边缘模糊、连续清透度；七个外观预设。光学样片/业务卡片/三层材质场景、效果 on/off、指针/键盘移动。GPU 可选按 zIndex 逐层折射**材质纹理**，不采集前景 DOM 或其文字/照片；默认不叠层。

预设定义与 schema v1 是核心导出；实验室命名保存/更新/恢复，JSON 校验、生成、复制和可选下载。有限数值/选项/版本/颜色校验与未知字段剔除；图片不进入 JSON。深浅主题、测试图/网格/棋盘/渐变/图片背景、故障恢复和减少动态效果仍保留。

## 已验证

双语迭代本地构建、14 个契约测试（含语言解析/动态状态/20 参数标签）、类型与打包消费检查通过。实际浏览器确认切换语言保留 21 px 厚度、image 背景、中文自定义预设名和 JSON；坏 JSON 被拒绝。性能归档 147 / 147 与 WebGPU 11 行筛选保留，React 输入与计数/solid 后端在两次语言切换后保留，十次挂载/卸载后 11 个 controller 释放。中英 390 px 页面均无水平溢出，未新增 GPU/跨浏览器性能结论。

双语版本已部署，线上三个页面的切换、携带语言的导航、归档加载、React 输入/计数保留与 README 图文入口均已实际检查；对应源码与工作流见 [deployment.md](deployment.md)。

源码与实际浏览器证据见 [validation.md](validation.md)。本次 GitHub Pages 已实际验证 GPU 渲染、实时参数、预设 JSON、图片、导航、完整故障降级与 React 生产构建交互，见 [deployment.md](deployment.md)。已确认 GPU 透明/毛玻璃与叠层呈现、WebGL 的叠层像素差异和模糊低通效果、预设保存/刷新恢复/JSON 生成与导入、坏 JSON 拒绝、真实设备/上下文故障降级。v0.4 构建、10 个契约测试、TypeScript 消费、实际打包/本地安装/无 DOM 导入/React SSR 通过。React 19 开发模式 StrictMode 输入、点击、后端更新与十次挂载/卸载已测；11 个可观察 controller 最终释放，fixture 无遗留子节点，控制台无 error/warn。

五后端 147 组固定构建性能测试通过，包含两种 look、10/50/100、动态背景、idle 和 GPU 重叠分层，每组 3 次重复。原始 JSON、逐次/汇总 CSV 与报告进入 Git；所有 idle 无额外 draw，最终 DOM/注册/订阅清理通过。100 个移动表面存在长尾；归档版本的 SVG 50/100 表面成本高，后续缓存试验见下文。资源计数不是驱动显存，CPU 提交不是 GPU 时间。详见 [performance.md](performance.md)。

当前 Codex 内置 Chromium 154 的原生 2D/GPU/WebGL DOM API 未开放；能力诊断如实显示。详见 [native-capture.md](native-capture.md)。

SVG 位移图/节点缓存已实施并通过第一轮成对验证：54 / 54 性能组有效；10/50/100 移动表面 CPU p95 为 17.0→5.1、64.5→20.2、140.1→44.9 ms。20 组 SVG / 60 个子树输出逐通道一致，另有 10 组后端 smoke；移动时输入/焦点保留，参数失效与注销清理通过。14 个契约测试、类型、生产构建和打包消费检查通过。GPU shader 未改；CPU/rAF 不是 GPU 时间，100 表面仍有长尾。协议、三方可借鉴部分和原始证据见 [optimization-experiment.md](optimization-experiment.md)。旧 147 组归档保留为历史源码基线，不代表当前完整后端矩阵。

## 未验证 / 未实现

原生 HTML-in-Canvas 2D 桥存在，但实际采集、命中、resize、焦点和新旧兼容未通过实测；直接 GPU DOM 采集未接入。内置浏览器没有已确认的 flags/启动参数入口；普通 Chrome 的隔离 profile 命令只作为人工实验路线，未运行。

没有 Svelte、React hydration / React Flow 集成、任意 DOM 背景折射、跨浏览器验收、DPR 2 压力测试、长期 soak、GPU 时间/驱动显存、视频、形状融合、多灯光、显微扰动或独立 Acrylic 模型。Apple-inspired looks 是自定义参数，没有实测校准为系统像素一致。浏览器文件下载行为尚未确认；JSON 文本路径已验证。

## 继续点

固定源码质量复核及建议验收顺序见 [shader-quality-review.md](shader-quality-review.md)。已核对另外两个项目的局部输入、内容图集/纹理分桶、自适应模糊与光学结构，但未引入其运行时或重跑三方基准。SVG 缓存已完成首轮试验；双 GPU 像素等价、真实消费验收、公共更新 profiler 和 GPU 局部处理仍待推进。不要把本次状态/截图 smoke 当作双 shader 数值一致的证明。

先与用户讨论 [acceptance.md](acceptance.md)，选择默认材质；分析并优化高密度公共更新，补真实画布和跨浏览器验收。原生采集独立推进，不把未开放 API 当作已支持。独立 Git 为 main，公开远端为 [palering/liquid-glass](https://github.com/palering/liquid-glass)；用户已授权 GitHub 仓库与展示站发布，不涉及 npm 发布。整体公开许可待选，上游 MIT 保留；包边界见 [package-contract.md](package-contract.md)。验收稳定后，后续液态玻璃效果统一复用此库。

开发服务 4174，原画布 4173。若服务不存在，按根 README 启动。
