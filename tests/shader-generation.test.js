import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

test('clean shader checks need no compiler and reject source drift or edited GLSL', async () => {
  const root = resolve(import.meta.dirname, '..');
  await mkdir(resolve(root, '.local'), { recursive: true });
  const temp = await mkdtemp(resolve(root, '.local/shader-check-'));
  try {
    for (const dir of ['src/shaders', 'vendor/studio/src/shaders-wgsl/lib', 'tools/shader-translator'])
      await cp(resolve(root, dir), resolve(temp, dir), { recursive: true });
    await mkdir(resolve(temp, 'scripts'));
    await cp(resolve(root, 'scripts/shaders.mjs'), resolve(temp, 'scripts/shaders.mjs'));
    const check = () => execFileSync(process.execPath, ['scripts/shaders.mjs', '--check'], { cwd: temp, encoding: 'utf8', stdio: 'pipe' });
    assert.match(check(), /Verified 4 generated/);
    const generated = resolve(temp, 'src/shaders/generated/optics.json');
    const original = await readFile(generated);
    await writeFile(generated, Buffer.concat([original, Buffer.from('\n')]));
    assert.throws(check, /was edited/);
    await writeFile(generated, original);
    const source = resolve(temp, 'src/shaders/optics.wgsl');
    await writeFile(source, (await readFile(source, 'utf8')) + '\n// changed source\n');
    assert.throws(check, /sources\/tool changed/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
