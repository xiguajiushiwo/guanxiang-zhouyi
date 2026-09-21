# Guanxiang account Worker

This Worker provides the D1-backed account and reading-history API used through the same-origin Pages and Liara proxies.

## Deploy

`wrangler.jsonc` contains the created D1 database binding. Set secrets without putting them in files:

```powershell
npx wrangler@latest secret put SESSION_SECRET
npx wrangler@latest secret put ACCOUNT_PROXY_SECRET
npx wrangler@latest d1 migrations apply DB --remote
npx wrangler@latest deploy
```

`ALLOWED_ORIGINS` must contain every browser origin that is allowed to use the proxy. The proxy sends `x-guanxiang-account-proxy-secret`; direct requests without that header are rejected.

The frontend never receives either secret. It calls `/api/account/*`, and the Pages or Liara proxy forwards the request to this Worker.
