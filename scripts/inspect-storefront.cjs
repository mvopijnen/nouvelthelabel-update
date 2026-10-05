// Read-only storefront diagnosis with a normal browser UA; never submits checkout.
const {chromium}=require('playwright-core');
const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 const results=[];
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  for(const url of process.argv.slice(2).length?process.argv.slice(2):['https://nouvelthelabel.com/','https://nouvelthelabel.com/collections/all']){
   const page=await context.newPage(),errors=[],failures=[],badResponses=[];
   page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message}));
   page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text()})});
   page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
   page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()})});
   const response=await page.goto(url,{waitUntil:'load',timeout:60000});
   await page.waitForTimeout(5000);
   const state=await page.evaluate(()=>({userAgent:navigator.userAgent,images:[...document.querySelectorAll('.slideshow-block--media img')].map(i=>({src:i.currentSrc,sizes:i.sizes,loading:i.loading,priority:i.fetchPriority,width:i.width,height:i.height,visible:!!i.getClientRects().length})),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,start:r.startTime,duration:r.duration,transfer:r.transferSize,initiator:r.initiatorType})),preconnects:[...document.querySelectorAll('link[rel=preconnect]')].map(l=>l.href),privacy:{apiAvailable:!!window.Shopify?.customerPrivacy,banner:!!document.querySelector('#shopify-pc__banner')},cartCount:document.querySelector('.header--cart')?.dataset.cartCount}));
   const interactions=[];
   for(const selector of ['.header--search','.header--cart']){
    const control=page.locator(selector+':visible').first();
    if(!await control.count()||!await control.getAttribute('data-drawer-open'))continue;
    const start=Date.now();
    try{
     await control.click({timeout:5000});
     await page.waitForFunction(()=>document.querySelector('.layout--viewport')?.dataset.drawerStatus==='opened',{},{timeout:5000});
     interactions.push({selector,opened:true,responseMs:Date.now()-start});
     await page.keyboard.press('Escape');
     await page.waitForFunction(()=>document.querySelector('.layout--viewport')?.dataset.drawerStatus==='closed',{},{timeout:5000});
    }catch(e){interactions.push({selector,opened:false,error:e.message});}
   }
   results.push({url,width,status:response.status(),...state,interactions,errors,failures,badResponses});
   await page.close();
  }
  await context.close();
 }
 fs.writeFileSync('artifacts/storefront-diagnosis.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(({resources,...r})=>r),null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
