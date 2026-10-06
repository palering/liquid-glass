# Optical refinement evidence

Audience: public

Chrome/Chromium 154, 2026-10-06; local work only. See [report](../../../docs/optical-refinement.md) and [TS entry](../../../docs/ts-migration-plan.md).

- `baseline-source.json`: immutable E5 WGSL-stage src/vendor snapshot; not pristine Studio.
- `current-source.json`: recoverable final JS source, generated shaders, type declarations, test fixtures, experiment/tool sources and package/build configuration. Each entry has source text and SHA-256; `inputs` reconstruct the final core fingerprint. Preserve it when beginning TS; extract files into a separate checkout for comparison rather than overwriting ongoing work.
- `candidates.json`: frozen baseline and compiled candidate provenance; tracked authors are in experiments/optics. Rust/Naga is needed to reproduce candidates, not normal package builds.
- `*-quality.json`: analytic/hybrid/current comparisons use color ≤1/255 and exact alpha. Height intentionally permits color differences; its pass means nonblank/mask/lifecycle, not equivalence. `bounded-quality` and `current-quality` are exact in all 84 cases.
- `*-timing.json`: optional timestamp-query, one main optical GPU pass, no blur/layering. Quantized/noisy timings do not establish a stable speed gain.
- `current-performance.json`: CPU/rAF resource protocol, separate from GPU timestamps. `summary.json` combines raw samples using nearest-rank; no outlier removal.
- `neutral-bounded.json`: 64 range/DPR/roundness/zero-control calibration rows; baseline and bounded candidate both match the opaque source.
- `chrome-smoke.json`, `consumer-matrix.json`, `consumer-production.json`: input/atomic-update/cleanup, real consumer matrix, actual production connection/drag/theme evidence. JPGs show actual rendering.
- `soak.json`: four instances, two APIs, DPR 2, 18,000 foreground frames, periodic resize/blur changes and failure recovery; bounded run, not production lifetime or driver memory.
- `manifest.json`: SHA-256 of this archive's files. Core E5/BC2 fingerprints are separate from the complete archive checksum set.

No private local paths or Git author metadata are part of the source checkpoint. Other browser engines and platform compatibility are deferred to the later WebView phase by user direction. Native DOM capture, hydration, driver memory, production lifetime and package publication remain outside the verified scope.
