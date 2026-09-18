# Iran-accessible Liara deployment design

## Goal

Provide a public production URL that is reliably reachable on ordinary Iranian internet connections while preserving the existing Cloudflare and Netlify deployments. The Liara deployment must retain the current desktop and mobile interface, local casting and interpretation, history, bilingual content, offline-capable assets, and AI deep readings.

The rollout is successful only when the exact production `*.liara.run` URL passes two consecutive checks from all eight available Iranian Check-Host nodes in Tehran, Isfahan, Shiraz, and Qom; serves key first-party assets; and completes a real AI reading through same-origin `/api/reading`.

## Evidence and confirmed constraints

- The production Netlify origin failed from five tested Iranian nodes with connection timeouts or resets.
- The existing `pages.dev` origin failed from all six tested Iranian nodes.
- A live Liara application origin returned HTTP `200` from all eight tested Iranian nodes in 0.25 to 0.92 seconds.
- GitHub and raw GitHub content were reachable from all six tested Iranian nodes, but GitHub Pages cannot run the server-side AI proxy.
- A live `onrender.com` application succeeded from only one of eight Iranian nodes, so Render is not a rollout candidate.
- The user requires operation during normal Iranian internet access, not during a nationwide international-network shutdown.
- The browser must never receive an AI provider credential or proxy secret.
- No existing visual design, reading logic, history behavior, or daily hexagram behavior should change.
- The Cloudflare and Netlify deployments remain independent rollback targets.

Probe results establish current reachability, not a permanent guarantee against later routing or policy changes. The deployment documentation must state this limitation plainly.

## Considered approaches

### Liara full-stack Node application (selected)

One Liara Node application serves the production static build and handles `/api/reading`. It gives users one origin, keeps secrets server-side, avoids CORS, and uses the only tested application hostname that passed all eight Iranian probes.

### GitHub Pages with a separate Liara API

This separates static hosting from the API, but the tested GitHub Pages origin passed only five of six probes. It also introduces cross-origin policy, two independent failure surfaces, and origin-scoped browser history differences without improving the selected Liara application's reachability.

### ArvanCloud virtual server or container

Iranian infrastructure should be reachable domestically, but a managed server adds operating-system maintenance, patching, TLS, process supervision, and higher cost. The current application does not need that operational surface while Liara can run the existing Node stack directly.

## Architecture

```text
Iranian browser
  -> Liara Node application on one *.liara.run origin
     -> static files from dist/
     -> POST /api/reading
        -> shared reading proxy
        -> Cloudflare AI Worker (authenticated server-to-server request)
        -> Workers AI and the existing Durable Object rate limiter

Other browsers
  -> Liara, Cloudflare Pages, or Netlify
```

The repository will keep one static build pipeline. Liara runs a small Node HTTP adapter around the existing `functions/_shared/reading-proxy.mjs` contract. The adapter serves `dist/`, converts the incoming Node request into a Web `Request`, forwards `/api/reading` through the shared proxy, and streams the Web `Response` back to the client without buffering the AI response.

The frontend will recognize `*.liara.run` as a production host and select same-origin `/api/reading`. Localhost behavior remains unchanged so local development does not consume production AI quota accidentally.

## Components and repository changes

### Production Node server

Refactor `serve.mjs` so its static-file and API behavior can be tested without starting a process. The server will:

- honor Liara's `PORT` variable, while retaining `ZHOUYI_PORT` and port `4175` as local fallbacks;
- listen on `0.0.0.0` in production and `127.0.0.1` locally unless explicitly overridden;
- serve only the built `dist/` tree in production and preserve SPA fallback to `index.html`;
- route exact `/api/reading` requests to the shared proxy before static fallback;
- require a server-side `PROXY_SECRET` for AI forwarding;
- use Liara's documented, proxy-controlled client address header, falling back to the socket address rather than trusting an arbitrary client-supplied forwarding chain;
- preserve response status, content type, `Retry-After`, no-store behavior, and streaming;
- return stable error envelopes without exposing secrets, upstream bodies, file paths, or stack traces;
- keep path traversal outside the selected static root impossible.

The package scripts will build `dist/` before the Liara production process starts. Local development commands remain available and do not require production secrets.

### Frontend endpoint selection

Extend the existing inline endpoint selection to include `.liara.run`. No UI copy or layout changes are required. The existing privacy statement remains accurate because AI inference continues to run through Cloudflare Workers AI.

### AI Worker authorization

Liara receives its own random proxy secret. The same value is stored as `LIARA_PROXY_SECRET` on the Worker. The Worker will accept the existing Cloudflare Pages and Netlify secrets plus the Liara secret, and the exact production Liara origin will be added to `ALLOWED_ORIGINS`.

The Liara secret must not reuse either existing proxy secret. All deployments continue to share the existing Durable Object rate limiter, so adding a mirror does not multiply hourly or daily AI limits.

