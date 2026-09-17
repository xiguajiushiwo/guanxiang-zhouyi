# Iran-accessible Netlify mirror design

## Goal

Provide a second public production URL that can be opened and used from Iran while preserving the current Cloudflare Pages deployment. The mirror must retain the existing desktop and mobile experience, local readings, history, bilingual content, offline-capable static assets, and AI deep readings.

Success means the production Netlify URL passes a real HTTP check from a Tehran probe, loads all first-party assets, and can complete an AI reading through the same-origin `/api/reading` endpoint. The existing Cloudflare URL must continue to work throughout the rollout.

## Confirmed constraints

- The current `pages.dev` hostname resolves to a private address from the tested Tehran network and is therefore unusable there.
- Netlify is reachable from the same Tehran probe. Vercel timed out and is not part of this design.
- GitHub Pages is reachable but cannot run the same-origin server function required for AI readings.
- The browser must never receive an AI provider credential or proxy secret.
- No existing visual design, reading logic, history behavior, or daily hexagram behavior should change.
- The Cloudflare Pages site remains an active production deployment and rollback target.

## Architecture

The repository will gain a Netlify deployment alongside the existing Cloudflare deployment:

```text
Iranian browser
  -> Netlify static site
  -> POST /api/reading on the same Netlify origin
  -> Netlify Function
  -> Cloudflare AI Worker (authenticated server-to-server request)
  -> Workers AI and the existing Durable Object rate limiter

Other browsers
  -> either the existing Cloudflare Pages URL or the Netlify mirror
```

The static site continues to be built by `build-pages.mjs`; Netlify publishes the same `dist/` output used by Cloudflare Pages. A Netlify redirect maps `/api/reading` to a serverless function. That function applies the same method and request-size checks as the Pages Function, attaches an authenticated visitor-IP forwarding header, and streams the Worker response back without buffering it.

The frontend will recognize both `*.pages.dev` and `*.netlify.app` as production hosts and use same-origin `/api/reading`. Localhost behavior stays unchanged so local development does not accidentally consume production AI quota.

## Components and repository changes

### Netlify configuration

Add `netlify.toml` with:

- build command `npm run build:pages`;
- publish directory `dist`;
- functions directory `netlify/functions`;
- a forced `200` rewrite from `/api/reading` to the reading function;
- a no-cache response header for `/api/reading` while static asset caching continues to follow the application's existing service-worker behavior.

The Netlify site will be linked to the existing GitHub repository so pushes to `main` can update the mirror after the initial deployment.

### Netlify reading function

Add a standard Request/Response-based function under `netlify/functions/`. It will:

- accept `POST` and `OPTIONS` only;
- reject declared or actual bodies larger than 12 KiB;
- require a server-side `PROXY_SECRET` environment variable;
- obtain the visitor address from Netlify's function `context.ip`, falling back to `x-nf-client-connection-ip` only when the context value is absent;
- forward the request to the existing AI Worker with the Netlify page origin, visitor address, and proxy secret;
- preserve response status, content type, `Retry-After`, and streaming response body;
- return the same stable error envelope already used by the Pages proxy.

Proxy behavior will live in `functions/_shared/reading-proxy.mjs`, with thin Cloudflare Pages and Netlify adapters. Both adapters will be covered by contract tests, and the Cloudflare deployment will be built and smoke-tested before the Worker allowlist is changed.

### AI Worker authorization

The Worker will keep its current Cloudflare Pages proxy secret and accept a second, independently generated Netlify proxy secret. This avoids rotating the live Pages secret and prevents rollout downtime.

The production Netlify origin will be added to `ALLOWED_ORIGINS`. Visitor IP forwarding remains trusted only when one of the configured proxy secrets matches. Requests without an allowed origin or valid proxy secret continue to be rejected or treated as direct requests according to the existing security rules.

Both sites use the existing Durable Object, so hourly and daily AI limits remain global rather than being doubled by the mirror.

