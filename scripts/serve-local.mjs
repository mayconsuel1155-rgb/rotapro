import https from 'node:https';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SyncStore } from './sync-store.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
let config;
try { config = JSON.parse((await readFile(path.join(root, '.certs/config.json'), 'utf8')).replace(/^\uFEFF/, '')); }
catch { console.error('Execute npm run setup:local antes de iniciar o servidor local.'); process.exit(1); }
await stat(path.join(dist, 'index.html'));
const store = new SyncStore(process.env.ROTAPRO_DATA_DIR || path.join(root, '.local-data'));
const appPort = Number(process.env.ROTAPRO_PORT || 8443);
const setupPort = Number(process.env.ROTAPRO_SETUP_PORT || 8081);
await store.init();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const server = https.createServer({ pfx: await readFile(path.join(root, '.certs/server.pfx')), passphrase: config.passphrase }, async (req, res) => {
  try {
    const url = new URL(req.url, 'https://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'POST' || url.pathname !== '/api/sync') return json(res, 404, { error: 'Rota indisponivel' });
      // No CORS: requests must originate from this app and use a paired device key.
      if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origem invalida' });
      if (!store.authorized(req.headers['x-pairing-key'])) return json(res, 401, { error: 'Codigo de pareamento invalido' });
      const chunks = [];
      let bodySize = 0;
      for await (const chunk of req) {
        bodySize += chunk.length;
        if (bodySize > 20 * 1024 * 1024) return json(res, 413, { error: 'Dados acima do limite de 20 MB' });
        chunks.push(chunk);
      }
      let changes;
      try { changes = JSON.parse(Buffer.concat(chunks).toString('utf8')).changes; }
      catch { return json(res, 400, { error: 'JSON invalido' }); }
      try { return json(res, 200, await store.exchange(changes)); }
      catch (e) { console.error(e); return json(res, 500, { error: 'Nao foi possivel salvar a sincronizacao' }); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); return res.end(); }
    let target = file === dist ? path.join(dist, 'index.html') : file;
    try { if (!(await stat(target)).isFile()) throw new Error(); }
    catch {
      if (path.extname(target)) { res.writeHead(404); return res.end(); }
      target = path.join(dist, 'index.html');
    }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': target.includes(path.sep + 'assets' + path.sep) ? 'public, max-age=31536000, immutable' : 'no-cache', 'Service-Worker-Allowed': '/' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (e) { console.error(e); if (!res.headersSent) res.writeHead(500); res.end(); }
});
server.requestTimeout = 30000;
server.listen(appPort, '0.0.0.0', () => {
  console.log(`\nAplicativo: https://${config.address}:${appPort}`);
  console.log(`Instalacao do certificado: http://${config.address}:${setupPort}`);
  console.log(`Codigo de pareamento (somente nos seus aparelhos): ${store.key}\n`);
});
// Only the public certificate is exposed over HTTP; private keys remain outside dist.
const setup = http.createServer(async (req, res) => {
  if (req.url === '/rotapro-ca.cer') {
    res.writeHead(200, { 'Content-Type': 'application/pkix-cert', 'Content-Disposition': 'attachment; filename="rotapro-ca.cer"' });
    return res.end(await readFile(path.join(root, '.certs/rotapro-ca.cer')));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instalar RotaPro</title><body style="font:18px system-ui;max-width:650px;margin:40px auto;padding:20px"><h1>Instalar no telefone</h1><p>1. <a href="/rotapro-ca.cer">Baixe o certificado público deste computador</a>.</p><p>2. Android: Configurações → Segurança → Criptografia e credenciais → Instalar certificado → Certificado de CA. Os nomes variam por fabricante. Selecione o arquivo baixado. Instale somente o certificado fornecido pelo seu próprio computador.</p><p>iPhone: instale o perfil baixado em Ajustes e habilite a confiança em Ajustes → Geral → Sobre → Confiança de Certificados.</p><p>3. Abra <a href="https://${config.address}:8443">o RotaPro por HTTPS</a>. A página deve abrir sem aviso de certificado.</p><p>4. Aguarde a mensagem “Disponível offline”, instale pelo menu do navegador e informe o código de pareamento exibido no terminal do computador.</p><p>5. Abra pelo ícone e teste com o computador desligado. Para sincronizar, ligue o servidor, conecte os aparelhos à mesma rede e abra o aplicativo.</p></body></html>`);
});
setup.listen(setupPort, '0.0.0.0');
for (const service of [server, setup]) service.on('error', e => { console.error(e); process.exit(1); });
