// Contato (lado da empresa parceira): telefone, e-mail e responsável da AACD, onde e quando
// retirar as peças e o formulário "Envie uma mensagem".
// O back não tem rota de mensagem: "Enviar mensagem" abre o e-mail (Gmail, como na tela de
// Doações) com destinatário, assunto e texto já preenchidos, e a empresa só confirma o envio.

import { api } from '../../shared/js/api.js';
import { copiarTexto } from '../../shared/js/ui.js';

// Dados de contato da AACD. ATENÇÃO: são os valores de exemplo do Figma.
// Troquem pelos dados reais antes de publicar (é o único lugar em que eles aparecem).
export const CONTATO_AACD = {
  telefone: '(11) 5576-0000',
  telefoneHorario: 'Segunda a sexta, 8h às 17h',
  ramal: '2214',
  email: 'projeto3d@aacd.org.br',
  responsavel: {
    nome: 'Ana Martins',
    setor: 'Coordenação de Inovação',
    email: 'ana.martins@aacd.org.br',
  },
  retirada: {
    endereco: 'Av. Exemplo, 1000 · São Paulo, SP',
    entrada: 'Entrada pela portaria B, térreo',
    horario: 'Segunda a sexta, 9h às 16h',
    fechado: 'Fechado em feriados',
  },
};

export const ASSUNTOS = [
  'Dúvida sobre um pedido',
  'Retirada de peça',
  'Problema com impressora ou material',
  'Cadastro da empresa',
  'Outro assunto',
];

export const MENSAGEM_MIN = 10;
export const MENSAGEM_MAX = 1500;

// ---------- Funções puras (testadas em tests/contato.test.js) ----------

// Link que abre a escrita de um e-mail no Gmail, já preenchido
export function linkDeEmail({ para, assunto = '', corpo = '' }) {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: para });
  if (assunto) params.set('su', assunto);
  if (corpo) params.set('body', corpo);
  return `https://mail.google.com/mail/?${params}`;
}

