const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const actual=fs.readFileSync('assets/theme.js','utf8');
const baseline=execFileSync('git',['show','6f885d4243d368c14a74e963158337d37488f349:assets/theme.js'],{encoding:'utf8'});
function run(source,cascade,rows){
 const begin=source.indexOf('class Transition{'),end=source.indexOf('addItemObserver(',source.indexOf('addItemCascade(t,e,i){',begin));
 const Transition=vm.runInNewContext(source.slice(begin,end)+'};Transition');
 const log=[];
 const items=rows.map(([top,override,interval,crop],index)=>{
  const attrs={'data-transition-cascade':override||null,'data-transition-cascade-interval':interval||null,'data-transition-trigger':'custom','data-transition-cropper':crop?'':null};
  const style={setProperty:(key,value)=>log.push({type:'write',index,key,value})};
  return {getAttribute:key=>attrs[key]??null,get offsetTop(){log.push({type:'read',index});return top},style,children:[{style}]};
 });
 const transition=Object.create(Transition.prototype);
 transition.container={getAttribute:key=>({'data-transition-cascade':cascade,'data-transition-cascade-interval':'50','data-transition-trigger':'custom'}[key]??null)};
 transition.findItems=()=>items;transition.initItems();return log;
}
test('Transition cascade keeps exact delays, cropper targets and row grouping while reading before writes',()=>{
 for(const cascade of ['horizontal','vertical',null])for(const rows of [
  [[0],[0],[100],[100],[100]],[[0,null,'20',true],[0],[80,'vertical','30'],[80]],[[0,'horizontal'],[0],[70],[70,'horizontal','40',true]]
 ]){
  const before=run(baseline,cascade,rows),after=run(actual,cascade,rows);
  assert.deepEqual(after.filter(e=>e.type==='write'),before.filter(e=>e.type==='write'));
  const firstWrite=after.findIndex(e=>e.type==='write');
  assert(!after.slice(firstWrite).some(e=>e.type==='read'),'Layout reads must finish before transition writes');
  const hasHorizontal=rows.some(row=>(row[1]||cascade)==='horizontal');
  assert.equal(after.filter(e=>e.type==='read').length,hasHorizontal?rows.length:0);
 }
});
