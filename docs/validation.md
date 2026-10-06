# Browser validation

Audience: public

## v0.4 packaging / framework / performance

2026-10-06：build、10 个 Node 契约测试、TypeScript 消费检查、实际 npm tarball 本地离线安装、无 DOM 核心导入与 React SSR 通过。tarball 仅 12 个库/类型/许可文件，无 lab、PNG、benchmark 样本或开发缓存；当前压缩体积约 43 KB，会随 README 变化。这个数字是包体积，不是运行内存。

React 19 开发模式 StrictMode：原生输入改为“StrictMode 输入保持”，点击更新到 1，WebGPU → solid 后输入值仍在；十次 mount/unmount 完成，11 个可观察 controller disposed=true / surfaces=0 / listeners=0，fixture 无子节点，console 无 error/warn。[原始检查](../benchmarks/results/react-lifecycle.json)。尚未验证 hydration 或 React Flow。

固定构建 Chromium 154 / DPR 1 共 147 组性能测试全部有效，包括后端×两种 look×10/50/100、动态背景、idle及GPU分层，每组 3 次。数据与解释见 [performance.md](performance.md) 和 [原始样本](../benchmarks/results/latest.json)。资源清理是 JS/DOM 证据；GPU timestamps、显存与长期 soak 未测。此前 v0.1/v0.3 的短测量保留为历史，不与本矩阵合并。

日期：2026-10-06（用户时区 Asia/Shanghai）。环境：macOS，Codex 内置浏览器 user agent Chrome/154.0.0.0，DPR 1。通过内置 Playwright UI、CDP 开发调试与截图验证；Playwright CLI 的系统 Chrome 不存在，因此没有把 CLI 启动失败当作运行验收。

## 结果

| 项目 | 证据与结果 |
| --- | --- |
| 自动选择 | WebGPU adapter/device/pipeline 初始化成功并实际绘制，ready / draws > 0 |
| WebGL 对照 | 手动选择后正确绘制三个 surface，与同一背景坐标对齐；没有正常运行 warning/error |
| SVG | 场景图裁切 + 位移 + blur 实际呈现；只能证明本 Chromium 的 scene 路径，不是 SVG backdrop 的跨浏览器证明 |
| CSS / solid | 手动选择正确回退，GPU canvas 移除、3 个 DOM material layer；不支持的折射/模糊参数禁用 |
| device/context 故障 | `GPUDevice.destroy` 后 auto → webgl；`WEBGL_lose_context` 后 → svg；requested=auto、actual/reason 清楚显示 |
| 控件 / 交互 | 调参更新输出，按钮增加本地计数；方向键移动卡片；指针拖动将 CSS 位置移到 left 55.5 px / top 112 px，对应 shader 更新 |
| 主题 | 深色及灰白浅色均检查文字、边框、底板、图表；light-webgpu.jpg 为浅色棋盘诊断背景 |
| 背景 | 网格、渐变、棋盘、示例图片；图片已 decode 并切换场景纹理；本地文件选择器实际导入 storefront.png 成功；损坏图片解码失败后回到 grid 并报告原因 |
| responsive | 1440×1100 和 390×844；窄屏 scrollWidth 375 ≤ innerWidth 390，三个表面纵向排列、控件可滚动访问 |
| 减少动态效果 | 通过临时浏览器 emulation 验证 animating=false，switch disabled 且 unchecked；验证后撤销 emulation |
| 参数输出 | 固定 WebGL/棋盘/blur=0，折射倍率 0→2 时 GPU canvas PNG hash 231628048→-1209387596；仅折射变动，确认像素实际变化 |
| 原生采集 | `drawElementImage` / `requestPaint` 检测未通过，nativeSupported=false，入口禁用；通过 API 强制 native-dom 也保留 scene 并显示原因。没有原生采集效果证明 |

浏览器验证用过临时 viewport、合成 surface 和媒体偏好；合成节点清除，viewport/媒体偏好最终恢复。源码格式化期间出现过一次 Vite HMR reload error；完成格式化、构建并重新加载后，新的 CDP 事件中仅有 Vite 连接 debug 信息，无新 warning/error 或运行异常。模拟故障和主动失败测试不计作正常状态。

## 短时合成表面测试

