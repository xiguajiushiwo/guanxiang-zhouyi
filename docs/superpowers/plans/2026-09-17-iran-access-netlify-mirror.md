# Iran-accessible Netlify Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a complete Netlify mirror that is usable from Iran, including same-origin streamed AI readings, while keeping the existing Cloudflare Pages site operational.

**Architecture:** Netlify publishes the existing `dist/` static build and rewrites `/api/reading` to a Netlify Function. Both the Netlify Function and Cloudflare Pages Function call a shared proxy core, while the existing Cloudflare AI Worker accepts separate authenticated proxy secrets and keeps one shared Durable Object rate limit.

**Tech Stack:** Static HTML/CSS/ES modules, Node.js built-in test assertions, Netlify Functions and CLI, Cloudflare Pages/Workers and Wrangler, Globalping HTTP measurements.

**Spec:** `docs/superpowers/specs/2026-09-17-iran-access-netlify-mirror-design.md`

## Global Constraints

- Preserve the current desktop and mobile visuals, local readings, history, bilingual content, offline assets, and daily hexagram behavior.
- Keep `https://guanxiang-zhouyi-evf.pages.dev` live throughout the rollout.
- Never place either proxy secret in Git, frontend assets, saved command output, or documentation.
- Keep localhost disconnected from production AI by default.
- Use the existing Worker and Durable Object so both public sites share rate limits.
- Use the exact Netlify production origin in `ALLOWED_ORIGINS`; do not authorize wildcard origins.
- A Tehran probe must resolve the final URL to a public address, negotiate valid TLS, and receive HTTP success.

## File Map

- Create `functions/_shared/reading-proxy.mjs`: platform-neutral request validation and streaming upstream proxy.
- Modify `functions/api/reading.js`: thin Cloudflare Pages adapter around the shared proxy.
- Create `netlify/functions/reading.mjs`: thin Netlify adapter that supplies secret and trusted client IP.
- Create `netlify.toml`: static build, function directory, and `/api/reading` rewrite.
- Create `test-reading-proxy.mjs`: shared proxy contract tests.
- Modify `test-pages-proxy.mjs`: Cloudflare adapter contract tests.
- Create `test-netlify-proxy.mjs`: Netlify adapter contract tests.
- Modify `index.html`: enable same-origin AI on `*.netlify.app`.
- Modify `test-landing.mjs`: assert production-host endpoint selection.
- Modify `service-worker.js`: advance the shell version so existing installations receive the host-detection change.
- Modify `worker/src/index.mjs`: accept either the Pages or Netlify proxy secret for trusted client-IP forwarding.
- Modify `worker/test-worker.mjs`: cover both valid proxy secrets and invalid-secret fallback.
- Modify `worker/wrangler.jsonc.example`: document the Netlify origin in the origin allowlist.
- Modify `package.json`: add Netlify tests and build/deploy scripts.
- Modify `DEPLOYMENT.md` and `worker/README.md`: document dual-host deployment, secrets, verification, and rollback.
- Modify ignored `worker/wrangler.jsonc` only during deployment: add the exact live Netlify origin without committing account configuration.

---

### Task 1: Shared Reading Proxy Core

**Files:**
- Create: `functions/_shared/reading-proxy.mjs`
- Create: `test-reading-proxy.mjs`
- Modify: `functions/api/reading.js`
- Modify: `test-pages-proxy.mjs`

**Interfaces:**
- Produces: `proxyReading({request, proxySecret, clientIp, fetchImpl?}): Promise<Response>`
- Produces: `MAX_BODY_BYTES: number` and `UPSTREAM_URL: string`
- Consumes: Web-standard `Request`, `Response`, `Headers`, `ReadableStream`, and `fetch`

- [ ] **Step 1: Write failing shared-core and Pages-adapter tests**

Create contract assertions that cover method rejection, preflight, missing secret, declared and actual 12 KiB limits, exact origin forwarding, authenticated visitor-IP forwarding, response streaming, `Retry-After`, and sanitized upstream failure. The core test calls `proxyReading` with an injected `fetchImpl`; the Pages test calls `onRequest({request, env})` and verifies the adapter supplies `cf-connecting-ip`.

