import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dictionaryForTests } from './i18n.mjs';
import { INFO_PAGES, INFO_SOCIALS, getInfoPage } from './info-content.mjs';

const expected=['support','changelog','pro','disclaimer','privacy','feedback','report'];
assert.deepEqual(INFO_PAGES.map(page=>page.slug),expected);
assert.equal(new Set(INFO_PAGES.map(page=>page.path)).size,expected.length);
assert.equal(getInfoPage('privacy').key,'privacy');
assert.equal(getInfoPage('unknown').key,'support');

const github=INFO_SOCIALS.find(item=>item.id==='github');
assert.deepEqual(github,{
  id:'github',
  label:'GitHub',
  href:'https://github.com/xiguajiushiwo/guanxiang-zhouyi',
  available:true,
});
for(const id of ['xiaohongshu','douyin','x']){
  const social=INFO_SOCIALS.find(item=>item.id===id);
  assert.equal(social.available,false);
  assert.equal(social.href,'');
}

const dictionary=dictionaryForTests();
for(const language of ['zh-CN','en','fa']){
  for(const page of INFO_PAGES){
    assert.ok(dictionary[language][`info.${page.key}.title`]);
    assert.ok(dictionary[language][`info.${page.key}.browserTitle`]);
  }
  for(const key of ['info.comingSoon','info.backHome','info.allPages','info.socials','info.unavailable','info.supportEntry','info.githubLabel']){
    assert.ok(dictionary[language][key]);
  }
}

for(const slug of expected){
  const html=await readFile(new URL(`./${slug}.html`,import.meta.url),'utf8');
  assert.match(html,new RegExp(`<body[^>]*data-info-page="${slug}"`));
  assert.match(html,/href="\.\/info\.css/);
  assert.match(html,/src="\.\/info\.js/);
  assert.match(html,/data-info-title/);
  assert.match(html,/data-info-nav/);
  assert.match(html,/data-info-socials/);
  assert.equal((html.match(/class="info-nav-link"/g)||[]).length,7);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.match(html,/href="https:\/\/github\.com\/xiguajiushiwo\/guanxiang-zhouyi"/);
  assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  assert.equal((html.match(/data-social-unavailable=/g)||[]).length,3);
  assert.match(html,/页面正在准备中/);
  assert.match(html,/href="\.\/"/);
}

const [infoScript,infoStyles,buildSource,workerSource]=await Promise.all([
  readFile(new URL('./info.js',import.meta.url),'utf8'),
  readFile(new URL('./info.css',import.meta.url),'utf8'),
  readFile(new URL('./build-pages.mjs',import.meta.url),'utf8'),
  readFile(new URL('./service-worker.js',import.meta.url),'utf8'),
]);
assert.match(infoScript,/INFO_PAGES/);
assert.match(infoScript,/aria-current/);
assert.match(infoScript,/document\.documentElement\.dir/);
assert.match(infoStyles,/@media\(max-width:390px\)/);
assert.match(infoStyles,/@media\(prefers-reduced-motion:reduce\)/);
assert.doesNotMatch(infoStyles,/gradient\(/);
for(const file of [...expected.map(slug=>`${slug}.html`),'info.css','info.js','info-content.mjs']){
  assert.ok(buildSource.includes(`'${file}'`),`build is missing ${file}`);
  assert.ok(workerSource.includes(`'./${file}'`),`service worker is missing ${file}`);
}
assert.match(workerSource,/guanxiang-shell-v53/);
assert.match(workerSource,/STATIC_PAGE_FALLBACKS/);

console.log('Information page metadata and translations passed.');
