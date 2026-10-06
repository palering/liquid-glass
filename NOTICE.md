# Third-party notices

Liquid Glass Studio by Charles Yin (2024), MIT:
https://github.com/iyinchao/liquid-glass-studio

Pinned revision: `f7b28c36305a862f5cffed3ddd51511cf1204f56`.
Original shader files and full MIT license remain in `vendor/studio/`.
`src/shaders.js` adapts the GLSL/WGSL optical shaders for shared transparent
surface rendering. Distributed bundles contain these shader adaptations and
must retain `vendor/studio/LICENSE` and this notice. Upstream utility/demo code
is reference-only and is not bundled.

Core controller, capture policy, resource lifecycle, GPU blur/composition,
framework adapters, lab and benchmark harness are maintained in this project.
The overall public license is pending; the package remains private and UNLICENSED.

Lab PNGs are generated assets carried forward from the local infinite-canvas
prototype. They are lab-only and excluded from the library tarball. See
`public/assets/README.md` for standalone provenance.
