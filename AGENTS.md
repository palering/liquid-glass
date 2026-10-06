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

## TS stage one (historical checkpoint)

Local JS baseline commit: f6f329e. Config/settings/preset/policy/performance/geometry now use strict TS. Keep ESM .js specifiers; Vite resolves TS and Node tests use scripts/register-source.mjs. npm consumers use compiled JS and do not receive the loader/compiler. npm test restores the immutable JS reference and compares values, accessor reads, exceptions, JSON and resource policies. Public hand-written declarations remain until stage four; sources/renderers/controller/React remain JS. Continue from docs/ts-migration-stage1.md, preserving old archives. No push/deploy/npm publication.

## Complete TS migration checkpoint

2026-10-07: all authored core runtime modules, source/renderer/controller and React adapter are strict TS. Read docs/ts-migration-complete.md for final evidence and boundaries. src/contracts.ts owns contracts; no source import from types/. Public declarations are generated with npm run types:generate and verified with types:check; shader packer declarations derive from Naga reflection. Preserve ESM .js specifiers, compiled exports and optional React, and keep WGSL/GLSL/JS packing unchanged. Node22.18+ recommended for development tooling. Current Chrome scope verified, other engines/native DOM/hydration/production soak remain separate. Stage-one next steps are completed. Continue local work only; no push/deploy/npm publication.

## Git dependency stage (supersedes the local-only checkpoint)

2026-10-07: the user authorized completing and uploading the Git dependency route before returning to infinite-canvas. Push this verified stage to the existing repository; main pushes trigger the existing Pages workflow. Do not publish npm or change licensing. Git consumers pin a complete commit SHA and commit their lockfile. prepare runs build:lib (shader/declaration checks and library-only Vite build); keep the Lab/archive build outside dependency installation. npm run test:git checks a committed local HEAD or an explicit remote Git URL with real install, types, React SSR and lockfile reinstall. See docs/git-consumption.md for current evidence. The consumer uses installed exports in both dev and production; no implicit sibling-source alias.
