# Project instructions

Read README.md, docs/status.md and docs/architecture.md before implementation. This is a separate reusable liquid-glass library and lab, with infinite-canvas as its first planned consumer. Do not treat planning documents as implemented features.

User priorities: WebGPU first, native HTML-in-Canvas exploration, WebGL then SVG fallback, global backend selection, dark and gray-white light themes, future image backgrounds. Keep rendering backend independent from backdrop acquisition. An available GPU does not imply native DOM capture support.

Preserve real DOM semantics, clear text, input focus, pointer interaction and React Flow ports. Never replace the editor wholesale with an upstream layout framework without validating graph interactions. Use shared renderer resources; avoid a GPU context per card. No frame-by-frame whole-editor DOM snapshots by default.

Studio optical shaders have been adapted in the standalone library; the adjacent infinite-canvas prototype now consumes it for building cards, connection controls and the workspace sidebar. Native DOM capture and production stability remain unverified. Pin evaluated revisions, retain notices when reusing source, and record any API adaptation. Verify material quality, performance, capture and fallback in actual browsers before marking them verified. Update shared docs with implementation, evidence, limitations and next steps.

## Commit messages

Use Conventional Commits 1.0.0 for every new commit: `<type>[optional scope][optional !]: <description>`. Use lowercase feat, fix, docs, style, refactor, perf, test, build, ci, chore, or revert; mark and explain breaking changes. This also applies when the repository is cloned outside its original workspace. Do not rewrite published history just to reformat old subjects.

## Publication checkpoint

2026-10-06: continue development and verification locally. Do not push commits or deploy Pages until the user authorizes publication of a later stage. This supersedes earlier permission to publish each iteration. Keep local results and their verification status reviewable.

## Shader source

Author GPU shaders only in src/shaders/*.wgsl; preserve pinned vendor originals. Generate GLSL and uniform packers with npm run shaders:generate (locked local Naga tool), never patch generated files manually. Normal npm build checks generated hashes and does not require Rust. Verify pixel, coordinate, alpha and lifecycle contracts for both GPU APIs; see docs/wgsl-single-source.md for the frozen baseline and reproducible fixture.

## Current browser scope and TS boundary

2026-10-06: validate Chrome/Chromium now; defer other browser engines and platform-specific compatibility to future WebView support. Do not expand compatibility layers during optical work or TS migration. Keep optical experiments separate from the production API, and preserve the validated JS baseline before TS work. Follow docs/ts-migration-plan.md; migration readiness is distinct from production stability.

## Shader research and performance policy

Evaluate models independently of Studio and independently of DOM capture. Preserve pinned sources and the current compatibility look; use isolated experiments before adoption. The paired Gaussian candidate is not production-approved (final optical fidelity fails, timing is mixed). See docs/shader-design-research.md. Five manual performance profiles are now implemented in JS; docs/performance-profiles.md is the actual API, and docs/performance-profile-implementation.md records its validation. Preserve requested settings separately from effective per-kind controls, preallocation texture/radius budgets, explicit animation cadence and preset v2/v1 migration. Automatic calibration and alternate shader kernels remain proposals. Keep author shaders in WGSL and generated GLSL/ABI automatic; experimental WGSL under experiments/ must stay outside runtime/package exports. Do not combine TS migration with new optical models or public performance policy.

## Shader preparation checkpoint

2026-10-07: production keeps dense25 and the compatibility model, with exact-zero Fresnel/glare branches now validated. Uniform tint/range preparation and CPU/unrolled/recursive Gaussian weights remain isolated: their timing did not justify adoption. Bounded Hermite/semicircle/convex profiles are experiments, not accepted production models. See docs/shader-preparation.md and benchmarks/results/shader-preparation/current-source.json for the new pre-TS checkpoint. TS must compare exactly against this checkpoint, preserve 160/32-byte reflected ABI and existing policy/JSON behavior, and not accumulate the shader-experiment pixel tolerance. Readiness is distinct from global shader optimality and production stability. No push/deploy.
