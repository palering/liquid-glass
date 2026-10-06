import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const generated = resolve(root, "src/shaders/generated");
const specs = [
  ["optics-vertex", "vertex", "vs_main"],
  ["optics", "fragment", "fs_main"],
  ["image-vertex", "vertex", "main"],
  ["image", "fragment", "main"],
];
const hash = (data) => createHash("sha256").update(data).digest("hex");
const inputs = new Map();
async function expand(file, parents = []) {
  file = resolve(file);
  if (!file.startsWith(root + "/") || parents.includes(file))
    throw new Error("Shader include escapes the project or has a cycle");
  const source = await readFile(file, "utf8");
  inputs.set(relative(root, file), hash(source));
  let result = source;
  for (const match of source.matchAll(/#include '([^']+)'/g))
    result = result.replace(match[0], await expand(resolve(dirname(file), match[1]), [...parents, file]));
  return result;
}
const sources = new Map();
for (const [name] of specs)
  sources.set(name, await expand(resolve(root, `src/shaders/${name}.wgsl`)));
for (const name of ["scripts/shaders.mjs", "tools/shader-translator/Cargo.toml", "tools/shader-translator/Cargo.lock", "tools/shader-translator/src/main.rs"])
  inputs.set(name, hash(await readFile(resolve(root, name))));
const inputHashes = Object.fromEntries([...inputs].sort(([a], [b]) => a.localeCompare(b)));
function packers(artifacts) {
  let code = '// Generated from Naga WGSL reflection. Do not edit.\n';
  for (const [file, bytes] of Object.entries(artifacts)) {
    const shader = JSON.parse(bytes);
    const stem = file.replace('.json', '').replace(/(^|-)([a-z])/g, (_, prefix, c) => c.toUpperCase());
    for (const [name, layout] of Object.entries(shader.uniforms)) {
      code += `export function pack${stem}${name[0].toUpperCase() + name.slice(1)}(data, values) {\n`;
      code += '  const { f32, i32, u32 } = data;\n';
      for (const [field, info] of Object.entries(layout.fields))
        for (let i = 0; i < info.count; i++)
          code += `  ${info.kind}[${info.offset / 4 + i}] = values[${JSON.stringify(field)}]${info.count === 1 ? '' : `?.[${i}]`} ?? 0;\n`;
      code += '  return data.buffer;\n}\n';
    }
  }
  return code;
}

if (process.argv.includes("--check")) {
  const manifest = JSON.parse(await readFile(resolve(generated, "manifest.json")));
  if (JSON.stringify(inputHashes) !== JSON.stringify(manifest.inputs))
    throw new Error("Shader sources/tool changed: run npm run shaders:generate");
  const artifacts = {};
  for (const [name] of specs) {
    const data = await readFile(resolve(generated, `${name}.json`));
    if (hash(data) !== manifest.outputs[`${name}.json`])
      throw new Error(`Generated ${name} was edited: regenerate, do not patch GLSL`);
    if (JSON.parse(data).wgsl !== sources.get(name))
      throw new Error(`Generated ${name} WGSL does not match its source`);
    artifacts[`${name}.json`] = data;
  }
  const data = await readFile(resolve(generated, 'packers.js'));
  if (hash(data) !== manifest.outputs['packers.js'] || data.toString() !== packers(artifacts))
    throw new Error('Generated uniform packers changed or do not match shader reflection');
  console.log(`Verified ${specs.length} generated WGSL/GLSL shader pairs`);
} else {
  const target = resolve(root, ".local/shader-translator-target");
  execFileSync("cargo", ["build", "--release", "--locked", "--manifest-path", "tools/shader-translator/Cargo.toml"], {
    cwd: root, stdio: "inherit", env: { ...process.env,
      CARGO_HOME: process.env.CARGO_HOME ?? resolve(root, ".local/cargo-home"), CARGO_TARGET_DIR: target },
  });
  const temporary = resolve(root, ".local/wgsl-input");
  await mkdir(temporary, { recursive: true });
  await mkdir(generated, { recursive: true });
  const outputs = {};
  // Compile all inputs before replacing checked-in artifacts.
  for (const [name, stage, entry] of specs) {
    const input = resolve(temporary, `${name}.wgsl`), output = resolve(temporary, `${name}.json`);
    await writeFile(input, sources.get(name));
    execFileSync(resolve(target, "release/glass-shader-translator"), [input, stage, entry, output], { stdio: "inherit" });
    outputs[`${name}.json`] = await readFile(output);
  }
  outputs['packers.js'] = Buffer.from(packers(outputs));
  for (const [name, data] of Object.entries(outputs)) await writeFile(resolve(generated, name), data);
  await writeFile(resolve(generated, "manifest.json"), JSON.stringify({ compiler: "naga-30.0.0", target: "GLSL ES 300 / WebGL2", inputs: inputHashes,
    outputs: Object.fromEntries(Object.entries(outputs).map(([name, data]) => [name, hash(data)])) }, null, 2) + "\n");
  console.log(`Generated ${specs.length} WGSL/GLSL shader pairs`);
}
