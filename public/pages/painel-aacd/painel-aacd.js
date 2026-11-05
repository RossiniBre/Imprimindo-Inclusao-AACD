// Painel da AACD (funcionário e admin): acompanhamento dos pedidos de impressão.
// Lista vem de GET /api/solicitacoes:
//   { id, titulo, status, empresa, criadoPor, impressora, criadoEm, decididoEm,
//     finalizadoEm, justificativa, expiraEm }
// Status do back -> seção da tela:
//   PENDENTE -> Esperando aceite | EM_ANDAMENTO -> Imprimindo
//   CONCLUIDA -> Prontas          | RECUSADA, CANCELADA, FALHOU -> Recusadas
// Ações: cancelar pendente (POST /api/solicitacao/cancelar) e remover
// pronta/recusada (POST /api/solicitacao/excluir). O prazo estimado da
// impressão vem de GET /api/solicitacao/ver?id= (barra de progresso).

import { api } from '../../shared/js/api.js';

// Regras do back (PrazosSolicitacao.java)
export const DIAS_LIMPEZA = 60;      // prontas/recusadas somem depois disso
export const DIAS_EXPIRA_PENDENTE = 30;

const CARTOES_POR_GRUPO = 4;         // "Mostrando 4 de 6 · Ver todos"

export const GRUPO_DO_STATUS = {
  PENDENTE: 'esperando',
  EM_ANDAMENTO: 'imprimindo',
  CONCLUIDA: 'prontas',
  RECUSADA: 'recusadas',
  CANCELADA: 'recusadas',
  FALHOU: 'recusadas',
};

const NOME_DO_GRUPO = {
  esperando: 'esperando aceite',
  imprimindo: 'imprimindo',
  prontas: 'prontas',
  recusadas: 'recusadas',
};

// ---------- Funções puras (testáveis) ----------

export function agrupar(lista) {
  const grupos = { esperando: [], imprimindo: [], prontas: [], recusadas: [] };
  for (const s of lista) {
    const nome = GRUPO_DO_STATUS[s.status];
    if (nome) grupos[nome].push(s);
  }
  return grupos;
}

// O back manda LocalDateTime ("2026-11-03T09:15:30") ou LocalDate ("2026-11-10"),
// sempre sem fuso: trata como horário local. Data sem hora vale até o fim do dia.
export function lerData(texto) {
  if (!texto) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 23, 59, 59);
  }
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

const dois = (n) => String(n).padStart(2, '0');