### Documentation and scripts

Update `package.json` and `DEPLOYMENT.md` with repeatable Netlify build, deploy, environment-variable, verification, and rollback instructions. Secrets are entered through provider CLIs or dashboards and are never written into Git, command output files, or frontend assets.

## Data flow

1. The browser loads the same static assets from the Netlify production origin.
2. Local casting, classic texts, local interpretation, history, language selection, and the daily hexagram continue entirely in the browser.
3. For a deep reading, the browser posts the validated payload to same-origin `/api/reading`.
4. Netlify rewrites the request internally to its function.
5. The function validates the envelope size, adds the authenticated proxy headers, and forwards the body to the AI Worker.
6. The Worker validates the Netlify origin and proxy secret, applies the existing shared rate limits, invokes Workers AI, and streams plain text back.
7. The function passes the stream to the browser; the existing frontend renders and stores it without provider-specific changes.

## Security and privacy

- The Netlify proxy secret is distinct from the existing Cloudflare Pages proxy secret.
- Secrets exist only in Netlify and Cloudflare environment configuration.
- Client IP forwarding is authenticated before it affects rate-limit identity.
- Request-size, allowed-origin, schema-validation, and rate-limit controls remain in force.
- Responses remain `no-store` and receive `X-Content-Type-Options: nosniff`.
- Logs and deployment documentation must not print secret values.
- No personal reading history is moved to either host; it remains in browser storage as it does today.

## Failure handling

- If the Netlify function lacks configuration, it returns `503 SERVICE_ERROR` without exposing configuration details.
- If the Worker is unavailable, the function returns a stable `503`; the already generated local interpretation remains usable.
- Oversized and malformed requests are rejected before invoking AI.
- Worker `429` responses and `Retry-After` are preserved.
- A failed Netlify rollout does not affect the Cloudflare site. Rollback consists of restoring the previous Netlify deploy or removing the Netlify origin and secret from the Worker after the mirror is disabled.

## Deployment sequence

1. Add and test Netlify configuration, function code, host detection, Worker multi-secret support, and documentation locally.
2. Create/link the Netlify site and perform an initial static deployment to obtain the stable `*.netlify.app` origin.
3. Generate a new random Netlify proxy secret without persisting it to the repository.
4. Configure that secret in Netlify and as the Worker's dedicated Netlify proxy secret.
5. Add the exact Netlify origin to the Worker allowlist and deploy the Worker.
6. Deploy the final Netlify build and run end-to-end checks.
7. Push the implementation commit to GitHub while leaving the Cloudflare deployment in place.

## Verification

Automated checks will cover:

- Netlify function method, CORS/preflight, missing-secret, body-size, upstream failure, streaming response, status, and header behavior;
- Worker acceptance of either trusted proxy secret and rejection of invalid values;
- production endpoint selection for both hosting suffixes and localhost isolation;
- the existing complete unit, content, internationalization, landing-page, and browser suites;
- a production build containing the same static application files as the Cloudflare build.

Production checks will cover:

- HTTP `200` for the Netlify homepage and key assets;
- desktop and narrow mobile rendering without regressions;
- Chinese and English flows;
- a complete quick casting with local interpretation;
- an AI deep reading that streams successfully and is restored from history;
- continued operation of the existing Cloudflare URL;
- a fresh Globalping HTTP measurement from Tehran against the exact Netlify production URL, including public DNS resolution, valid TLS, HTTP success, and acceptable load time.

## Out of scope

- Purchasing or binding a custom domain;
- replacing Workers AI or the Durable Object rate limiter;
- changing the visual design or reading content;
- automatic client-side failover between the two domains;
- migrating existing browser-local history between origins.

Because browser storage is origin-scoped, users who switch from the Cloudflare URL to the Netlify URL start with an empty local history. Export/import synchronization can be designed separately if it becomes necessary.
