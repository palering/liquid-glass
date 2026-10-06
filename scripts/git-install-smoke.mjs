// Exercise npm's Git dependency preparation from a committed, unbuilt checkout.
// An optional argument selects a remote Git URL instead of the local HEAD.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, writeFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const spec = process.argv[2] ?? `git+${pathToFileURL(root).href}#${revision}`;
await mkdir(resolve(root, '.local/git-consumers'), {recursive: true});
const consumer = await mkdtemp(resolve(root, '.local/git-consumers/check-'));
await writeFile(resolve(consumer, 'package.json'), JSON.stringify({
  name: 'glass-git-consumer', private: true, type: 'module',
  dependencies: {
    [manifest.name]: spec,
    react: manifest.devDependencies.react,
    'react-dom': manifest.devDependencies.react,
  },
  devDependencies: {
    typescript: manifest.devDependencies.typescript,
    '@types/react': manifest.devDependencies['@types/react'],
    '@types/react-dom': manifest.devDependencies['@types/react-dom'],
  },
}, null, 2) + '\n');
const cache = resolve(root, '.local/npm-cache');
console.log(`Installing Git dependency: ${spec}`);
execFileSync('npm', ['install', '--foreground-scripts', '--no-audit', '--no-fund', '--cache', cache], {
  cwd: consumer, stdio: 'inherit',
});
const installed = resolve(consumer, 'node_modules', manifest.name);
async function filesAt(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const name = prefix + entry.name;
    assert(!entry.isSymbolicLink(), `Unexpected package symlink: ${name}`);
    if (entry.isDirectory()) result.push(...await filesAt(resolve(directory, entry.name), `${name}/`));
    else result.push(name);
  }
  return result.sort();
}
const files = await filesAt(installed);
for (const file of ['dist/lib/core.js', 'dist/lib/react.js', 'src/glass.css',
  'types/core.d.ts', 'types/react.d.ts', 'NOTICE.md', 'vendor/studio/LICENSE']) {
  assert(files.includes(file), `Missing Git package file: ${file}`);
}
for (const file of files) {
  assert(/^(dist\/lib\/|types\/|vendor\/studio\/(LICENSE|UPSTREAM\.md)$|src\/glass\.css$|package\.json$|README(?:\.zh-CN)?\.md$|LICENSE$|NOTICE\.md$)/.test(file),
    `Unexpected Git package file: ${file}`);
}
await writeFile(resolve(consumer, 'types-consumer.ts'), await readFile(resolve(root, 'tests/types-consumer.ts'), 'utf8'));
execFileSync(process.execPath, [resolve(consumer, 'node_modules/typescript/bin/tsc'),
  '--noEmit', '--strict', '--skipLibCheck', 'false', '--target', 'ES2022',
  '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--lib', 'ES2022,DOM', 'types-consumer.ts'],
  {cwd: consumer, stdio: 'inherit'});
await writeFile(resolve(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import {GlassController, createPreset, parsePreset, performanceProfiles} from '@workspace/liquid-glass';
import {GlassProvider, GlassSurface} from '@workspace/liquid-glass/react';
import React from 'react';
import {renderToString} from 'react-dom/server';
assert.equal(typeof document, 'undefined');
assert.equal(typeof GlassController, 'function');
assert.equal(performanceProfiles.economy.dprCap, 1);
assert.equal(parsePreset(createPreset('git', {performance:{preset:'economy'}})).settings.performance.preset, 'economy');
assert.match(renderToString(React.createElement(GlassProvider, null,
  React.createElement(GlassSurface, {as:'button'}, 'git consumer'))), /git consumer/);
console.log('Git consumer: core import, preset policy and React SSR passed');
`);
execFileSync(process.execPath, ['smoke.mjs'], {cwd: consumer, stdio: 'inherit'});
// Verify the same pinned dependency installs using the consumer's lockfile.
execFileSync('npm', ['ci', '--foreground-scripts', '--no-audit', '--no-fund', '--cache', cache],
  {cwd: consumer, stdio: 'inherit'});
execFileSync(process.execPath, ['smoke.mjs'], {cwd: consumer, stdio: 'inherit'});
const lock = JSON.parse(await readFile(resolve(consumer, 'package-lock.json'), 'utf8'));
const result = {spec, resolved: lock.packages[`node_modules/${manifest.name}`].resolved,
  files, installedDeclarationsCompile: true, coreImport: true, reactSSR: true,
  lockfileReinstall: true, node: process.version};
await writeFile(resolve(consumer, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
