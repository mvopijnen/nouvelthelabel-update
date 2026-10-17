import fs from 'node:fs';
import defaultConfig from 'lighthouse/core/config/default-config.js';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

export const profiles=JSON.parse(fs.readFileSync(new URL('./performance-profiles.json',import.meta.url),'utf8'));
export function configurationFor(profile){
 if(!profiles[profile])throw new Error(`Unknown performance profile: ${profile}`);
 const source=profile==='desktop'?desktopConfig:defaultConfig;
 const {formFactor,...screen}=profiles[profile];
 return {...source,settings:{...defaultConfig.settings,...source.settings,formFactor,screenEmulation:{...screen,disabled:false},onlyCategories:['performance']}};
}
export function validateProfile(profile,report){
 const expected=profiles[profile],settings=report.configSettings;
 if(!expected||!settings||settings.formFactor!==expected.formFactor)throw new Error(`${profile}: wrong formFactor`);
 const screen=settings.screenEmulation;
 for(const key of ['width','height','mobile','deviceScaleFactor'])if(screen?.[key]!==expected[key])throw new Error(`${profile}: wrong viewport ${key}`);
 if(screen.disabled!==false)throw new Error(`${profile}: viewport emulation disabled`);
 const isMobile=ua=>/Android|Mobile|iPhone|iPad/i.test(ua);
 for(const ua of [settings.emulatedUserAgent,report.environment?.networkUserAgent]){
  if(typeof ua!=='string'||!ua||isMobile(ua)!==expected.mobile)throw new Error(`${profile}: wrong or missing user-agent`);
 }
 return settings;
}
export function runMetadata(profile,run,url,report){
 const settings=validateProfile(profile,report);
 if(!Number.isFinite(report.categories.performance.score))throw new Error(`${profile}: missing performance score`);
 const ids={FCP_ms:'first-contentful-paint',LCP_ms:'largest-contentful-paint',TBT_ms:'total-blocking-time',CLS:'cumulative-layout-shift',SpeedIndex_ms:'speed-index'};
 const metrics=Object.fromEntries(Object.entries(ids).map(([key,id])=>{
  const value=report.audits[id]?.numericValue;
  if(!Number.isFinite(value)||value<0)throw new Error(`${profile}: invalid ${key}`);
  return [key,value];
 }));
 return {schemaVersion:1,profile,run:Number(run),url,finalURL:report.finalDisplayedUrl,fetchTime:report.fetchTime,formFactor:settings.formFactor,viewportWidth:settings.screenEmulation.width,viewportHeight:settings.screenEmulation.height,mobile:settings.screenEmulation.mobile,userAgent:report.environment.networkUserAgent,emulatedUserAgent:settings.emulatedUserAgent,lighthouseVersion:report.lighthouseVersion,throttling:settings.throttling,throttlingMethod:settings.throttlingMethod,...metrics,score:report.categories.performance.score*100};
}
