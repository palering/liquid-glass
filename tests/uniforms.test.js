import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uniformData } from '../src/renderers/uniforms.js';
import { packOpticsU, packImageU } from '../src/shaders/generated/packers.js';
const optics = JSON.parse(readFileSync(new URL('../src/shaders/generated/optics.json', import.meta.url)));
const image = JSON.parse(readFileSync(new URL('../src/shaders/generated/image.json', import.meta.url)));

test('shared optical ABI retains integer bits, aligned tint and coordinates', () => {
  const data = uniformData(optics.uniforms.u);
  const bytes = packOpticsU(data, { u_resolution: [960, 540], u_dpr: 2,
    u_glOrigin: 1, u_mouseSpring: [150, 320], u_blurEdge: 1,
    u_showShape1: 0, u_tint: [0.25, 0.5, 0.75, 1], u_refDistance: 0.125 });
  const view = new DataView(bytes);
  assert.equal(bytes.byteLength, 160);
  assert.equal(view.getFloat32(12, true), 1);
  assert.equal(view.getFloat32(24, true), 150);
  assert.equal(view.getInt32(92, true), 1);
  assert.equal(view.getFloat32(96, true), 0.25);
  assert.equal(view.getFloat32(156, true), 0.125);
  packOpticsU(data, { u_dpr: 1 });
  assert.equal(view.getInt32(92, true), 0);
  assert.equal(view.getFloat32(12, true), 0);
});
test('image ABI packs fractional steps and mode without stale padding', () => {
  const data = uniformData(image.uniforms.u);
  const bytes = packImageU(data, { step: [0.125, 0.25], size: [503, 291], sigma: 2.5, mode: 2, pad: [9, 9] });
  assert.deepEqual([...new Float32Array(bytes)], [0.125, 0.25, 503, 291, 2.5, 2, 9, 9]);
  packImageU(data, { step: [0, 0], size: [960, 540], sigma: 1, mode: 1 });
  assert.deepEqual([...new Float32Array(bytes)], [0, 0, 960, 540, 1, 1, 0, 0]);
});
