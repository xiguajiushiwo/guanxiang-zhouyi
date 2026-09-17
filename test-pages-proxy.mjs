import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequest, MAX_BODY_BYTES, UPSTREAM_URL } from './functions/api/reading.js';

assert.match(await readFile(new URL('./build-pages.mjs',import.meta.url),'utf8'),/'ai-sources\.mjs'/);

const secret='test-proxy-secret';
const call=(request,env={PROXY_SECRET:secret})=>onRequest({request,env});

assert.equal((await call(new Request('https://guanxiang-zhouyi.pages.dev/api/reading'))).status,405);
assert.equal((await call(new Request('https://guanxiang-zhouyi.pages.dev/api/reading',{method:'OPTIONS'}))).status,204);
assert.equal((await call(new Request('https://guanxiang-zhouyi.pages.dev/api/reading',{method:'POST',body:'x'.repeat(MAX_BODY_BYTES+1)}))).status,413);
assert.equal((await call(new Request('https://guanxiang-zhouyi.pages.dev/api/reading',{method:'POST',body:'{}'}),{})).status,503);

const originalFetch=globalThis.fetch;
try{
  let captured;
  globalThis.fetch=async(url,init)=>{
    captured={url,init};
    return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('第一段'));controller.enqueue(new TextEncoder().encode('第二段'));controller.close()}}),{status:200,headers:{'content-type':'text/plain; charset=utf-8','access-control-allow-origin':'*'}});
  };
  const payload=JSON.stringify({question:'所问'});
  const response=await call(new Request('https://guanxiang-zhouyi.pages.dev/api/reading',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.8'},body:payload}));
  assert.equal(captured.url,UPSTREAM_URL);
  assert.equal(captured.init.headers.origin,'https://guanxiang-zhouyi.pages.dev');
  assert.equal(captured.init.headers['x-guanxiang-client-ip'],'203.0.113.8');
  assert.equal(captured.init.headers['x-guanxiang-proxy-secret'],secret);
  assert.equal(new TextDecoder().decode(captured.init.body),payload);
  assert.equal(await response.text(),'第一段第二段');
  assert.equal(response.headers.get('access-control-allow-origin'),null);
  assert.equal(response.headers.get('cache-control'),'no-store');

  globalThis.fetch=async()=>{throw new Error('internal network detail')};
  const failed=await call(new Request('https://guanxiang-zhouyi.pages.dev/api/reading',{method:'POST',body:'{}'}));
  assert.equal(failed.status,503);
  assert.equal((await failed.text()).includes('internal network detail'),false);
}finally{globalThis.fetch=originalFetch}

console.log('Pages proxy tests passed.');
