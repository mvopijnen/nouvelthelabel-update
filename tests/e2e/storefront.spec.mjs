import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPreview,previewURL,assertPreview,cents} from '../../scripts/preview-browser.mjs';

async function visible(page,selector){return page.locator(`${selector}:visible`).first();}
async function cart(page){
 const response=await page.context().request.get(new URL('/cart.js',page.url()).href);
 expect(response.ok()).toBeTruthy();return response.json();
}
async function audit(page,testInfo,name){
 const results=await new AxeBuilder({page}).analyze();
 await testInfo.attach(`accessibility-${name}`,{body:JSON.stringify(results,null,2),contentType:'application/json'});
 return results.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({page:name,id:v.id,impact:v.impact,nodes:v.nodes}));
}
async function drawer(page,selector){
 await (await visible(page,selector)).click();
 await expect(page.locator('.layout--viewport')).toHaveAttribute('data-drawer-status','opened');
 await page.keyboard.press('Escape');
 await expect(page.locator('.layout--viewport')).toHaveAttribute('data-drawer-status','closed');
}
async function selectVariant(page,variant){
 for(const [index,option] of variant.options.entries()){
  const row=page.locator(`main .product-options--option[data-index="${index}"]`).first();
  const radio=row.locator('.radios--value-button').filter({hasText:new RegExp(`^\\s*${option.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`)});
  if(await radio.count())await radio.first().click();
  else{
   await row.locator('.disclosure--toggle').click();
   await row.locator('.disclosure--option').filter({hasText:option}).first().click();
  }
 }
 await expect(page.locator('main form.product-form input[name=id]').first()).toHaveValue(String(variant.id));
 await expect.poll(async()=>cents(await page.locator('main .product-price--original:visible').first().innerText())).toBe(variant.price);
 const button=page.locator('main form.product-form .product-buy-buttons--primary').first();
 if(variant.available)await expect(button).toBeEnabled();else await expect(button).toBeDisabled();
}
async function add(page,variant){
 await assertPreview(page);
 const request=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/cart/add.js')&&r.request().method()==='POST');
 await page.locator('main form.product-form .product-buy-buttons--primary').first().click();
 expect((await request).ok()).toBeTruthy();
 await expect.poll(async()=>(await cart(page)).items.some(item=>item.variant_id===variant.id)).toBeTruthy();
}

