# 验收与下一阶段

Audience: public

2026-10-06：用户认为效果已改善，本轮完成独立 Git、包装、React 契约与性能证据。状态是**可讨论验收的工程基线**，不是已宣布生产稳定或全功能完成。随后用户明确授权公开 GitHub 仓库与 Pages 展示站，发布验证单独记录在 [deployment.md](deployment.md)。

## 本轮已通过

- 实验室和核心/React ESM 构建；10 个策略、参数、预设与统计契约测试；TypeScript 消费检查。
- npm tarball 白名单、离线本地消费安装、无 DOM 核心导入与 React SSR；保留 vendor MIT notices，未发布。
- React 19 开发模式 StrictMode：输入保持、点击更新、WebGPU → solid 切换、十次挂载/卸载；11 个可观察 controller 最终 surfaces/listeners 为 0，fixture 无子节点，控制台无 error/warn。
- 五种后端 147 组性能矩阵、idle 不重绘、注销与最终清理、原始样本/报告归档。[性能边界](performance.md) 与 [历史视觉验证](validation.md) 分开记录。

## 第三轮本地验收更新

真实 React Flow 建筑卡片/加号/工作区侧栏已共享核心；交互、坐标、双 GPU readback、DPR 2 短窗口多实例和资源回收通过。条件样式缓存和局部 blur 经测量撤回；稳定绑定复用/零色散与纹理端点保留。证据和未验证边界见 [consumer-gpu-experiment.md](consumer-gpu-experiment.md)。尚不能将此宣布为跨浏览器生产稳定、完整 DOM 采集或长期 soak 通过。

## 当前 Chrome 与 TS 门槛

当前只处理 Chrome/Chromium；其他浏览器和平台适配留到 WebView 支持阶段，不能作为此阶段提前增加复杂度的理由，也不阻塞开始 TS。光学候选取舍、最终 25 个 Node 契约、84 个 RGBA 精确对照、12 组性能、10 个 Chrome smoke、20 个消费矩阵和实际生产交互见 [光学报告](optical-refinement.md)。限定持续运行与 GPU timestamp 有各自协议，不能推导生产长期稳定或驱动显存结论。JS 基线和声明/生成工具已保存，按 [TS 入口](ts-migration-plan.md) 逐组迁移，尚未启动运行时 TS 改写。所有追加工作仍本地，后续发布需要用户授权。

追加手动性能阶段已完成JS实现与独立验收：五档/双语UI/预算反馈/v2-v1兼容，29契约、类型、shader/构建/包、84完全一致RGBA、30策略项、10基础smoke、1350帧切档清理及20真实消费。最新 [实施报告](performance-profile-implementation.md) 与新的JS快照是TS当前入口；旧光学快照不覆盖。当前停止于该门槛，尚未迁移运行时。

## 历史验收表（当前结果以上文及阶段报告为准）

| 项目 | 当前证据 | 接受条件 / 下一步 |
| --- | --- | --- |
| 视觉与可读性 | GPU 光学/磨砂/叠层及亮暗背景已有实验验证 | 用户选定默认 cards / controls / panels 预设，检查真实设计稿对照 |
| 密集画布 | 10/50/100 合成场景；100 存在长尾 | SVG/公共更新/模型几何已有分阶段试验；100 表面长尾仍须按实际需求评估 |
| 降级 | 历史实际 device/context loss，偏好保留；本轮各后端完整测量 | Chrome 当前复核；Safari / Firefox / 移动端留到后续 WebView 阶段 |
| 原生采集 | 桥接代码；本机 API 未开放 | 开放实验 API 的隔离浏览器验证采集、输入、几何、resize；直连 GPU 路线仍未实现 |
| React | mount/update/unmount/SSR 已测 | React Flow port、pan/zoom 已本地通过；hydration 与 Svelte 未实现 |
| 稳定性 | 每组资源清理通过 | DPR 2 多实例及限定运行、GPU 时间已有专项；生产长期与驱动显存未验收 |
| 发布 | 用户已授权公开 GitHub / Pages；private 包 / UNLICENSED / 第三方 notices 保留 | 展示站独立验收；整体许可待选，不发布 npm |

验收稳定后，新液态玻璃效果统一复用这个核心，不再在消费应用各自复制 shader/controller。Frosted 可复用现有参数 look；独立 Acrylic 模型和 Svelte 包另立阶段。相邻无限画布现已完成三个代表表面的本地接入验收，其他表面扩展另行评估。
