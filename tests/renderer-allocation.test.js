import test from 'node:test';
import assert from 'node:assert/strict';
import {WebGLRenderer} from '../src/renderers/webgl.js';
import {GLImagePass} from '../src/renderers/blur-webgl.js';

test('GL renderer rejects exhausted shader allocation and removes its loss listener',async()=>{
 const events=[];
 const gl={MAX_TEXTURE_SIZE:1,VERTEX_SHADER:2,FRAGMENT_SHADER:3,getParameter:()=>4096,createShader:()=>null,getExtension:()=>null};
 const canvas={getContext:()=>gl,addEventListener:name=>events.push(`add:${name}`),removeEventListener:name=>events.push(`remove:${name}`)};
 await assert.rejects(WebGLRenderer.create(canvas,()=>{}),/shader allocation failed/);
 assert.deepEqual(events,['add:webglcontextlost','remove:webglcontextlost']);
});

test('GL image pass releases compiled shaders if program allocation fails',()=>{
 const created=[],deleted=[];
 const gl={VERTEX_SHADER:2,FRAGMENT_SHADER:3,COMPILE_STATUS:4,createShader:type=>{const shader={type};created.push(shader);return shader;},shaderSource(){},compileShader(){},getShaderParameter:()=>true,createProgram:()=>null,deleteShader:shader=>deleted.push(shader)};
 assert.throws(()=>new GLImagePass(gl),/program allocation failed/);
 assert.deepEqual(deleted,created);
});
