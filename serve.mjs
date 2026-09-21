import { resolve } from 'node:path';
import process from 'node:process';
import { createZhouyiServer } from './node-server.mjs';

const production = process.argv.includes('--production');
const root = resolve(process.cwd(), production ? 'dist' : '.');
const port = Number(process.env.PORT || process.env.ZHOUYI_PORT || 4175);
const host = process.env.ZHOUYI_HOST || (production ? '0.0.0.0' : '127.0.0.1');
const server = createZhouyiServer({
  root,
  proxySecret: process.env.PROXY_SECRET,
  accountWorkerUrl: process.env.ACCOUNT_WORKER_URL,
  accountProxySecret: process.env.ACCOUNT_PROXY_SECRET,
});

server.listen(port, host, () => {
  console.log(`观象已启动：http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`);
});
