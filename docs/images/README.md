# README previews

Audience: public

These JPEGs are unretouched, cropped screenshots of the actual GitHub Pages lab at source revision 03e52c0, captured on 2026-10-06 in the Codex Chromium browser with the WebGPU backend. They are documentation assets, not AI mockups or performance evidence.

- clear-optics.jpg: Clear preset, light theme, testchart backdrop, optical sample view, layered off.
- clear-layers.jpg: Clear preset, dark theme, gradient backdrop, layers view, layered on.

Both use the lab's Clear preset without individual parameter changes: blurPx 0, tintOpacity 0, thickness 30, distance 0.075. Backgrounds are the library's own procedural scenes. Crop bounds follow the stage element. These images contain no browser/account chrome or local paths. They are tracked for README display and excluded from the library tarball and Pages payload.

`svg-cache-pair.jpg` 是独立开发 fixture 的修改前/后 SVG 对照，不用于主 README。Clear、浅色 image、600×360 / 3 个表面、renderer DPR 1，1440×1024 浏览器截图；两侧同一背景像素。基线 8f6b9ff，当前源码与像素证据见 [优化实验](../optimization-experiment.md)。JPEG 仅作整页视觉检查，精确 RGBA 比较使用独立 SVG 子树栅格化。

`shared-updates-retained.jpg` 是第二轮撤回样式缓存候选后的本地 fixture 整页截图，2026-10-06、Chromium 154、1440×1024、SVG / Clear / image / DPR 1，两侧 600×360 / 3 个表面。基线 8cdf48d，与第二轮结束时的核心源码相同；不是候选效果图或性能证据。三个 SVG 子树像素一致，详见 [第二轮记录](../shared-update-experiment.md)。

`consumer-dark.jpg` / `consumer-light.jpg` 是第三轮实际消费者的本地生产构建整页截图，2026-10-06、Chromium 154、1440×1024、DPR 1、WebGPU、三个代表表面、8 个原始节点/8 边。没有修图、AI 生成或浏览器 chrome；原型的栅格内容资产仍有原有生成素材来源。GPU 只取样消费者绘制的环境。不是原稿逐像素复刻、GPU 性能或 DOM 采集证明；数值证据见 [第三轮报告](../consumer-gpu-experiment.md)。
