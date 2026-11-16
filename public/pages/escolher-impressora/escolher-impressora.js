// Nova solicitação de impressão, passo 2 de 3 (Escolher impressora), lado AACD.

import { api } from '../../shared/js/api.js';
import {
  DISPONIBILIDADE, cidadeUf, medidas, cabeNaImpressora, codigosMateriais, rotuloMaterial,
  formatarTelefone,
} from '../../shared/js/dominio.js';
import { elemento, chip, criarModal } from '../../shared/js/ui.js';
import { formatarPrazo, checagens } from '../impressoras-aacd/impressoras-aacd.js';
import { mostrarQuemPreenche } from '../nova-solicitacao/nova-solicitacao.js';
import { salvarRascunho, rascunhoAtual } from '../../shared/js/rascunho-solicitacao.js';

export const PROXIMO_PASSO = '#/confirmar-solicitacao';

// ---------- Funções puras (testadas em tests/escolher-impressora.test.js) ----------

export function motivoDeNaoAtender(impressora, pedido) {
  if (impressora.ativo === false) return 'desativada';
  const materiais = codigosMateriais(impressora);
  if (materiais.length > 0 && !materiais.includes(pedido.material)) return 'material';
  if (cabeNaImpressora(pedido, impressora) === false) return 'tamanho';
  return null;
}

// Impressoras que atendem, na ordem da tela: a que a pessoa já tinha clicado antes
// (pedido.impressoraId), depois as livres, depois as em uso; empate por modelo.
export function impressorasQueAtendem(lista, pedido) {
  const peso = (i) => (i.id === pedido.impressoraId ? 0 : i.disponibilidade === 'OCIOSA' ? 1 : 2);
  return lista
    .filter((i) => motivoDeNaoAtender(i, pedido) === null)
    .sort((a, b) => peso(a) - peso(b) || String(a.modelo).localeCompare(String(b.modelo), 'pt-BR'));
}

// Quantas ficaram de fora por cada motivo: { desativada, material, tamanho }
export function contarDescartadas(lista, pedido) {
  const contagem = { desativada: 0, material: 0, tamanho: 0 };
  lista.forEach((i) => {
    const motivo = motivoDeNaoAtender(i, pedido);
    if (motivo) contagem[motivo] += 1;
  });
  return contagem;
}