// "2026-10-14T16:30:00" -> "14/10, 16h30"
export function formatarDataHora(texto) {
  const d = lerData(texto);
  if (!d) return '';
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}, ${dois(d.getHours())}h${dois(d.getMinutes())}`;
}

// "2026-10-14" -> "14/10"
export function formatarData(texto) {
  const d = lerData(texto);
  if (!d) return '';
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
}

// 1 dia e 3h | 5h10 | 40 min | menos de 1 min
export function duracao(ms) {
  const minutos = Math.floor(Math.max(ms, 0) / 60000);
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const min = minutos % 60;

  if (dias > 0) {
    const d = `${dias} dia${dias === 1 ? '' : 's'}`;
    return horas > 0 ? `${d} e ${horas}h` : d;
  }
  if (horas > 0) return `${horas}h${min > 0 ? dois(min) : ''}`;
  if (min > 0) return `${min} min`;
  return 'menos de 1 min';
}

export function tempoEsperando(criadoEm, agora = new Date()) {
  const d = lerData(criadoEm);
  if (!d) return '';
  return `Esperando há ${duracao(agora - d)}`;
}

// Barra do "Imprimindo": da aceitação até o prazo estimado pela empresa.
// Devolve null se faltar uma das datas.
export function progresso(decididoEm, prazoEstimado, agora = new Date()) {
  const inicio = lerData(decididoEm);
  const fim = lerData(prazoEstimado);
  if (!inicio || !fim || fim <= inicio) return null;

  const porcentagem = Math.round(Math.min(Math.max((agora - inicio) / (fim - inicio), 0), 1) * 100);
  const restante = fim - agora;
  const texto = restante > 0
    ? `faltam cerca de ${duracao(restante)}`
    : `prazo passou há ${duracao(-restante)}`;

  return { porcentagem, texto };
}

// Quantos dias faltam para o pedido sumir da lista (regra de limpeza do back)
export function diasParaSumir(dataTexto, dias = DIAS_LIMPEZA, agora = new Date()) {
  const d = lerData(dataTexto);
  if (!d) return null;
  const limite = new Date(d.getTime() + dias * 86400000);
  return Math.max(Math.ceil((limite - agora) / 86400000), 0);
}

// ---------- Tela ----------

let limpar = null;

export function destruir() {
  limpar?.();
  limpar = null;
}

export function iniciar(container) {
  let pedidos = [];
  let grupos = agrupar([]);
  let prazos = {};              // id -> prazoEstimado (vem de /api/solicitacao/ver)
  let filtro = null;            // null = todos os grupos
  const expandidos = new Set(); // grupos com "Ver todos" aberto

  const contadores = container.querySelectorAll('.contador');
  const secoes = container.querySelectorAll('.grupo');
  const filtroAtivo = container.querySelector('#filtro-ativo');
  const filtroNome = container.querySelector('#filtro-nome');
  const botaoTodos = container.querySelector('#botao-todos');
  const avisoGeral = container.querySelector('#aviso-geral');
  const listaCarregando = container.querySelector('#lista-carregando');
  const listaVazia = container.querySelector('#lista-vazia');
  container.querySelector('#dias-limpeza').textContent = DIAS_LIMPEZA;

  const modal = container.querySelector('#modal-confirmar');
  const modalTitulo = container.querySelector('#modal-titulo');
  const modalTexto = container.querySelector('#modal-texto');
  const modalPedido = container.querySelector('#modal-pedido');
  const modalAlternativa = container.querySelector('#modal-alternativa');
  const erroModal = container.querySelector('#erro-modal');
  const botaoConfirmar = container.querySelector('#botao-confirmar-modal');
  const botaoVoltar = container.querySelector('#botao-voltar-modal');
  let acaoPendente = null;      // { acao, pedido } enquanto o modal está aberto
  let elementoAnterior = null;  // quem tinha o foco antes do modal

  // ----- Avisos -----

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  function limparAviso() {
    avisoGeral.hidden = true;
  }

  // ----- Cartões -----

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function chip(classe, texto) {
    return elemento('span', `chip ${classe}`, texto);
  }

  function botao(texto, acao, pedido, classe = '') {
    const b = elemento('button', `botao-linha ${classe}`.trim(), texto);
    b.type = 'button';
    b.dataset.acao = acao;
    b.dataset.id = pedido.id;
    return b;
  }

  function montarCartao(pedido, grupo) {
    const agora = new Date();
    const cartao = elemento('article', 'cartao');

    // Topo: número do pedido + badge
    const topo = elemento('div', 'cartao__topo');
    topo.appendChild(elemento('span', 'cartao__id', `Pedido ${pedido.id}`));

    if (grupo === 'esperando') {
      const esperaMs = agora - (lerData(pedido.criadoEm) ?? agora);
      const urgente = esperaMs > 2 * 86400000;
      topo.appendChild(chip(urgente ? 'chip--erro' : 'chip--destaque', tempoEsperando(pedido.criadoEm, agora)));
    } else if (grupo === 'imprimindo') {
      topo.appendChild(chip('chip--sucesso', 'Imprimindo'));
    } else if (grupo === 'prontas') {
      const dias = diasParaSumir(pedido.finalizadoEm, DIAS_LIMPEZA, agora);
      topo.appendChild(chip('chip--neutro', dias === null ? 'Pronta' : `Some em ${dias} dia${dias === 1 ? '' : 's'}`));
    } else {
      const rotulos = { RECUSADA: 'Recusada', CANCELADA: 'Cancelada', FALHOU: 'Falhou na impressão' };
      topo.appendChild(chip(pedido.status === 'CANCELADA' ? 'chip--neutro' : 'chip--erro', rotulos[pedido.status] ?? pedido.status));
    }
    cartao.appendChild(topo);

    // Título, empresa, impressora
    cartao.appendChild(elemento('h3', 'cartao__titulo', pedido.titulo));
    cartao.appendChild(elemento('p', 'cartao__empresa', pedido.empresa ?? ''));
    cartao.appendChild(elemento('p', 'cartao__detalhe',
      pedido.impressora ? `Impressora: ${pedido.impressora}` : 'Impressora: não informada'));

    // Bloco específico de cada grupo
    if (grupo === 'esperando') {
      cartao.appendChild(elemento('p', 'cartao__detalhe',
        `Enviado em ${formatarDataHora(pedido.criadoEm)}`
        + (pedido.expiraEm ? ` · expira em ${formatarData(pedido.expiraEm)}` : '')));
    }

    if (grupo === 'imprimindo') {
      const p = progresso(pedido.decididoEm, prazos[pedido.id], agora);
      if (p) {
        const barra = elemento('div', 'barra');
        barra.setAttribute('role', 'progressbar');
        barra.setAttribute('aria-valuemin', '0');
        barra.setAttribute('aria-valuemax', '100');
        barra.setAttribute('aria-valuenow', String(p.porcentagem));
        barra.setAttribute('aria-label', 'Andamento estimado da impressão');
        const cheio = elemento('div', 'barra__cheio');
        cheio.style.width = `${p.porcentagem}%`;
        barra.appendChild(cheio);
        cartao.appendChild(barra);

        const legenda = elemento('p', 'cartao__legenda');
        legenda.appendChild(elemento('span', '', `${p.porcentagem}% do prazo`));
        legenda.appendChild(elemento('span', '', p.texto));
        cartao.appendChild(legenda);
      } else {
        cartao.appendChild(elemento('p', 'cartao__detalhe',
          pedido.decididoEm ? `Aceita em ${formatarDataHora(pedido.decididoEm)}` : 'Aceita pela empresa'));
      }
    }

    if (grupo === 'prontas') {
      cartao.appendChild(elemento('p', 'cartao__ok', `✓ Concluída em ${formatarDataHora(pedido.finalizadoEm)}`));
    }

    if (grupo === 'recusadas') {
      cartao.appendChild(elemento('p', 'cartao__motivo',
        pedido.justificativa ? `Motivo: ${pedido.justificativa}` : 'Motivo não informado.'));
    }

    // Ações
    const acoes = elemento('div', 'cartao__acoes');
    if (grupo === 'esperando') {
      acoes.appendChild(botao('Cancelar pedido', 'cancelar', pedido, 'botao-linha--perigo'));
    } else if (grupo === 'imprimindo') {
      acoes.appendChild(elemento('span', 'cartao__nota', 'A empresa avisa quando terminar.'));
    } else if (grupo === 'prontas') {
      acoes.appendChild(botao('Remover', 'remover', pedido));
    } else {
      const outra = elemento('a', 'botao-linha botao-linha--principal', 'Escolher outra empresa');
      outra.href = '#/parceiros';
      acoes.appendChild(outra);
      acoes.appendChild(botao('Remover', 'remover', pedido));
    }
    cartao.appendChild(acoes);

    cartao.appendChild(elemento('p', 'cartao__rodape',
      pedido.criadoPor ? `Enviado por ${pedido.criadoPor}` : 'Enviado pela AACD'));

    return cartao;
  }

  // ----- Render -----

  function renderizar() {
    grupos = agrupar(pedidos);

    contadores.forEach((c) => {
      const nome = c.dataset.grupo;
      c.querySelector('[data-papel="numero"]').textContent = grupos[nome].length;
      c.setAttribute('aria-pressed', String(filtro === nome));
    });

    filtroAtivo.hidden = filtro === null;
    if (filtro) filtroNome.textContent = NOME_DO_GRUPO[filtro];

    secoes.forEach((secao) => {
      const nome = secao.dataset.grupo;
      const lista = grupos[nome];
      const visivel = lista.length > 0 && (filtro === null || filtro === nome);
      secao.hidden = !visivel;
      if (!visivel) return;

      const mostrarTodos = expandidos.has(nome) || filtro === nome;
      const mostrados = mostrarTodos ? lista : lista.slice(0, CARTOES_POR_GRUPO);

      secao.querySelector('[data-papel="total"]').textContent = lista.length;
      secao.querySelector('[data-papel="mostrando"]').textContent =
        `Mostrando ${mostrados.length} de ${lista.length}`;

      const verTodos = secao.querySelector('[data-papel="ver-todos"]');
      verTodos.hidden = lista.length <= CARTOES_POR_GRUPO || filtro === nome;
      verTodos.textContent = expandidos.has(nome) ? 'Ver menos' : `Ver todos (${lista.length})`;

      secao.querySelector('[data-papel="cartoes"]').replaceChildren(...mostrados.map((p) => montarCartao(p, nome)));
    });

    listaCarregando.hidden = true;
    listaVazia.hidden = pedidos.length > 0;
  }

  async function carregarPrazos() {
    // O prazo estimado só vem no detalhe; busca para os que estão imprimindo.
    const imprimindo = grupos.imprimindo.filter((p) => !(p.id in prazos));
    if (imprimindo.length === 0) return;

    await Promise.all(imprimindo.map(async (p) => {
      try {
        const resposta = await api.verSolicitacao(p.id);
        prazos[p.id] = resposta.ok ? (resposta.corpo?.prazoEstimado ?? null) : null;
      } catch {
        prazos[p.id] = null;
      }
    }));
    renderizar();
  }

  async function carregar() {
    limparAviso();

    let resposta;
    try {
      resposta = await api.solicitacoes();
    } catch {
      listaCarregando.hidden = true;
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
      return;
    }

    if (resposta.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!resposta.ok) {
      listaCarregando.hidden = true;
      mostrarAviso(resposta.corpo?.erro ?? 'Não foi possível carregar os pedidos.');
      return;
    }

    pedidos = Array.isArray(resposta.corpo) ? resposta.corpo : [];
    prazos = {};
    renderizar();
    carregarPrazos();
  }

  // ----- Filtro pelos contadores -----

  contadores.forEach((c) => {
    c.addEventListener('click', () => {
      const nome = c.dataset.grupo;
      filtro = filtro === nome ? null : nome;
      renderizar();
      if (filtro) container.querySelector(`.grupo[data-grupo="${filtro}"]`)?.scrollIntoView({ block: 'start' });
    });
  });

  botaoTodos.addEventListener('click', () => {
    filtro = null;
    renderizar();
  });

  secoes.forEach((secao) => {
    secao.querySelector('[data-papel="ver-todos"]').addEventListener('click', () => {
      const nome = secao.dataset.grupo;
      if (expandidos.has(nome)) expandidos.delete(nome); else expandidos.add(nome);
      renderizar();
    });
  });

  // ----- Modal: cancelar / remover -----

  const ACOES = {
    cancelar: {
      titulo: 'Cancelar o pedido de impressão?',
      texto: 'A empresa deixa de ver este pedido e ele vai para a lista de recusadas. Depois você pode criar um novo pedido.',
      botao: 'Sim, cancelar',
      voltar: 'Voltar',
      chamar: (id) => api.cancelarSolicitacao(id),
    },
    remover: {
      titulo: 'Remover o pedido de impressão?',
      texto: 'Este pedido será removido, sem que seja direcionado para outra empresa.',
      botao: 'Sim, remover',
      voltar: 'Cancelar',
      chamar: (id) => api.excluirSolicitacao(id),
    },
  };

  function abrirModal(acao, pedido) {
    const cfg = ACOES[acao];
    acaoPendente = { acao, pedido };
    elementoAnterior = document.activeElement;

    modalTitulo.textContent = cfg.titulo;
    modalTexto.textContent = cfg.texto;
    modalPedido.textContent = `Pedido ${pedido.id} · ${pedido.titulo}`;
    modalAlternativa.hidden = !(acao === 'remover' && GRUPO_DO_STATUS[pedido.status] === 'recusadas');
    botaoConfirmar.textContent = cfg.botao;
    botaoVoltar.textContent = cfg.voltar;
    botaoConfirmar.disabled = false;
    erroModal.hidden = true;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    botaoConfirmar.focus();
  }

  function fecharModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    acaoPendente = null;
    elementoAnterior?.focus?.();
    elementoAnterior = null;
  }

  function aoApertarEsc(evento) {
    if (evento.key === 'Escape' && !modal.hidden) fecharModal();
  }

  container.querySelector('#botao-fechar-modal').addEventListener('click', fecharModal);
  botaoVoltar.addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) fecharModal();
  });
  document.addEventListener('keydown', aoApertarEsc);

  botaoConfirmar.addEventListener('click', async () => {
    if (!acaoPendente) return;
    const { acao, pedido } = acaoPendente;
    erroModal.hidden = true;
    botaoConfirmar.disabled = true;
    botaoConfirmar.textContent = acao === 'cancelar' ? 'Cancelando...' : 'Removendo...';

    try {
      const resposta = await ACOES[acao].chamar(pedido.id);
      if (resposta.ok) {
        fecharModal();
        await carregar();
        return;
      }
      // 400 dados inválidos · 403 sem permissão · 409 status mudou
      erroModal.textContent = resposta.corpo?.erro ?? 'Não foi possível concluir. Tente de novo.';
    } catch {
      erroModal.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
    }
    erroModal.hidden = false;
    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = ACOES[acao].botao;
  });

  // Botões dentro dos cartões (delegação)
  container.querySelector('.painel__conteudo').addEventListener('click', (evento) => {
    const b = evento.target.closest('button[data-acao]');
    if (!b) return;
    const pedido = pedidos.find((p) => p.id === Number(b.dataset.id));
    if (pedido) abrirModal(b.dataset.acao, pedido);
  });

  limpar = () => {
    document.removeEventListener('keydown', aoApertarEsc);
    document.body.style.overflow = '';
  };

  carregar();
}
