
import fs from 'node:fs';
const {dictionaryForTests}=await import('./i18n.mjs');
const zh=dictionaryForTests()['zh-CN'], en=dictionaryForTests().en;
const errors=[],warnings=[];
for(const key of Object.keys(zh)) if(!(key in en)) errors.push('missing English key: '+key);
for(const key of Object.keys(en)) if(!(key in zh)) errors.push('missing Chinese key: '+key);
const read=(p)=>fs.readFileSync(p,'utf8');
const sources=[['index.html',read('index.html')],['app.js',read('app.js')]];
const refs=new Set();
for(const [,source] of sources){
  for(const match of source.matchAll(/data-i18n(?:-[a-z-]+)?=["']([^"']+)["']/g)) refs.add(match[1]);
  for(const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) refs.add(match[1]);
}
for(const key of refs) if(!(key in zh)) errors.push('untranslated key reference: '+key);
const required=['reading.core','reading.situation','reading.turningPoint','reading.trend','reading.actions','reading.cautions','reading.question','reading.focus','reading.aiPrivacy','history.stored','classics.loading','classics.progress','principles.loading'];
for(const key of required) if(!(key in zh)||!(key in en)) errors.push('required dynamic key missing: '+key);
const html=read('index.html').replace(/<script[\s\S]*?<\/script>/gi,'');
for(const match of html.matchAll(/<(button|h1|h2|h3|h4|p|label|small|span)[^>]*>([^<]*[\u4e00-\u9fff][^<]*)<\/\1>/g)){
  const tag=match[1],text=match[2].trim();
  if(!text||/class=["'][^"']*(?:wing-original|edition-source|detail-meaning)[^"']*["']/.test(match[0])) continue;
  if(!text.includes('·')&&!text.includes('《')&&!text.includes('卦')&&!text.includes('爻')) continue;
  warnings.push('visible Chinese candidate: <'+tag+'> '+text.slice(0,60));
}
const unique=[...new Set(warnings)];
if(unique.length) console.warn('i18n warnings ('+unique.length+'):\n'+unique.slice(0,20).map(item=>' - '+item).join('\n'));
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('i18n validation passed: '+Object.keys(zh).length+' keys, '+refs.size+' references checked.');
