const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
test('Preview credentials skip safely; malformed values and live roles are rejected',async()=>{
 const {settings,requireUnpublished,validateManifest}=await import('../scripts/shopify-preview.mjs');
 assert.deepEqual(settings({}),{ready:false,missing:['SHOPIFY_STORE_DOMAIN','SHOPIFY_CLI_THEME_TOKEN','SHOPIFY_PREVIEW_THEME_ID']});
 const env={SHOPIFY_STORE_DOMAIN:'test.myshopify.com',SHOPIFY_CLI_THEME_TOKEN:'test-only',SHOPIFY_PREVIEW_THEME_ID:'123'};
 assert.equal(settings(env).ready,true);
 for(const domain of ['https://test.myshopify.com','nouvelthelabel.com','test.myshopify.com/path'])assert.throws(()=>settings({...env,SHOPIFY_STORE_DOMAIN:domain}));
 for(const role of ['main','live','development',undefined])assert.throws(()=>requireUnpublished([{id:123,role}],123));
 assert.throws(()=>requireUnpublished([{id:124,role:'unpublished'}],123));
 assert.throws(()=>requireUnpublished([{id:123,role:'unpublished'},{id:123,role:'unpublished'}],123));
 assert.throws(()=>validateManifest({id:123,role:'unpublished',previewURL:'https://test.myshopify.com/'}));
 const out=execFileSync(process.execPath,['scripts/shopify-preview.mjs','check'],{env:{...process.env,...Object.fromEntries(Object.keys(env).map(k=>[k,'']))},encoding:'utf8'});
 assert.match(out,/skipped/);assert.match(out,/Nothing deployed or published/);
});
test('Deployment rejects live themes before push and only pushes the exact unpublished ID',async()=>{
 const {deploy}=await import('../scripts/shopify-preview.mjs');
 const config={store:'test.myshopify.com',id:'123'};let calls=[];
 assert.throws(()=>deploy(config,'unused',args=>{calls.push(args);return [{id:123,role:'main'}]}));
 assert.equal(calls.length,1);assert.equal(calls[0][1],'list');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'preview-guard-'));
 try{
  const archive=path.join(temp,'theme.zip');
  execFileSync('python3',['-c',"import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],'w') as z:z.writestr('assets/test.txt','test')",archive]);
  calls=[];
  const manifest=deploy(config,archive,args=>{
   calls.push(args);
   if(args[1]==='list')return [{id:123,role:'unpublished'}];
   assert.equal(fs.readFileSync(path.join(args[args.indexOf('--path')+1],'assets/test.txt'),'utf8'),'test');
   return {theme:{id:123,role:'unpublished',preview_url:'https://test.myshopify.com/?preview_theme_id=123'}};
  },path.join(temp,'deployment.json'));
  assert.equal(manifest.id,'123');assert.equal(calls.length,3);
  const push=calls.find(c=>c[1]==='push');
  assert.equal(push[push.indexOf('--theme')+1],'123');assert(push.includes('--strict'));assert(push.includes('--nodelete'));
  assert(!push.some(v=>['--live','--publish','--allow-live'].includes(v)));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('Visible price parser retains actual cents across European and English formats',async()=>{
 const {cents}=await import('../scripts/preview-browser.mjs');
 for(const [text,expected]of [['€49,95',4995],['€100,00 EUR',10000],['€1.249,50',124950],['€1,249.50',124950],['€100',10000]])assert.equal(cents(text),expected);
});
test('Performance acceptance cannot accept failed, missing or high-LCP measurements',async()=>{
 const {acceptance}=await import('../scripts/performance-acceptance.mjs');
 const good={valid:true,runs:[{},{},{}],median:{LCP_ms:2500,TBT_ms:30,CLS:0}};
 assert(acceptance({profiles:{mobile:good,desktop:good}}).passed);
 assert.throws(()=>acceptance({profiles:{mobile:good}}));
 assert(!acceptance({profiles:{mobile:{...good,median:{LCP_ms:6000,TBT_ms:30,CLS:0}},desktop:good}}).passed);
 assert(!acceptance({profiles:{mobile:{...good,median:{LCP_ms:2000,TBT_ms:201,CLS:0.01}},desktop:good}}).passed);
});
