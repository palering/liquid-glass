import test from "node:test";
import assert from "node:assert/strict";
import { validateGeometry } from "../src/geometry.js";
import { surfaceUniforms } from "../src/policy.js";

test("provided geometry is atomic and rejects nonfinite or missing bounds", () => {
  const live = [{id:"a"},{id:"b"}];
  const frame = {width:960,height:540,surfaces:new Map([
    ["a",{x:-20,y:30,w:90,h:70,scale:.5}],
    ["b",{x:0,y:0,w:0,h:0}],
  ])};
  assert.equal(validateGeometry(frame,live),true);
  for(const patch of [{x:NaN},{y:Infinity},{w:-1},{h:NaN},{scale:0},{scale:Infinity}])
    assert.equal(validateGeometry({...frame,surfaces:new Map([...frame.surfaces,["a",{...frame.surfaces.get("a"),...patch}]])},live),false);
  assert.equal(validateGeometry({...frame,surfaces:new Map([["a",frame.surfaces.get("a")]])},live),false);
  assert.equal(validateGeometry({...frame,width:0},live),false);
  assert.equal(validateGeometry(null,live),false);
});
test("scaled geometry keeps screen radius and stage-local shader coordinates", () => {
  const r={x:80,y:40,w:100,h:60,radius:10,scale:.5};
  const u=surfaceUniforms(r,960,540,1,"card",{radius:20},"dark");
  assert.equal(u.u_shapeRadius,10);
  assert.deepEqual(u.u_mouseSpring,[130,470]);
  assert.equal(surfaceUniforms({...r,scale:undefined},960,540,1,"card",{radius:20},"dark").u_shapeRadius,20);
});
