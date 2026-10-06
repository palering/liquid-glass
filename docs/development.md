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