```js
const response=await proxyReading({
  request:new Request('https://mirror.example/api/reading',{method:'POST',body:payload}),
  proxySecret:'netlify-secret',
  clientIp:'203.0.113.8',
  fetchImpl:async(url,init)=>{
    captured={url,init};
    return new Response(stream,{status:200,headers:{'content-type':'text/plain','retry-after':'9'}});
  }
});
assert.equal(captured.init.headers.origin,'https://mirror.example');
assert.equal(captured.init.headers['x-guanxiang-client-ip'],'203.0.113.8');
assert.equal(response.headers.get('retry-after'),'9');
```

- [ ] **Step 2: Run the tests and verify the shared module is missing**

Run: `node test-reading-proxy.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `functions/_shared/reading-proxy.mjs`.

- [ ] **Step 3: Implement the shared proxy and Pages adapter**

Implement the core with this public shape and keep provider details out of returned errors:

```js
export const UPSTREAM_URL='https://guanxiang-ai-reading.1510351214.workers.dev';
export const MAX_BODY_BYTES=12*1024;

const jsonError=(code,status)=>new Response(
  JSON.stringify({error:{code,message:'AI reading service is temporarily unavailable.'}}),
  {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}}
);

export async function proxyReading({request,proxySecret,clientIp='unknown',fetchImpl=globalThis.fetch}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store'}});
  if(request.method!=='POST')return jsonError('INVALID_REQUEST',405);
  if(!proxySecret)return jsonError('SERVICE_ERROR',503);
  const declaredLength=Number.parseInt(request.headers.get('content-length')||'0',10);
  if(Number.isFinite(declaredLength)&&declaredLength>MAX_BODY_BYTES)return jsonError('INVALID_REQUEST',413);
  let body;
  try{body=await request.arrayBuffer()}catch{return jsonError('INVALID_REQUEST',400)}
  if(body.byteLength>MAX_BODY_BYTES)return jsonError('INVALID_REQUEST',413);
  let upstream;
  try{
    upstream=await fetchImpl(UPSTREAM_URL,{method:'POST',headers:{'content-type':'application/json','origin':new URL(request.url).origin,'x-guanxiang-client-ip':clientIp,'x-guanxiang-proxy-secret':proxySecret},body});
  }catch{return jsonError('SERVICE_ERROR',503)}
  const headers=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff'});
  headers.set('content-type',upstream.headers.get('content-type')||'text/plain; charset=utf-8');
  if(upstream.headers.has('retry-after'))headers.set('retry-after',upstream.headers.get('retry-after'));
  return new Response(upstream.body,{status:upstream.status,headers});
}
```

Make `functions/api/reading.js` a thin wrapper:

```js
import { MAX_BODY_BYTES, UPSTREAM_URL, proxyReading } from '../_shared/reading-proxy.mjs';

export function onRequest({request,env}){
  return proxyReading({
    request,
    proxySecret:env?.PROXY_SECRET,
    clientIp:request.headers.get('cf-connecting-ip')||'unknown'
  });
}

export { MAX_BODY_BYTES, UPSTREAM_URL };
```

- [ ] **Step 4: Run focused proxy tests**

Run: `node test-reading-proxy.mjs && node test-pages-proxy.mjs`

Expected: both scripts print their passed messages and exit `0`.

- [ ] **Step 5: Commit the shared proxy boundary**

```powershell
git -c safe.directory=C:/workspace/zhouyi add functions/_shared/reading-proxy.mjs functions/api/reading.js test-reading-proxy.mjs test-pages-proxy.mjs
git -c safe.directory=C:/workspace/zhouyi commit -m "refactor: share reading proxy contract"
```

### Task 2: Netlify Function and Hosting Configuration

**Files:**
- Create: `netlify/functions/reading.mjs`
- Create: `netlify.toml`
- Create: `test-netlify-proxy.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `proxyReading` from `functions/_shared/reading-proxy.mjs`
- Produces: `handleNetlifyReading(request, context, env?): Promise<Response>` for tests and Netlify runtime
- Produces: same-origin route `POST /api/reading`

- [ ] **Step 1: Write the failing Netlify adapter test**

Test the exported handler with a stubbed environment and fetch. Verify `context.ip` wins, `x-nf-client-connection-ip` is the fallback, the secret is forwarded only to the Worker, and missing configuration returns `503`.

