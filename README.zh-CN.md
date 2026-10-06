# Liquid Glass

> **[English README →](README.md)**

面向 Web 的玻璃材质库与交互实验室。探索通透折射、磨砂表面和玻璃叠层，文字、按钮与输入框保持真实 DOM。

**[在线演示](https://palering.github.io/liquid-glass/?lang=zh-CN) · [性能实验室](https://palering.github.io/liquid-glass/benchmark.html?lang=zh-CN) · [React 示例](https://palering.github.io/liquid-glass/react-smoke.html?lang=zh-CN)**

![浅色光学测试图上的通透玻璃折射](docs/images/clear-optics.jpg)

*Clear 预设 · WebGPU · 浅色光学场景。*

![深色渐变背景上的三层通透玻璃](docs/images/clear-layers.jpg)

*Clear 预设 · WebGPU · 深色渐变与材质叠层。两张图片均为实验室实际运行截图。*

## 功能

- 框架无关核心、可选 React 19 薄适配与 TypeScript 类型声明。
- 优先使用 WebGPU，初始化失败或设备/上下文丢失时降级到 WebGL2 → SVG → CSS → solid。
- 七种材质预设、20 个光学参数，以及染色、模糊和连续清透度控制。
- 深浅主题、内置场景、示例图片与本地图片导入。
- 命名预设与 JSON 导入导出；表面可拖动，内容保留原生 DOM 交互。
- 每个 controller 共享一个 renderer，复用模糊资源，静态场景按变化重绘。

## 本地运行

需要 Node.js 22 和 npm。

```sh
npm ci --cache .local/npm-cache
npm run dev
```

打开 [localhost:4174](http://127.0.0.1:4174/)。实验室可独立运行，不依赖相邻工程。构建、检查和本地包安装见 [开发说明](docs/development.md)。

## 使用核心

包**尚未发布到 npm**。使用以下导入前，先从仓库构建并在消费项目中安装本地 tarball。

```js
import { GlassController } from '@workspace/liquid-glass';
import '@workspace/liquid-glass/styles.css';

const glass = new GlassController(stage, {
  backend: 'auto', capture: 'scene', theme: 'light', background: 'testchart'
});
const unregister = glass.register(cardElement, { kind: 'card', radius: 22 });
await glass.ready;
await glass.setSettings({ controls: { blurPx: 0, thickness: 30 } });
// 卸载时：unregister(); glass.dispose();
```

`stage` 需要 `lg-stage` 类和明确尺寸；前景内容放在 `lg-content` 中，布局由消费方管理。React 绑定通过 `@workspace/liquid-glass/react` 导出。设置、生命周期、预设与 React 用法见 [API 参考](docs/api.md)。

## 当前边界

GPU 和 SVG 取样的是库自己的场景与传入图片，不会自动采集页面任意 DOM。原生 HTML-in-Canvas 仍属实验能力，本轮验证所用浏览器尚未开放。SVG 提供位移近似，CSS 提供背景模糊，效果与 GPU 光学路径不同。

当前是实验性库。跨浏览器、React Flow 接入、DPR 2 压力测试和长期稳定性尚未验收。已测结果与限制见 [当前状态](docs/status.md) 和 [性能证据](docs/performance.md)。

## 文档

[API](docs/api.md) · [开发说明](docs/development.md) · [部署说明](docs/deployment.md) · [完整文档索引](docs/README.md)

## 许可与来源

项目整体许可待选，包保持 `private` / `UNLICENSED`。源码公开访问不等于授予开源许可。改编自 [Liquid Glass Studio](https://github.com/iyinchao/liquid-glass-studio) 的着色器保留 MIT 许可与署名，见 [NOTICE.md](NOTICE.md) 和 [vendor/studio/LICENSE](vendor/studio/LICENSE)。
