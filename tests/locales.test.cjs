const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const {root,renderFile,renderSource,image}=require('./liquid-helper.cjs');
const base='6f885d4243d368c14a74e963158337d37488f349';
const flatten=(value,prefix='')=>Object.fromEntries(Object.entries(value).flatMap(([key,item])=>{
 const name=prefix?prefix+'.'+key:key;
 return item&&typeof item==='object'?Object.entries(flatten(item,name)):[[name,item]];
}));

test('Every theme locale has default keys and preserves all existing translations and checkout overrides',()=>{
 const defaults=flatten(JSON.parse(fs.readFileSync(path.join(root,'locales/en.default.json'),'utf8')));
 for(const language of ['en.default','nl','de','es','fr','it']){
  const name=`locales/${language}.json`;
  const current=flatten(JSON.parse(fs.readFileSync(path.join(root,name),'utf8')));
  const original=flatten(JSON.parse(execFileSync('git',['show',`${base}:${name}`],{cwd:root,encoding:'utf8'})));
  for(const [key,value]of Object.entries(original))assert.equal(current[key],value,`${language} existing ${key}`);
  for(const key of Object.keys(defaults))assert(key in current,`${language} missing ${key}`);
 }
 const nl=flatten(JSON.parse(fs.readFileSync(path.join(root,'locales/nl.json'),'utf8')));
 assert.match(nl['general.search.no_search_terms_feedback'],/\{\{ terms \}\}/);
 assert.match(nl['products.pickup.available_at_html'],/<strong>\{\{ location_name \}\}<\/strong>/);
});

test('Mobile-only image fallback supplies its actual mobile dimensions; blank fallback remains valid',async()=>{
 const mobile=image('mobile');
 for(const media of [mobile,undefined]){
  const html=await renderFile('image',{mobile_image:media,sizes:'100vw'});
  const img=new JSDOM(html).window.document.querySelector('img');
  assert.equal(img.getAttribute('width'),String(media?.width||1));
  assert.equal(img.getAttribute('height'),String(media?.height||1));
  assert.equal(img.hasAttribute('src'),false);
 }
 const gift=await renderSource('sections/gift-card.liquid',{section:{settings:{}},gift_card:{enabled:true},shop:{name:'Nouvél'}});
 const document=new JSDOM(gift).window.document;
 const card=document.querySelector('#gift-card > img');
 assert.equal(card.getAttribute('width'),'540');assert.equal(card.getAttribute('height'),'330');
 assert.match(card.getAttribute('src'),/gift-card\/card.jpg/);
 assert.match(gift,/#gift-card img\s*\{[^}]*height:\s*auto/);
});
