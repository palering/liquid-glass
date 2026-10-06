import { cp, mkdir, rm } from "node:fs/promises";
// Publish all archived evidence, clearing stale files on repeated builds.
await rm("public/benchmarks", { recursive: true, force: true });
await mkdir("public/benchmarks", { recursive: true });
await cp("benchmarks/results", "public/benchmarks/results", { recursive: true });
