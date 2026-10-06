import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, '.local/wgsl-baseline');
const snapshot = JSON.parse(await readFile(resolve(root, 'benchmarks/results/wgsl-translation/baseline-source.json')));
const hash = data => createHash('sha256').update(data).digest('hex');
for (const [name, entry] of Object.entries(snapshot.files)) {
  const target = resolve(directory, name);
  if (!/^(src|vendor)\//.test(name) || !target.startsWith(directory + '/') || hash(entry.source) !== entry.sha256)
    throw new Error(`Invalid baseline file: ${name}`);
  let existing;
  try { existing = await readFile(target); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (existing) {
    if (hash(existing) !== entry.sha256) throw new Error(`Baseline differs; preserve and inspect it: ${name}`);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, entry.source);
  }
}
console.log(`Prepared verified local baseline ${snapshot.sourceSha256}`);
