// Derive the TypeScript interface for the existing JS packers from Naga reflection.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../src/shaders/generated/',import.meta.url);
let output='// Generated from Naga reflection by scripts/shader-types.mjs. Do not edit.\n';
output+='export interface UniformData { buffer:ArrayBuffer; bytes:Uint8Array<ArrayBuffer>; f32:Float32Array<ArrayBuffer>; i32:Int32Array<ArrayBuffer>; u32:Uint32Array<ArrayBuffer> }\n';
for(const name of ['optics-vertex','optics','image-vertex','image']){
 const shader=JSON.parse(await readFile(new URL(`${name}.json`,root),'utf8'));
 const stem=name.replace(/(^|-)([a-z])/g,(_,p,c)=>c.toUpperCase());
 for(const [uniform,layout] of Object.entries(shader.uniforms)){
  const type=`${stem}${uniform[0].toUpperCase()+uniform.slice(1)}`;
  output+=`export interface ${type} {\n`;
  for(const [field,info] of Object.entries(layout.fields))output+=` ${JSON.stringify(field)}?:${info.count===1?'number':'ArrayLike<number>'}|null;\n`;
  output+=`}\nexport function pack${type}(data:UniformData,values:${type}):ArrayBuffer;\n`;
 }
}
const file=new URL('packers.d.ts',root);
if(process.argv.includes('--check')){
 if(await readFile(file,'utf8')!==output)throw new Error('Shader packer types drifted: run node scripts/shader-types.mjs');
 console.log('Verified reflection-derived shader packer types');
}else await writeFile(file,output);
