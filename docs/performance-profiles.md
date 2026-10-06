# 性能档位与成本预算

Audience: public

2026-10-06。**五个手动档位已在本地 JS 核心、类型声明、预设 JSON 和双语 Lab 接入，尚未推送或部署。** 本文件描述实际 API；验证协议与原始数据见 [实施验收](performance-profile-implementation.md)。全部 GPU 档位使用已验证的 dense25 核和现有光学模型。没有自动硬件分档、compact7、简化 RGB 照明或额外灯光。

English overview: five manual profiles are implemented locally. They control DPR, logical GPU texture budgets, distinct blur radii, dispersion, layered rendering and owned animation cadence. All GPU profiles retain dense25 optics. Requested material settings remain intact; effective settings and reasons are observable. These budgets are not hardware FPS guarantees. See the [implementation evidence](performance-profile-implementation.md).

## 四个独立选择

材质 look 决定外观，backend 决定渲染能力，capture 决定背景来源，performance 决定成本取舍。`auto` 是后端可用性/恢复策略，不是硬件跑分。性能档位不会启用整页 DOM 快照或使原生采集 API 可用。前景文字、图片、输入和端口继续使用真实 DOM 与原分辨率。

## 已实现档位

下面预算按**一个 controller**理解。默认 `performance: null` 保留原 `quality` 行为，不自动启用档位。

| 档位 | DPR 上限 | 逻辑纹理预算 | 最多独立正模糊半径 | 色散 / 叠层 | 自有动画背景更新上限 | 取舍 |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| minimal / 最低开销 | 1 | 不分配 GPU 纹理 | GPU 不适用 | 实色，无折射 / 无叠层 | 30 Hz | 放弃折射；场景 Canvas、布局与交互仍有成本 |
| economy / 节能 | 1 | 32 MiB | 1 | 色散精确为 0 / 关闭叠层 | 30 Hz | 模糊半径合并、彩边消失、细节分辨率降低，动态背景可能滞后 |
| balanced / 均衡 | 1.5 | 64 MiB | 3 | 保留请求 / 允许请求的叠层 | 60 Hz | 分辨率受限；超预算进一步降 DPR |
| full / 完整效果 | 2 | 128 MiB | 3 | 保留请求 / 允许请求的叠层 | 60 Hz | 高覆盖/重叠仍可能昂贵；不自动开启叠层 |
| custom / 自定义默认 | 2 | 64 MiB | 3 | 保留请求 / 允许请求的叠层 | 60 Hz | 在下述范围内覆盖预算，并显示实际生效值 |

GPU 模糊算法均为降采样金字塔 + 横纵 dense25；minimal 使用 solid。其他档位遵守请求的 backend 及既有故障降级。SVG/CSS/solid 的逻辑 GPU 纹理计数为 0，浏览器合成与 SVG 位图成本不在这项预算中。没有按 GPU 名称绑定档位，也不承诺所有设备达到 30/60 FPS。

```js
await glass.setSettings({ performance: { preset: 'economy' } });
await glass.setSettings({
  performance: {
    preset: 'custom',
    fidelity: 'preserve',
    overrides: { dprCap: 1.5, textureBudgetMiB: 48, maxBlurRadii: 3, animationHz: 30 },
    adaptive: false
  }
});
const effective = glass.getState().performance;
// effective.dpr / blurRadii / controlsByKind / layered / estimatedTextureBytes
// effective.adjustmentReasons / budgetExceeded / requested
await glass.setSettings({ performance: null }); // 恢复 quality 与原材质控制
```

核心另导出只读 `performanceProfiles` 和 `textureInventory(width,height,dpr,radii,layered)`。后者返回当前 RGBA8 资源清单、逻辑字节及半径链层数/pass 数，不查询驱动显存。

`state.performance` 描述解析后的预算策略；`blurKernel` 是所选 GPU 核，`layered`/`blurRadii` 是该策略的材质要求。实际执行能力同时看 `state.activeBackend`：SVG/CSS/solid 不执行 dense25 或 GPU 叠层。预算实色回退保留待恢复的 GPU 计划和所需字节，实际 GPU 持有字节报告为 0；不要单看计划字段声称回退仍有折射/叠层。

## 校验、保真与预算

`overrides` 接受：`dprCap` 0.5–2、`textureBudgetMiB` 1–512、整数 `maxBlurRadii` 1–3、`animationHz` 15–60、`dispersion: 'off'|'preserve'`、boolean `layered`。数值必须有限且在范围内，非法值抛出 TypeError；未知键被忽略。`adaptive: true` 明确拒绝。`blurKernel`/照明变体不是可用 override。设置先校验，再改变 DOM、状态或图片请求。

