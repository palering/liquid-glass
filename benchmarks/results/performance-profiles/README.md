# Performance profiles · JS checkpoint

Audience: public

2026-10-06, local Chrome/Chromium validation. Current runtime remains JavaScript. No push, Pages deployment or npm publication occurred. See the [implementation report](../../../docs/performance-profile-implementation.md) and [actual API](../../../docs/performance-profiles.md).

Core fingerprint: `c54d8b1d181309ab76fea17820583d6ee9e66744d943bf264cc8c3ac908d656f`. Immutable pixel reference BC2: `bc2a5ad508a4350aac24d05a9c3519188573ee974398a39322f839ee46434bb7`. Git HEAD in raw metadata identifies the older published commit; the source fingerprint identifies this dirty local implementation.

- `current-source.json`: recoverable source contents/hashes for runtime, declarations, generated shaders, translator, configuration, scripts, tests, experiments and Lab. This is the current TS starting point; the optical BC2 snapshot stays unchanged.
- `quality.json`: 84/84 default RGBA comparisons exactly match BC2, with resource counters and cleanup. This does not assert economy has identical output.
- `contracts.json`: 30 policy/lifecycle/preset cases and short dynamic-source CPU/rAF samples.
- `stability.json`: 1,350 frames; two GPU backends at 600 each, SVG/CSS/solid at 50 each, profile/blur/layer/size cycles and final cleanup.
- `chrome-smoke.json`: ten default backend/theme cases.
- `consumer-matrix.json`: twenty React Flow backend/zoom/geometry/DOM cases.
- `consumer-interactions.json`: observed drag/connect/edit/add/delete/insert/backend-loss actions in the development consumer.
- `consumer-production.json`: rebuilt package consumer, no DEV QA, one shared GPU canvas, live connection/drag and 390px dark/light checks.
- `lab-ui.json`, `lab-zh.png`: observed bilingual profile diagnostics, old-preset restore, v2 import, narrow layout, and actual Chinese preview screenshot.
- `summary.json`, `checks.json`: derived statistics and observed build/package/check results; logical texture bytes and CPU submission are not GPU time, VRAM, energy or FPS.
- `manifest.json`: SHA-256 for data, recoverable source and fixtures.

Reproduce with `node scripts/prepare-profile-baseline.mjs`, then start the local development server and run the three buttons in `tests/browser/performance-profiles.html` sequentially. Baseline preparation verifies BC2 and preserves conflicting files; no shader compiler is needed. Save future results separately. Current default shader sources and pinned vendor sources match BC2; all profiles use dense25. Approximate profile changes and automatic hardware calibration are separate from the TS language migration.