export function linkDoMapa(endereco) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.replace(' · ', ', '))}`;
}

// Opções do campo "Pedido relacionado": mais recentes (maior número) primeiro
export function opcoesDePedidos(lista) {
  return [...(Array.isArray(lista) ? lista : [])]
    .filter((p) => p?.id)
    .sort((a, b) => b.id - a.id)
    .map((p) => ({ valor: String(p.id), rotulo: `Pedido ${p.id}${p.titulo ? ` · ${p.titulo}` : ''}` }));
}

export function validarMensagem(texto) {
  const limpo = String(texto ?? '').trim();
  if (!limpo) return 'Escreva a mensagem.';
  if (limpo.length < MENSAGEM_MIN) return `Explique um pouco mais (pelo menos ${MENSAGEM_MIN} caracteres).`;
  if (limpo.length > MENSAGEM_MAX) return `No máximo ${MENSAGEM_MAX} caracteres.`;
  return null;
}

// Assunto e corpo do e-mail. O número do pedido vai no assunto, como a AACD pede.
// `pedido` é o rótulo da opção escolhida ('Pedido 6502 · Prótese de mão') ou ''.
export function montarEmail({ assunto, pedido = '', mensagem, empresa = {} }) {
  const numero = /^Pedido (\d+)/.exec(pedido)?.[1];
  const linhas = [String(mensagem).trim(), '', '--'];
  if (empresa.nome) linhas.push(`Empresa: ${empresa.nome}`);
  if (pedido) linhas.push(`Pedido relacionado: ${pedido.replace(/^Pedido /, '')}`);
  if (empresa.email) linhas.push(`Responder para: ${empresa.email}`);
  if (empresa.telefone) linhas.push(`Telefone: ${empresa.telefone}`);
  return {
    assunto: [numero ? `[Pedido ${numero}]` : '', assunto, empresa.nome ? `- ${empresa.nome}` : '']
      .filter(Boolean).join(' '),
    corpo: linhas.join('\n'),
  };
}

// ---------- Tela ----------

export function iniciar(container) {
  const c = CONTATO_AACD;
  const q = (seletor) => container.querySelector(seletor);
  const escrever = (seletor, texto) => { q(seletor).textContent = texto; };

  let empresa = {};

  // ----- Cartões de contato -----

  escrever('#telefone', c.telefone);
  escrever('#telefone-horario', c.telefoneHorario);
  escrever('#telefone-ramal', `Ramal do projeto: ${c.ramal}`);
  escrever('#email', c.email);
  escrever('#responsavel', c.responsavel.nome);
  escrever('#responsavel-setor', c.responsavel.setor);
  escrever('#responsavel-contato', `${c.responsavel.email} · ramal ${c.ramal}`);
  escrever('#escrever-responsavel', `Escrever para ${c.responsavel.nome.split(' ')[0]}`);

  escrever('#retirada-endereco', c.retirada.endereco);
  escrever('#retirada-entrada', c.retirada.entrada);
  escrever('#retirada-horario', c.retirada.horario);
  escrever('#retirada-fechado', c.retirada.fechado);

  q('#escrever-email').href = linkDeEmail({ para: c.email });
  q('#escrever-responsavel').href = linkDeEmail({ para: c.responsavel.email });
  q('#ver-mapa').href = linkDoMapa(c.retirada.endereco);

  const botaoCopiar = q('#copiar-telefone');
  botaoCopiar.addEventListener('click', async () => {
    const copiou = await copiarTexto(c.telefone, botaoCopiar);
    if (!copiou) botaoCopiar.textContent = 'Não foi possível copiar';
  });

  // ----- Formulário -----

  const form = q('#form-mensagem');
  const campoAssunto = q('#campo-assunto');
  const campoPedido = q('#campo-pedido');
  const campoMensagem = q('#campo-mensagem');
  const erro = q('#erro-mensagem');
  const aviso = q('#aviso-envio');

  campoAssunto.replaceChildren(...ASSUNTOS.map((texto) => new Option(texto, texto)));

  campoMensagem.addEventListener('input', () => {
    aviso.hidden = true;
    if (erro.textContent) {
      erro.textContent = validarMensagem(campoMensagem.value) ?? '';
      campoMensagem.classList.toggle('com-erro', Boolean(erro.textContent));
    }
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    aviso.hidden = true;

    const problema = validarMensagem(campoMensagem.value);
    erro.textContent = problema ?? '';
    campoMensagem.classList.toggle('com-erro', Boolean(problema));
    if (problema) {
      campoMensagem.focus();
      return;
    }

    const { assunto, corpo } = montarEmail({
      assunto: campoAssunto.value,
      pedido: campoPedido.value ? campoPedido.selectedOptions[0].textContent : '',
      mensagem: campoMensagem.value,
      empresa,
    });
    window.open(linkDeEmail({ para: c.email, assunto, corpo }), '_blank', 'noopener');

    aviso.textContent = 'Abrimos o seu e-mail em outra aba com a mensagem pronta. Confira e clique em enviar por lá.';
    aviso.hidden = false;
  });

  // ----- Dados da empresa logada: e-mail de resposta e pedidos -----

  api.perfilEmpresa().then((resposta) => {
    if (resposta.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!resposta.ok || !resposta.corpo) return;
    empresa = resposta.corpo;
    if (empresa.email) {
      escrever('#resposta-email', empresa.email);
      q('#resposta-para').hidden = false;
    }
  }).catch(() => { /* sem o perfil, a mensagem vai sem a assinatura da empresa */ });

  api.solicitacoes().then((resposta) => {
    if (!resposta.ok) return;
    campoPedido.append(...opcoesDePedidos(resposta.corpo).map((o) => new Option(o.rotulo, o.valor)));
  }).catch(() => { /* sem a lista, o campo fica só com "Nenhum pedido" */ });
}
