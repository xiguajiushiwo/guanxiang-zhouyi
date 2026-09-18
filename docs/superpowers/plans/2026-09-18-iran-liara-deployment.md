# Iran-accessible Liara Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the complete Zhouyi application and its same-origin AI proxy at `https://guanxiang-zhouyi.liara.run`, then verify the exact URL from eight Iranian probes.

**Architecture:** A testable Node HTTP adapter serves the existing `dist/` build and sends `/api/reading` through the shared proxy core. Liara stores a dedicated proxy secret; the existing Cloudflare Worker accepts the matching `LIARA_PROXY_SECRET` and exact Liara origin while retaining the Cloudflare Pages and Netlify paths.

**Tech Stack:** Node.js HTTP/Web Streams, existing static build scripts, Liara Node PaaS and CLI 9, Cloudflare Workers/Wrangler, Node assertion tests, Playwright CLI, Check-Host HTTP probes.

**Spec:** `docs/superpowers/specs/2026-09-18-iran-liara-deployment-design.md`

## Global Constraints

- The production URL is `https://guanxiang-zhouyi.liara.run`; if Liara reports that exact application ID is unavailable, stop before changing source configuration and select a new exact ID through a spec amendment.
- Keep the existing Cloudflare Pages and Netlify deployments live throughout the rollout.
- Do not change the visual design, divination flow, local storage format, reading content, or current AI payload contract.
- Never place a provider credential or proxy secret in source, Git, build artifacts, frontend assets, logs, or literal command arguments.
- Use a dedicated Liara proxy secret named `PROXY_SECRET` on Liara and `LIARA_PROXY_SECRET` on the Worker.
- Treat the Liara deployment as complete only after two consecutive rounds return HTTP `200` from all eight Iranian Check-Host nodes.
- Preserve localhost AI isolation: local pages must not call production AI unless an endpoint is explicitly injected.

---

### Task 1: Testable Node production server

**Files:**
- Create: `node-server.mjs`
- Create: `test-node-server.mjs`
- Modify: `serve.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `proxyReading({ request, proxySecret, clientIp, fetchImpl })` from `functions/_shared/reading-proxy.mjs`.
- Produces: `createZhouyiServer({ root, proxySecret, fetchImpl }): http.Server` and `clientIpForNodeRequest(request): string` from `node-server.mjs`.
- Produces: `serve.mjs --production`, which serves `dist/`, honors `PORT`, and listens on `0.0.0.0`.

- [ ] **Step 1: Write the failing Node adapter test**

Create `test-node-server.mjs` with a temporary static root, an ephemeral loopback port, and an injected upstream:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createZhouyiServer, clientIpForNodeRequest } from './node-server.mjs';

const root=await mkdtemp(join(tmpdir(),'zhouyi-liara-'));
await writeFile(join(root,'index.html'),'<h1>INDEX</h1>');
await writeFile(join(root,'app.js'),'console.log("asset")');
let forwarded;
const fetchImpl=async(url,init)=>{
  forwarded={url,init,body:await new Response(init.body).text()};
  return new Response('【核心判断】\n测试通过。',{status:200,headers:{'content-type':'text/plain; charset=utf-8','retry-after':'7'}});
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

  const oversized=await fetch(`${origin}/api/reading`,{method:'POST',body:'x'.repeat(12*1024+1)});
  assert.equal(oversized.status,413);
}finally{
  await new Promise(resolve=>server.close(resolve));
  await rm(root,{recursive:true,force:true});
}

assert.equal(clientIpForNodeRequest({headers:{'x-real-ip':'198.51.100.8'},socket:{remoteAddress:'127.0.0.1'}}),'198.51.100.8');
assert.equal(clientIpForNodeRequest({headers:{},socket:{remoteAddress:'127.0.0.1'}}),'127.0.0.1');
console.log('Node production server tests passed.');
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node test-node-server.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `node-server.mjs`.

- [ ] **Step 3: Implement the minimal Node adapter**

Create `node-server.mjs` around the existing shared proxy. Use `Readable.toWeb()` for request bodies and `Readable.fromWeb()` for response streams:

```js
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { proxyReading } from './functions/_shared/reading-proxy.mjs';

