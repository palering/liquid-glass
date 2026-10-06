# Vendored source

Source: https://github.com/iyinchao/liquid-glass-studio
Commit: f7b28c36305a862f5cffed3ddd51511cf1204f56
Retrieved: 2026-10-06
License: MIT, copyright (c) 2024 Charles Yin; full license retained in LICENSE.

The src/ files are the original pinned files. The lab uses the GLSL/WGSL main shaders and their libraries/vertex shaders, expanded and adapted in our src/shaders.js. Outside-shape output becomes transparent; shape 1 is disabled, shape 2 is positioned for each surface, and material uniforms are mapped in src/policy.js. No upstream installation scripts or demo assets were executed or copied.

Our renderer/resource lifecycle is separate from the upstream demo utilities. Raw utility/background shaders are retained as reference, not runtime dependencies. Since v0.3, the GPU paths use our own downsample pyramid and separable Gaussian passes with radius-based texture caching; they do not use Canvas 2D blur. Scene painting and dirty texture upload are still included in CPU submission measurements. SVG remains a scene displacement approximation and CSS uses native backdrop blur.
