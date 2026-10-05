import {spawnSync} from 'node:child_process';
import {manifest} from './preview-browser.mjs';
const target=manifest();
const directory='artifacts/preview/performance';
function run(command,args){const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,SHOPIFY_PREVIEW_MANIFEST:'artifacts/preview/deployment.json',PERFORMANCE_CODE_REVISION:target.revision||'',PERFORMANCE_BATCH_ID:process.env.GITHUB_RUN_ID||directory}});if(result.status!==0)throw Error(`${command} failed`);}
for(const profile of ['mobile','desktop'])for(const runId of ['1','2','3'])run(process.execPath,['scripts/measure-performance.mjs',profile,runId,target.previewURL,directory]);
run('python3',['scripts/summarize-performance.py',directory]);
run(process.execPath,['scripts/performance-acceptance.mjs',`${directory}/summary.json`]);
