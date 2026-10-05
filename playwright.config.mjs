import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',timeout:240000,expect:{timeout:15000},workers:1,retries:0,
 outputDir:'artifacts/preview/test-results',
 reporter:[['list'],['html',{outputFolder:'artifacts/preview/playwright-report',open:'never'}],['json',{outputFile:'artifacts/preview/e2e-results.json'}]],
 use:{browserName:'chromium',headless:true,trace:'off',screenshot:'only-on-failure',
  launchOptions:{...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']},
  ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})},
 projects:[
  {name:'mobile-390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  {name:'tablet-768',use:{viewport:{width:768,height:1024},isMobile:false,hasTouch:true}},
  {name:'desktop-1280',use:{viewport:{width:1280,height:900},isMobile:false,hasTouch:false}}
 ]
});
