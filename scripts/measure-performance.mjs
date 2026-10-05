import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import {configurationFor,runMetadata} from './performance-profile.mjs';

const [profile,run,url='https://nouvelthelabel.com/',directory='artifacts/performance-baseline']=process.argv.slice(2);
if(!['mobile','desktop'].includes(profile)||!['1','2','3'].includes(run))throw new Error('Usage: node scripts/measure-performance.mjs mobile|desktop 1|2|3 [URL] [OUTPUT_DIRECTORY]');
fs.mkdirSync(directory,{recursive:true});
const prefix=path.join(directory,`${profile}-${run}`);
fs.rmSync(prefix+'.meta.json',{force:true});
fs.rmSync(path.join(directory,'summary.json'),{force:true});
const proxy=process.env.HTTPS_PROXY;
const chrome=await chromeLauncher.launch({chromePath:process.env.CHROME_PATH||'/usr/bin/chromium',chromeFlags:['--headless','--no-sandbox',...(proxy?[`--proxy-server=${proxy}`]:[])]});
try{
 // Node's Lighthouse API takes the desktop configuration as its third argument.
 // A CLI-only preset flag in the second argument silently leaves mobile defaults in effect.
 const result=await lighthouse(url,{port:chrome.port,output:'json',logLevel:'error'},configurationFor(profile));
 fs.writeFileSync(prefix+'.json',JSON.stringify(result.lhr,null,2));
 if(result.artifacts.Trace)fs.writeFileSync(prefix+'.trace.json',JSON.stringify(result.artifacts.Trace));
 if(result.artifacts.DevtoolsLog)fs.writeFileSync(prefix+'.devtools.json',JSON.stringify(result.artifacts.DevtoolsLog));
 if(result.lhr.runtimeError)throw new Error(`Lighthouse failed: ${result.lhr.runtimeError.message}`);
 const metadata={...runMetadata(profile,run,url,result.lhr),batchId:process.env.PERFORMANCE_BATCH_ID||path.resolve(directory),storefrontRevision:process.env.PERFORMANCE_CODE_REVISION||null};
 fs.writeFileSync(prefix+'.meta.json',JSON.stringify(metadata,null,2));
 console.log(JSON.stringify({...metadata,warnings:result.lhr.runWarnings}));
}finally{await chrome.kill();}
