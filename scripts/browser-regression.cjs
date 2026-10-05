const {chromium}=require('playwright-core');
const {root,renderFile,renderSource,slideshow}=require('../tests/liquid-helper.cjs');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const stylesheet=file=>{
 const text=fs.readFileSync(path.join(root,file),'utf8');
 return [...text.matchAll(/{% stylesheet %}([\s\S]*?){% endstylesheet %}/g)].map(m=>m[1]).join('\n');
};
let browser;
(async()=>{
 fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
 const executablePath=process.env.CHROME_PATH||['/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
 if(!executablePath)throw new Error('Set CHROME_PATH to an installed Chrome/Chromium executable');
 browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 const results=[];
 const css=fs.readFileSync(path.join(root,'assets/theme.css'),'utf8')+stylesheet('snippets/slideshow-carousel.liquid')+stylesheet('snippets/slideshow-blocks.liquid')+stylesheet('sections/header.liquid');
 const settings=JSON.parse(fs.readFileSync(path.join(root,'config/settings_data.json'),'utf8')).current;
 const headerConfig=JSON.parse(fs.readFileSync(path.join(root,'sections/header-group.json'),'utf8')).sections.header;
 const renderHeader=layout=>renderSource('sections/header.liquid',{section:{...headerConfig,id:'header',settings:{...headerConfig.settings,layout}},settings,shop:{name:'Nouvél',customer_accounts_enabled:false},cart:{item_count:0},localization:{available_countries:[],available_languages:[]},routes:{cart_url:'/cart'}});
 const variables=await renderFile('css-variables',{settings});
 for(const width of [390,700,1280])for(const count of [1,2,3]){
  const data=slideshow(count);let markup=await renderSource('sections/slideshow.liquid',data);
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${css}</style><script>window.Shopify={designMode:false,theme:{name:'Blockshop'},routes:{cart:'/cart',libraries:{theme_async:'/assets/theme-async.js',swipe_listener:'/assets/swipe-listener.min.js'}}}</script><script type="importmap">{"imports":{"@troop-themes/main":"/assets/theme.js"}}</script></head><body style="margin:0"><nav class="header--root"><div class="header--secondary-nav" style="display:flex"><button class="header--search" aria-label="Search">Search</button><a href="/cart" class="header--cart" aria-label="Cart">Cart</a></div></nav>${markup}<script type="module" src="/assets/theme.js"></script></body></html>`;
  const initial=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:false});
  const initialPage=await initial.newPage();
  // The configured sidebar header is intentionally mobile-only; exercise a supported desktop layout too.
  const headerLayout=width<640?headerConfig.settings.layout:'left-center';
  const headerHTML=await renderHeader(headerLayout);
  await initialPage.setContent(html.replace(/<nav class="header--root">[\s\S]*?<\/nav>/,headerHTML).replace('</head>',variables+'</head>'));
  const visibleBeforeJavaScript=await initialPage.locator('.slideshow-block--root').first().evaluate(e=>({opacity:getComputedStyle(e).opacity,visibility:getComputedStyle(e).visibility,height:e.getBoundingClientRect().height}));
  assert.equal(visibleBeforeJavaScript.opacity,'1');assert.equal(visibleBeforeJavaScript.visibility,'visible');assert(visibleBeforeJavaScript.height>0);
  const realHeader={layout:headerLayout};
  for(const name of ['search','cart']){
   realHeader[name]=await initialPage.locator(`.header--${name}:visible`).first().boundingBox();
   assert(realHeader[name].width>=44&&realHeader[name].height>=44,'Actual configured header target is too small');
  }
  assert(realHeader.search.x+realHeader.search.width<=realHeader.cart.x||realHeader.cart.x+realHeader.cart.width<=realHeader.search.x,'Actual configured header targets overlap');
  await initial.close();
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1.75,isMobile:width<768,hasTouch:width<768});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.route('https://theme.test/**',route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/')return route.fulfill({contentType:'text/html',body:html});
   if(pathname.startsWith('/assets/'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,pathname.slice(1)),'utf8')});
   if(pathname.startsWith('/images/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1543" height="861"><rect width="1543" height="861" fill="#ad9279"/></svg>'});
   if(pathname==='/cart.js')return route.fulfill({contentType:'application/json',body:'{"items":[],"item_count":0}'});
   return route.fulfill({contentType:'text/plain',body:''});
  });
  await page.goto('https://theme.test/',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('slideshow-carousel').active_block);
  await page.waitForTimeout(600);
  const before=await page.locator('slideshow-carousel').boundingBox();
  assert.equal(await page.locator('.slideshow-block--root').count(),count);
  const hiddenDownloads=requests.filter(url=>url.includes('/images/desktop-'));
  if(width===390)assert.equal(hiddenDownloads.length,0,'Hidden mobile desktop-image download');
  if(width===1280)assert(hiddenDownloads.some(url=>url.includes('desktop-0')),'Visible desktop image did not load');
  const image=await page.locator('.slideshow-block--root').first().locator('img').first().evaluate(i=>({width:i.width,height:i.height,complete:i.complete}));
  assert(image.complete&&image.width>0&&image.height>0);
  if(count>1){
   await page.evaluate(()=>document.querySelector('slideshow-carousel').slideToNext());await page.waitForTimeout(450);
   assert.equal(await page.locator('.slideshow-block--root').nth(1).getAttribute('data-active'),'true');
   await page.evaluate(()=>document.querySelector('slideshow-carousel').slideToPrev());await page.waitForTimeout(450);
  }
  assert.equal(await page.locator('.slideshow-block--root').first().getAttribute('data-active'),'true');
  const after=await page.locator('slideshow-carousel').boundingBox();assert.equal(before.height,after.height);
  const search=page.locator('.header--search'),cart=page.locator('.header--cart');
  const a=await search.boundingBox(),b=await cart.boundingBox();
  for(const box of [a,b])assert(box.width>=44&&box.height>=44);
  assert(a.x+a.width<=b.x||b.x+b.width<=a.x,'Header targets overlap');
  await search.focus();assert(await search.evaluate(e=>e.matches(':focus-visible')));
  await page.keyboard.press('Tab');assert(await cart.evaluate(e=>e===document.activeElement));
  assert.deepEqual(errors,[]);
  results.push({width,slides:count,visibleBeforeJavaScript,realHeader,image,hiddenDesktopDownloads:hiddenDownloads.length,height:before.height,header:{search:a,cart:b},errors});
  await context.close();
 }
 fs.writeFileSync(path.join(root,'artifacts/browser-regression.json'),JSON.stringify(results,null,2));
 console.log(`Passed ${results.length} browser cases: real rendered slideshow/configuration, image network selection, stable component height and header targets.`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>browser?.close());
