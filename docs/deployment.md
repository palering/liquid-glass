# GitHub repository and Pages deployment

Audience: public

2026-10-06：用户明确授权创建公开 GitHub 仓库与 GitHub Pages 展示站。仓库为 [palering/liquid-glass](https://github.com/palering/liquid-glass)，预期站点为 [在线实验室](https://palering.github.io/liquid-glass/)。当前首次部署进行中，线上验证待完成。

## 实现与操作

`.github/workflows/pages.yml` 在 main push 或手动 dispatch 时运行：Node 22、npm ci、契约测试、类型检查、核心/实验室构建与打包消费检查。构建任务只有 contents read；部署任务只有 pages write / id-token write，使用 github-pages environment。Pages 配置为 GitHub Actions source；只上传 `dist/lab`，不上传整个仓库或库 tarball。

`actions/configure-pages` 的 base_path 传入 `VITE_BASE_PATH`；`lab/url.js` 统一导航、图片和 fetch 路径。三个入口为根实验室、benchmark.html、react-smoke.html。`scripts/prepare-lab.mjs` 拷贝全部 benchmarks/results 归档，性能页提供原始 JSON、逐次/汇总 CSV 与报告链接。默认本地构建仍使用根路径。

```sh
npm ci --cache .local/npm-cache
VITE_BASE_PATH=/liquid-glass/ npm run build
npm test
npm run typecheck
npm run test:package
VITE_BASE_PATH=/liquid-glass/ npm run preview
# 浏览器访问 http://127.0.0.1:4175/liquid-glass/
# GitHub Actions 失败后查看日志并修复，必要时重新运行
# gh run list --workflow pages.yml
# gh run view RUN_ID --log-failed
```

后续发布：运行上述检查，提交 main 并推送 origin；等待 build/deploy success，再检查线上页面和 benchmark-source.json 的 revision。不要将 pending workflow 或 HTTP 200 当作真实交互/渲染验收。

## 本次验证

- 本地 /liquid-glass/ 构建、10 个契约测试、TypeScript 与打包/离线安装/核心导入/React SSR 全部通过。
- Codex 内置浏览器：实际 WebGPU ready，边缘厚度 20 → 21 px 触发重绘；业务视图与两张生成图片加载；预设生成 JSON 后校验、导入并保存成功。
- GitHub Actions 与线上交互：待首次部署完成后补实际记录。
- 发布前检查：Git 白名单排除 node_modules、.local、dist、环境文件、tarball 与临时截图；源码/归档未发现本地绝对路径或凭证。完整 Studio MIT/NOTICE 保留。

## 许可与能力边界

private / UNLICENSED 保持不变；整体开源许可尚未选定，未发布 npm 包。实验室图片单独属于站点资产，来源与授权见 public/assets/README.md；库 tarball 不包含它们。

GPU/SVG 只取样自有 scene/图片，不自动采集任意业务 DOM。原生 HTML-in-Canvas 在本次内置浏览器未开放。真实 React Flow、跨浏览器、DPR 2 和长期稳定性仍未验收；100 个移动表面和密集 SVG 性能存在长尾。展示站部署不扩展这些能力，也不代替用户对默认视觉的验收。147 组归档是先前的固定构建性能基线，本次部署检查不重新宣传为新的线上性能矩阵。

工作流遵循 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
