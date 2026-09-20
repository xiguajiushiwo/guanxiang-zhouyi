import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createZhouyiServer, clientIpForNodeRequest } from './node-server.mjs';
import { MAX_BODY_BYTES } from './functions/_shared/reading-proxy.mjs';

const root=await mkdtemp(join(tmpdir(),'zhouyi-liara-'));
await writeFile(join(root,'index.html'),'<h1>INDEX</h1>');
await writeFile(join(root,'app.js'),'console.log("asset")');

let forwarded;
const fetchImpl=async(url,init)=>{
  forwarded={url,init,body:await new Response(init.body).text()};
  return new Response('【核心判断】\n测试通过。',{
    status:200,
    headers:{'content-type':'text/plain; charset=utf-8','retry-after':'7'},
  });
};
const server=createZhouyiServer({root,proxySecret:'liara-secret',fetchImpl});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;

try{
  const home=await fetch(`${origin}/`);
  assert.equal(home.status,200);
  assert.equal(await home.text(),'<h1>INDEX</h1>');
  assert.match(home.headers.get('content-type'),/text\/html/);
  assert.match(home.headers.get('cache-control'),/no-store/);

  const asset=await fetch(`${origin}/app.js`);
  assert.equal(asset.status,200);
  assert.match(asset.headers.get('content-type'),/javascript/);

  const fallback=await fetch(`${origin}/history/record-1`);
  assert.equal(fallback.status,200);
  assert.equal(await fallback.text(),'<h1>INDEX</h1>');

  const traversal=await fetch(`${origin}/%2e%2e%2foutside.txt`);
  assert.equal(traversal.status,403);

  const malformed=await fetch(`${origin}/%E0%A4%A`);
  assert.equal(malformed.status,400);

  const method=await fetch(`${origin}/api/reading`);
  assert.equal(method.status,405);

  const api=await fetch(`${origin}/api/reading`,{
    method:'POST',
    headers:{'content-type':'application/json','x-real-ip':'203.0.113.24'},
    body:'{"version":1}',
  });
  assert.equal(api.status,200);
  assert.equal(api.headers.get('retry-after'),'7');
  assert.equal(await api.text(),'【核心判断】\n测试通过。');
  assert.equal(forwarded.body,'{"version":1}');
  assert.equal(forwarded.init.headers['x-guanxiang-client-ip'],'203.0.113.24');
  assert.equal(forwarded.init.headers['x-guanxiang-proxy-secret'],'liara-secret');

  const oversized=await fetch(`${origin}/api/reading`,{method:'POST',body:'x'.repeat(MAX_BODY_BYTES+1)});
  assert.equal(oversized.status,413);
}finally{
  await new Promise(resolve=>server.close(resolve));
  await rm(root,{recursive:true,force:true});
}

assert.equal(clientIpForNodeRequest({headers:{'x-real-ip':'198.51.100.8'},socket:{remoteAddress:'127.0.0.1'}}),'198.51.100.8');
assert.equal(clientIpForNodeRequest({headers:{},socket:{remoteAddress:'127.0.0.1'}}),'127.0.0.1');
console.log('Node production server tests passed.');
