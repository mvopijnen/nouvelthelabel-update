const {Liquid}=require('liquidjs');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
// Shopify accepts comment/endcomment inside a liquid block; LiquidJS tokenizes its text as tags.
const normalizeShopifyComments=source=>source.replace(/({%-?\s*liquid\b)([\s\S]*?)(-?%})/g,(_,open,body,close)=>open+body.replace(/\bcomment\s*\n[\s\S]*?\n\s*endcomment\b/g,'')+close);
function engine(){
 const liquid=new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:false});
 for(const name of ['doc','schema','stylesheet','javascript'])liquid.registerTag(name,{
  parse(token,tokens){while(tokens.length){if(tokens.shift().name==='end'+name)return;}throw new Error('Unclosed '+name);},
  render(){return '';}
 });
 for(const name of ['form','paginate','style'])liquid.registerTag(name,{
  parse(token,tokens){this.templates=[];const stream=this.liquid.parser.parseStream(tokens).on('template',t=>this.templates.push(t)).on('tag:end'+name,()=>stream.stop());stream.start();},
  *render(context,emitter){yield this.liquid.renderer.renderTemplates(this.templates,context,emitter);}
 });
 for(const name of ['layout','section','sections'])liquid.registerTag(name,{parse(){},render(){return '';}});
 liquid.registerFilter('t',key=>key);
 liquid.registerFilter('json',value=>JSON.stringify(value));
 liquid.registerFilter('asset_url',name=>'/assets/'+name);
 liquid.registerFilter('font_url',font=>font?.system?'':font?.url||'');
 liquid.registerFilter('money',value=>'€'+Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100));
 liquid.registerFilter('money_with_currency',value=>'€'+Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100)+' EUR');
 liquid.registerFilter('money_without_trailing_zeros',value=>'€'+Intl.NumberFormat('nl-NL',{maximumFractionDigits:2}).format(value/100));
 const images=new Map();
 const args=list=>Object.fromEntries(list.filter(Array.isArray));
 liquid.registerFilter('image_url',(image,...list)=>{
  const {width}=args(list);const url='/images/'+image.id+'.svg?width='+(width||image.width);images.set(url,image);return url;
 });
 liquid.registerFilter('image_tag',(url,...list)=>{
  const a=args(list),image=images.get(url)||{width:1543,height:861};
  const widths=String(a.widths||image.width).split(',').map(Number).filter(n=>n<=image.width);
  const source=String(url).split('?')[0];
  const attr={src:url,width:image.width,height:image.height,alt:'',sizes:a.sizes||'100vw',loading:a.loading||'lazy',fetchpriority:a.fetchpriority||'auto',srcset:widths.map(w=>source+'?width='+w+' '+w+'w').join(', ')};
  return '<img '+Object.entries(attr).map(([k,v])=>`${k}="${String(v).replaceAll('&','&amp;').replaceAll('"','&quot;')}"`).join(' ')+'>';
 });
 return liquid;
}
async function renderFile(name,data){return engine().renderFile(name,data);}
async function renderSource(file,data){return engine().parseAndRender(fs.readFileSync(path.join(root,file),'utf8'),data);}
const image=id=>({id,width:1543,height:861,aspect_ratio:1543/861});
function slideshow(count){
 const config=JSON.parse(fs.readFileSync(path.join(root,'templates/index.json'),'utf8')).sections.slideshow;
 const settings=Object.values(config.blocks)[0].settings;
 const blocks=Array.from({length:count},(_,i)=>({id:'slide-'+i,shopify_attributes:'',settings:{...settings,'media-1':image('hero-'+i),'media-2':image('desktop-'+i)}}));
 return {section:{id:'hero',index:1,settings:config.settings,blocks}};
}
module.exports={root,engine,renderFile,renderSource,slideshow,image,normalizeShopifyComments};
