# Package and framework contract

Audience: public

独立 Git / GitHub 仓库，`main` 分支；包 `@workspace/liquid-glass@0.4.0` 保持 private。公开源码远端为 [palering/liquid-glass](https://github.com/palering/liquid-glass)。2026-10-07 用户授权本阶段上传并使用固定 GitHub 提交依赖；`prepare` 仅构建库，稳定后再安排 CI 预构建发行。没有 npm 发行；整体许可尚未选择，Studio MIT 源码及 shader 改编仍保留原版权声明。实际上传和安装结果以 [Git 依赖记录](git-consumption.md) 为准。

## 实际目录边界

| 路径 | 职责 | 进入库 tarball |
| --- | --- | --- |
| src/controller.ts | 共享生命周期、surface 注册、后端/采集状态、dirty 重绘 | 构建为 ESM |
| src/capture/ | scene；实验性原生 DOM 2D 桥 | 构建为 ESM |
| src/renderers/、src/shaders.ts、src/shaders/ | GPU / GL / SVG / CSS / solid；WGSL 单源码及生成 GLSL，GPU 模糊与合成 | 构建为 ESM |
| src/config.ts、preset.ts、policy.ts、settings.ts、performance.ts、geometry.ts | 严格类型的参数、预设校验、后端顺序、性能预算和几何验证 | 构建为 ESM JS |
| src/contracts.ts | 共享公开与内部类型；实现生成公开声明 | 类型擦除，不单独分发 |
| src/react.ts | 共享 controller 的 React 19 薄适配 | 独立 React 入口 |
| types/ | 从实现生成的core/react声明，消费者类型检查 | 是 |
| src/glass.css | DOM / 装饰层与阴影样式 | 是，显式导入 |
| lab/、public/ | 双语效果实验室、性能 UI、React fixture、生成素材 | 否 |
| benchmarks/ | 协议、统计、原始样本、报告 | 否，Git 管理 |
| vendor/studio/ | 固定上游源码与 notices | 只包含 LICENSE / UPSTREAM |
| tests/、scripts/、docs/ | 契约、打包/数据工具、交接说明 | 否，根 README 文件除外 |

`dist/lib/` 与 `dist/lab/` 都可重新构建，不进入 Git。node_modules、.local、output、生成公开数据副本、压缩包与环境文件不进入 Git；npm `files` 再单独限定发布边界。shader 是 bundle 中的字符串，不依赖消费项目访问 vendor 或 Vite raw loader。库 tarball 含完整 vendor MIT notices。

## 入口与约束

ESM-only，暂不承诺 CJS / UMD。核心入口不导入 React；React 可选 peer 19。CSS 由消费方显式引入。`npm run test:package` 实际打包、本地离线安装并验证核心导出、React SSR 和文件范围；没有执行 npm publish。`npm run typecheck` 检查包含错误选项拒绝的 TypeScript 消费 fixture。

无 DOM 环境可以导入核心、参数及预设；`GlassController` 必须在浏览器挂载阶段创建，SSR 不调用构造函数。React Provider 的 effect 创建/释放 controller，Surface effect 注册/注销，useGlass 订阅公开状态。React fixture 已验证 StrictMode 下真实输入、点击更新、后端切换及十次挂载/卸载；记录的是可观察 controller 清理，不是浏览器驱动显存泄漏检测。

消费方负责 stage 尺寸、布局、唯一注册 id、`lg-content` 分层以及 transform/pan/zoom 后的 `invalidate()`。`id` 是玻璃注册 id；不是另一个 DOM id 管理器。`register` 返回清理函数；消费方必须在元素离开 stage 时注销。选择后端与背景采集分别配置；原生 API 不可用时仍报告 scene 回退。

## 后续适配

React 目前同包子入口足够；稳定后才考虑 `core` / `react` 分包。Svelte 将复用核心，独立验证挂载/销毁、响应式更新、SSR/hydration 与事件语义。Acrylic 尚未实现；Frosted 目前是参数 look，不声称具备完整独立散射模型。

验收后将此库作为后续液态玻璃效果的默认复用实现。首个消费应用先接少量表面，再验证 React Flow 端口、边、平移缩放和面板遮挡背景；相邻 React Flow 原型已接入三个代表表面，其他表面扩展另行验收。

## 展示站发布边界

README 截图位于 docs/images，属于源码文档资产，不进入库 tarball 或 Pages。

GitHub Pages 工作流只上传 `dist/lab`。它包含实验室自有生成图片、性能归档 JSON/CSV/报告和三个 HTML 入口；不包含 `dist/lib`、node_modules、缓存、环境文件、打包 tarball 或临时截图。`VITE_BASE_PATH` 控制站点 URL 前缀，不改变核心库 API。公开仓库与展示站授权不等于选择整体开源许可，private / UNLICENSED 与 vendor MIT/NOTICE 保持原状。详见 [deployment.md](deployment.md)。

2026-10-07：作者运行源码已完整迁移为strict TS，只有反射生成的packer保持JS。`npm run types:generate`生成packer类型和公开声明，`types:check`验证漂移；消费者仍只获得13文件的编译JS/CSS/声明/README/许可，编译器、WebGPU开发类型、实验和测试加载器不进入包。core声明不依赖React或WebGPU类型包；React声明引用同一个core controller，保持类型身份。见[完整验收](ts-migration-complete.md)。
