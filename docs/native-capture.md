# Native HTML-in-Canvas

Audience: public

2026-10-06：当前 Codex 内置 Chromium 154 实测未开放此能力；不能把可用 WebGPU 当作原生 DOM 采集已可用。渲染和采集仍是两个独立选择。

## 当前实例的证据

Secure context 为 true。`CanvasRenderingContext2D.prototype.drawElementImage`、`HTMLCanvasElement.prototype.requestPaint`、GPUQueue 的 `drawElementImageToTexture` / `copyElementImageToTexture`、WebGL2 的 `texElementSubImage2D` / `texElementImage2D` 均不存在；`content` 属性也未暴露。实验室的能力诊断显示实际 API，而不是根据 UA 判断。

当前浏览器控制接口只提供 visibility / viewport 等能力，没有启动参数能力；检查过的 [Codex Browser 文档](https://developers.openai.com/codex/browser) 和设置参考也没有给出任意 Chromium flags 入口。这只能说明**当前没有找到受支持的入口**，不能证明应用内部绝无隐藏开关。没有修改 Codex 配置或重启用户的 app。

给网页 URL 加查询参数，或给 GlassController 加选项，不能启用浏览器未开放的原生 API。`capture: 'native-dom'` 只是请求采集路径，不是浏览器 feature flag。

## 普通 Chrome 的独立实验路线

普通 Chrome 可检查 `chrome://flags/#canvas-draw-element`。Chromium 源码的运行时 feature 名为 `CanvasDrawElement`：[源码说明](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/paint)。

macOS 上可**手动**启动一个单独的测试 profile，例如：

```sh
open -na "Google Chrome" --args \
  --user-data-dir=/tmp/liquid-glass-native-test \
  --enable-blink-features=CanvasDrawElement \
  http://127.0.0.1:4174/
```

此命令未执行、未验证；它不是 Codex 内置浏览器的启动方法。先确认本机安装的 Chrome 版本与 API，再检查实验室诊断。即便开关启用，也必须实测 paint、内容更新、输入、焦点、几何、resize、DPR 和清理，才能将 native 路径标记为通过。不要禁用 Web 安全或使用用户主 profile 来绕过采集限制。

## 版本适配

[Chrome 官方变更说明](https://developer.chrome.com/blog/html-in-canvas-ot-changes)记录：Chrome 155 起使用 `content="drawable"`，2D 自动更新 DOM 几何；新的 GPU 方法为 `drawElementImageToTexture`，WebGL 为 `texElementSubImage2D`，GPU/WebGL 还需显式更新元素几何。实验仍在 Origin Trial 阶段，不能当作跨浏览器稳定 API。

当前代码只包含原生 **2D → GPU 纹理**桥，按属性检测选择旧 `layoutsubtree` 或新 `content`。旧 2D 返回矩阵时应用几何变换；新版本交给浏览器。直接 GPU DOM 上传、完整新旧版本适配和真实 DOM 输入验收尚未完成。没有偷偷用 DOM 截图来冒充 native。
