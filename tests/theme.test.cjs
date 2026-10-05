const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {root,engine,renderFile,renderSource,slideshow,normalizeShopifyComments}=require('./liquid-helper.cjs');

for(const count of [1,2,3])test(`Real homepage configuration renders ${count} slides with both image slots`,async()=>{
 const html=await renderSource('sections/slideshow.liquid',slideshow(count));
 const d=new JSDOM(html).window.document;
 const slides=d.querySelectorAll('.slideshow-block--root');
 assert.equal(slides.length,count);
 assert.equal(d.querySelectorAll('[data-active="true"]').length,1);
 assert.equal(d.querySelectorAll('img[fetchpriority="high"]').length,1);
 assert.equal(d.querySelectorAll('link[rel="preload"][as="image"]').length,0);
 for(const [i,slide]of [...slides].entries()){
  const imgs=slide.querySelectorAll('img');assert.equal(imgs.length,2);
  assert.equal(imgs[0].loading||imgs[0].getAttribute('loading'),i===0?'eager':'lazy');
  assert.equal(imgs[1].getAttribute('loading'),'lazy');
  assert.equal(imgs[1].getAttribute('fetchpriority'),'auto');
  assert.match(imgs[0].getAttribute('sizes'),/1075px/);
 }
});

test('Lower slideshow is lazy, with no high-priority image',async()=>{
 const data=slideshow(3);data.section.index=4;
 const html=await renderSource('sections/slideshow.liquid',data);
 const d=new JSDOM(html).window.document;
 assert.equal(d.querySelectorAll('img[loading="eager"]').length,0);
 assert.equal(d.querySelectorAll('img[fetchpriority="high"]').length,0);
});

test('Liquid prices and actual JavaScript formatter use the same whole-euro rounding',async()=>{
 const text=fs.readFileSync(path.join(root,'assets/theme.js'),'utf8');
 const start=text.indexOf('static formatMoney('),end=text.indexOf('static arraysEqual',start);
 const Money=vm.runInNewContext(`class Money {static get money_format(){return '€{{amount_with_comma_separator}}'} ${text.slice(start,end)}}; Money`);
 for(const [cents,expected]of [[4995,'€50'],[10000,'€100'],[124950,'€1.250']]){
  const variant={id:1,price:cents,compare_at_price:cents+10000,unit_price:cents,unit_price_measurement:{reference_value:1,reference_unit:'kg'}};
  const product={selected_or_first_available_variant:variant,price:cents,compare_at_price:cents+10000,available:true};
  for(const snippet of ['product-price','product-card--price']){
   const html=await renderFile(snippet,{product,id:'price',cart:{currency:{iso_code:'EUR'}}});
   const document=new JSDOM(html).window.document;
   const price=document.querySelector('.product-price--original,.product--price');
   assert.equal(price.textContent.trim(),expected);
   assert.equal(document.querySelector('.product-price--unit-price,.product--unit-price').textContent.trim(),expected);
  }
  assert.equal(Money.formatMoney(cents),expected);
  assert.equal(variant.price,cents);assert.equal(product.price,cents);
 }
});

