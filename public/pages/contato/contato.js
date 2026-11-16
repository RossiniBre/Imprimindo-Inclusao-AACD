// Contato (lado da empresa parceira): telefone, e-mail e responsável da AACD e
// explicação de como funciona a entrega. Não há formulário de mensagem: a conversa
// é por e-mail ou telefone, e os cartões abrem o e-mail (Gmail) já endereçado.

import { api } from '../../shared/js/api.js';
import { copiarTexto } from '../../shared/js/ui.js';

// Dados oficiais da AACD que não mudam (telefone e ramal).
// O e-mail do projeto e o responsável vêm do back (admin da AACD), nunca daqui.
// Retirada: preencha com os dados reais. Campo vazio some da tela.
export const CONTATO_AACD = {
  telefone: '(11) 5576-0000',
  telefoneHorario: 'Segunda a sexta, 8h às 17h',
  ramal: '2214',
  retirada: {
    endereco: '',
    entrada: '',
    horario: '',
    fechado: '',
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

// Responsável pelo projeto = admin da AACD. Sem nome ou e-mail, devolve null.
export function responsavelDoPerfil(perfil) {
  const nome = String(perfil?.nome ?? '').trim();
  const email = String(perfil?.email ?? '').trim();
  if (!nome || !email) return null;
  return {
    nome,
    email,
    setor: String(perfil.setor ?? perfil.cargo ?? '').trim(),
    ramal: String(perfil.ramal ?? '').trim(),
  };
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

  // ----- Cartão do telefone (dado oficial fixo) -----

  escrever('#telefone', c.telefone);
  escrever('#telefone-horario', c.telefoneHorario);
  escrever('#telefone-ramal', `Ramal do projeto: ${c.ramal}`);

  const botaoCopiar = q('#copiar-telefone');
  botaoCopiar.addEventListener('click', async () => {
    const copiou = await copiarTexto(c.telefone, botaoCopiar);
    if (!copiou) botaoCopiar.textContent = 'Não foi possível copiar';
  });

  // ----- E-mail do projeto e responsável: vêm do admin da AACD (back) -----

  const cartaoEmail = q('#email').closest('.contato__cartao');
  const cartaoResponsavel = q('#responsavel').closest('.contato__cartao');
  cartaoEmail.hidden = true;        // só aparecem quando os dados chegarem
  cartaoResponsavel.hidden = true;

  function mostrarEmailAacd(email) {
    if (!email) return;
    escrever('#email', email);
    q('#escrever-email').href = linkDeEmail({ para: email });
    cartaoEmail.hidden = false;
  }

  function mostrarResponsavel(resp) {
    if (!resp) return;
    escrever('#responsavel', resp.nome);
    escrever('#responsavel-setor', resp.setor);
    escrever('#responsavel-contato', resp.ramal ? `${resp.email} · ramal ${resp.ramal}` : resp.email);
    escrever('#escrever-responsavel', `Escrever para ${resp.nome.split(' ')[0]}`);
    q('#escrever-responsavel').href = linkDeEmail({ para: resp.email });
    cartaoResponsavel.hidden = false;
  }

  api.contatoAacd()
    .then((resposta) => {
      if (resposta.status === 401) {
        location.hash = '#/login';
        return;
      }
      const resp = responsavelDoPerfil(resposta.ok ? resposta.corpo : null);
      mostrarResponsavel(resp);
      mostrarEmailAacd(resp?.email);
    })
    .catch(() => { /* sem o contato, os cartões de e-mail e responsável ficam ocultos */ });
}