import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
fs.mkdirSync('artifacts',{recursive:true});
const result=spawnSync(path.join(root,'node_modules/.bin/shopify'),['theme','check','--path',root,'--output','json'],{encoding:'utf8',env:{...process.env,SHOPIFY_CLI_NO_ANALYTICS:'1'},maxBuffer:20*1024*1024});
if(result.error || ![0,1].includes(result.status))throw result.error||new Error(`Theme Check failed (${result.status}): ${result.stderr}`);
const findings=JSON.parse(result.stdout);
fs.writeFileSync('artifacts/theme-check.json',JSON.stringify(findings,null,2));
const baseline=JSON.parse(fs.readFileSync('docs/theme-check-known-errors.json','utf8')).errors;
const counts=new Map();
const key=item=>JSON.stringify(item);
for(const item of baseline)counts.set(key(item),(counts.get(key(item))||0)+1);
const unexpected=[];let errors=0,warnings=0;
for(const file of findings)for(const offense of file.offenses){
 if(offense.severity==='warning')warnings++;
 if(offense.severity!=='error')continue;
 errors++;
 const item={path:path.relative(root,file.path),check:offense.check,message:offense.message};
 const remaining=counts.get(key(item))||0;
 if(remaining)counts.set(key(item),remaining-1);else unexpected.push(item);
}
const summary={rawExitCode:result.status,existingErrors:errors-unexpected.length,newErrors:unexpected,warnings};
fs.writeFileSync('artifacts/theme-check-summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(unexpected.length)process.exitCode=1;
// Exit 0 means no new errors relative to the documented source baseline, not a clean Theme Check.
