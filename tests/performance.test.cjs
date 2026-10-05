const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const profileModule=import('../scripts/performance-profile.mjs');
const audits=['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'];
async function reportFor(profile,number=1){
 const {configurationFor}=await profileModule;
 const settings=structuredClone(configurationFor(profile).settings);
 return {configSettings:settings,environment:{networkUserAgent:settings.emulatedUserAgent},lighthouseVersion:'13.0.1',fetchTime:`2026-10-05T12:00:0${number}Z`,finalDisplayedUrl:'https://theme.test/',categories:{performance:{score:0.8}},audits:Object.fromEntries(audits.map((key,index)=>[key,{numericValue:index===3?0:number*1000+index}]))};
}
test('Node API selects the actual desktop configuration and rejects cross-labelled profiles',async()=>{
 const {validateProfile}=await profileModule;
 for(const profile of ['mobile','desktop']){
  const report=await reportFor(profile);
  assert.doesNotThrow(()=>validateProfile(profile,report));
  assert.throws(()=>validateProfile(profile==='mobile'?'desktop':'mobile',report));
 }
});
test('Both viewport and real network user-agent are required to agree with the requested profile',async()=>{
 const {validateProfile}=await profileModule;
 for(const profile of ['mobile','desktop']){
  for(const change of [r=>r.configSettings.screenEmulation.mobile=!r.configSettings.screenEmulation.mobile,r=>r.configSettings.screenEmulation.width=1,r=>r.environment.networkUserAgent=profile==='desktop'?'Android Mobile':'Macintosh desktop',r=>delete r.environment.networkUserAgent]){
   const report=await reportFor(profile);change(report);
   assert.throws(()=>validateProfile(profile,report));
  }
 }
});
test('Six distinct validated report/metadata pairs produce medians; missing runs and tampered desktop fail',async()=>{
 const {runMetadata}=await profileModule;
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'theme-performance-'));
 const summarize=()=>execFileSync('python3',[path.resolve(__dirname,'../scripts/summarize-performance.py'),directory],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 try{
  for(const profile of ['mobile','desktop'])for(const number of [1,2,3]){
   const report=await reportFor(profile,number);
   fs.writeFileSync(path.join(directory,`${profile}-${number}.json`),JSON.stringify(report));
   fs.writeFileSync(path.join(directory,`${profile}-${number}.meta.json`),JSON.stringify({...runMetadata(profile,number,'https://theme.test/',report),batchId:'test-batch'}));
  }
  assert.equal(JSON.parse(summarize()).desktop.LCP_ms,2001);
  const name=path.join(directory,'desktop-3.json'),original=fs.readFileSync(name);
  fs.unlinkSync(name);assert.throws(summarize);fs.writeFileSync(name,original);
  const wrong=JSON.parse(original);wrong.configSettings.formFactor='mobile';fs.writeFileSync(name,JSON.stringify(wrong));assert.throws(summarize);
  fs.writeFileSync(name,original);
  const metadataPath=path.join(directory,'desktop-3.meta.json');const metadata=JSON.parse(fs.readFileSync(metadataPath));metadata.LCP_ms=1;fs.writeFileSync(metadataPath,JSON.stringify(metadata));assert.throws(summarize);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
