// Exact two substitutions permitted by the measured transition read/write fix.
exports.restoreTransitionReads=source=>source
 .replace('this.items=this.findItems(),this.item_tops=this.items.some(t=>"horizontal"===(t.getAttribute("data-transition-cascade")||this.cascade))?this.items.map(t=>t.offsetTop):null,this.items.forEach','this.items=this.findItems(),this.items.forEach')
 .replace('const e=this.item_tops[t],o=t>0?this.item_tops[t-1]:e;','const e=this.items[t].offsetTop,o=t>0?this.items[t-1].offsetTop:e;');
