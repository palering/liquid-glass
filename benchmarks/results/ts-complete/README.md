# Complete TypeScript migration evidence

Audience: public

2026-10-07。当前Chrome范围的完整核心TS迁移验收；协议、实施和未验证边界见[完整报告](../../../docs/ts-migration-complete.md)。各JSON来自实际浏览器fixture的只读结果导出，图为实际预览截图。旧Shader/性能/TS第一阶段归档保持不变。

- `quality.json` / `quality.png`：双GPU140项和展示；`checks.json`记录与冻结JS的逐例精确哈希比较。
- `contracts.json`、`stability.json`、`chrome.json`：30项性能、1350帧切档资源和五后端主题10项。
- `lifecycle.json`：初始化取消、并发切换、image取消、回调隔离和最终设备释放8项。
- `failure-cascade.json`、`react-strictmode.json`：实际故障链与React挂载/状态保留。
- `consumer-matrix.json`、`consumer-production.json`、`consumer-*.png`：真实React Flow几何、图交互和手机布局；包含先前动画未结束的拖动尝试，最终构建已复核。
- `checks.json` / `source-manifest.json` / `manifest.json`：非UI检查、逐文件源哈希与证据SHA清单；实现从Git恢复，不再复制整套源码。

源码指纹与Git提交revision是不同概念：运行时指纹包含当前源码，fixture中的revision是验收时已有的提交，工作树当时仍有本轮迁移。没有推送、部署或npm发布。资源计数不是驱动显存；Node与短时Chrome检查不证明跨平台或生产长期稳定。
