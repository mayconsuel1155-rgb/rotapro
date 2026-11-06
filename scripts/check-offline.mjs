// Integration check using an isolated Chrome/Edge profile and a temporary sync store.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import https from 'node:https';
import { X509Certificate } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(os.tmpdir(), 'rotapro-browser-'));
const processes = [];
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) { const result = await fn(); if (result) return result; await sleep(200); }
  throw new Error('Timeout: ' + label);
}
try {
  let browserPath;
  for (const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']) {
    try { await access(candidate); browserPath = candidate; break; } catch {}
  }
  if (!browserPath) throw new Error('Chrome ou Edge não encontrado.');
  const server = spawn(process.execPath, ['scripts/serve-local.mjs'], {
    cwd: root, windowsHide: true, env: { ...process.env, ROTAPRO_PORT: '9443', ROTAPRO_SETUP_PORT: '9081', ROTAPRO_DATA_DIR: path.join(temp, 'data') }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.push(server);
  let ready = false;
  server.stdout.on('data', data => { if (data.toString().includes('Aplicativo:')) ready = true; });
  server.stderr.on('data', data => process.stderr.write(data));
  await until(() => ready, 'local server');
  const ca = new X509Certificate(await readFile(path.join(root, '.certs/rotapro-ca.cer'))).toString();
  await new Promise((resolve, reject) => {
    https.get('https://127.0.0.1:9443/', { ca }, response => {
      response.resume();
      if (response.statusCode === 200) resolve(); else reject(new Error('Invalid HTTPS response'));
    }).on('error', reject);
  });
  const browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--ignore-certificate-errors', '--remote-debugging-port=0', `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  processes.push(browser);
  let wsUrl;
  browser.stderr.on('data', data => { const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (match) wsUrl = match[1]; });
  await until(() => wsUrl, 'browser debugging');
  socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const events = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id); pending.delete(message.id);
      if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result);
    } else events.push(message);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await page('Runtime.enable'); await page('Network.enable'); await page('Page.enable');
  await page('Page.navigate', { url: 'https://127.0.0.1:9443/' });
  await until(() => evaluate('document.body.innerText.includes("Disponível offline neste aparelho")'), 'offline precache');
  await page('Page.reload');
  await until(() => evaluate('!!navigator.serviceWorker.controller && document.body.innerText.includes("Meu Dia")'), 'controlled app');
  const installability = await page('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors, [], 'Browser installation criteria must pass');
  // Actual application pairing and sync, without touching the user's production data.
  const key = (await readFile(path.join(temp, 'data/pairing-key'), 'utf8')).trim();
  await evaluate(`localStorage.setItem('rotapro-pairing-key', ${JSON.stringify(key)}); window.dispatchEvent(new Event('focus')); true`);
  await until(() => evaluate('!!localStorage.getItem("rotapro-last-sync")'), 'paired synchronization');
  // Insert a record through IndexedDB, as the app does during disconnected field work.
  await evaluate(`new Promise((resolve, reject) => { const request = indexedDB.open('RotaProDB'); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result; const tx = db.transaction('clients', 'readwrite'); tx.objectStore('clients').put({ id: 'offline-check', name: 'Cliente offline de teste', address: 'Rua Teste', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); tx.oncomplete = () => { db.close(); resolve(true); }; tx.onerror = () => reject(tx.error); }; })`);
  // Stop the server completely: this tests offline startup rather than only a mocked network flag.
  server.kill();
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  events.length = 0;
  await page('Page.reload');
  await until(() => evaluate('document.body.innerText.includes("Meu Dia") && !!navigator.serviceWorker.controller'), 'offline reload with server stopped');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Clientes').click(); true`);
  await until(() => evaluate('document.body.innerText.includes("Cliente offline de teste")'), 'persistent offline records');
  assert(events.some(e => e.method === 'Network.responseReceived' && e.params.response.fromServiceWorker), 'Offline response must come from the service worker');
  assert(!events.some(e => e.method === 'Runtime.exceptionThrown'), 'No uncaught browser errors');
  const returned = spawn(process.execPath, ['scripts/serve-local.mjs'], {
    cwd: root, windowsHide: true, env: { ...process.env, ROTAPRO_PORT: '9443', ROTAPRO_SETUP_PORT: '9081', ROTAPRO_DATA_DIR: path.join(temp, 'data') }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.push(returned);
  let returnedReady = false;
  returned.stdout.on('data', data => { if (data.toString().includes('Aplicativo:')) returnedReady = true; });
  await until(() => returnedReady, 'server return');
  await evaluate(`window.dispatchEvent(new Event('focus')); true`);
  await until(async () => {
    try { return JSON.parse(await readFile(path.join(temp, 'data/sync.json'), 'utf8'))['client/offline-check']; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }, 'offline client uploaded');
  const { browserContextId } = await send('Target.createBrowserContext');
  const secondTarget = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const secondSession = await send('Target.attachToTarget', { targetId: secondTarget.targetId, flatten: true });
  const otherEvaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, secondSession.sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.navigate', { url: 'https://127.0.0.1:9443/' }, secondSession.sessionId);
  await until(() => otherEvaluate('document.body.innerText.includes("Meu Dia")'), 'second device');
  await otherEvaluate(`localStorage.setItem('rotapro-pairing-key', ${JSON.stringify(key)}); window.dispatchEvent(new Event('focus')); true`);
  await until(() => otherEvaluate('!!localStorage.getItem("rotapro-last-sync")'), 'second device sync');
  await otherEvaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Clientes').click(); true`);
  await until(() => otherEvaluate('document.body.innerText.includes("Cliente offline de teste")'), 'offline client on second device');
  console.log('PASS: HTTPS app, service worker, pairing, offline reload with server stopped, persisted client, reconnection upload and download by a second isolated browser.');
  console.log('Certificate trust and installation still require confirmation on the physical phone.');
  await send('Browser.close').catch(() => {});
} finally {
  socket?.close();
  for (const process of processes.reverse()) if (process.exitCode === null) process.kill();
  await sleep(1000);
  assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(temp).startsWith('rotapro-browser-'));
  await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
