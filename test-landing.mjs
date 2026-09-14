import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, styles, worker] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./landing-v2.css', import.meta.url), 'utf8'),
  readFile(new URL('./service-worker.js', import.meta.url), 'utf8'),
]);

assert.match(html, /id="siteCover"/);
assert.match(html, /id="enterSite"[^>]*>\s*进入观象\s*<\/button>/);
assert.equal((html.match(/进入观象/g) || []).length, 1);
assert.match(html, /landing-v2\.css/);
assert.match(script, /function initLandingCover\(\)/);
assert.match(script, /removeAttribute\(['"]inert['"]\)/);
assert.match(script, /setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/);
assert.match(styles, /\.site-cover\s*\{/);
assert.match(styles, /\.cover-hexagram\s*\{/);
assert.match(script, /requestAnimationFrame\(\(\)=>document\.dispatchEvent\(new Event\('guanxiang:entered'\)\)\)/);
assert.ok(script.indexOf("$('.main-content')?.focus") < script.indexOf("requestAnimationFrame(()=>document.dispatchEvent(new Event('guanxiang:entered')))"));
assert.match(styles, /@media\s*\(max-width:\s*680px\)/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);
assert.doesNotMatch(styles, /gradient\(/);
assert.match(worker, /['"]\.\/landing-v2\.css['"]/);

console.log('首页封面结构校验通过。');