test('Shopify journey and accessibility; stop on checkout before any payment',async({page,context},testInfo)=>{
 const handle=process.env.SHOPIFY_E2E_PRODUCT_HANDLE;
 expect(handle,'Set SHOPIFY_E2E_PRODUCT_HANDLE to a dedicated existing multi-variant test product').toMatch(/^[a-z0-9][a-z0-9-]*$/);
 const collection=process.env.SHOPIFY_E2E_COLLECTION_PATH||'/collections/all';
 expect(collection).toMatch(/^\/collections\/[a-z0-9][a-z0-9-]*$/);
 const pageErrors=[],consoleErrors=[],networkFailures=[],accessibilityFailures=[];
 context.on('page',p=>{
  p.on('pageerror',e=>pageErrors.push({url:p.url(),message:e.message}));
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push({url:p.url(),message:m.text()})});
  p.on('requestfailed',r=>networkFailures.push({url:r.url(),message:r.failure()?.errorText}));
 });
 page.on('pageerror',e=>pageErrors.push({url:page.url(),message:e.message}));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push({url:page.url(),message:m.text()})});
 page.on('requestfailed',r=>networkFailures.push({url:r.url(),message:r.failure()?.errorText}));
 // Read-only checkout navigation is allowed. Payment/order completion requests are rejected.
 await context.route('**/*',async route=>{
  const r=route.request();const payload=r.postData()||'';
  if(r.method()==='POST'&&(/submitForCompletion|CompleteCheckout|completePayment/i.test(payload)||/\/(payments|orders)\/(complete|create)/i.test(r.url()))){
   throw Error('Payment/order completion is outside the authorized test boundary');
  }
  await route.continue();
 });
 let authenticated=false;
 try{
  await openPreview(page);authenticated=true;
  await context.tracing.start({screenshots:true,snapshots:true});
  await expect(page.locator('header').first()).toBeVisible();
  const menu=await visible(page,'.header--menu, [data-drawer-view="menu"]');
  if(await menu.count())await drawer(page,'.header--menu, [data-drawer-view="menu"]');
  else await expect(page.locator('header a[href^="/collections/"]:visible').first()).toBeVisible();
  await drawer(page,'.header--search');await drawer(page,'.header--cart');
  accessibilityFailures.push(...await audit(page,testInfo,'homepage'));

  await openPreview(page,collection);
  await expect(page.locator('main .product-card--root').first()).toBeVisible();
  const sort=await visible(page,'disclosure-element[data-type="sort-by"] .disclosure--toggle');
  await sort.click();
  await (await visible(page,'.disclosure--option[data-value="price-descending"]')).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('sort_by')).toBe('price-descending');
  await expect(page.locator('main .product-card--root').first()).toBeVisible();
  await (await visible(page,'[data-drawer-view="filter"]')).click();
  const filter=page.locator('.filter--input[type=checkbox]:not(:disabled)').first();
  await expect(filter,'Fixture collection must have an enabled Shopify filter').toBeAttached();
  const filterId=await filter.getAttribute('id');
  await page.locator(`label[for="${filterId}"]`).click();
  await (await visible(page,'.filter--button[data-type="apply"]')).click();
  await expect.poll(()=>[...new URL(page.url()).searchParams.keys()].some(key=>key.startsWith('filter.'))).toBeTruthy();
  await expect(page.locator('main .product-card--root').first()).toBeVisible();
  accessibilityFailures.push(...await audit(page,testInfo,'collection'));
  await page.locator('main .product-card--root a[href*="/products/"]:visible').first().click();
  await expect(page).toHaveURL(/\/products\//);await assertPreview(page);

  await openPreview(page,`/products/${handle}`);
  const productResponse=await context.request.get(new URL(`/products/${handle}.js`,page.url()).href);
  expect(productResponse.ok()).toBeTruthy();const product=await productResponse.json();
  expect(product.variants.length,'Fixture must exercise actual variant selection').toBeGreaterThan(1);
  const available=product.variants.find(v=>v.available);
  expect(available,'Fixture needs an available variant with at least two units in stock').toBeTruthy();
  const alternate=product.variants.find(v=>v.id!==available.id);
  await expect.poll(()=>page.locator('main .product-media--root img:visible, main .product--images img:visible').evaluateAll(imgs=>imgs.length>0&&imgs.every(i=>i.complete&&i.naturalWidth>0))).toBeTruthy();
  await selectVariant(page,alternate);await selectVariant(page,available);
  accessibilityFailures.push(...await audit(page,testInfo,'product'));
  await add(page,available);
  await expect(page.locator('.drawer--container[data-view="cart"] .cart--item').first()).toBeVisible();
  await openPreview(page,'/cart');
  let state=await cart(page),item=state.items.find(i=>i.variant_id===available.id);
  expect(item.price).toBe(available.price);expect(item.quantity).toBe(1);
  const line=()=>page.locator(`main .cart--item[data-variant-id="${available.id}"]`);
  await expect(line()).toBeVisible();
  expect(cents(await line().locator('.cart--item--price .money').last().innerText())).toBe(item.final_price);
  expect(cents(await page.locator('main .cart--total-price').innerText())).toBe(state.total_price);
  await line().locator('.quantity-selector--plus').click();
  await expect.poll(async()=>(await cart(page)).items.find(i=>i.variant_id===available.id)?.quantity).toBe(2);
  state=await cart(page);item=state.items.find(i=>i.variant_id===available.id);
  await expect.poll(async()=>cents(await line().locator('.cart--item--total .money').last().innerText())).toBe(item.final_line_price);
  await expect.poll(async()=>cents(await page.locator('main .cart--total-price').innerText())).toBe(state.total_price);
  accessibilityFailures.push(...await audit(page,testInfo,'cart'));
  await line().locator('.quantity-selector--remove').click();
  await expect.poll(async()=>(await cart(page)).item_count).toBe(0);
  await openPreview(page,`/products/${handle}`);await selectVariant(page,available);await add(page,available);
  await openPreview(page,'/cart');await assertPreview(page);
  await page.locator('main [name="checkout"]').click();
  await expect(page).toHaveURL(/\/checkouts?\//,{timeout:45000});
  // STOP: no customer fields, payment fields, order submission or purchase actions.
  expect(accessibilityFailures,'Serious/critical accessibility violations').toEqual([]);
  expect(pageErrors,'Unhandled JavaScript errors, including review/app errors').toEqual([]);
 }finally{
  await testInfo.attach('browser-diagnostics',{body:JSON.stringify({pageErrors,consoleErrors,networkFailures},null,2),contentType:'application/json'});
  if(authenticated){
   await context.tracing.stop({path:testInfo.outputPath('journey.zip')});
   // This context owns a fresh test cart; cleanup never uses a customer session.
   await context.request.post(new URL('/cart/clear.js',previewURL()).href).catch(()=>{});
  }
 }
});