```js
const response=await handleNetlifyReading(
  new Request('https://guanxiang-zhouyi-global.netlify.app/api/reading',{method:'POST',body:'{}'}),
  {ip:'198.51.100.24'},
  {PROXY_SECRET:'netlify-secret',fetchImpl}
);
assert.equal(captured.init.headers['x-guanxiang-client-ip'],'198.51.100.24');
assert.equal(response.status,200);
```

- [ ] **Step 2: Run the adapter test and verify it fails**

Run: `node test-netlify-proxy.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `netlify/functions/reading.mjs`.

- [ ] **Step 3: Implement the Netlify adapter**

```js
import { proxyReading } from '../../functions/_shared/reading-proxy.mjs';

export function handleNetlifyReading(request,context={},env={}){
  const proxySecret=env.PROXY_SECRET??process.env.PROXY_SECRET;
  const clientIp=context.ip||request.headers.get('x-nf-client-connection-ip')||'unknown';
  return proxyReading({request,proxySecret,clientIp,fetchImpl:env.fetchImpl||globalThis.fetch});
}

export default (request,context)=>handleNetlifyReading(request,context);
```

Add `netlify.toml`:

```toml
[build]
  command = "npm run build:pages"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/reading"
  to = "/.netlify/functions/reading"
  status = 200
  force = true

[[headers]]
  for = "/api/reading"
  [headers.values]
    Cache-Control = "no-store"
    X-Content-Type-Options = "nosniff"
```

Add `test-reading-proxy.mjs` and `test-netlify-proxy.mjs` to `test:unit`, plus `deploy:netlify` as `npm run build:pages && netlify deploy --prod --dir dist`.

- [ ] **Step 4: Run adapter and configuration checks**

Run: `node test-netlify-proxy.mjs && npx netlify build --offline`

Expected: adapter passes; Netlify builds 28 static files and bundles the `reading` function without import errors.

- [ ] **Step 5: Commit the Netlify deployment surface**

```powershell
git -c safe.directory=C:/workspace/zhouyi add netlify/functions/reading.mjs netlify.toml test-netlify-proxy.mjs package.json
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: add Netlify site and reading proxy"
```

### Task 3: Production Host Detection and Cache Update

**Files:**
- Modify: `index.html`
- Modify: `test-landing.mjs`
- Modify: `service-worker.js`

**Interfaces:**
- Produces: `window.GUANXIANG_AI_ENDPOINT === '/api/reading'` on `*.pages.dev` and `*.netlify.app`
- Preserves: empty default endpoint on localhost and unrelated origins

- [ ] **Step 1: Add failing host-selection assertions**

Extract the inline endpoint expression from `index.html`, evaluate it with Pages, Netlify, and localhost hostnames, and assert:

```js
assert.equal(endpointFor('guanxiang-zhouyi-evf.pages.dev'),'/api/reading');
assert.equal(endpointFor('guanxiang-zhouyi-global.netlify.app'),'/api/reading');
assert.equal(endpointFor('127.0.0.1'),'');
```

- [ ] **Step 2: Run the landing test and verify the Netlify case fails**

Run: `node test-landing.mjs`

Expected: FAIL because `*.netlify.app` currently resolves to an empty endpoint.

- [ ] **Step 3: Add Netlify host selection and advance the service-worker cache**

Use the exact host predicate:

```html
<script>window.GUANXIANG_AI_ENDPOINT=window.GUANXIANG_AI_ENDPOINT||(['.pages.dev','.netlify.app'].some(suffix=>location.hostname.endsWith(suffix))?'/api/reading':'');</script>
```

Change `CACHE_NAME` from `guanxiang-shell-v36` to `guanxiang-shell-v37` so existing installed copies retrieve the updated HTML and assets.

- [ ] **Step 4: Run landing and service-worker tests**

Run: `node test-landing.mjs && node test-service-worker-update.mjs`

Expected: both pass, including the Netlify hostname and cache-version assertions.

- [ ] **Step 5: Commit host support**

```powershell
git -c safe.directory=C:/workspace/zhouyi add index.html test-landing.mjs service-worker.js
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: enable AI readings on Netlify"
```

### Task 4: Worker Dual-Proxy Authentication

**Files:**
- Modify: `worker/src/index.mjs`
- Modify: `worker/test-worker.mjs`
- Modify: `worker/wrangler.jsonc.example`
- Modify: `worker/README.md`

**Interfaces:**
- Produces: `trustedProxySecret(value, env): boolean`
- Consumes: `env.PROXY_SECRET` for Pages and `env.NETLIFY_PROXY_SECRET` for Netlify
- Preserves: direct Cloudflare client IP when neither secret matches

- [ ] **Step 1: Add failing dual-secret tests**

Add one proxied request authenticated with `PROXY_SECRET`, one with `NETLIFY_PROXY_SECRET`, and one invalid request. Assert the two valid requests use `x-guanxiang-client-ip` and the invalid request uses `cf-connecting-ip`.

```js
assert.equal(clientIpForRequest(netlifyRequest,{NETLIFY_PROXY_SECRET:'netlify-secret'}),'203.0.113.77');
assert.equal(clientIpForRequest(netlifyRequest,{NETLIFY_PROXY_SECRET:'wrong-secret'}),'192.0.2.10');
```

- [ ] **Step 2: Run Worker tests and verify the Netlify-secret case fails**

Run: `node worker/test-worker.mjs`

Expected: FAIL because only `PROXY_SECRET` is accepted.

- [ ] **Step 3: Implement dual-secret matching**

```js
export function trustedProxySecret(value,env){
  if(!value)return false;
  return [env.PROXY_SECRET,env.NETLIFY_PROXY_SECRET].some(secret=>secret&&value===secret);
}

