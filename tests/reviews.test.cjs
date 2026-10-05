const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../layout/theme.liquid'),'utf8');
const script=text=>text.match(/<script>\s*(\(function \(\) \{[\s\S]*?)<\/script>/)[1];
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
function fixture(text){
 const dom=new JSDOM('<div id="marketing"></div><div id="mount"><div class="jdgm-widget" id="reviews"><div><span class="jdgm-rev__author">Ada</span><span>Geverifieerd</span><span class="jdgm-verified-badge"><svg></svg></span></div></div></div>',{runScripts:'outside-only'});
 dom.window.eval(script(text));
 return dom;
}
test('Scoped review observers preserve badges, text/icons, late widgets, replacements and fallback markup',async()=>{
 const dom=fixture(source),w=dom.window,d=w.document;await settle();
 const check=()=>{for(const name of d.querySelectorAll('.jdgm-rev__author,.jm-author-name')){
  assert.equal(name.querySelectorAll('.custom-verified-badge').length,1);assert.equal(name.style.display,'');assert.equal(name.querySelector('.custom-verified-badge').textContent,'Geverifieerd');
 }};
 check();assert.equal(d.querySelector('.jdgm-verified-badge svg').style.display,'none');
 assert.equal(d.querySelector('#reviews > div > span:nth-child(2)').style.display,'none');
 d.querySelector('#reviews').insertAdjacentHTML('beforeend','<div><span class="jm-author-name">Bo</span><span>Geverifieerd</span></div>');await settle();check();
 d.querySelector('.jdgm-rev__author').textContent='Ada renamed';await settle();check();
 const parent=d.querySelector('.jm-author-name').parentElement;
 parent.insertAdjacentHTML('beforeend','<span class="jdgm-verified-badge"><svg></svg></span><span>Geverifieerd</span>');await settle();
 assert.equal(parent.lastElementChild.style.display,'none');assert.equal(parent.querySelector('svg').style.display,'none');check();
 // Added widgets and legacy names outside recognized containers both retain the fallback.
 d.querySelector('#marketing').insertAdjacentHTML('beforeend','<section class="jdgm-carousel-wrapper"><div><span class="jdgm-rev__author">Late</span></div></section><div id="legacy"><span class="jm-author-name">Legacy</span></div>');await settle();check();
 d.querySelector('#legacy').insertAdjacentHTML('beforeend','<span>Geverifieerd</span>');await settle();assert.equal(d.querySelector('#legacy').lastElementChild.style.display,'none');
 d.querySelector('#mount').innerHTML='<div class="jdgm-widget"><div><span class="jm-author-name">Replacement</span></div></div>';await settle();check();
 d.querySelector('#mount .jm-author-name').querySelector('.custom-verified-badge').remove();await settle();check();
 d.querySelector('#mount').dispatchEvent(new w.Event('shopify:section:load',{bubbles:true}));await settle();check();
 w.close();
});
test('Unrelated DOM updates no longer run review querySelectorAll; review styling and helpers remain exact',async()=>{
 const baseline=execFileSync('git',['show','6f885d4243d368c14a74e963158337d37488f349:layout/theme.liquid'],{encoding:'utf8'});
 const range=/        function startVerifiedBadgeScript\(\) \{[\s\S]*?(?=        if \(document.readyState)/;
 assert.equal(source.replace(range,baseline.match(range)[0]).replace("shop.money_format | replace: 'EUR', '€' | escape","shop.money_format | replace: 'EUR', '€' | replace: 'amount', 'amount_no_decimals' | escape"),baseline);
 const measurements=[];
 for(const [name,text] of [['before',baseline],['after',source]]){
  const dom=fixture(text);await settle();const w=dom.window;
  let calls=0,bodyScans=0;
  const native=w.Element.prototype.querySelectorAll;
  w.Element.prototype.querySelectorAll=function(selector){if(selector.includes('.jdgm-rev__author')){calls++;if(this===w.document.body)bodyScans++;}return native.call(this,selector)};
  for(let batch=0;batch<10;batch++){
   const root=w.document.querySelector('#marketing');
   for(let i=0;i<100;i++){const node=w.document.createElement('span');node.textContent='Unrelated';root.append(node);}
   await settle();root.replaceChildren();await settle();
  }
  measurements.push({name,unrelatedAddedNodes:1000,reviewQuerySelectorAllCalls:calls,bodyScans});
  if(name==='before')assert.equal(calls,1000);else assert.equal(calls,0);
  assert.equal(bodyScans,0);w.close();
 }
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/review-observer-work.json',JSON.stringify({kind:'deterministic DOM-work comparison; not a storefront performance score',measurements},null,2));
});
