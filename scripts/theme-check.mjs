import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
fs.mkdirSync('artifacts',{recursive:true});
const result=spawnSync(path.join(root,'node_modules/.bin/shopify'),['theme','check','--path',root,'--output','json'],{encoding:'utf8',env:{...process.env,SHOPIFY_CLI_NO_ANALYTICS:'1'},maxBuffer:20*1024*1024});
if(result.error || ![0,1].includes(result.status))throw result.error||new Error(`Theme Check failed (${result.status}): ${result.stderr}`);
const findings=JSON.parse(result.stdout);
fs.writeFileSync('artifacts/theme-check.json',JSON.stringify(findings,null,2));
const errors=[];let warnings=0;
for(const file of findings)for(const offense of file.offenses){
 if(offense.severity==='warning')warnings++;
 if(offense.severity!=='error')continue;
 const item={path:path.relative(root,file.path),check:offense.check,message:offense.message};
 errors.push(item);
}
const summary={rawExitCode:result.status,errors,warnings};
fs.writeFileSync('artifacts/theme-check-summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
// No inherited-error exemptions: both the underlying CLI and every error must be clean.
process.exitCode=result.status || (errors.length ? 1 : 0);
