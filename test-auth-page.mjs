import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html,script,styles,index,app,build,worker]=await Promise.all([
  readFile(new URL('./auth.html',import.meta.url),'utf8'),
  readFile(new URL('./auth.js',import.meta.url),'utf8'),
  readFile(new URL('./auth.css',import.meta.url),'utf8'),
  readFile(new URL('./index.html',import.meta.url),'utf8'),
  readFile(new URL('./app.js',import.meta.url),'utf8'),
  readFile(new URL('./build-pages.mjs',import.meta.url),'utf8'),
  readFile(new URL('./service-worker.js',import.meta.url),'utf8'),
]);

assert.match(html,/id="authForm"/);
assert.match(html,/data-auth-mode="login"/);
assert.match(html,/data-auth-mode="register"/);
assert.match(html,/data-guest/);
assert.match(html,/data-account-id/);
assert.match(html,/class="auth-emblem-core"/);
assert.equal((html.match(/class="auth-trigrams"/g)||[]).length,1);
assert.equal((html.match(/data-language="(?:zh-CN|en|fa)"/g)||[]).length,3);
assert.doesNotMatch(index,/id="accountDialog"/);
assert.match(index,/id="profileButton"/);
assert.match(app,/location\.assign\('\.\/auth'\)/);
assert.match(app,/location\.assign\('\.\/auth\?from=app'\)/);
assert.match(app,/new URLSearchParams\(location\.search\)\.get\('entry'\)==='account'/);
assert.match(script,/createAccountClient/);
assert.match(script,/\.register\(email,password\)/);
assert.match(script,/\.login\(email,password\)/);
assert.match(script,/\.logout\(\)/);
assert.match(script,/guanxiang-account-mode-v1/);
assert.match(app,/guanxiang-account-mode-v1/);
assert.match(script,/\.\/\?entry=account#home/);
assert.match(styles,/@media\(max-width:760px\)/);
assert.match(build,/'auth\.html'/);
assert.match(build,/'auth\.css'/);
assert.match(build,/'auth\.js'/);
assert.match(worker,/'\.\/auth\.html'/);
assert.match(worker,/'\.\/auth\.css'/);
assert.match(worker,/'\.\/auth\.js'/);
assert.match(worker,/guanxiang-shell-v45/);

console.log('Standalone account page checks passed.');