test('Collection reloads clean up observers and listeners; instances stay independent',async()=>{
 const source=fs.readFileSync(path.join(root,'sections/collectie-hoogtepunten.liquid'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 const dom=new JSDOM('<div id="a"><collection-highlights class="ch-wrapper-a" data-mobile-layout="interactive"><div class="ch-item is-active"><a href="/one">Link</a></div><div class="ch-item"></div><div class="ch-img is-active"></div><div class="ch-img"></div></collection-highlights></div><div id="b"><collection-highlights class="ch-wrapper-b" data-mobile-layout="interactive"><div class="ch-item is-active"></div><div class="ch-item"></div><div class="ch-img is-active"></div><div class="ch-img"></div></collection-highlights></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w,'innerWidth',{value:390,writable:true});
 const observers=[];w.IntersectionObserver=class{constructor(callback){this.callback=callback;observers.push(this)}observe(target){this.target=target}disconnect(){this.disconnected=true}};
 const script=id=>source.replaceAll('{{ section.id }}',id).replaceAll('{{ section.settings.mobile_layout }}','interactive');
 w.eval(script('a'));w.eval(script('b'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 observers.forEach(o=>o.callback([{isIntersecting:true}]));
 let a=w.document.querySelector('.ch-wrapper-a');const b=w.document.querySelector('.ch-wrapper-b');
 const link=a.querySelector('a');const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(click);assert.equal(click.defaultPrevented,false);
 a.querySelectorAll('.ch-item')[1].click();await new Promise(r=>w.requestAnimationFrame(r));
 assert.equal(a.querySelectorAll('.ch-item')[1].classList.contains('is-active'),true);
 assert.equal(b.querySelectorAll('.ch-item')[0].classList.contains('is-active'),true);
 for(let i=0;i<3;i++){
  w.document.getElementById('a').dispatchEvent(new w.Event('shopify:section:unload',{bubbles:true}));
  assert.equal(a.collectionHighlightsCleanup,undefined);assert.equal(a.dataset.initialized,undefined);
  const previous=a.querySelectorAll('.ch-item')[0].className;
  a.querySelectorAll('.ch-item')[0].click();await new Promise(r=>w.requestAnimationFrame(r));assert.equal(a.querySelectorAll('.ch-item')[0].className,previous);
  const replacement=a.cloneNode(true);a.remove();w.document.getElementById('a').append(replacement);a=replacement;
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await Promise.resolve();observers.at(-1).callback([{isIntersecting:true}]);
 }
 assert.equal(observers.slice(0,-1).every(o=>o.disconnected),true);
 w.document.getElementById('a').dispatchEvent(new w.Event('shopify:section:unload',{bubbles:true}));
 w.document.getElementById('b').dispatchEvent(new w.Event('shopify:section:unload',{bubbles:true}));
 assert.equal(observers.every(o=>o.disconnected),true);w.close();
});

test('Shared font URLs are preloaded once; system fonts emit no font hints',async()=>{
 const font={url:'/same.woff2',system:false};
 const html=await renderFile('preload',{settings:{'typography--heading':font,'typography--nav':font,'typography--paragraph':font}});
 assert.equal(new JSDOM(html).window.document.querySelectorAll('link[as="font"]').length,1);
 const system={system:true,'system?':true};const sys=await renderFile('preload',{settings:{'typography--heading':system,'typography--nav':system,'typography--paragraph':system}});
 assert.equal(new JSDOM(sys).window.document.querySelectorAll('link[as="font"]').length,0);assert.doesNotMatch(sys,/fonts.shopifycdn.com/);
});

test('Footer unload clears timers and listeners across repeated initialization',async()=>{
 const source=fs.readFileSync(path.join(root,'sections/ss-footer-4.liquid'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replaceAll('{{ section.id }}','footer');
 const dom=new JSDOM('<div id="section"><div class="footer-footer">'+[0,1].map(i=>`<button class="footer-tab-toggle-footer"></button><div class="footer-tab-text-footer"><div class="footer-tab-height-cal-footer"></div></div><span class="footer-tab-toggle-arrow-footer"></span>`).join('')+'</div></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,footer=w.document.querySelector('.footer-footer'),buttons=footer.querySelectorAll('button');
 for(let i=0;i<3;i++){
  w.eval(source);w.eval(source);
  buttons[0].click();await new Promise(r=>w.setTimeout(r,5));assert.equal(footer.querySelector('.footer-tab-text-footer').style.display,'block');
  buttons[1].click();buttons[0].click();
  w.document.getElementById('section').dispatchEvent(new w.Event('shopify:section:unload',{bubbles:true}));
  assert.equal(footer.dataset.tabsInitialized,undefined);
  const before=footer.innerHTML;buttons[1].click();w.dispatchEvent(new w.Event('resize'));await new Promise(r=>w.setTimeout(r,310));assert.equal(footer.innerHTML,before);
 }
 w.close();
});

test('Machine-readable product price and protected review source are unchanged',()=>{
 const meta=fs.readFileSync(path.join(root,'snippets/meta-tags.liquid'),'utf8');
 assert.match(meta,/product\.price \| divided_by: 100\.0/);
 assert.doesNotMatch(meta,/product\.price[^\n]*\| round/);
 const {execFileSync}=require('node:child_process');
 const base=execFileSync('git',['show','8ff750c037e6f376efb739415c44190db2c1ac6d:theme.liquid'],{cwd:root});
 assert.deepEqual(fs.readFileSync(path.join(root,'layout/theme.liquid')),base);
});

test('Actual variant-change component keeps original, compare and unit prices rounded',async()=>{
 const variant={id:1,price:4995,compare_at_price:10000,unit_price:4995,unit_price_measurement:{reference_value:1,reference_unit:'kg'}};
 const html=await renderFile('product-price',{product:{selected_or_first_available_variant:variant},id:'variant',cart:{}});
 const dom=new JSDOM('<div>'+html+'</div>',{runScripts:'outside-only'}),w=dom.window;
 const main=fs.readFileSync(path.join(root,'assets/theme.js'),'utf8');const begin=main.indexOf('static formatMoney('),end=main.indexOf('static arraysEqual',begin);
 w.eval(`window.Utils=class{static get money_format(){return '€{{amount_with_comma_separator}}'}${main.slice(begin,end)}}`);
 const listeners=new Map();w.on=(name,callback)=>{listeners.set(name,callback);w.addEventListener(name.split('.')[0],callback)};w.off=name=>{w.removeEventListener(name.split('.')[0],listeners.get(name));listeners.delete(name)};
 const async=fs.readFileSync(path.join(root,'assets/theme-async.js'),'utf8');const start=async.indexOf('class ProductPrice'),stop=async.indexOf('customElements.get("product-price-element")',start);
 w.eval(async.slice(start,stop)+';customElements.define("product-price-element",ProductPrice)');
 const changed={...variant,price:124950,compare_at_price:150000,unit_price:10000};
 w.dispatchEvent(new w.CustomEvent('theme:product:variant:variantChanged',{detail:{variant:changed}}));
 assert.equal(w.document.querySelector('.product-price--original').textContent,'€1.250');
 assert.equal(w.document.querySelector('.product-price--compare').textContent,'€1.500');
 assert.equal(w.document.querySelector('.product-price--unit-price').textContent,'€100');
 assert.equal(changed.price,124950);
 w.document.querySelector('product-price-element').remove();assert.equal(listeners.size,0);w.close();
});

test('Cart drawer and desktop render rounded prices without changing basket amounts',async()=>{
 const item={id:1,key:'item',quantity:1,title:'Product',url:'/products/product',original_price:10000,final_price:4995,original_line_price:10000,final_line_price:4995,unit_price:4995,unit_price_measurement:{reference_value:1,reference_unit:'kg'},product:{has_only_default_variant:true},discount_allocations:[],properties:{}};
 const cart={items:[item],item_count:1,total_price:4995,currency:{iso_code:'EUR'},cart_level_discount_applications:[],note:'',taxes_included:true};
 for(const view of ['desktop','drawer']){
  const html=await renderFile('cart',{view,cart,settings:{},routes:{cart_url:'/cart',all_products_collection_url:'/collections/all'},linklists:{}});
  const d=new JSDOM(html).window.document;
  assert.equal(d.querySelector('.cart--total-price').textContent.trim(),'€50 EUR');
  assert.match(d.querySelector('.cart--item--price').textContent,/€50/);
  assert.equal(cart.total_price,4995);assert.equal(item.final_price,4995);
 }
});

test('All Liquid files parse, including restored gift card/password and Shopify block tags',()=>{
 const liquid=engine();let count=0;
 for(const directory of ['layout','sections','snippets','templates'])for(const entry of fs.readdirSync(path.join(root,directory),{recursive:true})){
  const file=path.join(root,directory,entry);if(!file.endsWith('.liquid'))continue;
  assert.doesNotThrow(()=>liquid.parse(normalizeShopifyComments(fs.readFileSync(file,'utf8'))),file);count++;
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/theme-path-mapping.json'),'utf8'));
 const expected=[...Object.values(manifest.moved),...Object.keys(manifest.restored_from_archive)].filter(name=>name.endsWith('.liquid')).length;
 assert.equal(count,expected);
});

test('Product metadata preserves cents; quoted article data stays delegated to Shopify',async()=>{
 const liquid=engine();let delegated=false;
 liquid.registerFilter('structured_data',article=>{delegated=true;return JSON.stringify({'@type':'Article',headline:article.title})});
 const source=fs.readFileSync(path.join(root,'snippets/meta-tags.liquid'),'utf8');
 const article={title:'A "quoted" title & more',excerpt:'Text "quoted" & safe'};
 const html=await liquid.parseAndRender(source,{request:{page_type:'article'},template:'article',article,page_title:article.title,page_description:article.excerpt,shop:{name:'Shop'}});
 assert(delegated);const document=new JSDOM(html).window.document;
 assert.equal(JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).headline,article.title);
 const productHTML=await liquid.parseAndRender(source,{request:{page_type:'product'},template:'product',product:{price:4995,title:'Product'},cart:{currency:{iso_code:'EUR'}},shop:{name:'Shop'}});
 const pd=new JSDOM(productHTML).window.document;assert.equal(pd.querySelector('meta[property="og:price:amount"]').content,'49.95');
 assert.equal(pd.querySelectorAll('script[type="application/ld+json"]').length,0,'Do not duplicate app-managed Product schema');
});

test('Predictive-search restored snippet and actual JS fetch, clear and cached results work',async()=>{
 const html=await renderFile('main-search',{settings:{'transitions--text':true},predictive_search:{performed:false},routes:{search_url:'/search'},collections:{all:{products:[]}}});
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const main=fs.readFileSync(path.join(root,'assets/theme.js'),'utf8');w.eval(main.slice(0,main.indexOf('class SizeQueries')));
 w.Shopify={routes:{predictive_search:'/search/suggest',search:'/search'}};
 const calls=[];w.fetch=async url=>{calls.push(url);return {ok:true,text:async()=>'<div id="shopify-section-predictive-search"><a href="/products/result">Result</a></div>'}};
 const source=fs.readFileSync(path.join(root,'assets/theme-async.js'),'utf8');const start=source.indexOf('class PredictiveSearch'),stop=source.indexOf('customElements.get(',start);
 w.eval(source.slice(start,stop)+';customElements.define("predictive-search-element",PredictiveSearch)');
 const element=w.document.querySelector('predictive-search-element');await element.getSearchResults('ring');
 assert.equal(calls.length,1);assert.match(calls[0],/q=ring&section_id=predictive-search/);assert.match(element.querySelector('.search--results').textContent,/Result/);
 await element.getSearchResults('ring');assert.equal(calls.length,1);
 element.querySelector('.search--textbox').value='ring';element.querySelector('.search--clear').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(element.querySelector('.search--textbox').value,'');
 element.remove();assert.equal(element.cached_results.size,0);w.close();
});

for(const intent of ['related','complementary'])test(`${intent} recommendations fetch the correct restored section and insert results`,async()=>{
 const dom=new JSDOM(`<div><product-recommendations-element data-intent="${intent}" data-max-products="4" data-product-id="123"><div data-container="panel"></div></product-recommendations-element></div>`,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const main=fs.readFileSync(path.join(root,'assets/theme.js'),'utf8');w.eval(main.slice(0,main.indexOf('class SizeQueries')));
 w.Shopify={routes:{product_recommendations:'/recommendations/products'}};
 w.IntersectionObserver=class{observe(){}disconnect(){}};
 const calls=[];w.fetch=async url=>{calls.push(url);return {ok:true,text:async()=>'<div><div data-container="panel"><a href="/products/recommended">Recommended</a></div></div>'}};
 const source=fs.readFileSync(path.join(root,'assets/theme-async.js'),'utf8');const start=source.indexOf('class ProductRecommendations'),stop=source.indexOf('customElements.get(',start);
 w.eval(source.slice(start,stop)+';customElements.define("product-recommendations-element",ProductRecommendations)');
 const element=w.document.querySelector('product-recommendations-element');await element.load();await new Promise(r=>w.requestAnimationFrame(r));
 assert.equal(calls.length,1);assert.match(calls[0],new RegExp(`section_id=${intent}-products&limit=4&product_id=123&intent=${intent}`));assert.match(element.textContent,/Recommended/);assert.equal(element.getAttribute('aria-hidden'),'false');
 assert(fs.existsSync(path.join(root,'sections',intent+'-products.liquid')));w.close();
});

test('Restored password and gift-card pages render their controls and retain real redemption values',async()=>{
 const gift_card={initial_value:124950,balance:4995,currency:'EUR',code:'TEST1234',qr_identifier:'https://theme.test/redeem/test',enabled:true,expired:false,pass_url:'/wallet/test'};
 const data={gift_card,section:{settings:{}},shop:{name:'Nouvél',url:'https://theme.test'},request:{locale:{iso_code:'nl'}}};
 const sectionHTML=await renderSource('sections/gift-card.liquid',data);
 const document=new JSDOM(sectionHTML).window.document;
 assert.equal(document.querySelector('#gift-card-amount strong').textContent,'€1.250');
 assert.match(document.querySelector('#gift-card-amount .money').textContent,/€50/);
 assert.equal(document.querySelector('#gift-card-code-digits').textContent,'TEST1234');
 assert.equal(document.querySelector('.add-to-apple-wallet').getAttribute('href'),'/wallet/test');
 const layoutHTML=await renderSource('layout/gift-card.liquid',{...data,content_for_layout:sectionHTML});
 assert.match(layoutHTML,/https:\/\/theme.test\/redeem\/test/);
 assert.equal(gift_card.initial_value,124950);assert.equal(gift_card.balance,4995);
 const password=await renderSource('sections/password.liquid',{section:{id:'password',settings:{}},shop:{name:'Nouvél',password_message:'Private preview'},settings:{},form:{}});
 const pd=new JSDOM(password).window.document;
 assert(pd.querySelector('input[name="password"]'));assert(pd.querySelector('.password--login'));assert(pd.querySelector('.password--cancel'));
 const passwordLayout=await renderSource('layout/password.liquid',{shop:{name:'Nouvél',money_format:'€{{amount_with_comma_separator}}'},settings:{},request:{locale:{iso_code:'nl'},page_type:'password'},content_for_layout:password});
 assert.match(passwordLayout,/id="main_content"/);assert.match(passwordLayout,/Private preview/);
});

test('Price formatting is the only change to main theme JavaScript calculations',()=>{
 const {execFileSync}=require('node:child_process');
 const base=execFileSync('git',['show','8ff750c037e6f376efb739415c44190db2c1ac6d:theme.js'],{cwd:root,encoding:'utf8'});
 const actual=fs.readFileSync(path.join(root,'assets/theme.js'),'utf8');
 const previous='static formatMoney(t,e=!1){const i=this.money_format,s=e||i.includes("no_decimals")?0:2,';
 const current='static formatMoney(t){const i=this.money_format,s=0,';
 assert.equal(actual.replace(current,previous),base);
});
