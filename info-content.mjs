export const INFO_PAGES=Object.freeze([
  {slug:'support',key:'support',path:'./support',mark:'?'},
  {slug:'changelog',key:'changelog',path:'./changelog',mark:'变'},
  {slug:'pro',key:'pro',path:'./pro',mark:'专'},
  {slug:'disclaimer',key:'disclaimer',path:'./disclaimer',mark:'界'},
  {slug:'privacy',key:'privacy',path:'./privacy',mark:'隐'},
  {slug:'feedback',key:'feedback',path:'./feedback',mark:'言'},
  {slug:'report',key:'report',path:'./report',mark:'举'},
]);

export const INFO_SOCIALS=Object.freeze([
  {id:'xiaohongshu',label:'小红书',href:'',available:false},
  {id:'douyin',label:'抖音',href:'',available:false},
  {id:'x',label:'X',href:'',available:false},
  {id:'github',label:'GitHub',href:'https://github.com/xiguajiushiwo/guanxiang-zhouyi',available:true},
]);

export function getInfoPage(slug){
  return INFO_PAGES.find(page=>page.slug===slug)||INFO_PAGES[0];
}
