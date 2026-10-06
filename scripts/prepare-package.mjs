// Keep npm pack --json machine-readable, including npm versions that still run
// prepare with --ignore-scripts. Build output belongs on stderr during packaging.
import {spawnSync} from 'node:child_process';
const result = spawnSync('npm', ['run', 'build:lib'], {
  cwd: new URL('../', import.meta.url), stdio: ['ignore', 2, 2],
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
