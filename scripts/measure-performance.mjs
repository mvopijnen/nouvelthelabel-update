import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const [profile,run,url='https://nouvelthelabel.com/',directory='artifacts/performance-baseline']=process.argv.slice(2);
if(!['mobile','desktop'].includes(profile)||!run)throw new Error('Usage: node scripts/measure-performance.mjs mobile|desktop RUN [URL] [OUTPUT_DIRECTORY]');
fs.mkdirSync(directory,{recursive:true});
const proxy=process.env.HTTPS_PROXY;
const chrome=await chromeLauncher.launch({chromePath:process.env.CHROME_PATH||'/usr/bin/chromium',chromeFlags:['--headless','--no-sandbox',...(proxy?[`--proxy-server=${proxy}`]:[])]});
try{
 const result=await lighthouse(url,{port:chrome.port,output:'json',onlyCategories:['performance'],logLevel:'error',...(profile==='desktop'?{preset:'desktop'}:{})});
 const prefix=path.join(directory,`${profile}-${run}`);
 fs.writeFileSync(prefix+'.json',JSON.stringify(result.lhr,null,2));
 if(result.artifacts.Trace)fs.writeFileSync(prefix+'.trace.json',JSON.stringify(result.artifacts.Trace));
 if(result.artifacts.DevtoolsLog)fs.writeFileSync(prefix+'.devtools.json',JSON.stringify(result.artifacts.DevtoolsLog));
 console.log(JSON.stringify({profile,run,url,score:result.lhr.categories.performance.score===null?null:result.lhr.categories.performance.score*100,metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(k=>[k,result.lhr.audits[k]?.numericValue??null])),warnings:result.lhr.runWarnings,error:result.lhr.runtimeError}));
 if(result.lhr.runtimeError)process.exitCode=1;
}finally{await chrome.kill();}
