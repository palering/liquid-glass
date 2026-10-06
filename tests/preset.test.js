import test from "node:test";
import assert from "node:assert/strict";
import { createPreset, parsePreset, serializePreset } from "../src/preset.js";
import { candidates, surfaceUniforms } from "../src/policy.js";
test("portable preset roundtrip retains backend, capture and optical values", () => {
  const p = createPreset("雕刻玻璃", {
    backend: "webgpu",
    capture: "native-dom",
    layered: true,
    controls: { distance: 0.083, blurEdge: false, tintColor: "#AaBbCc" },
  });
  assert.deepEqual(parsePreset(serializePreset(p)), p);
  assert.equal(p.settings.controls.tintColor, "#aabbcc");
  assert.deepEqual(candidates(p.settings.backend, new Set(["webgpu"])), [
    "webgl",
    "svg",
    "css",
    "solid",
  ]);
});
test("preset clamps numeric ranges and excludes URLs, DOM and prototype keys", () => {
  const p = createPreset(
    "测试",
    JSON.parse(
      '{"controls":{"distance":999,"ior":-1,"radius":10000,"__proto__":{"x":1}},"imageUrl":"private","other":"no"}',
    ),
  );
  assert.equal(p.settings.controls.distance, 0.15);
  assert.equal(p.settings.controls.ior, 1.01);
  assert.equal(p.settings.controls.radius, 160);
  assert.equal("imageUrl" in p.settings, false);
  assert.equal(Object.hasOwn(p.settings.controls, "__proto__"), false);
});
test("invalid preset cannot inject NaN, invalid options or future versions", () => {
  for (const settings of [
    { controls: { ior: NaN } },
    { controls: { blurEdge: "false" } },
    { backend: "unknown" },
    { controls: { tintColor: "url(no)" } },
  ])
    assert.throws(() => createPreset("test", settings));
  assert.throws(() => parsePreset("{"));
  assert.throws(() =>
    parsePreset({ schema: "workspace-liquid-glass", version: 99, name: "x" }),
  );
  assert.throws(() => createPreset("", {}));
});
test("tint color becomes normalized RGB channel inputs", () => {
  const u = surfaceUniforms(
    { x: 0, y: 0, w: 100, h: 100, radius: 10 },
    200,
    200,
    1,
    "card",
    { tintColor: "#ff8000", tintOpacity: 0.3 },
    "light",
  );
  assert.deepEqual(u.u_tint, [1, 128 / 255, 0, 0.3]);
});
