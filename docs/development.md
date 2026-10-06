# Development and local consumption

Audience: public

## 运行与构建

GitHub Pages 的 Node 22 环境已通过构建与检查，本地也使用 Node.js 22 / npm。

```sh
npm ci --cache .local/npm-cache
npm run dev
npm run build
npm run preview
```

开发入口为 http://127.0.0.1:4174/，固定构建预览为 http://127.0.0.1:4175/。性能页为 benchmark.html，React 契约页为 react-smoke.html。构建输出 dist/lab（静态多入口站）与 dist/lib（ESM 核心和 React 绑定）。实验室、图片和 benchmark 不进入库 tarball。

```sh
npm test
npm run typecheck
npm run test:package
```

契约测试、TypeScript 消费与实际打包/离线安装/无 DOM 导入/React SSR 分别覆盖不同边界；这些检查不证明跨浏览器视觉或生产稳定性。浏览器证据见 [validation.md](validation.md)，性能复跑见 [performance.md](performance.md)，Pages 子路径与发布见 [deployment.md](deployment.md)。

当前TS第一阶段：31个Node契约，六个纯函数模块以strict检查；公开声明仍单独消费检查。`npm test`先从固定Shader阶段快照恢复忽略目录中的JS参考，再通过仅测试使用的TypeScript加载器保留源码`.js`导入标识；npm消费仍只加载构建后的JS，不需要编译器。文件重命名后应重新加载开发页，必要时重启开发服务。浏览器 `tests/browser/performance-profiles.html` 提供策略契约和稳定性按钮；双GPU像素及精确JS对照见[第一阶段验收](ts-migration-stage1.md)。旧快照保持独立。

## Shader 开发

主光学、顶点与自有降采样/模糊/合成 shader 只维护 `src/shaders/*.wgsl`。Studio 的固定 WGSL 库仍保留上游出处。`src/shaders/generated/` 是检查进版本库的 WGSL/GLSL、绑定/布局元数据和 CPU 打包函数；禁止手动修改生成 GLSL。正常 `npm ci`、dev/build 仅校验产物，不需要 Rust，也不在浏览器运行转换器。

修改 shader 或转换工具时，需要 Rust/Cargo（Naga 要求 Rust 1.87+；本次使用 1.98.1）：

```sh
npm run shaders:generate
npm run shaders:check
npm test
npm run build
```

生成命令使用 `tools/shader-translator/Cargo.lock` 和固定 Naga 30.0.0，在 `.local/` 缓存依赖及编译工具。首跑需访问 Rust 包仓库；不会全局安装。源代码、工具/lock 或生成产物不一致会使 dev/build 失败。shader 与 uniform 结构变化还需运行实际 GPU 像素、生命周期和消费验收，见 [单源码验收](wgsl-single-source.md)。

## 光学实验与迁移入口

运行 node scripts/prepare-optical-experiments.mjs（需要同一锁定 Rust 工具），然后 npm run dev，打开 /tests/browser/optical-refinement.html。候选由 WGSL 编译，原始基线从逐文件哈希快照恢复到 .local；默认生产实现不受切换候选影响。报告见 [光学试验](optical-refinement.md)，下一阶段顺序见 [TS 重构入口](ts-migration-plan.md)。本轮限 Chrome/Chromium，其他浏览器在 WebView 阶段再处理。

## 本地包使用

包未发布到 npm。先在本仓库构建并生成 tarball：

```sh
npm run build
mkdir -p .local/packages
npm pack --pack-destination .local/packages --cache .local/npm-cache
```

在消费项目中运行 npm install，并传入上一步生成的 workspace-liquid-glass-0.4.0.tgz 的实际路径。随后可从 `@workspace/liquid-glass` 导入核心，从 `@workspace/liquid-glass/react` 导入 React 绑定，并显式导入 `@workspace/liquid-glass/styles.css`。React 绑定需要消费方提供 React 19；SSR 只能导入模块，controller 在浏览器挂载阶段创建。完整接口见 [api.md](api.md)。

## 展示站语言

实验室、性能页与 React 示例都支持 English / 简体中文。页头 EN / 中文按钮原地切换文案，并更新 html lang 与当前 URL；不会重建核心 controller、清空参数、替换用户图片或丢失输入。`?lang=en` / `?lang=zh-CN` 是可分享的显式入口。页面导航保留 lang 参数；切换偏好保存在浏览器，查询参数优先，无有效偏好时默认为英文。

lab/copy.js 管理静态文案，translation.js 管理翻译与语言解析，i18n.js 只处理实验室的文本/辅助标签和语言导航。渲染后端、scene 纹理、预设 schema、字段 id、用户预设名称、JSON/CSV 与诊断代码保持原样。React 订阅语言变化重绘文案，卸载时取消订阅。没有将 lab 的语言逻辑打包进核心库。

## 文档与提交

README.md 是英文项目入口，README.zh-CN.md 是内容对应的中文入口。两者保持介绍、截图、快速运行、简短用法、必要边界与许可；完整 API、开发路线和验证记录放在 docs。修改涉及入口信息时同步检查两个版本。

新提交使用 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)，例如 `docs(readme): add bilingual guides and clear glass previews`。本仓库 AGENTS.md 保留规则，workspace 根 AGENTS.md 将其应用于所有子项目。已公开历史不因规范调整而重写。
