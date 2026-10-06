# TS 重构入口与不变契约

Audience: public

2026-10-07。用户授权先完成光学试验与稳定性检查，直到可以开始 TS 重构；本文件是下一阶段的实施入口，当前门槛已通过，尚未开始把运行时代码改写为 TS。当前先验收 Chrome/Chromium，Safari/Firefox 与平台差异延后到 WebView 支持阶段。此处的迁移就绪不等于生产稳定或跨平台完成。

## 本阶段边界

追加的 [Shader 研究](shader-design-research.md) 候选仍隔离；五个手动 [性能档位](performance-profiles.md) 已先在 JS 中独立实现与验收。**TS 从最新的 [Shader 优化 JS 快照](../benchmarks/results/shader-preparation/current-source.json) 开始**，旧性能阶段、光学 BC2 和研究归档保留作对照，不能覆盖。迁移保留已实现的预算策略与精确零光照快路径，不引入新核、新光学模型或自动硬件校准。优先Shader候选的实测采用/拒绝见[本轮报告](shader-preparation.md)；常量预计算、三种权重方案未进入生产，三种新轮廓继续隔离。

主光学与图像 pass 已只维护 WGSL，Naga 生成 GLSL ES 300、反射数据和固定 CPU packer。解析/混合梯度及高度场候选独立于运行时；最终取舍和证据见 [光学报告](optical-refinement.md)。高级模型没有变成新公开设置，继续保持七个现有 look 和现有 controller/React 接口。所有发布仍需用户授权，整体许可/private/npm 策略保持原状。

## 开始迁移前的门槛

| 门槛 | 当前依据 |
| --- | --- |
| 可恢复的 JS 基线 | 最新 JS/声明/工具/测试/配置/Lab 保存在Shader优化阶段归档，旧光学归档不改写；后续迁移建立小步 Git 检查点 |
| Shader 单源码与 ABI | 四对产物的 source/tool/output 漂移检查；160-byte 光学 / 32-byte 图像块、成员偏移和整数位已有契约 |
| 已实现 API 与实验分离 | core/react/styles.css、生命周期、几何、scene painter 和 performance API 保留；预设输出 v2、兼容读取 v1；performance:null 保持原 quality 行为 |
| 数值和输入边界 | 非有限值与非法选项在 DOM/状态/图片请求变化前拒绝；有效数值按已记录范围夹取，默认材质与相对控制保留 |
| 回归可复跑 | Node、类型消费者、库/实验室构建、实际打包/SSR；GPU 像素、资源、Chrome 交互与限定时间 soak 的报告/原始结果 |
| 许可与分发边界 | 原 vendor MIT 保留；实验/Rust/基线/文档不进入库 tarball；没有推送、部署或 npm 发布授权 |

精确完成状态与未验证边界以 [status.md](status.md)、[Shader优化验收](shader-preparation.md)、[性能实施验收](performance-profile-implementation.md) 和 [光学报告](optical-refinement.md) 为准。保持 requested controls 与 effective controlsByKind 分离，预算失败/尺寸恢复、档位清除、显式 invalidation、预设迁移和零资源清理都是 TS 必须保留的契约。

## 迁移顺序

1. **基础数据与纯函数。** config、settings、preset、policy、geometry、performance。区分外部可选 Settings/Controls、规范化 PerformanceOptions、内部完整设置、生效资源计划、校验后的几何帧与 material/uniform 值。保留 ESM .js 导入路径及既有数值行为；逐组开启 strict 检查，避免全仓一次性改后缀。
2. **来源与 renderer 契约。** 定义 scene/source 的 canvas、version、resize/dispose；DOM renderer、GPU image pass 与光学 renderer 使用明确的生命周期和资源类型。DOM 使用标准浏览器类型；WebGPU 类型单独引入并锁定，安装/编译验证后才记录具体依赖版本。
3. **Controller 与 React。** 明确初始化/ready/failed/disposed、后端异步 generation、geometry/painter 回调、注册/注销和订阅类型。随后迁移 React 薄适配，保持可选 peer、SSR 导入和 StrictMode 行为。
4. **声明与打包。** 从实现生成声明，替换手写声明；保持同样的 core/react/styles.css exports。WGSL 不改写成 TS，GLSL/ABI/packing 继续自动生成；如为生成 packer 增加 TS 声明，也从同一 reflection 生成，不手写布局索引。
5. **消费验收。** 实际 tarball 安装到消费 fixture，跑编译、无 DOM 导入/SSR、React 页面、真实画布矩阵和生产交互。光学像素与新冻结基线要求精确一致，参数 JSON 保持一致；不沿用优化实验的1/255容差来允许语言迁移逐步漂移；非预期差异先定位再继续。

lab、性能 UI、Rust 工具和浏览器实验 fixture 暂时不要求迁移；它们不应拖累核心 strict 类型检查。保留每组小步可回退检查点，不用广泛 any、非空断言或关闭 strict 消除错误。类型应表达已核对的运行契约；不在类型重构中顺带切换光学模型、采集路线或新增公开功能。

## 每组接受条件

Node 和 tsc 通过，生成 shader 检查通过，构建与实际包消费通过；受影响的实际浏览器路径通过。更改 renderer/controller/React 后分别复跑对应像素、生命周期或交互 fixture。全部迁移后做一次完整回归；基线文件不能被新结果覆盖。公开源码和 Pages 仍保持已发布版本，直到阶段发布获授权。

Safari/Firefox、各系统 WebView、原生 DOM 采集、hydration、GPU 驱动显存及生产长期运行属于独立验收项；按当前用户范围，它们不阻塞开始 TS 重构，也不得标记为已支持。
