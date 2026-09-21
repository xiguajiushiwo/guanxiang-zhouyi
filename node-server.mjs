import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { proxyReading } from './functions/_shared/reading-proxy.mjs';
import { proxyAccount } from './functions/_shared/account-proxy.mjs';

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

export function clientIpForNodeRequest(request) {
  const header = request.headers['x-real-ip'];
  const realIp = Array.isArray(header) ? header[0] : header;
  return String(realIp || request.socket?.remoteAddress || 'unknown').trim();
}

async function sendWebResponse(response, webResponse) {
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
  if (!webResponse.body) {
    response.end();
    return;
  }
  Readable.fromWeb(webResponse.body).pipe(response);
}

export function createZhouyiServer({ root, proxySecret, accountWorkerUrl, accountProxySecret, fetchImpl = globalThis.fetch }) {
  const staticRoot = resolve(root);

  return createServer(async (request, response) => {
    try {
      const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const url = new URL(request.url || '/', `${protocol}://${request.headers.host || 'localhost'}`);

      if (url.pathname === '/api/reading') {
        const body = ['GET', 'HEAD'].includes(request.method || 'GET') ? undefined : Readable.toWeb(request);
        const webRequest = new Request(url, {
          method: request.method,
          headers: request.headers,
          body,
          duplex: body ? 'half' : undefined,
        });
        const webResponse = await proxyReading({
          request: webRequest,
          proxySecret,
          clientIp: clientIpForNodeRequest(request),
          fetchImpl,
        });
        await sendWebResponse(response, webResponse);
        return;
      }

      if (url.pathname === '/api/account' || url.pathname.startsWith('/api/account/')) {
        const upstreamPath = url.pathname.replace(/^\/api\/account/, '') || '/';
        const upstreamUrl = new URL(upstreamPath + url.search, accountWorkerUrl || 'http://127.0.0.1');
        const body = ['GET', 'HEAD'].includes(request.method || 'GET') ? undefined : Readable.toWeb(request);
        const webRequest = new Request(url, {
          method: request.method,
          headers: request.headers,
          body,
          duplex: body ? 'half' : undefined,
        });
        const webResponse = await proxyAccount({
          request: webRequest,
          proxySecret: accountProxySecret,
          clientIp: clientIpForNodeRequest(request),
          upstreamUrl,
          fetchImpl,
        });
        await sendWebResponse(response, webResponse);
        return;
      }

      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        response.writeHead(400).end('Bad Request');
        return;
      }

      if (pathname === '/') pathname = '/index.html';
      const target = resolve(staticRoot, `.${pathname}`);
      if (target !== staticRoot && !target.startsWith(`${staticRoot}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      let file = target;
      try {
        if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      } catch {
        file = resolve(staticRoot, 'index.html');
      }

      const extension = extname(file).toLowerCase();
      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': TYPES[extension] || 'application/octet-stream',
        'Cache-Control': extension === '.html' ? 'no-store, max-age=0' : 'no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(content);
    } catch {
      response.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      }).end('Server error');
    }
  });
}