export function clientIpForRequest(request,env){
  const direct=request.headers.get('cf-connecting-ip')||'unknown';
  const supplied=request.headers.get('x-guanxiang-proxy-secret')||'';
  const forwarded=request.headers.get('x-guanxiang-client-ip')||'';
  return trustedProxySecret(supplied,env)&&forwarded?forwarded:direct;
}
```

Add `https://guanxiang-zhouyi-global.netlify.app` to the example `ALLOWED_ORIGINS`, and document `NETLIFY_PROXY_SECRET` as a secret binding distinct from `PROXY_SECRET`.

- [ ] **Step 4: Run Worker tests**

Run: `node worker/test-worker.mjs`

Expected: all guard, rate-limit, prompt, stream, and dual-secret assertions pass.

- [ ] **Step 5: Commit Worker support**

```powershell
git -c safe.directory=C:/workspace/zhouyi add worker/src/index.mjs worker/test-worker.mjs worker/wrangler.jsonc.example worker/README.md
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: authorize Netlify reading proxy"
```

### Task 5: Documentation and Full Local Regression

**Files:**
- Modify: `DEPLOYMENT.md`
- Modify: `package.json` if the full test command needs correction

**Interfaces:**
- Produces: repeatable operator instructions for both production hosts
- Consumes: all prior tests, `npm run build:pages`, and the existing browser smoke suite

- [ ] **Step 1: Document the exact dual-host lifecycle**

Add sections for initial Netlify login/link, setting the production-only secret, deploying the Worker allowlist, deploying the static site/function, checking both origins, restoring an earlier Netlify deploy, and removing `NETLIFY_PROXY_SECRET` only after the mirror is disabled.

Use commands that do not contain literal secrets:

```powershell
$proxyBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($proxyBytes)
$netlifyProxySecret = [Convert]::ToBase64String($proxyBytes)
npx netlify env:set PROXY_SECRET $netlifyProxySecret --context production --scope functions --secret
Push-Location worker
$netlifyProxySecret | npx wrangler@latest secret put NETLIFY_PROXY_SECRET
Pop-Location
Remove-Variable netlifyProxySecret,proxyBytes
```

- [ ] **Step 2: Run static validation and all unit tests**

Run: `npm run validate`

Expected: content, i18n, syntax, static behavior, shared proxy, both host adapters, and Worker tests all pass.

- [ ] **Step 3: Build both provider outputs locally**

Run: `npm run build:pages && npx netlify build --offline`

Expected: `dist/` contains the 28 production static files and Netlify bundles the reading function.

- [ ] **Step 4: Run browser regression at desktop and mobile widths**

