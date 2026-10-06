import test from "node:test";
import assert from "node:assert/strict";
import {
  candidates,
  material,
  resolveCapture,
  surfaceUniforms,
} from "../src/policy.js";
test("auto priority and failure exclusion", () => {
  assert.deepEqual(candidates("auto", new Set(["webgpu", "webgl"])), [
    "svg",
    "css",
    "solid",
  ]);
  assert.deepEqual(candidates("webgl"), ["webgl", "svg", "css", "solid"]);
  assert.throws(() => candidates("unknown"));
});
test("capture capability is independent from backend", () => {
  assert.equal(resolveCapture("native-dom", false).active, "scene");
  assert.equal(resolveCapture("native-dom", true).active, "native-dom");
  assert.equal(resolveCapture("auto", true).active, "scene");
});
test("bounds share CSS-pixel material and bottom-up shader coordinates", () => {
  const u = surfaceUniforms(
    { x: 20, y: 30, w: 100, h: 60, radius: 90 },
    800,
    600,
    2,
    "card",
    {},
    "light",
  );
  assert.deepEqual(u.u_mouseSpring, [140, 480]);
  assert.equal(u.u_shapeRadius, 30);
  assert.equal(u.u_shapeWidth, 100);
  assert.ok(u.u_tint[0] > 0.9);
  assert.equal(material("card", { tint: 2 }).tint, 0.95);
});
test("absolute optical controls retain units and legacy defaults", () => {
  const bounds = { x: 0, y: 0, w: 120, h: 80, radius: 20 };
  const u = surfaceUniforms(
    bounds,
    800,
    600,
    2,
    "card",
    {
      distance: 0.05,
      thickness: 25,
      ior: 1.4,
      dispersion: 7,
      blurPx: 1,
      fresnelFactor: 0.2,
      glareFactor: 0.9,
      glareAngle: -45,
      radius: 90,
      blurEdge: false,
    },
    "light",
  );
  assert.equal(u.u_refDistance, 0.05);
  assert.equal(u.u_refThickness, 25);
  assert.equal(u.u_refFactor, 1.4);
  assert.equal(u.u_refDispersion, 7);
  assert.equal(u.u_glareAngle, -Math.PI / 4);
  assert.equal(u.u_blurEdge, 0);
  assert.equal(u.u_shapeRadius, 40);
  assert.equal(material("panel", { blurPx: 1 }).blur, 1);
  assert.equal(material("panel", { blur: 0 }).blur, 0);
  assert.equal(material("card", { tintOpacity: 0 }).tint, 0);
});
