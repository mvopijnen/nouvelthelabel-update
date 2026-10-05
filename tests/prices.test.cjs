const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const {root,renderSource,renderFile}=require('./liquid-helper.cjs');

test('Account, order and gift-card rendering retain cents, currency and redemption data',async()=>{
 for(const cents of [4995,10000,124950]){
  const expected='€'+Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
  const item={id:1,title:'Test',quantity:1,original_price:cents+500,final_price:cents,unit_price:cents,original_line_price:cents+500,final_line_price:cents,unit_price_measurement:{reference_value:1,reference_unit:'kg'},discount_allocations:[],line_level_discount_allocations:[]};
  const order={id:1,name:'#TEST',total_price:cents,currency:'EUR',line_items_subtotal_price:cents,line_items:[item],shipping_methods:[{price:395}],tax_lines:[{price:867}],cart_level_discount_applications:[]};
  const customer={orders:[order]};
  const account=await renderSource('sections/account.liquid',{customer,cart:{currency:{iso_code:'EUR'}},routes:{},section:{settings:{}}});
  assert.equal(new JSDOM(account).window.document.querySelector('td.money').textContent.trim(),expected+' EUR');
  const html=await renderSource('sections/order.liquid',{order,section:{settings:{}},routes:{}});
  const text=new JSDOM(html).window.document.body.textContent;
  assert(text.includes(expected));assert(text.includes('€3,95'));assert(text.includes('€8,67'));
  const gift_card={initial_value:cents,balance:cents,code:'TEST-ONLY',enabled:true,currency:'EUR',qr_identifier:'test-redemption'};
  const gift=await renderSource('sections/gift-card.liquid',{gift_card,section:{settings:{}},shop:{name:'Nouvél'}});
  assert.equal(new JSDOM(gift).window.document.querySelector('#gift-card-amount strong').textContent,expected);
  assert.equal(order.total_price,cents);assert.equal(gift_card.balance,cents);assert.equal(item.final_price,cents);
 }
});

test('Price changes alter only presentation filters and the formatter precision, never calculations',()=>{
 const base='4b2737b';
 const files=['snippets/product-price.liquid','snippets/product-card--price.liquid','snippets/cart.liquid','sections/account.liquid','sections/order.liquid','sections/gift-card.liquid','layout/gift-card.liquid'];
 for(const name of files){
  const original=execFileSync('git',['show',`${base}:${name}`],{cwd:root,encoding:'utf8'});
  const expected=original.replaceAll(' | divided_by: 100.0 | round | times: 100 | money_without_trailing_zeros',' | money').replaceAll("| money | append: ' ' | append: cart.currency.iso_code",'| money_with_currency');
  assert.equal(fs.readFileSync(path.join(root,name),'utf8'),expected,name);
 }
 const main=execFileSync('git',['show','6f885d4243d368c14a74e963158337d37488f349:assets/theme.js'],{cwd:root,encoding:'utf8'});
 assert.equal(fs.readFileSync(path.join(root,'assets/theme.js'),'utf8'),main.replace('static formatMoney(t){const i=this.money_format,s=0,','static formatMoney(t){const i=this.money_format,s=2,'));
});

test('Quick add uses the same real-price component; original and compare prices retain cents',async()=>{
 const product={id:1,title:'Test',price:4995,compare_at_price:10000,available:true,has_only_default_variant:true,selected_or_first_available_variant:{id:1,price:4995,compare_at_price:10000,available:true}};
 const html=await renderFile('product-quick-add',{product,settings:{},routes:{cart_add_url:'/cart/add'}});
 assert.match(html,/product-quick-add/);
 const price=await renderFile('product-price',{product,id:'quick-add'});
 const d=new JSDOM(price).window.document;
 assert.equal(d.querySelector('.product-price--original').textContent.trim(),'€49,95');
 assert.equal(d.querySelector('.product-price--compare').textContent.trim(),'€100,00');
});
