# 验收与下一阶段

Audience: public

2026-10-06：用户认为效果已改善，本轮完成独立 Git、包装、React 契约与性能证据。状态是**可讨论验收的工程基线**，不是已宣布生产稳定或全功能完成。随后用户明确授权公开 GitHub 仓库与 Pages 展示站，发布验证单独记录在 [deployment.md](deployment.md)。

## 本轮已通过

- 实验室和核心/React ESM 构建；10 个策略、参数、预设与统计契约测试；TypeScript 消费检查。
- npm tarball 白名单、离线本地消费安装、无 DOM 核心导入与 React SSR；保留 vendor MIT notices，未发布。
- React 19 开发模式 StrictMode：输入保持、点击更新、WebGPU → solid 切换、十次挂载/卸载；11 个可观察 controller 最终 surfaces/listeners 为 0，fixture 无子节点，控制台无 error/warn。
- 五种后端 147 组性能矩阵、idle 不重绘、注销与最终清理、原始样本/报告归档。[性能边界](performance.md) 与 [历史视觉验证](validation.md) 分开记录。

## 回来讨论时的验收项

| 项目 | 当前证据 | 接受条件 / 下一步 |
| --- | --- | --- |
| 视觉与可读性 | GPU 光学/磨砂/叠层及亮暗背景已有实验验证 | 用户选定默认 cards / controls / panels 预设，检查真实设计稿对照 |
| 密集画布 | 10/50/100 合成场景；100 存在长尾 | 分析公共 bounds/样式成本与 SVG 缓存；真实拖动/缩放压力不能仅凭此基线接受 |
| 降级 | 历史实际 device/context loss，偏好保留；本轮各后端完整测量 | Safari / Firefox / 移动端真实渲染，说明每层视觉差异 |
| 原生采集 | 桥接代码；本机 API 未开放 | 开放实验 API 的隔离浏览器验证采集、输入、几何、resize；直连 GPU 路线仍未实现 |
| React | mount/update/unmount/SSR 已测 | hydration / React Flow port、pan/zoom、背景遮挡；Svelte 未实现 |
| 稳定性 | 每组资源清理通过 | 长时间、多实例、大面板、DPR 2、GPU 时间与内存检测 |
| 发布 | 用户已授权公开 GitHub / Pages；private 包 / UNLICENSED / 第三方 notices 保留 | 展示站独立验收；整体许可待选，不发布 npm |

验收稳定后，新液态玻璃效果统一复用这个核心，不再在消费应用各自复制 shader/controller。Frosted 可复用现有参数 look；独立 Acrylic 模型和 Svelte 包另立阶段。原无限画布保持现状，接入将是下一次有证据的消费应用验收。
