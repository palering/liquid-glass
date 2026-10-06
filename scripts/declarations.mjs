import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {rollup} from 'rollup';
import {dts} from 'rollup-plugin-dts';
const root=new URL('../',import.meta.url);
await rm(new URL('.local/declarations',root),{recursive:true,force:true});
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.declarations.json'],{cwd:root,stdio:'inherit'});
await mkdir(new URL('types/',root),{recursive:true});
for(const [name,entry] of [['core','index'],['react','react']]){
 // Bundle React against the core declaration so private class identity is shared.
 if(name==='react'){
  const temporary=new URL('.local/declarations/react.d.ts',root);
  await writeFile(temporary,(await readFile(temporary,'utf8')).replace(/from ['"]\.\/(controller|contracts)\.js['"]/g,"from './core.js'"));
 }
 const bundle=await rollup({input:new URL(`.local/declarations/${entry}.d.ts`,root).pathname,plugins:[dts()],external:id=>id==='react'||(name==='react'&&id==='./core.js'),onwarn(w){throw new Error(w.message);}});
 const {output}=await bundle.generate({format:'es'});
 const code='// Generated from src by npm run types:generate. Do not edit.\n'+output[0].code;
 const path=new URL(`types/${name}.d.ts`,root);
 if(process.argv.includes('--check')){
  if(await readFile(path,'utf8')!==code)throw new Error(`Generated ${name} declarations drifted`);
 }else await writeFile(path,code);
 await bundle.close();
}
console.log('Verified implementation-derived core and React declarations');
