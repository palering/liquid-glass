# Project instructions

Read README.md, docs/status.md and docs/architecture.md before implementation. This is a separate reusable liquid-glass library and lab, with infinite-canvas as its first planned consumer. Do not treat planning documents as implemented features.

User priorities: WebGPU first, native HTML-in-Canvas exploration, WebGL then SVG fallback, global backend selection, dark and gray-white light themes, future image backgrounds. Keep rendering backend independent from backdrop acquisition. An available GPU does not imply native DOM capture support.

Preserve real DOM semantics, clear text, input focus, pointer interaction and React Flow ports. Never replace the editor wholesale with an upstream layout framework without validating graph interactions. Use shared renderer resources; avoid a GPU context per card. No frame-by-frame whole-editor DOM snapshots by default.

Studio optical shaders have now been adapted in the standalone library; native DOM capture and consumption by infinite-canvas remain incomplete. Pin evaluated revisions, retain notices when reusing source, and record any API adaptation. Verify material quality, performance, capture and fallback in actual browsers before marking them verified. Update shared docs with implementation, evidence, limitations and next steps.

## Commit messages

Use Conventional Commits 1.0.0 for every new commit: `<type>[optional scope][optional !]: <description>`. Use lowercase feat, fix, docs, style, refactor, perf, test, build, ci, chore, or revert; mark and explain breaking changes. This also applies when the repository is cloned outside its original workspace. Do not rewrite published history just to reformat old subjects.
