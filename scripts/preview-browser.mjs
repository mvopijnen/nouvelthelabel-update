import fs from 'node:fs';
import {validateManifest} from './shopify-preview.mjs';

export function manifest(){return validateManifest(JSON.parse(fs.readFileSync(process.env.SHOPIFY_PREVIEW_MANIFEST||'artifacts/preview/deployment.json','utf8')));}
export function previewURL(route='/',target=manifest()){
 const url=new URL(target.previewURL);url.pathname=route;url.hash='';return url.href;
}
export async function assertPreview(page,target=manifest()){
 const id=await page.evaluate(()=>String(window.Shopify?.theme?.id||''));
 if(id!==String(target.id))throw Error('Refusing storefront actions: browser is not on the expected unpublished theme');
}
export async function openPreview(page,route='/',target=manifest()){
 await page.goto(previewURL(route,target),{waitUntil:'domcontentloaded'});
 if(new URL(page.url()).pathname==='/password'){
  if(!process.env.SHOPIFY_STOREFRONT_PASSWORD)throw Error('Preview requires SHOPIFY_STOREFRONT_PASSWORD');
  // Authentication happens before test tracing to keep password data out of artifacts.
  const response=await page.context().request.post(new URL('/password',page.url()).href,{form:{form_type:'storefront_password',utf8:'✓',password:process.env.SHOPIFY_STOREFRONT_PASSWORD}});
  if(!response.ok())throw Error('Storefront password authentication failed');
  await page.goto(previewURL(route,target),{waitUntil:'domcontentloaded'});
 }
 await assertPreview(page,target);
}
export function cents(text){
 const number=text.replace(/[^\d.,-]/g,'');
 if(!number)throw Error('No price in visible money text');
 const fraction=number.match(/[.,](\d{2})$/);
 const whole=(fraction?number.slice(0,-3):number).replace(/[.,]/g,'');
 return Number(whole)*100+(fraction?Number(fraction[1]):0);
}
