# Performance baseline

Audience: public

Generated from [raw samples](latest.json) and [summary CSV](summary.csv). Protocol 1.

- Started: 2026-10-05T20:57:29.737Z; finished: 2026-10-05T21:02:03.446Z.
- Source SHA-256: `90062fd9129b4a37efeb2f29034935cff5727dad5b3b9ad7ce57d7ef515c4b82`.
- Browser: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36.
- Platform: MacIntel; logical CPUs: 14; device DPR: 1; test DPR cap: 1.
- Viewport: 1440 × 1024; stage: 960 × 540 CSS px; light testchart; scene capture.
- Warmup 12 frames, measured 60 frames, 3 repetitions; backend order rotated per repetition.
- Valid 147/147; failed 0; skipped 0.
- Native capture supported: false; native capture is outside this baseline.
- Initial empty-page rAF p50: 16.700 ms.

## Moving surfaces

Pooled nearest-rank p95 across all three repetitions. Units ms. No samples discarded.

| Backend | Look | Surfaces | CPU p50 / p95 | rAF p50 / p95 |
| --- | --- | ---: | ---: | ---: |
| webgpu | studio | 10 | 1.200 / 1.900 | 16.700 / 17.400 |
| webgpu | studio | 50 | 4.300 / 9.500 | 16.700 / 16.800 |
| webgpu | studio | 100 | 20.800 / 48.900 | 17.000 / 50.000 |
| webgpu | frosted | 10 | 1.200 / 1.800 | 16.700 / 17.600 |
| webgpu | frosted | 50 | 4.500 / 9.600 | 16.700 / 17.200 |
| webgpu | frosted | 100 | 16.500 / 41.200 | 16.700 / 49.300 |
| webgl | studio | 10 | 1.400 / 1.800 | 16.700 / 17.400 |
| webgl | studio | 50 | 4.200 / 5.700 | 16.700 / 17.100 |
| webgl | studio | 100 | 23.400 / 46.000 | 17.700 / 50.000 |
| webgl | frosted | 10 | 1.400 / 1.800 | 16.700 / 17.300 |
| webgl | frosted | 50 | 4.300 / 7.600 | 16.700 / 16.900 |
| webgl | frosted | 100 | 19.500 / 35.100 | 16.700 / 33.700 |
| svg | studio | 10 | 12.100 / 15.900 | 16.700 / 16.800 |
| svg | studio | 50 | 49.700 / 63.200 | 50.000 / 66.800 |
| svg | studio | 100 | 95.000 / 116.000 | 100.000 / 116.800 |
| svg | frosted | 10 | 12.200 / 15.900 | 16.700 / 16.800 |
| svg | frosted | 50 | 52.400 / 65.300 | 50.100 / 66.800 |
| svg | frosted | 100 | 103.400 / 123.400 | 100.900 / 133.400 |
| css | studio | 10 | 1.000 / 1.300 | 16.700 / 17.000 |
| css | studio | 50 | 7.100 / 13.100 | 16.700 / 17.000 |
| css | studio | 100 | 20.000 / 60.300 | 33.300 / 66.700 |
| css | frosted | 10 | 0.800 / 1.200 | 16.700 / 17.300 |
| css | frosted | 50 | 5.800 / 10.600 | 16.700 / 16.900 |
| css | frosted | 100 | 11.700 / 19.800 | 33.300 / 34.100 |
| solid | studio | 10 | 1.200 / 1.600 | 16.700 / 17.600 |
| solid | studio | 50 | 4.100 / 5.700 | 16.700 / 17.400 |
| solid | studio | 100 | 19.600 / 42.800 | 32.400 / 50.000 |
| solid | frosted | 10 | 1.100 / 1.700 | 16.700 / 17.000 |
| solid | frosted | 50 | 5.500 / 9.200 | 16.700 / 16.800 |
| solid | frosted | 100 | 20.600 / 46.700 | 16.800 / 50.000 |

## Background updates and overlap

| Backend | Look | Workload | Layered | CPU p95 | rAF p95 | Source / blur / composite textures |
| --- | --- | --- | --- | ---: | ---: | --- |
| webgpu | studio | background | false | 1.900 | 17.400 | 1 / 2 / 0 |
| webgpu | frosted | background | false | 1.800 | 17.500 | 1 / 5 / 0 |
| webgpu | frosted | overlap | false | 1.700 | 17.300 | 1 / 5 / 0 |
| webgpu | frosted | overlap | true | 1.500 | 16.800 | 1 / 5 / 2 |
| webgl | studio | background | false | 3.600 | 17.400 | 1 / 2 / 0 |
| webgl | frosted | background | false | 3.500 | 17.200 | 1 / 5 / 0 |
| webgl | frosted | overlap | false | 1.800 | 16.800 | 1 / 5 / 0 |
| webgl | frosted | overlap | true | 5.400 | 16.800 | 1 / 5 / 2 |
| svg | studio | background | false | 65.900 | 66.800 | n/a / n/a / 0 |
| svg | frosted | background | false | 68.000 | 66.900 | n/a / n/a / 0 |
| css | studio | background | false | 0.400 | 17.100 | n/a / n/a / 0 |
| css | frosted | background | false | 0.400 | 17.000 | n/a / n/a / 0 |
| solid | studio | background | false | 1.300 | 17.400 | n/a / n/a / 0 |
| solid | frosted | background | false | 1.300 | 17.500 | n/a / n/a / 0 |

## Interpretation and boundaries

CPU time wraps surface transform updates plus controller.render(), including scene painting and dirty upload submission. Browser paint, compositing and asynchronous GPU execution occur outside this timer. rAF samples are callback cadence, not presented frame timestamps or measured FPS. GPU timestamps and driver memory are not collected. Resource fields count JS-owned live allocations only.

Idle cases issue no explicit draws and verify dirty scheduling stops. All 147 valid runs disposed controllers, cleared registered surfaces/listeners and removed stage children. afterUnregister records per-surface resource pruning before final disposal; shared scene textures can remain until disposal.

CSS/solid do not implement full GPU optics; SVG is an approximation. These rows describe the cost of each fallback, not visual-equivalent competition. No cross-browser, DPR 2, React Flow, native HTML-in-Canvas or mobile performance claim follows from this run. Device/thermal state and other application load were not controlled. Short 60-frame windows are a baseline, not a soak test.

No run failures recorded.
