// Test-only bridge for unchanged ESM .js specifiers during gradual TS migration.
// npm consumers use built JavaScript and never load this compiler hook.
import {access,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const sourceRoot=new URL('../src/',import.meta.url).href;
export async function resolve(specifier,context,nextResolve){
 if((specifier.startsWith('.')||specifier.startsWith('file:'))&&specifier.endsWith('.js')&&context.parentURL){
  const url=new URL(specifier,context.parentURL);
  if(url.href.startsWith(sourceRoot)){
   const typed=new URL(url.href.replace(/\.js$/,'.ts'));
   try{await access(fileURLToPath(typed));return{url:typed.href,shortCircuit:true};}catch(error){if(error.code!=='ENOENT')throw error;}
  }
 }
 return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
 if(url.startsWith(sourceRoot)&&url.endsWith('.ts')){
  const text=await readFile(fileURLToPath(url),'utf8');
  const result=ts.transpileModule(text,{fileName:fileURLToPath(url),compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,verbatimModuleSyntax:true}});
  return{format:'module',source:result.outputText,shortCircuit:true};
 }
 return nextLoad(url,context);
}
