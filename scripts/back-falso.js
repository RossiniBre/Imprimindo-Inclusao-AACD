// Back falso para ver as telas da AACD sem MySQL/Mongo e sem usuário cadastrado.
// Sobe um servidor na porta 8099 com dados de exemplo e, em seguida, o servidor
// estático (scripts/servidor.js) já apontando para ele.
// Uso: npm run dev:falso  ->  http://127.0.0.1:8080/#/login  (qualquer usuário e senha entram)
// Só módulos que já vêm no Node. Nada aqui é gravado em disco: os dados voltam ao reiniciar.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const PORTA_BACK = 8099;

const parceiros = [
  { id: 1, nome: 'Mackenzie', email: 'contato@mackenzie.br', telefone: '(11) 2114-8000', endereco: { cep: '01302-907', rua: 'Rua da Consolação', numero: '930', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP' } },
  { id: 2, nome: 'IMT Mauá', email: 'contato@maua.br', telefone: '(11) 4239-3000', endereco: { cep: '09580-900', rua: 'Praça Mauá', numero: '1', bairro: 'Mauá', cidade: 'São Caetano do Sul', uf: 'SP' } },
  { id: 3, nome: 'Órbita Tech', email: 'oi@orbita.tech', telefone: '(11) 4002-8922', endereco: { cep: '09210-580', rua: 'Av. dos Estados', numero: '5001', bairro: 'Bangu', cidade: 'Santo André', uf: 'SP' } },
  { id: 4, nome: 'Prisma Labs', email: 'lab@prisma.com.br', telefone: '(11) 3333-1234', endereco: { cep: '01504-001', rua: 'Rua Vergueiro', numero: '1200', bairro: 'Liberdade', cidade: 'São Paulo', uf: 'SP' } },
];

const mats = (...codigos) => codigos.map((c) => ({ codigo: c, rotulo: c }));
const impressoras = [
  { id: 11, empresaId: 1, modelo: 'Ender 3 V2', disponibilidade: 'OCIOSA', ativo: true, comprimentoMm: 220, larguraMm: 220, alturaMm: 250, materiais: mats('PLA', 'PETG') },
  { id: 12, empresaId: 1, modelo: 'Prusa MK4', disponibilidade: 'EM_USO', ativo: true, comprimentoMm: 250, larguraMm: 210, alturaMm: 220, materiais: mats('PLA', 'ABS', 'PETG') },
  { id: 13, empresaId: 2, modelo: 'Bambu Lab X1', disponibilidade: 'OCIOSA', ativo: true, comprimentoMm: 256, larguraMm: 256, alturaMm: 256, materiais: mats('PLA', 'TPU') },
  { id: 14, empresaId: 3, modelo: 'Creality K1', disponibilidade: 'OCIOSA', ativo: true, comprimentoMm: 220, larguraMm: 220, alturaMm: 250, materiais: mats('ABS') },
  { id: 15, empresaId: 4, modelo: 'Anycubic Photon', disponibilidade: 'OCIOSA', ativo: true, comprimentoMm: 143, larguraMm: 89, alturaMm: 165, materiais: mats('RESINA') },
];

let solicitacoes = [
  { id: 6505, titulo: 'Prótese infantil', status: 'RECUSADA', empresa: 'Prisma Labs', criadoPor: 'Carla Nogueira', impressora: 'Anycubic Photon', criadoEm: '2026-11-02T09:15:00', decididoEm: '2026-11-03T10:00:00', finalizadoEm: null, justificativa: 'Impressora em manutenção até 25/10.', expiraEm: null },
  { id: 6500, titulo: 'Órtese de punho', status: 'CONCLUIDA', empresa: 'Mackenzie', criadoPor: 'Ana Martins', impressora: 'Ender 3 V2', criadoEm: '2026-10-20T09:15:00', decididoEm: '2026-10-21T10:00:00', finalizadoEm: '2026-10-25T16:30:00', justificativa: null, expiraEm: null },
  { id: 6501, titulo: 'Prótese de mão', status: 'CONCLUIDA', empresa: 'Mackenzie', criadoPor: 'Ana Martins', impressora: 'Prusa MK4', criadoEm: '2026-10-22T09:15:00', decididoEm: '2026-10-22T10:00:00', finalizadoEm: '2026-10-28T16:30:00', justificativa: null, expiraEm: null },
  { id: 6502, titulo: 'Talas', status: 'PENDENTE', empresa: 'IMT Mauá', criadoPor: 'Ana Martins', impressora: 'Bambu Lab X1', criadoEm: '2026-11-08T09:15:00', decididoEm: null, finalizadoEm: null, justificativa: null, expiraEm: '2026-12-08' },
  { id: 6503, titulo: 'Órtese de tornozelo', status: 'EM_ANDAMENTO', empresa: 'Mackenzie', criadoPor: 'Ana Martins', impressora: 'Prusa MK4', criadoEm: '2026-11-07T09:15:00', decididoEm: '2026-11-08T08:00:00', finalizadoEm: null, justificativa: null, expiraEm: null },
];

let doacoes = [
  { id: 231, tipo: 'AMBOS', descricao: 'Podemos atender a partir de amanhã, e o filamento já está separado. 10 rolos de PLA branco de 1 kg e uma Ender 3 V2 revisada.', quantidade: 11, dataManifestacao: '2026-11-09T09:30:00Z', empresa: { id: 2, nome: 'IMT Mauá', ativa: true, email: 'contato@maua.br', telefone: '(11) 4239-3000' } },
  { id: 230, tipo: 'FILAMENTO', descricao: '10 unidades · PLA · 2 kg · Branco', quantidade: 10, dataManifestacao: '2026-11-09T07:00:00Z', empresa: { id: 1, nome: 'Mackenzie', ativa: true, email: 'contato@mackenzie.br', telefone: '(11) 2114-8000' } },
  { id: 229, tipo: 'IMPRESSORA', descricao: '1 unidade · Bambu Lab V2 · PLA, PETG e ABS', quantidade: 1, dataManifestacao: '2026-11-07T15:00:00Z', empresa: { id: 3, nome: 'Órbita Tech', ativa: false, email: 'oi@orbita.tech', telefone: '(11) 4002-8922' } },
];

const funcionarios = [
  { id: 1, nome: 'Ana Martins', identificador: 'ana.martins', email: 'ana.martins@aacd.com', perfil: 'ADMIN', cargo: 'Coordenadora', setor: 'Inovação', ativo: true },
  { id: 2, nome: 'Carla Nogueira', identificador: 'carla', email: 'carla@aacd.com', perfil: 'FUNCIONARIO', cargo: 'Fisioterapeuta', setor: 'Ortopedia', ativo: true },
];

const json = (res, status, corpo) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
};
const lerCorpo = (req) => new Promise((ok) => {
  let texto = '';
  req.on('data', (parte) => { texto += parte; });
  req.on('end', () => ok(texto));
});
const nomeEmpresa = (id) => parceiros.find((e) => e.id === id)?.nome ?? '';

const back = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  console.log('[back falso]', req.method, req.url);

  // Sessão: qualquer login entra como funcionário
  if (p === '/api/login') { await lerCorpo(req); return json(res, 200, { perfil: 'FUNCIONARIO' }); }
  if (p === '/api/logout') return json(res, 200, { mensagem: 'ok' });
  if (p === '/api/me') return json(res, 200, { perfil: 'FUNCIONARIO', nome: 'Ana Martins', identificador: 'ana.martins', email: 'ana.martins@aacd.com', cargo: 'Coordenadora', setor: 'Inovação' });

  // Parceiros e impressoras
  if (p === '/api/parceiros') return json(res, 200, parceiros);
  const porEmpresa = p.match(/^\/api\/parceiros\/(\d+)\/impressoras$/);
  if (porEmpresa) return json(res, 200, impressoras.filter((i) => i.empresaId === Number(porEmpresa[1])));
  if (p === '/api/impressoras/painel') {
    return json(res, 200, impressoras.map((i) => ({
      id: i.id, modelo: i.modelo, disponibilidade: i.disponibilidade, ativo: true,
      empresa: { id: i.empresaId, nome: nomeEmpresa(i.empresaId) }, materiais: i.materiais,
    })));
  }

  // Solicitações
  if (p === '/api/solicitacoes' && req.method === 'GET') return json(res, 200, solicitacoes);
  if (p === '/api/solicitacoes' && req.method === 'POST') {
    await lerCorpo(req);
    const id = 6600 + solicitacoes.length;
    solicitacoes.push({ id, titulo: 'Pedido novo', status: 'PENDENTE', empresa: 'Mackenzie', criadoPor: 'Ana Martins', impressora: 'Ender 3 V2', criadoEm: new Date().toISOString().slice(0, 19), decididoEm: null, finalizadoEm: null, justificativa: null, expiraEm: null });
    return json(res, 201, { id });
  }
  if (p === '/api/solicitacao/ver') {
    const s = solicitacoes.find((x) => x.id === Number(url.searchParams.get('id')));
    if (!s) return json(res, 404, { erro: 'Solicitação não encontrada.' });
    return json(res, 200, { id: s.id, titulo: s.titulo, status: s.status, justificativa: s.justificativa ?? undefined, prazoEstimado: s.status === 'EM_ANDAMENTO' ? '2026-11-12T18:00:00' : undefined });
  }
  if (p === '/api/solicitacao/arquivo') {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="protese_infantil_v2.stl"' });
    return res.end('solid falso\nendsolid falso\n');
  }
  if (p === '/api/solicitacao/excluir' || p === '/api/solicitacao/cancelar') {
    const corpo = new URLSearchParams(await lerCorpo(req));
    const id = Number(corpo.get('id'));
    if (p.endsWith('excluir')) solicitacoes = solicitacoes.filter((s) => s.id !== id);
    else solicitacoes = solicitacoes.map((s) => (s.id === id ? { ...s, status: 'CANCELADA', finalizadoEm: new Date().toISOString().slice(0, 19) } : s));
    return json(res, 200, { mensagem: 'ok' });
  }

  // Doações
  if (p === '/api/doacoes' && req.method === 'GET') return json(res, 200, doacoes);
  if (p === '/api/doacoes/excluir') {
    const corpo = new URLSearchParams(await lerCorpo(req));
    doacoes = doacoes.filter((d) => d.id !== Number(corpo.get('id')));
    return json(res, 200, { mensagem: 'Doação excluída.' });
  }

  // Funcionários (tela do admin)
  if (p === '/api/funcionarios' && req.method === 'GET') return json(res, 200, funcionarios);

  json(res, 404, { erro: `Rota não encontrada no back falso: ${p}` });
});

// Se a porta estiver ocupada (outro back falso aberto), tenta a seguinte
let porta = PORTA_BACK;
back.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE' && porta < PORTA_BACK + 20) {
    porta += 1;
    back.listen(porta);
    return;
  }
  console.error('Não foi possível subir o back falso:', erro.message);
  process.exit(1);
});

back.listen(porta, () => {
  console.log(`Back falso em http://127.0.0.1:${porta} (qualquer usuário e senha entram)`);
  const servidor = fileURLToPath(new URL('./servidor.js', import.meta.url));
  const filho = spawn(process.execPath, [servidor], {
    stdio: 'inherit',
    env: { ...process.env, BACK_PORT: String(porta) },
  });
  filho.on('exit', (codigo) => {
    if (codigo) {
      const portaSite = process.env.PORT || 8080;
      console.error(`\nO servidor do site não subiu. A porta ${portaSite} deve estar ocupada por outro "npm run dev".`);
      console.error('Feche o outro terminal ou rode com outra porta:  set PORT=8085  e depois  npm run dev:falso');
    }
    process.exit(codigo ?? 0);
  });
});
