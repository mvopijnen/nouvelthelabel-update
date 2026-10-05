import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const requiredSecrets=['SHOPIFY_STORE_DOMAIN','SHOPIFY_CLI_THEME_TOKEN','SHOPIFY_PREVIEW_THEME_ID'];
export function settings(env=process.env){
 const missing=requiredSecrets.filter(name=>!env[name]?.trim());
 if(missing.length)return {ready:false,missing};
 const store=env.SHOPIFY_STORE_DOMAIN.trim(),id=env.SHOPIFY_PREVIEW_THEME_ID.trim();
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(store))throw Error('SHOPIFY_STORE_DOMAIN must be the bare myshopify.com hostname');
 if(!/^[1-9]\d*$/.test(id))throw Error('SHOPIFY_PREVIEW_THEME_ID must be a numeric dedicated unpublished theme ID');
 return {ready:true,store,id};
}
export function requireUnpublished(themes,id){
 const matches=themes.filter(theme=>String(theme.id)===String(id));
 if(matches.length!==1||matches[0].role!=='unpublished')throw Error('Refusing deployment: target must exist exactly once and have role unpublished');
 return matches[0];
}
export function validateManifest(manifest){
 if(manifest.role!=='unpublished'||!/^[1-9]\d*$/.test(String(manifest.id)))throw Error('Invalid unpublished preview manifest');
 const url=new URL(manifest.previewURL);
 if(url.protocol!=='https:'||url.username||url.password||url.searchParams.get('preview_theme_id')!==String(manifest.id))throw Error('Preview URL does not identify the unpublished theme');
 return manifest;
}
function cli(args){
 const env={...process.env,SHOPIFY_CLI_NO_ANALYTICS:'1',CI:'1'};
 for(const key of Object.keys(env))if(key.startsWith('SHOPIFY_FLAG_'))delete env[key];
 // Keep credentials in the environment; never include tokens in argv or output.
 try{return JSON.parse(execFileSync(path.resolve('node_modules/.bin/shopify'),args,{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}));}
 catch{throw Error('Shopify CLI operation failed; inspect store/token permissions and unpublished theme configuration');}
}
export function deploy(config,archive='artifacts/nouvelthelabel-update-shopify.zip',executeCLI=cli,manifestPath='artifacts/preview/deployment.json'){
 const list=()=>{const result=executeCLI(['theme','list','--store',config.store,'--id',config.id,'--json']);return Array.isArray(result)?result:result.themes||[];};
 requireUnpublished(list(),config.id);
 const stage=fs.mkdtempSync(path.join(os.tmpdir(),'shopify-preview-'));
 try{
  // Extract only the built package, with path traversal and non-theme files rejected.
  execFileSync('python3',['-c',`import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
 for n in z.namelist():
  p=pathlib.PurePosixPath(n)
  if p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0] not in ('assets','config','layout','locales','sections','snippets','templates'): raise SystemExit('Unsafe theme package')
 z.extractall(root)
`,archive,stage]);
  const result=executeCLI(['theme','push','--store',config.store,'--theme',config.id,'--path',stage,'--strict','--nodelete','--json']);
  const target=requireUnpublished([result.theme||result],config.id);
  requireUnpublished(list(),config.id);
  const manifest=validateManifest({id:String(target.id),role:target.role,previewURL:target.preview_url,revision:process.env.GITHUB_SHA||null});
  fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
  return manifest;
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=settings();
 fs.mkdirSync('artifacts/preview',{recursive:true});
 fs.writeFileSync('artifacts/preview/readiness.json',JSON.stringify(config.ready?{ready:true}:{ready:false,missing:config.missing},null,2));
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`ready=${config.ready}\n`);
 if(!config.ready){
  const message=`Shopify preview skipped: missing GitHub Secrets ${config.missing.join(', ')}. Nothing deployed or published.\n`;
  console.log(message.trim());if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,message);
 }else if(process.argv[2]==='deploy'){deploy(config);console.log('Dedicated unpublished preview deployed; live theme publication is never performed.');}
 else if(process.argv[2]!=='check')throw Error('Usage: node scripts/shopify-preview.mjs check|deploy');
}