Run: `npm run test:browser`

Expected: the existing browser suite passes. Additionally inspect `1440x900` and `390x844` screenshots for the cover, app shell, language menu, casting flow, and history detail without overlap or layout regression.

- [ ] **Step 5: Commit documentation**

```powershell
git -c safe.directory=C:/workspace/zhouyi add DEPLOYMENT.md package.json
git -c safe.directory=C:/workspace/zhouyi commit -m "docs: add dual-host deployment runbook"
```

### Task 6: Deploy, Verify from Iran, and Publish

**Files:**
- Modify: ignored `worker/wrangler.jsonc`
- Modify: `DEPLOYMENT.md` only if the provider assigns a production origin other than `https://guanxiang-zhouyi-global.netlify.app`

**Interfaces:**
- Produces: a stable Netlify public URL and a Globalping Tehran measurement ID
- Preserves: the existing Cloudflare Pages URL and Worker endpoint

- [ ] **Step 1: Authenticate and create/link the Netlify site**

Run `npx netlify login` and complete the browser authorization. In Netlify, choose **Add new project -> Import an existing project -> GitHub**, select `xiguajiushiwo/guanxiang-zhouyi`, keep the build settings from `netlify.toml`, and request the site name `guanxiang-zhouyi-global`. Then link the local repository:

```powershell
npx netlify link --name guanxiang-zhouyi-global
npx netlify status
```

Expected: the GitHub repository and local checkout are linked to `https://guanxiang-zhouyi-global.netlify.app`, and pushes to `main` are configured as production deploys. If Netlify reports the name is already owned, use `guanxiang-zhouyi-global-2026`, then update the exact origin in tracked documentation, tests, and example configuration before continuing.

- [ ] **Step 2: Configure independent production secrets**

Generate one random value in memory, set it as Netlify `PROXY_SECRET` with production/functions scope and `--secret`, then pipe the same in-memory value to Wrangler as `NETLIFY_PROXY_SECRET`. Remove both PowerShell variables immediately after both providers confirm success.

- [ ] **Step 3: Authorize the exact origin and deploy the Worker**

Edit only ignored `worker/wrangler.jsonc` so `ALLOWED_ORIGINS` contains the existing Pages URL, the exact Netlify URL, and the existing localhost entries. Then run:

```powershell
Push-Location worker
npx wrangler@latest deploy
Pop-Location
```

Expected: `guanxiang-ai-reading` deploys successfully and the Pages production reading still returns a streamed `200` for a valid request.

- [ ] **Step 4: Deploy the Netlify production build**

Run: `npx netlify deploy --prod --build`

Expected: the production URL is the linked `*.netlify.app` origin, the homepage returns `200`, and `POST /api/reading` reaches the Netlify function rather than returning a static `404`.

- [ ] **Step 5: Execute production smoke tests**

Check the Netlify URL at `1440x900` and `390x844`, switch Chinese/English, enter the app, complete a quick cast, request one AI deep reading, open the resulting history record, and confirm the existing Cloudflare URL still loads. Verify that a request larger than 12 KiB returns `413` and a `GET /api/reading` returns `405`.

- [ ] **Step 6: Measure the exact production URL from Tehran**

Create a Globalping HTTP measurement with target equal to the final Netlify hostname and location `Iran`. Record and inspect the result.

Expected: Tehran probe, public `resolvedAddress`, authorized TLS, `statusCode: 200`, and `status: finished`. A private address, TLS failure, TCP timeout, or non-2xx homepage response fails acceptance.

- [ ] **Step 7: Commit any assigned-origin correction and push GitHub**

If the desired site name was available, no tracked correction is needed. Otherwise commit the exact assigned-origin changes:

```powershell
git -c safe.directory=C:/workspace/zhouyi add index.html test-landing.mjs worker/wrangler.jsonc.example DEPLOYMENT.md
git -c safe.directory=C:/workspace/zhouyi commit -m "docs: record Netlify production origin"
```

Then publish every implementation commit:

```powershell
git -c safe.directory=C:/workspace/zhouyi push origin main
git -c safe.directory=C:/workspace/zhouyi status --short
```

Expected: push succeeds, `main` contains the mirror implementation, and the final status is clean.
