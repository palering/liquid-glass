# Git dependency consumption / Git 依赖使用

Audience: public

2026-10-07：当前发行路线为独立 GitHub 仓库 + 固定提交的 npm Git 依赖。用户授权上传本阶段已验收结果，安装路线处理完成后继续无限画布。包仍为 `@workspace/liquid-glass@0.4.0`、`private` / `UNLICENSED`；未发布 npm，不改变上游 MIT/NOTICE。

## Install a pinned revision / 固定版本安装

In the consuming app, replace `COMMIT_SHA` with a published full SHA:

```sh
npm install 'git+https://github.com/palering/liquid-glass.git#COMMIT_SHA'
```

If npm reports `EALLOWGIT`, Git dependencies are disabled by the host configuration. For npm versions supporting this policy, use `--allow-git=root` to allow only the Git dependencies declared by this root app. This is a per-command choice; do not disable unrelated installation protections globally. 本机验证遇到了这一限制，使用命令级 `npm_config_allow_git=root`；没有修改全局 npm 配置。

Commit `package.json` and `package-lock.json`. Use `npm ci` on another machine or CI. Update the SHA intentionally; avoid following a moving branch. HTTPS supports public repository reads without an SSH key; Git is still required. Git installation needs Node.js 22.18+ and access to the npm registry for the build dependencies. If the host's npm policy disables dependency lifecycle scripts, the package cannot build its missing `dist/lib`; configure this dependency's preparation under the host's existing policy, or use a prebuilt tarball.

消费项目提交依赖与 lockfile；跨机器运行 `npm ci`。升级时主动更新完整 SHA，不直接跟随 `main`。公开仓库的 HTTPS 读取无需 SSH key，但仍需要 Git、Node.js 22.18+ 与构建依赖下载。禁止依赖生命周期脚本的宿主安装策略会阻止生成 `dist/lib`；按宿主策略允许该包的准备步骤，或安装预构建 tarball。

## What runs / 安装时运行什么

`prepare` → `npm run build:lib` → generated shader hash check → implementation-derived declaration drift check → library-only Vite build. npm uses the Git checkout's development dependencies for this temporary build, then installs the files allowed by `files`. It does not construct the Lab, copy benchmark archives, run GPU experiments or use Rust. `dist/lib` remains ignored in Git. Shader generated artifacts and declarations remain checked in and checked for drift.

Consumers import `@workspace/liquid-glass`, the optional React 19 entry `@workspace/liquid-glass/react`, and explicit CSS `@workspace/liquid-glass/styles.css`. Core remains independent of React. Use installed package exports in both development and production; source aliases into an adjacent clone would bypass the pinned version. The library itself does not require the consumer to configure a shader raw loader.

安装期间在临时 checkout 编译库，消费包只得到 ESM、CSS、类型和许可文件；开发与生产均使用安装后的导出，避免开发 alias 绕过固定版本。React 绑定需要宿主提供 React 19，核心没有 React 运行依赖。运行时和 DOM 采集边界仍见 [包契约](package-contract.md)。

## Verification / 验证

```sh
npm run build:lib
npm test
npm run typecheck
npm run test:package
# The local Git check uses committed HEAD, not uncommitted working files.
npm run test:git
# After upload, test the published SHA through HTTPS.
npm run test:git -- 'git+https://github.com/palering/liquid-glass.git#COMMIT_SHA'
```

The Git smoke test starts a new consumer, lets npm prepare an unbuilt Git revision, compiles positive/negative public type examples, imports core without a DOM, renders React on the server, checks installed file boundaries and repeats installation through `npm ci`. Results stay in ignored `.local/git-consumers/`. GPU/browser results are separate; this check is not a production stability claim.

2026-10-07 本地安装验证通过：提交 `2df5583de297524ebc5684a1cedc000725abb066` 经 npm 的 `git+file` 路径从无构建产物的提交自动准备；Node26.7/npm12.1 下声明正反例、无DOM核心导入、预设性能策略、React SSR 和 lockfile `npm ci` 重装通过。安装后仅13个文件，包含双语README/ESM/CSS/声明/完整许可，不含Lab、归档、源码编译器或Rust。33个Node测试、typecheck、完整Lab/库构建与tarball消费检查也通过。

首次远端Pages检查 `37541931808` 在 Node22 的 tarball JSON 解析失败；本地隔离官方Node22.23.3/npm10.9.9复现：该版本 `npm pack --ignore-scripts` 仍运行 `prepare`，子构建 stdout 污染 JSON。最终准备入口使用 `scripts/prepare-package.mjs` 将构建日志定向 stderr，保持真实 `npm pack --json` 的stdout只含JSON；tarball检查恢复正常生命周期，Git准备与CI需按最终提交复核。

发布前重新扫描389个候选文件、509个可达历史blob，未发现所检查的凭据、私钥、密码URL、私人路径；禁入文件忽略和未上传提交的noreply身份通过。扫描是模式检查，不是安全审计或绝无敏感信息保证。远端安装、Pages与画布消费结果在实际验证后补充。

## Later releases / 后续发行

Once the API and real integrations settle, add tag-triggered CI builds and prebuilt release artifacts or npm publication. That moves compilation out of the consumer's installation and supports hosts that disable lifecycle scripts. Preserve the same ESM/CSS/type import paths. Existing test/build/Pages CI remains; automatic library publishing is deferred. 初期使用 Git 固定提交，稳定后再补 CI 预构建发行；无需提前建立自动 npm 发布流程。