// 'Prótese de mão · PLA · 180 × 95 × 60 mm · 2 peças · prazo 15/10/2026'
export function resumoDoPedido(pedido) {
  const partes = [pedido.titulo, rotuloMaterial(pedido.material), medidas(pedido)];
  const quantidade = Number(pedido.quantidade);
  if (quantidade > 0) partes.push(`${quantidade} peça${quantidade === 1 ? '' : 's'}`);
  if (pedido.prazo) partes.push(`prazo ${formatarPrazo(pedido.prazo)}`);
  return partes.filter(Boolean).join(' · ');
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- Pedaços de tela que o passo 3 também usa ----------

// Chips da impressora: Livre/Em uso, mesa e materiais
export function chipsDaImpressora(impressora) {
  const disp = DISPONIBILIDADE[impressora.disponibilidade]
    ?? { rotulo: impressora.disponibilidade, classe: 'chip--neutro' };
  const mesa = medidas(impressora);
  return [
    chip(disp.classe, disp.rotulo),
    chip('chip--neutro', mesa ? `Mesa ${mesa}` : 'Mesa não informada'),
    ...codigosMateriais(impressora).map((m) => chip('chip--contorno', rotuloMaterial(m))),
  ];
}

// Preenche a lista "a peça precisa × a impressora tem" (material, tamanho e disponibilidade)
export function desenharChecagem(lista, pedido, impressora) {
  lista.replaceChildren(...checagens(pedido, impressora).map((c) => {
    const li = elemento('li', c.estado);
    li.appendChild(elemento('span', 'ns__checagem-icone', c.estado === 'ok' ? '✓' : c.estado === 'falha' ? '✕' : '?'));
    li.appendChild(elemento('span', '', c.rotulo));
    li.appendChild(elemento('span', 'ns__checagem-valor', c.valor));
    return li;
  }));
}

// ---------- Tela ----------

let modal = null;

export function destruir() {
  modal?.destruir();
  modal = null;
}

export function iniciar(container) {
  const pedido = rascunhoAtual();

  // Sem rascunho (página recarregada ou link direto) não há o que filtrar: volta ao passo 1
  if (!pedido?.arquivo) {
    location.hash = '#/nova-solicitacao';
    return;
  }

  const descricao = container.querySelector('#descricao');
  const avisoGeral = container.querySelector('#aviso-geral');
  const vazia = container.querySelector('#lista-vazia');
  const vaziaMotivo = container.querySelector('#vazia-motivo');
  const cartoes = container.querySelector('#cartoes');
  const rodape = container.querySelector('#rodape');
  const barra = container.querySelector('#barra-continuar');
  const barraTexto = container.querySelector('#barra-texto');

  const fundoModal = container.querySelector('#modal-detalhes');
  const modalSelecionar = fundoModal.querySelector('#modal-selecionar');

  let compativeis = [];
  let escolhidaId = pedido.impressora?.id ?? null;
  let emDetalhe = null;

  modal = criarModal(fundoModal, { aoFechar: () => { emDetalhe = null; } });

  container.querySelector('#pedido').textContent = resumoDoPedido(pedido);
  mostrarQuemPreenche(container);

  function mostrarErro(texto) {
    descricao.textContent = '';
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  const nomeDaEmpresa = (i) => i.empresa?.nome ?? 'empresa parceira';

  // ----- Cartões -----

  function montarCartao(i) {
    const escolhida = i.id === escolhidaId;
    const cartao = elemento('article', 'ei__cartao');
    if (escolhida) cartao.classList.add('ei__cartao--escolhida');

    const topo = elemento('div', 'ei__cartao-topo');
    topo.appendChild(elemento('h3', '', i.modelo));
    const disp = DISPONIBILIDADE[i.disponibilidade] ?? { rotulo: i.disponibilidade, classe: 'chip--neutro' };
    topo.appendChild(chip(disp.classe, disp.rotulo));
    cartao.appendChild(topo);

    cartao.appendChild(elemento(
      'p', 'ei__cartao-local',
      [i.empresa?.nome ?? 'Empresa parceira', i.cidade].filter(Boolean).join(' · '),
    ));

    const mesa = medidas(i);
    cartao.appendChild(elemento(
      'p', mesa ? 'ei__cartao-mesa ei__cartao-mesa--ok' : 'ei__cartao-mesa',
      mesa ? `Mesa ${mesa}` : 'Mesa não informada: confirme com a empresa',
    ));

    const base = elemento('div', 'ei__cartao-base');

    const detalhes = elemento('button', 'ei__detalhes', 'Ver detalhes');
    detalhes.type = 'button';
    detalhes.dataset.detalhes = i.id;
    detalhes.setAttribute('aria-label', `Ver detalhes: ${i.modelo}, ${nomeDaEmpresa(i)}`);
    base.appendChild(detalhes);

    const botao = elemento('button', 'ei__selecionar', escolhida ? 'Selecionada ✓' : 'Selecionar');
    botao.type = 'button';
    botao.dataset.id = i.id;
    botao.setAttribute('aria-pressed', String(escolhida));
    botao.setAttribute('aria-label', `${escolhida ? 'Desmarcar' : 'Selecionar'}: ${i.modelo}, ${nomeDaEmpresa(i)}`);
    base.appendChild(botao);

    cartao.appendChild(base);
    return cartao;
  }

  // Barra do "Continuar": só aparece depois que uma impressora foi selecionada
  function desenharBarra() {
    const escolhida = compativeis.find((i) => i.id === escolhidaId);
    barra.hidden = !escolhida;
    barraTexto.textContent = escolhida ? `${escolhida.modelo} · ${nomeDaEmpresa(escolhida)}` : '';
  }

  function desenharCartoes() {
    const rolagem = cartoes.scrollTop;
    cartoes.replaceChildren(...compativeis.map(montarCartao));
    cartoes.scrollTop = rolagem;
    desenharBarra();
  }

  function renderizar(totalDaRede, descartadas) {
    descricao.textContent = compativeis.length === 0
      ? ''
      : `${plural(compativeis.length, 'impressora ativa trabalha', 'impressoras ativas trabalham')} com ${rotuloMaterial(pedido.material)} e ${compativeis.length === 1 ? 'comporta' : 'comportam'} a peça.`;

    desenharCartoes();
    vazia.hidden = compativeis.length > 0;
    rodape.hidden = compativeis.length === 0;
    rodape.textContent = `Mostrando ${compativeis.length} de ${plural(totalDaRede, 'impressora', 'impressoras')} da rede.`;

    if (compativeis.length === 0) {
      const motivos = [];
      if (descartadas.material) motivos.push(`${plural(descartadas.material, 'não trabalha', 'não trabalham')} com ${rotuloMaterial(pedido.material)}`);
      if (descartadas.tamanho) motivos.push(`${plural(descartadas.tamanho, 'tem', 'têm')} a mesa menor que a peça`);
      if (descartadas.desativada) motivos.push(`${plural(descartadas.desativada, 'está desativada', 'estão desativadas')}`);
      vaziaMotivo.textContent = totalDaRede === 0
        ? 'Ainda não há impressoras cadastradas na rede.'
        : `Das ${plural(totalDaRede, 'impressora', 'impressoras')} da rede: ${motivos.join('; ')}.`;
    }
  }

  // ----- Selecionar e continuar -----

  function selecionar(impressora) {
    escolhidaId = impressora.id;
    salvarRascunho({ ...rascunhoAtual(), impressoraId: impressora.id, impressora });
    desenharCartoes();
  }

  function desmarcar() {
    escolhidaId = null;
    salvarRascunho({ ...rascunhoAtual(), impressoraId: null, impressora: null });
    desenharCartoes();
  }

  container.querySelector('#botao-continuar').addEventListener('click', () => {
    if (rascunhoAtual()?.impressora) location.hash = PROXIMO_PASSO;
  });

  // ----- Modal de detalhes -----

  function abrirDetalhes(i) {
    emDetalhe = i;
    fundoModal.querySelector('#modal-titulo').textContent = i.modelo;
    fundoModal.querySelector('#modal-local').textContent = [nomeDaEmpresa(i), i.cidade].filter(Boolean).join(' · ');
    fundoModal.querySelector('#modal-chips').replaceChildren(...chipsDaImpressora(i));

    const linhas = [
      ['Empresa', i.empresa?.nome],
      ['Cidade', i.cidade],
      ['E-mail', i.contato?.email],
      ['Telefone', formatarTelefone(i.contato?.telefone)],
      ['Mesa de impressão', medidas(i) || 'Não informada'],
      ['Materiais', codigosMateriais(i).map(rotuloMaterial).join(', ') || 'Não informados'],
      ['Código na rede', `Impressora ${i.id}`],
    ].filter(([, valor]) => valor);
    fundoModal.querySelector('#modal-dados').replaceChildren(...linhas.flatMap(([rotulo, valor]) => [
      elemento('dt', '', rotulo),
      elemento('dd', '', valor),
    ]));

    desenharChecagem(fundoModal.querySelector('#modal-checagem'), pedido, i);

    const jaEscolhida = i.id === escolhidaId;
    modalSelecionar.textContent = jaEscolhida ? 'Desmarcar esta impressora' : 'Selecionar esta impressora';
    modalSelecionar.disabled = false;
    modal.abrir(fundoModal.querySelector('[data-fechar]'));
  }

  modalSelecionar.addEventListener('click', () => {
    const impressora = emDetalhe;
    if (!impressora) return;
    modal.fechar();
    if (impressora.id === escolhidaId) {
      desmarcar();
    } else {
      selecionar(impressora);
      container.querySelector('#botao-continuar').focus();
    }
  });

  cartoes.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button');
    if (!botao) return;
    const id = Number(botao.dataset.detalhes ?? botao.dataset.id);
    const impressora = compativeis.find((i) => i.id === id);
    if (!impressora) return;

    if (botao.dataset.detalhes) {
      abrirDetalhes(impressora);
      return;
    }
    if (impressora.id === escolhidaId) {
      desmarcar();
    } else {
      selecionar(impressora);
    }
    cartoes.querySelector(`button[data-id="${impressora.id}"]`)?.focus();

  });

  // ----- Carregar -----

  async function carregar() {
    let painel;
    let parceiros;
    try {
      [painel, parceiros] = await Promise.all([api.painelImpressoras(), api.parceiros()]);
    } catch {
      mostrarErro('Sem conexão com o servidor. Recarregar a página apaga os dados da peça: volte ao passo anterior e tente de novo.');
      return;
    }

    if (painel.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (painel.status === 403) {
      mostrarErro('Só funcionários e administradores da AACD acessam esta tela.');
      return;
    }
    if (!painel.ok) {
      mostrarErro(painel.corpo?.erro ?? 'Não foi possível carregar as impressoras.');
      return;
    }

    const parceirosPorId = {};
    if (parceiros.ok && Array.isArray(parceiros.corpo)) {
      parceiros.corpo.forEach((p) => { parceirosPorId[p.id] = p; });
    }

    const rede = (Array.isArray(painel.corpo) ? painel.corpo : []).map((i) => {
      const parceiro = parceirosPorId[i.empresa?.id];
      return {
        ...i,
        cidade: cidadeUf(parceiro?.endereco),
        contato: { email: parceiro?.email ?? '', telefone: parceiro?.telefone ?? '' },
        // Sem o campo, a impressora conta como ativa; só `false` (ou 0) é desativada
        ativo: !(i.ativo === false || i.ativo === 0),
      };
    });

    // A rota do painel não traz as medidas da mesa: elas vêm por empresa. Só busca as
    // empresas que ainda têm impressora na disputa depois do filtro de material.
    const candidatas = rede.filter((i) => motivoDeNaoAtender(i, pedido) === null);
    const empresas = [...new Set(candidatas.map((i) => i.empresa?.id).filter(Boolean))];
    const mesasPorId = {};
    await Promise.all(empresas.map(async (empresaId) => {
      try {
        const resposta = await api.impressorasDoParceiro(empresaId);
        if (resposta.ok && Array.isArray(resposta.corpo)) {
          resposta.corpo.forEach((i) => { mesasPorId[i.id] = i; });
        }
      } catch { /* sem as medidas desta empresa: as impressoras dela ficam com "mesa não informada" */ }
    }));

    const completas = rede.map((i) => {
      const mesa = mesasPorId[i.id];
      return mesa
        ? { ...i, comprimentoMm: mesa.comprimentoMm, larguraMm: mesa.larguraMm, alturaMm: mesa.alturaMm }
        : i;
    });

    compativeis = impressorasQueAtendem(completas, pedido);
    // A impressora escolhida antes pode ter deixado de atender (os dados da peça mudaram)
    if (escolhidaId !== null && !compativeis.some((i) => i.id === escolhidaId)) {
      escolhidaId = null;
      salvarRascunho({ ...rascunhoAtual(), impressora: null });
    }
    renderizar(completas.length, contarDescartadas(completas, pedido));
  }

  carregar();
}