import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = process.cwd();
await mkdir(".local/packages", { recursive: true });
const metadata = JSON.parse(
  execFileSync(
    "npm",
    [
      "pack",
      "--json",
      "--pack-destination",
      ".local/packages",
      "--cache",
      ".local/npm-cache",
    ],
    { encoding: "utf8" },
  ),
);
const packed = Array.isArray(metadata)
  ? metadata[0]
  : Object.values(metadata)[0];
for (const f of packed.files)
  if (/^(lab|public|output|benchmarks|node_modules|\.local)\//.test(f.path))
    throw new Error(`Unwanted package file: ${f.path}`);
for (const file of [
  "dist/lib/core.js",
  "dist/lib/react.js",
  "types/core.d.ts",
  "types/react.d.ts",
  "vendor/studio/LICENSE",
  "NOTICE.md",
])
  if (!packed.files.some((f) => f.path === file))
    throw new Error(`Missing package file: ${file}`);
const consumer = resolve(".local/consumer");
await mkdir(consumer, { recursive: true });
await writeFile(
  `${consumer}/package.json`,
  JSON.stringify({
    name: "glass-local-consumer",
    private: true,
    type: "module",
  }),
);
execFileSync(
  "npm",
  [
    "install",
    resolve(".local/packages", packed.filename),
    "--offline",
    "--ignore-scripts",
    "--omit=dev",
    "--omit=optional",
    "--omit=peer",
    "--no-audit",
    "--no-fund",
    "--cache",
    resolve(".local/npm-cache"),
  ],
  { cwd: consumer, stdio: "pipe" },
);
// Compile against the installed tarball, not workspace self-reference declarations.
await writeFile(`${consumer}/types-consumer.ts`,await readFile(resolve('tests/types-consumer.ts'),'utf8'));
execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'--noEmit','--strict','--skipLibCheck','false','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022,DOM','types-consumer.ts'],{cwd:consumer,stdio:'pipe'});
const code = `
import { createPreset, parsePreset, looks, GlassController, performanceProfiles, textureInventory } from '@workspace/liquid-glass';
import { GlassProvider, GlassSurface } from '@workspace/liquid-glass/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
if (typeof document !== 'undefined') throw new Error('SSR test must have no DOM');
const preset = createPreset('consumer', {controls:looks.frosted, performance:{preset:'economy'}});
if (preset.version !== 2 || parsePreset(preset).settings.performance.preset !== 'economy') throw new Error('Preset export');
if (parsePreset({schema:'workspace-liquid-glass',version:1,name:'old',settings:{}}).settings.performance !== null) throw new Error('Preset migration');
if (performanceProfiles.economy.dprCap !== 1 || textureInventory(100,100,1,[]).bytes !== 40000) throw new Error('Performance exports');
const html = renderToString(React.createElement(GlassProvider, null, React.createElement(GlassSurface, {as:'button'}, 'hello')));
if (!html.includes('hello') || !html.includes('lg-stage')) throw new Error('SSR markup');
console.log(JSON.stringify({coreImport:true,reactSSR:true,domRequiredAtImport:false,installedDeclarationsCompile:true}));`;
// React is resolved from this project's pinned development dependencies; the
// packed consumer exercises ESM exports and CSS/type presence, not a browser.
const output = execFileSync(
  process.execPath,
  ["--input-type=module", "-e", code],
  { cwd: consumer, encoding: "utf8" },
);
console.log(output.trim());
console.log(
  JSON.stringify({
    filename: packed.filename,
    bytes: packed.size,
    files: packed.files.length,
    integrity: packed.integrity,
  }),
);
process.chdir(root);
