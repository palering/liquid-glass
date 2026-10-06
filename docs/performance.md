# 性能协议与实测结论

Audience: public

后续性能档位的参数、实现区别与预算规范见 [performance-profiles.md](performance-profiles.md)；它是未落地设计。追加Chrome两GPU合并采样试验已有隔离纹理、最终光学与WebGPU timestamp证据，见 [深入研究](shader-design-research.md)，没有替换生产核。下文保留首轮历史矩阵，不能与追加协议混算。

2026-10-06 首个可复跑历史基线。原始 [JSON](../benchmarks/results/latest.json)、[逐次 CSV](../benchmarks/results/runs.csv)、[汇总 CSV](../benchmarks/results/summary.csv)、[完整报告](../benchmarks/results/report.md) 均进入 Git；不以旧版本实验室零散帧数作为本轮矩阵。

固定构建、Chromium 154、Apple M4 Pro / ANGLE Metal（[采样后设备探针](../benchmarks/results/adapter.json)）、1440 × 1024 浏览器视口、960 × 540 scene、DPR 1、浅色 testchart、统一圆角 12 / 无外投影。每组预热 12 帧、采样 60 帧、重复 3 次，轮换后端顺序；总计 147 组，全部有效，无失败或跳过。代码输入列表与 SHA-256 在原始 JSON 中，覆盖 core、固定 vendor、benchmark runner/statistics，UI 与报告工具不在该 hash 内。

后续 SVG 缓存已试验，新的成对协议、原始样本和质量证据见 [optimization-experiment.md](optimization-experiment.md)。本页 147 组归档保持原样；其源码 hash 与优化后的实现不同，不能作为当前版本完整矩阵或与新协议直接混合。

## 看到了什么

下表是 Studio look 的移动场景；每格为 CPU 提交 p95 / rAF 间隔 p95，单位 ms，三次共 180 个样本合并统计。

| 后端 | 10 表面 | 50 表面 | 100 表面 |
| --- | ---: | ---: | ---: |
| WebGPU | 1.90 / 17.40 | 9.50 / 16.80 | 48.90 / 50.00 |
| WebGL2 | 1.80 / 17.40 | 5.70 / 17.10 | 46.00 / 50.00 |
| SVG | 15.90 / 16.80 | 63.20 / 66.80 | 116.00 / 116.80 |
| CSS | 1.30 / 17.00 | 13.10 / 17.00 | 60.30 / 66.70 |
| solid | 1.60 / 17.60 | 5.70 / 17.80 | 42.80 / 50.00 |

50 个小表面的 GPU 场景在本次短窗口中大多维持约 16.7 ms 的回调节奏；100 个移动表面出现长尾，不能承诺 60 fps。WebGPU 不一定比 WebGL2 的 CPU 提交更快，GPU 时间也未采集；不能用这个表直接决定所有设备上的优先级。

SVG 在 50 / 100 表面时成本明显偏高。此归档对应的 DOM renderer 在重绘中重建 filter / displacement 图；这是源码判断与实测高成本相符，并未通过 profiler 证明唯一瓶颈。100 表面下 solid 同样有长尾，说明公共几何/样式更新与浏览器布局成本也值得单独分析，不能把所有耗时归因于 shader。

50 表面动态背景的 Studio CPU p95：WebGPU 1.90、WebGL2 3.60、SVG 65.90 ms。该场景节点几何保持不动；与 move 场景测的是不同工作负载，不应当作背景更新“免费”的证明。10 个 Frosted 重叠表面，WebGL2 分层后 CPU p95 从 1.80 增至 5.40 ms；WebGPU 分层提交时间没有明显升高，但异步 GPU 成本未测，所以不宣称叠层没有额外成本。分层额外占用两个合成纹理。

所有 idle 组没有额外 draw；所有有效组最终 controller / surface / listener / stage children 清理通过。GPU 注销表面后 blur cache 与 surface uniform buffers 清空；shared source 留到 dispose 释放。该检查是 JS 所有权与 DOM 清理，不是长期显存泄漏检测。

## 复跑

1. `npm ci --cache .local/npm-cache`，`npm run build`，`npm run preview`。
2. 打开 `http://127.0.0.1:4175/benchmark.html`，保持窗口至少 1040 × 600；为保持本轮条件，使用 1440 × 1024、DPR 1。
3. 运行完整测试；测试会把 fixture 滚动到视口，若切换标签、resize、后端中途降级或清理失败，该组标为失败。没有自动把错误组归为其他后端的成功数据。
4. 导出 JSON，或复制原始 JSON。保存后运行 `npm run bench:report -- path/to/result.json`；同目录生成 runs.csv / summary.csv / report.md，并更新 lab 的归档副本。只把完整、条件明确的数据提升为基线。
5. 数据与源码一起提交；保留先前 Git 版本。比较时同时核对参数、尺寸、DPR、采集模式、节点分布、构建 hash、设备与浏览器；不同条件不直接合并。

CPU 包含 transform 更新、controller.render、scene 绘制、bounds/样式及纹理提交，不包含后续浏览器 paint/compositor/异步 GPU 执行。rAF 是回调间隔，不是实际呈现 FPS；p95 使用 nearest-rank，保留异常长尾，无样本剔除。原始数据包含长任务与资源计数；没有 GPU 时间或驱动显存数字。

CSS / solid 光学能力更少，SVG 为位移近似，不能把较低耗时解释为相同质量更快。原生 HTML-in-Canvas 本浏览器未开放；没有原生采集性能数据。Safari、Firefox、移动设备、DPR 2、高重叠大面板、真实 React Flow pan/zoom 与长时间压力仍待测。设备温度、系统其他负载未受控，60 帧短窗口不代表长期稳定性。
