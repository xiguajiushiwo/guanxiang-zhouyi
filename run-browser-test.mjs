import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const siteUrl = 'http://127.0.0.1:4175/';
const browserTest = process.argv[2] || 'smoke-browser.mjs';
if (!['smoke-browser.mjs', 'test-landing-browser.mjs'].includes(browserTest)) throw new Error('Unknown browser test script.');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function availablePort() {
  if (process.env.GUANXIANG_BROWSER_DEBUG_PORT) return process.env.GUANXIANG_BROWSER_DEBUG_PORT;
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(String(port)));
    });
  });
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isReachable(url)) return;
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function findBrowser() {
  const configured = process.env.GUANXIANG_BROWSER_PATH;
  const candidates = process.platform === 'win32'
    ? [configured, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
    : [configured, '/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  return candidates.find(existsSync);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)));
  });
}

async function closeBrowser(port) {
  try {
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await Promise.race([
      new Promise(resolve => socket.addEventListener('close', resolve, { once: true })),
      delay(2000),
    ]);
    socket.close();
  } catch {}
}

const browserPath = findBrowser();
if (!browserPath) throw new Error('No Edge, Chrome, or Chromium executable was found. Set GUANXIANG_BROWSER_PATH to run browser tests.');

const debugPort = await availablePort();
const profileDir = await mkdtemp(join(tmpdir(), 'guanxiang-browser-test-'));
let server;
let browser;

try {
  if (!(await isReachable(siteUrl))) {
    server = spawn(process.execPath, ['serve.mjs'], { stdio: 'inherit' });
    await waitFor(siteUrl);
  }

  browser = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-default-apps',
    '--disable-features=msEdgeFirstRunExperience',
    'about:blank',
  ], { stdio: 'ignore' });
  browser.unref();

  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  await run(process.execPath, [browserTest, debugPort]);
} finally {
  await closeBrowser(debugPort);
  server?.kill();
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