背景 gradient，场景 viewport 1023×584，DPR 1；每档增加 10/50/100 个小表面，并保留 3 个原始表面，每次 32 个 RAF 回合。平移小 DOM surface 并调用 render；不测 React Flow、节点照片复杂度、SVG 连线、DOM 捕获或大面积动态图模糊。

原始结果：`output/playwright/benchmark-webgpu.json` / `benchmark-webgl.json`。各档纹理数量始终 4（背景 + 3 类 blur）。WebGPU uniform buffer 为 13/53/103，注销后回收。采样是短时检查，不是稳定性或散热压力测试。

| 额外 surface | WebGPU mean / p95 RAF ms | WebGL mean / p95 RAF ms |
| --- | --- | --- |
| 10 | 16.67 / 17.60 | 16.67 / 16.80 |
| 50 | 16.67 / 16.70 | 16.67 / 17.60 |
| 100 | 16.67 / 17.20 | 16.66 / 17.30 |

RAF 间隔受显示节奏影响，不是纯 GPU 渲染时间。UI 显示的 CPU recent ms 包含近 60 次 draw 的场景生成、提交与 DOM 工作，可能跨档混合，不能直接当作每档 GPU 时间。不能根据这些结果宣称 WebGPU 必然快于 WebGL或真实画布达到稳定 60 fps。

## 限制

尚无 Safari/Firefox、DPR 2、移动设备 GPU、原生采集、React 挂载、真实画布或 GPU 直接 blur 验证。本版 SVG fallback 是 scene 图像路径；CSS/solid 可读性保底不等于光学效果一致。照片为生成素材，与参考原始资产存在差异。

## v0.2 光学参数与视觉对照

2026-10-06 追加，本次重点是呈现与独立调参，不重跑 v0.1 的合成节点性能数据。

- 原版只有 4 个综合倍率/遮罩调节；本版 17 个独立滑块 + blurEdge 开关，分别控制距离、厚度、IOR、色散、模糊、遮罩、Fresnel、高光方向/范围/硬度/聚拢及几何。光学样片没有照片、图表覆盖取样区域。
- Studio / clear / frosted / subtle 可见区别已检查；预设切换同步滑块数值，键盘输入色散 End 后到 20 并标记 custom；效果 on/off 与样片 ArrowRight 位移均实际使用 UI 操作。
- 固定 WebGL、同一测试图、相同视口和初始 controls，逐项仅改变一个参数：17 个数值参数和 blurEdge 共 18 项 PNG hash 全部变化。效果 disabled 时 GPU 输出清空，恢复后绘制。原始结果 `output/playwright/expanded-pixel-checks.json`。只证明该 WebGL 路径的参数改变输出，不代表 WebGPU 逐项同像素或物理精确。
- WebGPU 已用相同参数组检查透明厚边、磨砂、深色业务场景；新样片对应 shape bounds 和亮边位置正确，常驻 DOM 内容仍清晰。
- SVG 和 CSS 无对应光学能力的滑块正确禁用；光学视图 1 个 DOM material layer，off 后 0，恢复后 1。solid 禁用 blur。隐藏业务 surface 不再建立 DOM material layer。
- 1440×1100 与 390×844 检查新增布局；390 px 页面 scrollWidth=375，样片宽 250，17 个滑块可访问。验证后 viewport 恢复默认。
- 构建及 4 个 Node 契约测试通过。系统 Chrome CLI 仍未使用；这次为内置浏览器验证。

截图：`optics-v02-webgpu.jpg` 是 clear look；`optics-v02-off.jpg` 是同一外观关闭材质；`optics-v02-mobile.jpg` 为 Studio look 窄屏。上游在线演示所见与限制记在 upstream-review.md；未把网页自身 FPS 当作本库性能证据，也未把部署网站认作固定 commit。

v0.2 当时未实现 shape merging、微观扰动、完整采集或玻璃相互折射；v0.3 的新增能力见下文。当前视觉增强来自实际 uniforms、对照场景和预设调整，原始无限画布尚未接入。

## 2026-10-06 v0.3 verification

本轮参考来源和版本边界见 upstream-review.md；以下是本库的浏览器证据，不是上游项目成绩。当前内置 Chromium 154、macOS、DPR 1，桌面视口覆盖 1440×1024；窄屏 390×844。没有验证跨浏览器像素一致。

