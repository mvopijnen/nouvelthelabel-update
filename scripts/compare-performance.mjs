import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {acceptance} from './performance-acceptance.mjs';
const metrics=['score','FCP_ms','LCP_ms','TBT_ms','CLS','SpeedIndex_ms'];
export function compare(before,after){
 const result={kind:'comparison of lab medians; no field data or guaranteed score',profiles:{}};
 for(const profile of ['mobile','desktop']){
  const a=before.profiles?.[profile],b=after.profiles?.[profile];
  if(!a?.valid||!b?.valid||a.runs.length!==3||b.runs.length!==3)throw Error('Requires three validated before and after runs per profile');
  if(JSON.stringify(a.configuration)!==JSON.stringify(b.configuration))throw Error('Lighthouse configurations differ');
  for(const data of [a,b]){
   if(JSON.stringify(data.runs.map(r=>r.run).toSorted())!=='[1,2,3]')throw Error('Run identities must be 1, 2 and 3');
   for(const metric of metrics){
    const values=data.runs.map(r=>r[metric]);
    if(values.some(v=>!Number.isFinite(v)||v<0)||data.median[metric]!==values.toSorted((x,y)=>x-y)[1])throw Error('Inconsistent median or missing metric');
   }
  }
  const reference=a.runs[0];
  const url=new URL(reference.url);
  if(!/^[1-9]\d*$/.test(url.searchParams.get('preview_theme_id')||''))throw Error('Comparison needs the same dedicated preview, not a public URL versus a preview');
  for(const run of [...a.runs,...b.runs]){
   if(run.profile!==profile||run.url!==reference.url||run.finalURL!==reference.finalURL||run.userAgent!==reference.userAgent||run.lighthouseVersion!==reference.lighthouseVersion)throw Error('Measurement target, profile or browser version differs');
   if(!/^[a-f0-9]{40}$/.test(run.storefrontRevision||''))throw Error('Both deployed code revisions must be recorded; public baseline revision is unknown');
  }
  const revision=data=>{const values=new Set(data.runs.map(r=>r.storefrontRevision));if(values.size!==1)throw Error('Code changed within a measurement batch');return [...values][0];};
  result.profiles[profile]={beforeRevision:revision(a),afterRevision:revision(b),before:a.median,after:b.median,delta:Object.fromEntries(metrics.map(metric=>[metric,b.median[metric]-a.median[metric]])),retainsTBT:b.median.TBT_ms<=a.median.TBT_ms,retainsCLS:b.median.CLS<=a.median.CLS};
 }
 result.acceptance=acceptance(after);
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [a,b]=process.argv.slice(2);if(!a||!b)throw Error('Usage: node scripts/compare-performance.mjs BEFORE_SUMMARY AFTER_SUMMARY');
 const result=compare(JSON.parse(fs.readFileSync(a,'utf8')),JSON.parse(fs.readFileSync(b,'utf8')));
 fs.writeFileSync(path.join(path.dirname(b),'comparison.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(!result.acceptance.passed||Object.values(result.profiles).some(p=>!p.retainsTBT||!p.retainsCLS))process.exitCode=1;
}
