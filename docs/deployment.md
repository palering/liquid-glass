# GitHub repository and Pages deployment

Audience: public

2026-10-06：用户明确授权创建公开 GitHub 仓库与 GitHub Pages 展示站。仓库为 [palering/liquid-glass](https://github.com/palering/liquid-glass)，站点为 [在线实验室](https://palering.github.io/liquid-glass/)。首次部署与线上验证已完成；生产展示站与工程/视觉验收边界分开记录。

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

## 双语展示入口

三个页面均支持 `?lang=en` 和 `?lang=zh-CN`。页头 EN / 中文切换保留当前交互状态，导航继承语言；查询参数优先于浏览器偏好，缺省英文。语言逻辑只属于 lab，数据下载、资源 URL、原生 DOM 交互和核心 fallback 顺序没有改变。源 README 为英文，中文入口为 README.zh-CN.md；截图位于 docs/images，仅进入源码仓库，不进入 Pages 或库 tarball。

2026-10-06 双语版本 `e3f9198` 已由 [Actions run 37400378939](https://github.com/palering/liquid-glass/actions/runs/37400378939) 成功构建和部署，14 个测试、类型、构建及打包消费检查通过；线上 fingerprint revision 匹配，核心 sourceSha256 保持原值。实际浏览器确认英文首页 → 中文切换保留 21 px 厚度和 WebGPU ready，性能导航继承语言并加载 147 / 147 归档、DOM 清理 PASS，切到英文保留数据。React 生产页切中文后保留输入和点击计数，表面状态同步翻译，控制台无 error/warn。GitHub 两张 README 图片完整加载，中文 README 链接与内容显示正常。上述检查不构成新的性能基准。

## 本次验证

- 本地 /liquid-glass/ 构建、10 个契约测试、TypeScript 与打包/离线安装/核心导入/React SSR 全部通过。
- Codex 内置浏览器：实际 WebGPU ready，边缘厚度 20 → 21 px 触发重绘；业务视图与两张生成图片加载；预设生成 JSON 后校验、导入并保存成功。
- 首次 [GitHub Actions run 37397508009](https://github.com/palering/liquid-glass/actions/runs/37397508009) build / deploy success，部署源码 `46e348a`。发布身份修正后初始源码提交为 `ed358a5`，内容树与原初始提交相同。后续文档/fixture 标签修正会自动触发同一工作流；线上 benchmark-source.json 提供实际 revision。
- 线上三个 HTML 入口、fingerprint、两张图片、JSON、逐次/汇总 CSV 与报告均 HTTP 200；四份归档内容 SHA-256 与 Git 源文件相同。
- 内置 Chromium 154 线上实际 WebGPU、WebGL2、SVG 视觉呈现已观察；边缘厚度 20 → 21 px 与 draw 增加，Frosted look、深浅主题、示例图片、真实按钮计数和键盘移动成功。模拟故障实际沿 WebGPU → WebGL2 → SVG → CSS → solid，DOM 点击继续工作，未出现 error/warn。
- 预设 JSON 生成、校验导入并保存成功，坏 JSON 被拒绝；JSON 不含图片。文件下载仍不在本轮验收范围。
- 性能页真实加载 147 / 147 历史归档、DOM 清理 PASS；WebGPU 筛选显示 11 个汇总行。没有在线重跑完整性能矩阵。
- React 生产构建：输入文本保持，点击 0 → 1，auto → solid 更新成功；十次挂载/卸载后 11 个可观察 controller 全部报告已释放，控制台无 error/warn。StrictMode 开发 effect 重放来自既有本地证据，生产版本标签已明确区分。
- 390 × 844 视口检查：无水平溢出，光学样片可见；它不代表移动浏览器或 DPR 2 验收。
- 发布前内容扫描覆盖全部可达提交中的 111 个唯一 blob、99 个当前跟踪文件及 21 个站点产物：常见 GitHub/OpenAI/AWS/Slack/Google 凭证形态、私钥、敏感键赋值和本地绝对路径均无命中。Git 文件清单无禁入项，git check-ignore 验证 node_modules、.local、dist、环境文件、tarball、临时截图和生成归档副本都被忽略。完整 Studio MIT/NOTICE 保留。这是模式与范围检查，不保证覆盖任意编码或未知格式的敏感信息。
- 首次 push 被 GitHub GH007 拦截，原因是提交身份含私有邮箱，文件扫描未覆盖元数据。保留本地忽略目录中的历史 bundle 后，仅改写两个未发布提交的作者/提交者为账号公开 noreply 身份，逐个验证 tree 相同；私有邮箱保护保持开启。项目本地 Git 身份已设置 noreply，未修改全局配置，成功推送的可达历史不包含原私有邮箱。

## 许可与能力边界

private / UNLICENSED 保持不变；整体开源许可尚未选定，未发布 npm 包。实验室图片单独属于站点资产，来源与授权见 public/assets/README.md；库 tarball 不包含它们。

GPU/SVG 只取样自有 scene/图片，不自动采集任意业务 DOM。原生 HTML-in-Canvas 在本次内置浏览器未开放。真实 React Flow、跨浏览器、DPR 2 和长期稳定性仍未验收；100 个移动表面和密集 SVG 性能存在长尾。展示站部署不扩展这些能力，也不代替用户对默认视觉的验收。147 组归档是先前的固定构建性能基线，本次部署检查不重新宣传为新的线上性能矩阵。

工作流遵循 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