`fidelity` 是**半径合并许可**：economy/minimal 默认 `approximate`，其余默认 `preserve`。它不表示固定 DPR 或禁止显式关闭色散/叠层。`preserve` 保留请求的实际模糊半径；半径数量超过限制时使用 solid 并报告 `blur-radius-limit-unmet`，不静默合桶。`approximate` 从当前有序半径集合选出预算允许的代表半径，再按最近距离映射；实际改变 `blurPx`，不是只改缓存键。0 半径始终保持 0。当前 card/control/panel 默认 9/3/20 在 economy 变成同一个 9 px；所有请求参数仍保留在 `state.settings`。

先应用档位/override 和设备 DPR 上限，再沿 1.75/1.5/1.25/1/0.75/0.5 阶梯降低 DPR，直到逻辑纹理预算与设备单纹理尺寸均满足。仍不能满足则在新 GPU 纹理分配之前切换 solid，释放旧 renderer；`budgetExceeded`、原因和 `requiredTextureBytes` 表明无法满足。solid 的 `estimatedTextureBytes` 为 0。尺寸/设置变更后重新计算，符合预算会自动恢复请求后端。`requestedBackend` 保留用户偏好，`activeBackend` 反映实际状态。预算策略不是可用 VRAM 检测，也不覆盖旧资源释放的驱动延迟或替换瞬时峰值。

## 更新与交互

`animationHz` 只限制 `setAnimation(true)` 驱动的**库自有背景绘制**。几何仍按交互 invalidation/rAF 更新；resize、DPR 变化、图片 ready 与显式 `invalidateScene()` 会立即补绘，结束动画也刷新。没有 invalidation 的静止场景不新增 draw。消费者自绘场景主动调用 `invalidateScene()` 的频率由消费者决定；原生采集桥未加入这一限频策略，当前 Chrome 原生采集仍不可用。

background 限频可能使移动背景在旧纹理上短暂滞后；消费方应在 pan/zoom 等需要对齐时显式刷新。30 Hz 指背景绘制策略，不是整个 UI、GPU 每帧或所有来源的上限。

## 纹理清单和实际成本

设物理背景面积 `P`，半径 r 的降采样面积为 `P[r,l]`，末层为 `B[r]`：

```text
ownedBytes = 4 × (P + Σr(Σl P[r,l] + 2×B[r]) + (layered ? 2×P : 0))
```

每次减半向上取整；两维大于 2 且 `radius×DPR/scale > 3` 才继续减半。同半径共享缓存，不同半径尚未共享金字塔；最末横纵两个纹理均计入，0 半径不分配 blur 链。叠层只在有可见 surface 时分配两张全尺寸纹理。资源清单不包括 buffer、driver 对齐、swapchain、解码图片、Canvas CPU 副本和浏览器合成。多个 controller 应由应用汇总预算。

在 960×540 CSS、DPR2、非叠层、三种默认半径的验证场景中，legacy/full 逻辑纹理为 19.374 MiB，balanced 为 10.902 MiB，economy 为 2.843 MiB；节能档同时改变分辨率、半径和色散，不能作为等画质算法加速比较。动态源 CPU/rAF 短样本与限制见 [实施验收](performance-profile-implementation.md)。驱动 VRAM、能耗与多硬件吞吐未测，短窗口 CPU 改善不能冒充 GPU 或 FPS 提升。

DPR 常使像素量按平方变化，但 blur 降采样层级会跳变；小半径可能比大半径更贵。半径种类数、覆盖面积、重复重叠、layered 的全尺寸复制影响成本。调小非零色散或高光强度不保证减少读取/计算；精确零色散才走已验证快路径。CSS blur 和 solid 都不是整个应用零成本。

## 预设与后续研究

新导出 JSON schema **v2** 保存 performance；读取 v1 仍支持并明确恢复 `performance: null`，继续原 quality 行为。Lab 使用 v2 存储键，读取旧 v1 列表作为兼容来源，保留旧键。JSON 不包含图片、scene painter 或 geometry provider。

[独立 Shader 研究](shader-design-research.md) 的 paired13 候选完整保真未通过、计时收益混合，未用于任何档位。compact7、RGB 简化照明、高度场、多灯光、形状融合、prepass/图集、跨半径共享和自动硬件校准都是后续独立候选，需要分别验证质量与成本。自动策略的观察窗口/迟滞目前没有实现；不能把 adapter 存在或 GPU 名称当作吞吐测量。

本阶段完成手动预算，不扩展 Safari/Firefox/WebView 兼容层。后续 TS 工作从新的 JS 快照出发，只迁移语言和生成声明；保留旧 BC2 对照与新档位契约，不将新的模型/性能候选混入迁移。

## Shader fast-path scope / Shader 快路径范围

The current optical shader skips the corresponding Fresnel/glare computation at exactly zero intensity. Profiles do not silently turn lighting off. The measured benefit is conditional, not a general speed guarantee; see [shader preparation](shader-preparation.md).

当前光学Shader在亮边/高光强度精确为0时跳过对应运算，微小非零值仍执行原计算。档位不自动关闭光照。其计时收益只适用于所测关闭条件，不能外推为默认档位、所有硬件或FPS的保证。
