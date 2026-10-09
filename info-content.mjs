export const INFO_PAGES=Object.freeze([
  {slug:'support',key:'support',path:'./support'},
  {slug:'changelog',key:'changelog',path:'./changelog'},
  {slug:'pro',key:'pro',path:'./pro'},
  {slug:'disclaimer',key:'disclaimer',path:'./disclaimer'},
  {slug:'privacy',key:'privacy',path:'./privacy'},
  {slug:'feedback',key:'feedback',path:'./feedback'},
  {slug:'report',key:'report',path:'./report'},
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
