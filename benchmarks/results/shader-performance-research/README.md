# Shader / performance research archive

Audience: public

2026-10-06。独立研究归档；生产source仍为 `bc2a5ad508a4350aac24d05a9c3519188573ee974398a39322f839ee46434bb7`，102个冻结文件SHA-256与当前一致。此前光学阶段的 [完整JS检查点](../optical-refinement/current-source.json) 保留，不用本试验覆盖它。深入算法分析见 [研究报告](../../../docs/shader-design-research.md)，未实现的性能策略见 [档位规范](../../../docs/performance-profiles.md)。

## 数据与结论

| 文件 | 记录 | 判断 |
| --- | --- | --- |
| [paired-quality.json](paired-quality.json)、[repeat](paired-quality-repeat.json)、[final](paired-quality-final.json) | 两GPU共84案例/轮，三轮；最终轮使用冻结look配置及增强来源记录 | 每轮79/84通过，5超出颜色≤1/255门槛，最大14；alpha全部精确；资源注销计数归零 |
| [paired-direct-blur.json](paired-direct-blur.json) | 两GPU54个隔离blur输出，37×29/127×65/1×17，.5/3/18，image/testchart/透明输入 | 全部RGBA差≤1/255；透明输入alpha可差1，不能标alpha精确 |
| [paired-blur-timing.json](paired-blur-timing.json) | 18组WebGPU image-pass timestamp | 测量有效，不代表候选优化已通过 |
| [paired-pipeline-timing.json](paired-pipeline-timing.json) | 18组WebGPU真实renderer全部render passes；CPU submit/rAF分别保存 | 测量有效；总体收益混合，不承诺应用FPS |
| [summary.json](summary.json) | 所有样本按workload/radius/variant合并nearest-rank；无异常值剔除；保留逐repeat GPU统计 | 可用下面的分析命令重新生成 |
| [cpu-analysis.json](cpu-analysis.json) | 60个理想滤波比较、3种高度轮廓、18个纹理分配清单 | 单位texel合并恒等成立；.75间距不恒等；内存为逻辑纹理字节 |
| [candidate-image.json](candidate-image.json) | Naga生成候选WGSL/GLSL及reflection | 32-byte图像uniform ABI保持，与生产不同的实验产物 |
| [upstream-sources.json](upstream-sources.json) | 两个额外上游13个固定文件的URL/revision/字节/hash | 参考文件全部复核；未额外再分发源码 |
| [manifest.json](manifest.json) | 数据hash、最终复跑fixture/script hash、compiler/tool/binary hash、环境和限制 | 检查点与可追踪来源 |
| [frosted-comparison.png](frosted-comparison.png) | Chromium页面实际截图 | 两列肉眼接近不证明数值保真；页面显示79/84与最大差 |

每个计时模式3半径×2实现×3次重复，每组10预热+40采样；交替baseline/paired顺序，source960×540、DPR1。浏览器本身1280×720、DPR2、Chromium154/macOS，不与sceneDPR混淆。timestamp-query可用；本轮没有重新探测GPU硬件名/驱动/热状态，没有三上游同场景运行排序。全管线是renderer路径，排除controller/DOM/scene绘制；它每帧强制上传与blur，但timestamp只累计render-pass区间，不计上传/复制/间隙。query读取同步会影响rAF。完整采样包含尾值，短窗口及同一硬件不代表跨设备收益。

最终生产仍使用dense25。合并采样未通过完整光学门槛；它是可继续检验的候选，未成为Economy或其它正式档位。25Node契约、类型、四对生成shader漂移检查通过；新增fixture语法/候选编译、浏览器执行和控制台检查通过。没有TS迁移、公开档位设置、推送、部署或npm发布。

## 复跑

在仓库根目录使用已有依赖和本地锁定工具。第一次没有translator binary时，按 [WGSL工具说明](../../../docs/wgsl-single-source.md) 运行 `npm run shaders:generate` 构建它；普通库消费不需要Rust。准备脚本验证当前translator源码与冻结检查点一致，否则停止，不自动接受工具漂移。

```sh
node scripts/prepare-performance-experiments.mjs
node experiments/performance/analyze.mjs > output/shader-performance-research/cpu-analysis.json
npm run dev
```

CPU重定向前先创建自己的输出目录；不要覆盖本归档。打开 `http://127.0.0.1:4174/tests/browser/performance-research.html`，通过按钮分别跑像素、隔离blur、blur计时及全部render-pass计时。保持前台及尺寸；计时没有timestamp-query时记录unavailable，不能改算CPU当GPU。UI中的Research evidence文本框提供完整JSON，分别保存并注明运行条件。

准备脚本从旧JS检查点恢复两套隔离资源，只改候选图像artifact；look配置也读取冻结副本。实验作者WGSL在 [image-paired.wgsl](../../../experiments/performance/image-paired.wgsl)，生产shader不写入；后续TS不能使baseline偷偷读取新config。初次计时后的fixture只增加隔离readback入口、固定config导入与来源元数据，计时函数/候选artifact保持；manifest中的fixture hash对应最终可复跑文件，不声称它就是初次测量时整个文件的字节hash。

分析已保存的完整归档：

```sh
node scripts/analyze-performance-research.mjs benchmarks/results/shader-performance-research
```

该命令只向stdout输出，不重写raw JSON。如新数据缺少三个完整repeat、出现执行错误或样本数量不匹配，分析会失败。不要把字段`passed:true`的timing执行结果误认为性能收益验收；保真失败数据必须同计时一起保留。