const TYPES={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.woff2':'font/woff2',
};

export function clientIpForNodeRequest(request){
  const realIp=Array.isArray(request.headers['x-real-ip'])?request.headers['x-real-ip'][0]:request.headers['x-real-ip'];
  return String(realIp||request.socket?.remoteAddress||'unknown').trim();
}

async function sendWebResponse(response,webResponse){
  response.writeHead(webResponse.status,Object.fromEntries(webResponse.headers));
  if(!webResponse.body){response.end();return}
  Readable.fromWeb(webResponse.body).pipe(response);
}

export function createZhouyiServer({root,proxySecret,fetchImpl=globalThis.fetch}){
  const staticRoot=resolve(root);
  return createServer(async(request,response)=>{
    try{
      const protocol=request.headers['x-forwarded-proto']==='https'?'https':'http';
      const url=new URL(request.url||'/',`${protocol}://${request.headers.host||'localhost'}`);
      if(url.pathname==='/api/reading'){
        const body=['GET','HEAD'].includes(request.method||'GET')?undefined:Readable.toWeb(request);
        const webRequest=new Request(url,{method:request.method,headers:request.headers,body,duplex:body?'half':undefined});
        await sendWebResponse(response,await proxyReading({request:webRequest,proxySecret,clientIp:clientIpForNodeRequest(request),fetchImpl}));
        return;
      }
      let pathname;
      try{pathname=decodeURIComponent(url.pathname)}catch{response.writeHead(400).end('Bad Request');return}
      if(pathname==='/')pathname='/index.html';
      const target=resolve(staticRoot,`.${pathname}`);
      if(target!==staticRoot&&!target.startsWith(`${staticRoot}${sep}`)){response.writeHead(403).end('Forbidden');return}
      let file=target;
      try{if((await stat(file)).isDirectory())file=resolve(file,'index.html')}catch{file=resolve(staticRoot,'index.html')}
      const extension=extname(file).toLowerCase();
      const content=await readFile(file);
      response.writeHead(200,{
        'Content-Type':TYPES[extension]||'application/octet-stream',
        'Cache-Control':extension==='.html'?'no-store, max-age=0':'no-cache, must-revalidate',
        'X-Content-Type-Options':'nosniff',
      });
      response.end(content);
    }catch{
      response.writeHead(500,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end('Server error');
    }
  });
}
```

Reduce `serve.mjs` to environment/argument selection and server startup. `--production` selects `dist`, `PORT` takes precedence over `ZHOUYI_PORT`, and production defaults to `0.0.0.0`.

- [ ] **Step 4: Add production and test scripts**

Modify `package.json` scripts:

```json
{
  "prestart": "npm run build:pages",
  "start": "node serve.mjs --production",
  "dev": "node serve.mjs",
  "test:server": "node test-node-server.mjs"
}
```

Append `node test-node-server.mjs` to `test:unit` so server behavior stays in the full suite.

- [ ] **Step 5: Run focused and full tests**

Run: `npm run test:server`

Expected: `Node production server tests passed.`

Run: `npm test`

Expected: all existing tests and the new Node server test pass.

- [ ] **Step 6: Commit the server adapter**

```bash
git add node-server.mjs serve.mjs test-node-server.mjs package.json
git commit -m "feat: add Liara production server"
```

### Task 2: Liara endpoint and Worker authorization

**Files:**
- Modify: `index.html`
- Modify: `test-landing.mjs`
- Modify: `worker/src/index.mjs`
- Modify: `worker/test-worker.mjs`
- Modify: `worker/wrangler.jsonc`
- Modify: `worker/wrangler.jsonc.example`

**Interfaces:**
- Consumes: the existing `window.GUANXIANG_AI_ENDPOINT` host-suffix selection.
- Produces: same-origin `/api/reading` for `.liara.run`.
- Produces: Worker authentication through `LIARA_PROXY_SECRET` and the exact origin `https://guanxiang-zhouyi.liara.run`.

- [ ] **Step 1: Add failing host and secret assertions**

In `test-landing.mjs`, add:

```js
assert.equal(endpointFor('guanxiang-zhouyi.liara.run'),'/api/reading');
```

In `worker/test-worker.mjs`, add:

```js
assert.equal(trustedProxySecret('liara-secret',{PROXY_SECRET:'pages-secret',NETLIFY_PROXY_SECRET:'netlify-secret',LIARA_PROXY_SECRET:'liara-secret'}),true);
const liaraProxiedRequest=new Request('https://worker.example/reading',{
  method:'POST',
  headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.10','x-guanxiang-client-ip':'203.0.113.99','x-guanxiang-proxy-secret':'liara-secret'},
  body:JSON.stringify(validPayload()),
});
assert.equal(clientIpForRequest(liaraProxiedRequest,{LIARA_PROXY_SECRET:'liara-secret'}),'203.0.113.99');
assert.equal(clientIpForRequest(liaraProxiedRequest,{LIARA_PROXY_SECRET:'wrong-secret'}),'192.0.2.10');
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node test-landing.mjs`

Expected: FAIL because `.liara.run` currently selects an empty endpoint.

Run: `node worker/test-worker.mjs`

Expected: FAIL because `LIARA_PROXY_SECRET` is not accepted.

- [ ] **Step 3: Implement endpoint and third-secret support**

Change the inline suffix list in `index.html` to:

```js
['.pages.dev','.netlify.app','.liara.run']
```

Change `trustedProxySecret()` in `worker/src/index.mjs` to test all three environment bindings:

```js
return [env.PROXY_SECRET,env.NETLIFY_PROXY_SECRET,env.LIARA_PROXY_SECRET].some(secret=>secret&&value===secret);
```

Add `https://guanxiang-zhouyi.liara.run` to `ALLOWED_ORIGINS` in both Worker configurations. Do not add a literal secret.

- [ ] **Step 4: Run focused and full tests**

Run: `node test-landing.mjs && node worker/test-worker.mjs`

Expected: both focused suites pass.

Run: `npm test`

Expected: all suites pass.

- [ ] **Step 5: Commit endpoint and Worker authorization**

```bash
git add index.html test-landing.mjs worker/src/index.mjs worker/test-worker.mjs worker/wrangler.jsonc worker/wrangler.jsonc.example
git commit -m "feat: authorize Liara reading proxy"
```

### Task 3: Repeatable Liara configuration and runbook

**Files:**
- Create: `liara.json`
- Modify: `DEPLOYMENT.md`
- Modify: `worker/README.md`

**Interfaces:**
- Consumes: Liara CLI 9.5.x and Node platform runtime.
- Produces: a checked-in deployment descriptor for application `guanxiang-zhouyi`, port `4175`, and Iranian builds.
- Produces: secret-safe creation, deploy, verification, and rollback instructions.

- [ ] **Step 1: Add the Liara descriptor**

Create `liara.json`:

```json
{
  "platform": "node",
  "app": "guanxiang-zhouyi",
  "port": 4175,
  "build": {
    "location": "iran"
  },
  "node": {
    "version": "22"
  }
}
```

- [ ] **Step 2: Document exact account and application commands**

Add a Liara section to `DEPLOYMENT.md` containing:

```powershell
npx --yes @liara/cli@9 login --browser edge
npx --yes @liara/cli@9 create --app guanxiang-zhouyi --platform node --plan free --feature-plan free --read-only true
npx --yes @liara/cli@9 deploy --app guanxiang-zhouyi --platform node --port 4175 --build-location iran --no-app-logs
npx --yes @liara/cli@9 logs --app guanxiang-zhouyi
```

State explicitly that a `402`, `free_plan_platform`, or `free_plan_count` response requires account credit or a Liara plan selection by the account owner. Do not suggest bypassing provider account requirements.

- [ ] **Step 3: Document secret and rollback boundaries**

Document that `PROXY_SECRET` is set through an authenticated Liara API request body or dashboard field, not a literal CLI argument; the same in-memory value is piped to Wrangler as `LIARA_PROXY_SECRET`. Include rollback using the Liara release UI/CLI and state that the Worker origin and secret stay configured until the Liara deployment is intentionally retired.

Update `worker/README.md` to describe all three proxy bindings and the shared rate limiter.

- [ ] **Step 4: Validate configuration and documentation**

Run:

```powershell
Get-Content -Raw liara.json | ConvertFrom-Json | Out-Null
npx --yes @liara/cli@9 deploy --help
rg -n "LIARA_PROXY_SECRET|guanxiang-zhouyi\.liara\.run|@liara/cli@9" DEPLOYMENT.md worker/README.md liara.json
git diff --check
```

Expected: JSON parses, CLI help succeeds, all required terms are present, and `git diff --check` is silent.

- [ ] **Step 5: Commit deployment configuration**

```bash
git add liara.json DEPLOYMENT.md worker/README.md
git commit -m "docs: add Liara deployment runbook"
```

### Task 4: Local production verification

**Files:**
- Modify only if verification exposes a defect in Task 1-3 files.

**Interfaces:**
- Consumes: the production `npm start` entry point and full local test suite.
- Produces: a locally verified Liara-compatible build before any external provider change.

- [ ] **Step 1: Run repository validation**

Run: `npm run validate`

Expected: relations/content/i18n validation, syntax checks, and all unit tests pass.

- [ ] **Step 2: Build and start the production server**

Run: `npm start`

Expected: 28 production files are built and the server listens on port `4175` without a secret value in output.

- [ ] **Step 3: Smoke-test local production HTTP behavior**

Run in a second process:

```powershell
$home=Invoke-WebRequest -Uri 'http://127.0.0.1:4175/' -UseBasicParsing
$asset=Invoke-WebRequest -Uri 'http://127.0.0.1:4175/app.js' -UseBasicParsing
try { Invoke-WebRequest -Uri 'http://127.0.0.1:4175/api/reading' -UseBasicParsing } catch { $apiStatus=$_.Exception.Response.StatusCode.value__ }
[pscustomobject]@{Home=$home.StatusCode;Asset=$asset.StatusCode;Api=$apiStatus}
```

Expected: `Home=200`, `Asset=200`, `Api=405`.

- [ ] **Step 4: Stop the local production server and inspect changes**

Stop only the server process started in Step 2. Run `git status --short` and confirm that no build output, secret, auth file, or cache directory is staged.

### Task 5: Create and deploy the Liara production application

**Files:**
- External state: Liara account/application/environment and Cloudflare Worker secrets/deployment.
- Modify: `worker/wrangler.jsonc` only if Liara returns an origin different from the globally unassigned exact ID checked before implementation; such a difference requires stopping for a spec amendment.

**Interfaces:**
- Consumes: authenticated Liara CLI state in `%USERPROFILE%\.liara-auth.json` and existing Wrangler authentication.
- Produces: `https://guanxiang-zhouyi.liara.run` with server-side `PROXY_SECRET` and Worker-side `LIARA_PROXY_SECRET`.

- [ ] **Step 1: Authenticate and inspect the Liara account**

Run:

```powershell
npx --yes @liara/cli@9 login --browser edge
npx --yes @liara/cli@9 app list --output json
```

Expected: browser authentication is completed by the user and the CLI lists the account's applications. Do not automate passwords, OTPs, or Iranian account verification.

- [ ] **Step 2: Create the exact Liara app**

Run:

```powershell
npx --yes @liara/cli@9 create --app guanxiang-zhouyi --platform node --plan free --feature-plan free --read-only true
```

Expected: `App guanxiang-zhouyi created.` If the free plan is unavailable, pause for the account owner to choose and fund a displayed Liara plan; do not create a different hostname silently.

- [ ] **Step 3: Configure matching secrets without printing them**

Use one Node process to:

1. read the current Liara API token from `%USERPROFILE%\.liara-auth.json`;
2. generate `crypto.randomBytes(48).toString('base64url')`;
3. fetch existing application variables from `GET https://api.liara.ir/v1/projects/guanxiang-zhouyi`;
4. post the merged list with `{ project: 'guanxiang-zhouyi', variables }` to `POST https://api.liara.ir/v1/projects/update-envs`;
5. pass the same value only through standard input to `npx wrangler@latest secret put LIARA_PROXY_SECRET` in `worker/`;
6. clear references and print only provider status codes.

Expected: Liara returns success for the environment update and Wrangler confirms secret upload without displaying a value.

- [ ] **Step 4: Deploy the Worker allowlist**

Run from `worker/`:

```powershell
npx wrangler@latest deploy
```

Expected: a new Worker version deploys with `https://guanxiang-zhouyi.liara.run` in `ALLOWED_ORIGINS` and no change to existing bindings.

- [ ] **Step 5: Deploy the Liara application**

Run from the repository root:

```powershell
npx --yes @liara/cli@9 deploy --app guanxiang-zhouyi --platform node --port 4175 --build-location iran --no-app-logs
```

Then run:

```powershell
npx --yes @liara/cli@9 logs --app guanxiang-zhouyi
```

Expected: the build and release succeed, and logs show the server listening without stack traces or secrets.

### Task 6: End-to-end and Iranian-network acceptance

**Files:**
- Create: `docs/superpowers/deployments/2026-09-18-liara-verification.md`

**Interfaces:**
- Consumes: the exact Liara public origin and the existing production reading payload contract.
- Produces: recorded HTTP, browser, AI, and eight-node evidence; a verified public link; and a GitHub-synchronized implementation.

- [ ] **Step 1: Verify homepage, asset, and API route**

Run HTTP checks against:

```text
https://guanxiang-zhouyi.liara.run/
https://guanxiang-zhouyi.liara.run/app.js
https://guanxiang-zhouyi.liara.run/api/reading
```

Expected: homepage `200`, asset `200`, and API GET `405`.

- [ ] **Step 2: Send one real AI request**

Use the same valid payload structure as `worker/test-worker.mjs`, with `language: 'zh-CN'`, and POST it to the Liara `/api/reading` route. Require HTTP `200` and all five headings:

```text
【核心判断】
【当前处境】
【关键变化】
【后续趋势】
【行动建议】
```

Expected: a non-empty streamed response containing all headings and no provider error body.

- [ ] **Step 3: Run desktop and mobile browser checks**

Using the Playwright CLI, open the exact Liara URL at `1440x900` and `390x844`. Enter the app, open 大衍筮法, enter a valid question, and confirm the `占筮当慎` dialog shows both actions without overlap. Check console errors and key network requests.

Expected: both viewports render correctly; only an optional missing favicon may return `404`; no application asset, script, or API request fails.

- [ ] **Step 4: Run two eight-node Iranian checks**

For each round, request the homepage and `app.js` from:

```text
ir1.node.check-host.net
ir2.node.check-host.net
ir3.node.check-host.net
ir4.node.check-host.net
ir5.node.check-host.net
ir6.node.check-host.net
ir7.node.check-host.net
ir8.node.check-host.net
```

Wait for each Check-Host report to finish before starting the next round. Expected: all 16 homepage results and all 16 asset results return HTTP `200`. Record permanent report URLs, city, status, resolved address, and timing in the verification document.

- [ ] **Step 5: Verify existing deployments and write evidence**

Confirm the Cloudflare Pages and Netlify homepages still return `200`. Create `docs/superpowers/deployments/2026-09-18-liara-verification.md` containing:

- Liara deploy/release identifier;
- Worker version identifier;
- homepage, asset, API method, and real AI results;
- desktop/mobile checks;
- both rounds of eight-node report URLs and summarized timings;
- explicit wording that results demonstrate current reachability, not a permanent routing guarantee;
- rollback locations for Liara, Netlify, and Cloudflare.

- [ ] **Step 6: Run the final repository gate**

Run:

```powershell
npm run validate
npm run build:pages
git diff --check
git status --short
```

Expected: all checks pass; only intended source, documentation, and verification files are tracked; `.netlify-npx-cache/`, `.liara-auth.json`, `dist/`, and Playwright artifacts are not staged.

- [ ] **Step 7: Commit evidence and push GitHub**

```bash
git add docs/superpowers/deployments/2026-09-18-liara-verification.md
git commit -m "docs: record Liara production verification"
git push origin main
```

Expected: local `main` and `origin/main` resolve to the same commit. Hand off `https://guanxiang-zhouyi.liara.run` only after this step and both Iranian probe rounds pass.
