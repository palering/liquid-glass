import test from 'node:test';import assert from 'node:assert/strict';
import {shapeDistance,shapeGradient,heightProfile,transmittedRay}from '../experiments/optics/reference.js';
test('analytic gradient matches independent finite-difference distance derivatives away from kinks',()=>{
 let checked=0;
 for(const n of [2,2.6,4,8])for(const radius of [.01,.2,.8])for(let k=1;k<150;k++){
  const p=[Math.sin(k*1.789)*1.6,Math.cos(k*2.513)*1.4],half=[1.2,.8],d=p.map((x,i)=>Math.abs(x)-half[i]);
  if(Math.min(...p.map(Math.abs))<1e-3||Math.abs(d[0]-d[1])<1e-3||Math.min(...d.map(x=>Math.abs(x+radius)))<1e-3)continue;
  const g=shapeGradient(p,half,radius,n),epsilon=1e-5;
  for(let axis=0;axis<2;axis++){const a=[...p],b=[...p];a[axis]+=epsilon;b[axis]-=epsilon;const derivative=(shapeDistance(a,half,radius,n)-shapeDistance(b,half,radius,n))/(2*epsilon);assert.ok(Math.abs(g[axis]-derivative)<1e-5,JSON.stringify({p,n,radius,axis,actual:g[axis],derivative}));}checked++;
 }
 assert.ok(checked>1500);
 // High powers at microscopic corners stay finite under scaled evaluation.
 assert.ok(shapeGradient([1e-12,2e-12],[1e-12,1e-12],1e-12,8).every(Number.isFinite));
});
test('height profile joins a flat center continuously and its analytic slope matches the derivative',()=>{
 for(const bevel of [.25,1,20,65]){assert.deepEqual(heightProfile(0,bevel),{height:0,slope:0});assert.deepEqual(heightProfile(bevel,bevel),{height:bevel/2,slope:0});for(let k=1;k<100;k++){const d=bevel*k/100,e=bevel*1e-5,p=heightProfile(d,bevel);const derivative=(heightProfile(d+e,bevel).height-heightProfile(d-e,bevel).height)/(2*e);assert.ok(Math.abs(derivative-p.slope)<1e-7);assert.ok(p.slope>=0&&p.slope<=.75);}}
});
test('height ray obeys Snell tangential ratio and remains finite across supported IOR/slope bounds',()=>{
 for(const ior of [1.01,1.4,2.5])for(const slope of [0,.1,.75]){const {normal,ray}=transmittedRay([.8,.6],slope,ior);assert.ok(Math.abs(Math.hypot(...ray)-1)<1e-12);assert.ok(ray[2]<0);const cross=(a,b)=>Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);assert.ok(Math.abs(cross([0,0,-1],normal)/ior-cross(ray,normal))<1e-12);}
 assert.deepEqual(transmittedRay([1,0],0,1.4).ray,[0,0,-1]);
});
