// Servidor estático de desenvolvimento: serve a pasta public/ sem mexer nos arquivos.
// (O Live Server do VS Code injeta um script em todo .html, inclusive nos fragmentos
// das telas, e quebra qualquer tela que tenha <svg> inline.)
// Uso: npm run dev  ->  http://127.0.0.1:8080/#/login   (Ctrl+C para parar)
// Sem dependências: só módulos que já vêm no Node.

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const raiz = fileURLToPath(new URL('../public/', import.meta.url));
const porta = Number(process.env.PORT) || 8080;

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer((requisicao, resposta) => {
  const caminho = decodeURIComponent(new URL(requisicao.url, 'http://localhost').pathname);
  let arquivo = normalize(join(raiz, caminho));

  // Não deixa sair da pasta public/ (ex.: /../package.json)
  if (!arquivo.startsWith(raiz)) {
    resposta.writeHead(403).end();
    return;
  }

  try {
    if (statSync(arquivo).isDirectory()) arquivo = join(arquivo, 'index.html');
    statSync(arquivo);
  } catch {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
    return;
  }

  resposta.writeHead(200, {
    'Content-Type': tipos[extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store', // sempre pega a versão mais nova do disco
  });
  createReadStream(arquivo).pipe(resposta);
}).listen(porta, '127.0.0.1', () => {
  console.log(`Front rodando em http://127.0.0.1:${porta}/#/login  (Ctrl+C para parar)`);
});
