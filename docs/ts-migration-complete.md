# 完整 TypeScript 迁移验收

Audience: public

2026-10-07。用户授权的核心库TS迁移已完成，包括来源与renderer、controller、React、实现驱动的声明生成和实际消费验收。JS基线`f6f329e`与第一阶段`d10f003`保留；后续不再停在迁移入口。当前仅在本地，未推送、部署或发布npm。最新源码指纹为`02eadf4c977c5de7cd33553c335b3653b744b156bed1d12cdd7323e376f0aed3`；[原始结果](../benchmarks/results/ts-complete/README.md)独立于所有旧归档。

## 实现与契约

全部20个作者TS模块（其中一个为共享类型）使用strict检查，`allowJs: false`；没有`any`、非空断言或关闭类型检查。只有reflection生成的`packers.js`保留JS。Lab、benchmark、浏览器fixture、Rust和隔离Shader研究不属于核心语言迁移范围。

`src/contracts.ts`拥有公开和内部契约，运行源码不再依赖`types/`。标准DOM类型覆盖来源与DOM renderer；锁定`@webgpu/types@0.1.74`只用于开发。工厂在初始化完成后返回WebGPU renderer/image pass，私有构造器与明确资源字段约束其使用。保留异步generation、ready、image token、回调隔离、requested/effective性能设置、预算恢复和幂等dispose。实验原生DOM类型只在桥文件内描述，未添加全局DOM兼容层或宣称采集可用。

`npm run types:generate`通过TS编译器和锁定`rollup-plugin-dts@6.5.1`从实现生成两个公开声明；React引用core中的同一个controller，不复制私有类身份。packer声明由同一Naga reflection派生，不维护另一套offset。build/typecheck的`types:check`检查声明漂移。ESM源码继续使用`.js`specifier，Vite解析TS；实际包导出仍为core/react/styles.css，消费者无需编译器、loader、WebGPU类型包或Rust，React保持optional peer。

WGSL、生成GLSL、原反射JSON与CPU packing运算逐字节保留。配置数值、getters读取/异常、预设v1/v2和JSON顺序与JS快照保持一致。审查转译结果时，scene/native桥、React、WebGPU/image pass、DOM/uniforms、入口和ID运行逻辑与原JS相同。controller将两个CSS数值显式转为字符串，保持浏览器WebIDL转换结果；取消订阅仍实际返回首次true/重复false。WebGL增加shader/program/uniform分配失败检查，失败进入现有降级/清理路径；这是明确的异常处理改进，两个资源失败测试覆盖shader失败与program失败时的清理。

## 验收结果

| 边界 | 本轮结果 |
| --- | --- |
| 数值、设置、预设与ABI | 33个Node测试；包含2,400组预算、240组uniform和固定JS差分，全部通过 |
| 开发运行时 | 本地Node22.23.3和26.7；33项各自通过；Node22声明生成、Lab/库构建及实际包消费通过 |
| 公开与源码类型 | strict源码、公开类型正反例、真实安装tarball类型编译、React/core类型身份与多态props通过 |
| 打包与SSR | 13文件tarball；实际离线安装、无DOM导入、React SSR通过；声明/测试工具不进入运行包 |
| GPU像素与资源 | Chromium154 WebGPU+WebGL 140项；逐例哈希与迁移前最终JS精确一致，0差异；资源清理通过 |
| 性能策略与切档 | 五后端30项策略及1350帧切档/预算失败恢复；最终注册、订阅、canvas、blur/缓冲计数归零 |
| 异步生命周期 | 8项：初始化取消、并发后端切换、图片请求取消、scene/geometry异常隔离、非法patch、原生采集不可用、取消订阅与重复dispose；创建的2个GPU设备全部destroy |
| 浏览器交互 | 五后端深浅主题10项；真实WebGPU→WebGL→SVG→CSS→solid故障链；React StrictMode输入/计数跨设置与语言保留，10次挂载后11个可观察controller全部释放 |
| 真实React Flow消费 | 20组五后端/缩放模型几何矩阵；输入/焦点保留、stage读取0、最大误差0.015625px；生产连接、拖动、编辑、添加、插入拆边、删除和重置通过；390×844深浅主题无溢出，图片完整，DEV QA不进入生产 |

消费项目更新了开发入口alias到`src/index.ts`；生产继续使用包的构建入口。其构建与Sites4项检查通过；最终JS716.79kB /gzip220.12kB；原500kB chunk提示仍存在。本轮第一次拖动在弹窗动画期间没有移动，等待弹窗与视口稳定后通过，尝试记录保留；后续在最终生产bundle复测。消费验证使用mock/session图，未部署或增加业务持久化。

## 提交与依赖检查

重新检查最终候选文件与暂存区的凭据、私钥、密码URL、私人路径、敏感文件名、符号链接和忽略边界；截图仅为项目/模拟数据。检查范围不包括Git历史和其他项目，也不是完整漏洞审计或绝无敏感信息的保证。整体private/UNLICENSED和上游MIT声明不变。

安装开发类型工具时发现原Vite6.4.2的Windows开发服务器公告，升级同一版本线到6.4.4；库的在线npm audit返回0项。公告见[Vite路径绕过](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)与[launch-editor UNC问题](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)。未对其他项目的依赖树做整体安全审计。推荐开发环境Node22.18+；Node26加载器弃用提示只在开发测试出现，不进入包。

## 完成边界

本轮核心TS迁移的五组工作已完成。后续可做产品功能或阶段发布评审；发布仍需用户授权。没有剩余必须迁移的作者核心JS模块或手写公开声明。其他浏览器/WebView、原生DOM真实采集、React hydration、多硬件性能、驱动显存及生产长期稳定仍是独立后续任务；短时生命周期和此次迁移通过不代表这些已经支持。远端Node22 CI未重跑，本地Node22验收已完成。Shader模型取舍保持[迁移前结果](shader-preparation.md)，语言迁移不代表视觉模型最优或新增性能收益。