- 手动选择 WebGPU / WebGL / SVG / CSS / Solid 的实际 UI 入口可用；修正了旧 WebGPU option 标签错误。
- WebGPU / WebGL 多通道 blur：初稿 9-tap 高半径出现重复条纹，已换成低通降采样 + 25-tap 横纵高斯。透明与磨砂截图人工检查，光学 shader 沿用固定 Studio 来源。
- WebGL 固定测试图，160×90 玻璃内区域，distance/dispersion/fresnel/glare/tint 均置 0：blur 0 高频差分总量 1,051,221；blur 18 为 50,221（比值约 0.0478）。证明该区域细节被真实低通，不证明所有背景的模糊精度或 Apple 等价。
- WebGPU 与 WebGL 的三层显示通过。WebGL layered / separate 整个画布像素 hash 分别 3326310038 / 1099527821；证实该测试下开关影响像素。两者 CPU blur cache 都是 0，GPU blur radius cache 为 1，叠层目标为 2 张。前景 DOM 未参与取样。
- 真实 WebGPU device.destroy → WebGL；WebGL loseContext → SVG；auto 偏好、光学值与 layered 偏好保留；SVG 下 layered 禁用并解释不支持，GPU canvas 为 0、可见 DOM material 为 3。CSS/solid 手动切换确认 ready。SVG optical 模式关闭后 layers=0，重新开启=1。
- UI 20 个独立数值项 + 1 条连续清透 slider。投影浓度 End 到 0.6，下一帧 computed shadow 为 rgba(0,0,0,0.6)。清透度 End 联动到 tint=.64 / distance=.007。效果关闭后 GPU surface buffers=0、blur cache=0、CSS shadow=none。
- 命名保存后刷新，再选择能恢复 WebGPU/Frosted 参数；坏 JSON 拒绝。生成 JSON 并修改 distance=.007 / tint=.64 后导入成功且保存，控件与设置对应。测试只写专用 localStorage key，完成后恢复原有值。下载事件等待没有确认文件，改为始终展示 JSON + 复制入口 + 可选下载链接；文本路径已通过，文件下载/剪贴板/文件选择器的跨浏览器行为仍未验收。
- 图片 decode 完成后，image 背景确认 ready；新加入的取消测试以受控 pending source 检查旧请求完成后 applied=false 且 background=checker。修复重置/改背景被晚到图片覆盖的问题。
- 390 px 窄屏 document scrollWidth=375≤390，21 个 sliders；三层样片可见。DPR 2 叠层/Frosted，texture 682×920 对应 341 CSS px stage，WebGPU ready，缓存数量正常。只验证一个 DPR 2 场景，未做长时压力测试。
- fresh reload 后错误日志为空；没有由故障注入后的 ready 状态冒充正常初始化。

### Synthetic movement and resources

v0.3 修改后的 WebGPU 非叠层表面使用共享 render pass；背景模糊在该 pass 前完成。100 个额外小 surface（32 RAF、6 个已有注册项、stage client 1023×584、DPR 1）的末次结果：mean RAF 22.42 ms、p95 33.9 ms、recent CPU 7.66 ms。不是 GPU timestamp、不是业务应用 FPS，不能宣称稳定 60 FPS 或超越上游。

该次测量：source texture 1、blur textures 2、composite 0、surface uniform buffers 101；移除测试 surface 后注册数恢复 6、可见 optical uniform buffer 1、blur radius cache 1。旧 benchmark 仅列 renderer.textures 的计数，v0.3 已区分 source/blur/composite，不能把 source=1 解释成全部 GPU 资源。

原始新数据：`output/playwright/v03-checks.json`。截图：`layers-v03-webgpu.png`、`frosted-v03-webgpu.png`、`regular-v03-webgpu.png`、`reading-v03-webgpu.png`、`dark-v03-webgpu.png`、`mobile-v03-webgpu.png`、`mobile-v03-dpr2.png`。输出属于本地验证资料，文档保留可交接的事实与边界。

`npm run build` 和 `npm test`（8 tests）通过；agent-docs 结构检查 errors=0、warnings=0；该检查不证明 GPU 或视觉正确。原生 API 开放和完整库发布仍待 library-roadmap.md 所列验收。
