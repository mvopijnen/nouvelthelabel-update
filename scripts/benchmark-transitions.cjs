// Actual transition methods in a controlled browser fixture; never a storefront score.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright-core');
const baseline=execFileSync('git',['show','6f885d4243d368c14a74e963158337d37488f349:assets/theme.js'],{encoding:'utf8'});
const actual=fs.readFileSync('assets/theme.js','utf8');
const extract=source=>{const a=source.indexOf('class Transition{'),b=source.indexOf('addItemObserver(',source.indexOf('addItemCascade(t,e,i){',a));return source.slice(a,b)+'};window.Transition=Transition';};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const runs={before:[],after:[]};let expected;
 try{
  for(let run=1;run<=3;run++)for(const [name,source]of [['before',baseline],['after',actual]]){
   const page=await browser.newPage({viewport:{width:390,height:844}}),session=await page.context().newCDPSession(page);
   await session.send('Emulation.setCPUThrottlingRate',{rate:4});await session.send('Performance.enable');
   await page.setContent('<style>#fixture{display:grid;grid-template-columns:repeat(4,1fr)}.box{height:30px;transition:opacity .5s;transition-delay:var(--transition--delay,0ms)}</style><div id="fixture" data-transition-container="fixture" data-transition-cascade="horizontal" data-transition-cascade-interval="50" data-transition-trigger="custom">'+Array.from({length:400},()=>'<div class="box" data-transition-item="fixture">Item</div>').join('')+'</div>');
   await page.evaluate(extract(source));await page.evaluate(()=>document.body.offsetHeight);
   const before=Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const result=await page.evaluate(()=>{const t=Object.create(window.Transition.prototype);t.container=document.querySelector('#fixture');t.name='fixture';const start=performance.now();t.initItems();return {durationMs:performance.now()-start,delays:t.items.map(i=>i.style.getPropertyValue('--transition--delay'))}});
   const after=Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   if(result.delays.length!==400)throw Error('Fixture must exercise 400 actual transition items');
   if(!expected)expected=result.delays;
   if(JSON.stringify(result.delays)!==JSON.stringify(expected))throw Error('Transition behavior changed');
   runs[name].push({run,durationMs:result.durationMs,styleRecalculations:after.RecalcStyleCount-before.RecalcStyleCount,layouts:after.LayoutCount-before.LayoutCount});
   await page.close();
  }
  const median=values=>values.toSorted((a,b)=>a-b)[1];
  const result={kind:'controlled Chromium component benchmark; not a storefront LCP/TBT measurement',items:400,cpuSlowdown:4,runs,medians:Object.fromEntries(Object.entries(runs).map(([name,values])=>[name,{durationMs:median(values.map(v=>v.durationMs)),styleRecalculations:median(values.map(v=>v.styleRecalculations)),layouts:median(values.map(v=>v.layouts))}]))};
  fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/transition-benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1});
