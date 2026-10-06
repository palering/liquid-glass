# Independent library roadmap

Audience: public

2026-10-06 最新用户方向：现在整理成独立 Git 项目，补各后端性能数据，休息后讨论验收；稳定后作为后续玻璃效果默认实现。此指令替代早先“全功能验收后才初始化 Git”的阶段门槛。v0.4 已完成本地 main 仓库、独立包边界、React 契约和性能基线；随后用户已授权创建公开 GitHub 仓库与 Pages 展示站；没有发布 npm。

## 现有结构

实际目录与包文件范围以 [package-contract.md](package-contract.md) 为准。构建输出 core / react ESM 与多入口 lab；框架共享 controller，不复制 renderer。包保持 private / UNLICENSED，React 已测基础交互、生命周期和 SSR；没有 Svelte 包。性能原始样本及报告位于 `benchmarks/results/`，不进入 npm tarball。

预设模型与 UI 分离：`opticalFields`、`looks` 在核心导出；`createPreset` / `parsePreset` / `serializePreset` 提供 schema v1。浏览器 localStorage 属于实验室，不成为核心依赖。JSON 不含图片、URL、DOM、后端对象；消费方自行存储和迁移。参数范围是工程映射，不是假定的物理量。

## 展示站发布与后续发行

1. **采集与几何**：开放实验 API 的隔离浏览器验证 2D 桥，新旧 API、paint 更新、hit testing、焦点、输入、resize、DPR、取消；明确支持范围后再接 GPU 直接采集。
2. **首个消费应用**：React 挂载与 StrictMode 清理，React Flow pan/zoom/port/节点拖动及面板下方背景。先接少量表面，不能把实验室纹理自动当作业务 DOM 已采集。
3. **浏览器与性能矩阵**：真实 Safari/Firefox/移动端回退；DPR 2/多面板压力、GPU 时间及资源占用。叠层需更多 blur/composite pass，不应默认覆盖整个编辑器。
4. **库包装**：v0.4 已有类型、consumer 本地安装、无 DOM 导入、React SSR、files 白名单与 notices；公开许可、hydration、API 稳定性和消费工程集成仍待验收。开发缓存及截图排除在 Git/包之外，lab 生成素材在 Git 中以便独立运行，但不进库 tarball。
5. **GitHub/发行**：本地 Git 已创建，用户随后明确授权公开仓库与 Pages 展示站，远端为 palering/liquid-glass；实际部署验证见 [deployment.md](deployment.md)。整体开源许可、npm 包名与发行策略仍待选，不随展示站发布自动推进。

## 可选材质与框架包

- **Liquid**：保留完整折射、边缘反射、色散参数，GPU 优先。
- **Frosted**：目前已有 blur-heavy look；后续成为明确的材质模型，侧重散射与可读遮罩，支持 CSS 原生保底。
- **Acrylic**：后续设计低频环境色、散射、细噪声/纹理与色调策略；不是将 blur 增大就声称实现。共享参数可复用，专属效果需标出后端能力。
- **React / Svelte**：薄适配共享 controller；各自验证挂载/卸载、更新、SSR和事件语义，不复制渲染器。无需同一时间引入多个框架开发依赖。

Apple-inspired 参考预设的来源和自定义映射见 [upstream-review.md](upstream-review.md)。这些不是 Apple 原生算法或其数值标定结果。
