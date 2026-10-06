# 手动性能档位实施验收

Audience: public

2026-10-06。五个手动档位已先在 JS 中独立实现、验收，当前停在 TS 入口，本地未推送或部署。实际配置以 [档位 API](performance-profiles.md) 为准。[Shader 研究](shader-design-research.md) 的未通过候选没有换入生产，全部 GPU 档位沿用 dense25。

## 实施与基线

performance.js 校验请求并按可见材质生成半径、DPR、叠层和逻辑纹理预算。controller 保留用户原参数，通过内部 controlsByKind 应用取舍；分配前降级、预算恢复、显式 invalidation 与自有动画限频各有独立契约。双 GPU/DOM renderer 读取同一生效控制。Lab 菜单与生效诊断双语，预设输出 v2/读取 v1，声明与包导出同步更新。修正了预算阻断后重新选择同一后端的恢复分支；v1 迁移仍拒绝非对象。运行时尚未使用 TS。

核心指纹 `c54d8b1d181309ab76fea17820583d6ee9e66744d943bf264cc8c3ac908d656f`。[可恢复 JS 快照](../benchmarks/results/performance-profiles/current-source.json) 和 [数据归档](../benchmarks/results/performance-profiles/README.md) 分开保存。旧 BC2 `bc2a5ad508a4350aac24d05a9c3519188573ee974398a39322f839ee46434bb7`、光学/研究归档保持不变，作者 WGSL 与生成 shader 未改。

## 本轮协议与结果

macOS、内置 Chromium 154、device DPR2，具体 UA/视口/有效参数在 JSON。不是跨浏览器、多硬件、移动实机或生产长期稳定验收。

| 检查 | 结果与范围 |
| --- | --- |
| Node/类型/构建 | 29/29、tsc、Lab/库构建；四对 WGSL/GLSL/ABI 漂移检查通过 |
| 实际包 | 13 文件、40,030 bytes；离线安装、无 DOM 导入、React SSR、性能导出、预设 v2/v1 通过；未发布 npm |
| 默认像素与资源 | 两 GPU 对冻结 BC2，84/84 RGBA 完全一致（颜色/alpha 最大差 0）；薄/裁切/缩放/参数/resize 继承固定案例。稳定 30 帧无新纹理/buffer/bind group/GL attribute 查询；WebGPU 每帧仍创建 1 个 texture view |
| 档位契约 | 30 项：五档/legacy、实际纹理与估算、请求/输入/焦点保留、非法 patch 原子拒绝、v2/v1、保真半径超限、1 MiB 不可满足预算的分配前降级、resize 恢复、自有动画限频与 idle |
| 限定运行 | 两 GPU 各 600 帧、SVG/CSS/solid 各 50，共 1,350 帧；循环档位、0/6/18 半径、叠层/尺寸，逐帧核对纹理与缓存、焦点，校验同后端预算恢复。最终注册/订阅/Canvas/radius cache/uniform buffer 为 0 |
| Chrome smoke | 五后端 × 深浅主题 10/10，非法设置拒绝与内容/焦点保留，最终清理 |
| React Flow | 五后端 × 0.2/0.85/1/2 缩放 20/20，render 内 stage bounds 读取 0，最大差 0.015625 CSS px；焦点、输入及几何/scene 失败恢复 |
| 真实交互 | WebGL 浅色下拖动同步边、端口 8→9 边、编辑、新增/删除 8→9→8 节点及注册 3→4→3；插入拆边得到9节点/10边；WebGL 丢失回 SVG，内容保留 |
| 消费生产构建 | 包导出构建/原有4项打包测试，715.59 kB JS / 219.87 kB gzip，原有大chunk提示仍存在；实际预览无DEV QA、3注册/1 GPU画布、WebGL真实连线/拖动、390px深浅主题无溢出 |
| 双语/JSON | 中英文生效诊断、v1 已存预设恢复 legacy、v2 JSON 导入 economy、minimal 纹理 0、legacy 恢复原色散/quality；390px 两语言无横向溢出 |

资源计数不是驱动即时释放或显存泄漏检测。旧阶段四实例18,000帧证据继续保留，本轮新策略只报告1,350帧，不把旧 soak 当作新策略长期验收。

## 成本短样本

960×540 CSS、三种默认材质、非叠层；每档10帧暖机+40样本，每帧移动surface并显式重绘测试图。CPU记录controller调用（geometry/source/提交），rAF独立保存。显式刷新绕过动画限频；单次短窗口、固定顺序，温度/负载未控制，没有本轮GPU timestamp/驱动显存。

逻辑纹理：legacy/full DPR2为19.374 MiB，balanced DPR1.5为10.902 MiB，economy DPR1为2.843 MiB。economy同时改变半径/色散，是质量取舍。CPU mean/p95及原始样本见 [摘要](../benchmarks/results/performance-profiles/summary.json)，不能冒充GPU总耗时、能耗或FPS。90个交互rAF中的自有动画source绘制约半数，停止/显式invalidation补绘；静止没有新增draw。

## 复跑与迁移

```sh
npm test
npm run typecheck
npm run build
npm run test:package
node scripts/prepare-profile-baseline.mjs
npm run dev
```

准备脚本校验不可变BC2指纹并恢复fixture，保留有差异的现有文件，不需要Rust/Naga编译器。`tests/browser/performance-profiles.html` 顺序运行三个按钮，保存evidence textarea；`chrome-smoke.html`跑五后端。消费开发页`?glassQA=1`跑矩阵，生产不包含QA；图操作在实际浏览器验证，等视口动画结束并避免测试面板遮挡。manifest保存数据与fixture哈希，新结果另存。

TS按 [入口计划](ts-migration-plan.md) 从新JS快照迁移config/settings/preset/policy/geometry/performance，保持JSON、预算、生效设置与生命周期。其他shader模型/核、自适应、WebView、native capture、GPU全命令计时和长期运行均为后续独立工作。
