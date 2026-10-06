# TS 第一阶段：纯函数与配置

Audience: public

2026-10-07。敏感信息与提交范围检查通过后，已建立本地JS基线提交`f6f329e`，随后开始TS迁移。本文保留第一组历史验收；之后剩余组已完成，最新状态见[完整迁移验收](ts-migration-complete.md)。

## 已迁移

`config.ts`、`settings.ts`、`preset.ts`、`policy.ts`、`geometry.ts`、`performance.ts`使用strict检查。`contracts.ts`区分未知输入、校验后的部分设置、完整可移植设置、性能请求/生效计划、表面坐标与纹理清单。内部保留既有`capture: auto`行为，公开声明没有扩展。没有引入`any`、关闭strict或忽略运行时代码的类型错误。

作者Shader和生成产物逐字节保持JS基线版本，光学160字节/图像32字节ABI不变。计算顺序、异常消息、getters读取、JSON属性顺序、默认look、档位和公开包入口保持原行为。ESM源码继续使用`.js`导入标识，Vite解析到对应TS。Node源码测试用开发期加载器；实际tarball只包含构建后的JS，消费者不需要TypeScript编译器或加载器。

Node加载器使用`module.register()`兼容现有Node22工具路线；本轮实际本地版本为Node26.7，会显示该测试API的弃用提示，测试通过。未重跑远端Node22 CI，未推送；该提示只涉及开发测试加载器，不是npm运行时依赖。

## 验收

- 31个Node测试通过。新增差分检查直接加载[不可改写的JS快照](../benchmarks/results/shader-preparation/current-source.json)：2,400组性能预算组合、240组光学uniform组合及配置、无效输入、动态getters/异常、v1/v2预设和JSON精确对照通过。
- 公开声明消费与新增运行时类型消费都通过，含错误kind与非数值bounds的编译拒绝。四对shader漂移检查通过。
- 库/Lab构建与实际13文件tarball安装、无DOM导入、React SSR通过；本轮包40,237字节，源码TS和加载器不进入包。
- Chromium154实际双GPU140例通过，逐例`currentHash`与冻结JS结果完全相同，差异0；不是继续使用优化阶段的1/255容差。资源清理通过。
- 五后端30项性能策略检查通过，预算状态、输入保留、真实拥有纹理清单及最终零资源清理通过。

当前源码指纹`914562889b0999ef52547a7eb53d7df9926dec78e45ee636f6b0d35be95d5185`。文件更名与类型文本使源指纹改变，像素哈希和策略行为没有改变。原始结果与SHA清单见[本轮归档](../benchmarks/results/ts-stage1/README.md)；旧Shader/光学/性能归档不覆盖。

## 当时的继续点（现已完成）

下一组为scene/source与renderer的生命周期、纹理/缓冲资源和uniform契约，随后controller与React。renderer/controller/React目前仍为JS；公开声明仍手写，暂时作为内部类型依赖，生成声明与移除这项依赖在第四组完成。WGSL、实验fixture、Lab和Rust工具不要求改写成TS。

修改资源层后需要相应GPU像素、设备/上下文失败、预算切换、清理和真实消费回归；全部语言迁移后再做完整验收。当前第一组没有重写图交互，未重复此前的全部消费与长期soak。其他浏览器/WebView、原生DOM采集、hydration、驱动显存及生产长期稳定仍独立验收。没有推送、部署或npm发布。
