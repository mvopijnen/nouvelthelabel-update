import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function acceptance(summary){
 const failures=[];
 for(const profile of ['mobile','desktop']){
  const data=summary.profiles?.[profile];
  if(!data?.valid||data.runs?.length!==3)throw Error('Acceptance requires three validated runs for each profile');
  const m=data.median;
  if(m.LCP_ms>2500)failures.push(`${profile}: median LCP ${m.LCP_ms} ms exceeds 2500 ms`);
  if(m.TBT_ms>200)failures.push(`${profile}: median TBT ${m.TBT_ms} ms exceeds the Lighthouse good threshold of 200 ms`);
  if(m.CLS!==0)failures.push(`${profile}: median CLS ${m.CLS} does not retain the zero baseline`);
 }
 return {kind:'lab acceptance; no field data',passed:failures.length===0,failures};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const filename=process.argv[2];if(!filename)throw Error('Usage: node scripts/performance-acceptance.mjs SUMMARY_JSON');
 const result=acceptance(JSON.parse(fs.readFileSync(filename,'utf8')));
 fs.writeFileSync(path.join(path.dirname(filename),'acceptance.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}