### Liara configuration and deployment documentation

Add only the minimal Liara configuration needed for a Node PaaS deployment. The repeatable deployment flow will cover:

- Liara CLI authentication and application creation;
- production build and start commands;
- setting `PROXY_SECRET` through Liara's environment configuration;
- adding the matching Worker secret and exact allowed origin;
- deploying without printing or committing secret values;
- checking logs and health;
- rolling back to a previous Liara release;
- retaining the Cloudflare and Netlify deployments until Liara verification completes.

Liara may require account verification, account credit, or a paid application plan. Those account actions are external prerequisites and must not be worked around in code.

## Data flow

1. The browser loads the existing production assets from the Liara origin.
2. Casting, classic texts, local interpretation, history, language selection, and the daily hexagram remain browser-local.
3. For an AI deep reading, the browser posts the existing validated payload to same-origin `/api/reading`.
4. The Node adapter enforces method and body-size limits through the shared proxy and attaches the authenticated visitor-address headers.
5. The Cloudflare AI Worker validates the exact Liara origin and proxy secret, consumes the existing shared rate limit, invokes Workers AI, and returns a text stream.
6. The Node adapter streams the response to the browser. Existing rendering and local history storage continue unchanged.

## Security and privacy

- The Liara proxy secret is distinct from the Cloudflare Pages and Netlify secrets.
- Secrets exist only in Liara and Cloudflare environment configuration.
- No secret value is written to source files, Git, build artifacts, deployment logs, or command arguments.
- Forwarded visitor addresses affect rate-limit identity only after proxy authentication.
- Request-size, allowed-origin, schema-validation, and rate-limit controls remain in force.
- `/api/reading` responses remain `no-store` and use `X-Content-Type-Options: nosniff`.
- Static paths are resolved beneath the selected production root before any file read.
- Personal reading history remains in browser storage and is not migrated to Liara.

## Failure handling

- Missing Liara configuration returns `503 SERVICE_ERROR` without deployment details.
- An unreachable or rejected Worker returns the existing stable `503`; local interpretation remains usable.
- Oversized or malformed requests are rejected before AI invocation.
- Worker `429` responses and `Retry-After` are preserved.
- A missing static file uses the existing application-shell fallback, while malformed paths are rejected.
- A failed Liara rollout does not change either existing public site. Rollback restores the prior Liara release. The Liara origin and Worker secret are removed only after the Liara deployment is intentionally retired.

## Deployment sequence

1. Add failing tests for the production Node adapter, `.liara.run` endpoint selection, and the third Worker proxy secret.
2. Implement the Node adapter, production scripts, host detection, Worker authorization, and documentation.
3. Run the full unit, validation, build, and local HTTP test suites.
4. Authenticate to Liara and create the application to obtain its exact `*.liara.run` origin.
5. Generate a random Liara proxy secret in memory and configure it in Liara and the Worker.
6. Add the exact Liara origin to the Worker allowlist and deploy the Worker.
7. Deploy the Liara application and complete production verification.
8. Push the verified implementation to GitHub while keeping Cloudflare and Netlify live.

## Verification

Automated checks will cover:

- Node adapter static serving, SPA fallback, path traversal rejection, content types, and cache headers;
- `/api/reading` method, missing-secret, body-size, upstream failure, streaming response, status, and header behavior;
- trusted and fallback client-address handling;
- Worker acceptance of each of the three proxy secrets and rejection of invalid values;
- production endpoint selection for `.pages.dev`, `.netlify.app`, and `.liara.run`, with localhost isolated;
- the existing complete unit, content, internationalization, landing-page, and browser suites;
- a production build containing all required static assets.

Production checks will cover:

- HTTP `200` for the Liara homepage and key assets;
- `GET /api/reading` returning the expected `405`, proving the API route is not a static fallback;
- a real `POST /api/reading` returning all required AI reading sections;
- desktop and 390-pixel mobile rendering, including the divination confirmation dialog;
- Chinese and English navigation and one complete quick-casting flow;
- the original Cloudflare and Netlify origins continuing to serve their current versions;
- two consecutive Check-Host rounds in which all eight Iranian nodes return HTTP `200` for the homepage and key static asset, with reports retained in the deployment notes.

If any Iranian node repeatedly fails while the others pass, the rollout remains incomplete. It is not presented as the Iranian access link until the cause is resolved or a different host is selected.

## Out of scope

- Operation during a nationwide international-network shutdown;
- replacing Workers AI or the Durable Object rate limiter;
- purchasing or binding a custom domain;
- changing the visual design, divination flow, or reading content;
- automatic client-side failover between production origins;
- migrating browser-local history between origins.

Browser storage is origin-scoped, so the Liara URL starts with an empty local history. The existing export/import flow remains the supported way to move records between origins.
