# Documentation guide

Audience: public

README.md 是项目入口，docs/README.md 是索引；docs/status.md 区分已完成、未实现、验证与继续点。架构写在 architecture.md，源码证据与建议写在 upstream-review.md，避免在多个文件复制完整方案。

用户方向、技术建议、实际实现和浏览器验证必须分开标记。实施时记录固定上游版本、保留的许可、适配点、启动/构建命令和实际浏览器证据，再更新状态。新增主题或后端之前先说明能力边界，不将默认降级视为与 GPU 效果等价。

更新文档后运行 agent-docs 的结构检查，并核对本地链接和事实。该检查不构建代码、不检验着色器，也不证明材质视觉或性能正确。运行、构建、测试与实际 API 已记录在项目 README；验证证据和未验证功能在 status.md / validation.md。
