// Reescolher empresa (pedido recusado): mostra o pedido que foi recusado, cancelado ou falhou,
// deixa escolher outra impressora da rede e reenvia. O back não tem "reenviar": a tela baixa o
// arquivo do pedido antigo, cria um pedido novo para a impressora escolhida e remove o antigo.

import { api } from '../../shared/js/api.js';
import {
  MATERIAIS, DISPONIBILIDADE, cidadeUf, medidas, codigosMateriais, rotuloMaterial,
} from '../../shared/js/dominio.js';
import { elemento, chip, iniciais, criarModal } from '../../shared/js/ui.js';
import { filtrarImpressoras, validarPeca, montarDescricao } from '../impressoras-aacd/impressoras-aacd.js';
import { formatarDataHora } from '../painel-aacd/painel-aacd.js';

export const STATUS_REENVIAVEIS = ['RECUSADA', 'CANCELADA', 'FALHOU'];

export const ROTULO_STATUS = {
  RECUSADA: 'RECUSADO',
  CANCELADA: 'CANCELADO',
  FALHOU: 'FALHOU NA IMPRESSÃO',
};

export const ROTULO_PERFIL = {
  FUNCIONARIO: 'Funcionário(a) da AACD',
  ADMIN: 'Administrador(a) da AACD',
};

// ---------- Funções puras (testadas em tests/reescolher-empresa.test.js) ----------

export function podeReenviar(pedido) {
  return Boolean(pedido) && STATUS_REENVIAVEIS.includes(pedido.status);
}

// Texto do rodapé quando uma impressora está escolhida
export function textoReenvio(impressora) {
  if (!impressora) return 'Escolha uma impressora para reenviar o pedido.';
  const partes = [impressora.empresa?.nome ?? 'Empresa parceira', impressora.modelo];
  if (impressora.cidade) partes.push(impressora.cidade);
  return `Reenviando para ${partes.join(' · ')} · A empresa recebe um novo pedido.`;
}

// Observação do novo pedido: deixa registrado que é um reenvio
export function observacaoReenvio(pedidoId, observacao) {
  const extra = String(observacao ?? '').trim();
  return `Reenvio do pedido ${pedidoId}.${extra ? ` ${extra}` : ''}`;
}

// ---------- Tela ----------

let modalFalso = null;   // só para reaproveitar a limpeza de overflow do helper

export function destruir() {
  modalFalso?.destruir();
  modalFalso = null;
}

export function iniciar(container, { params } = {}) {
  const pedidoId = Number(params?.get('pedido'));
  let pedido = null;
  let impressoras = [];
  let parceirosPorId = {};
  const medidasPorEmpresa = {};
  let escolhida = null;

  const descricao = container.querySelector('#descricao');
  const avisoGeral = container.querySelector('#aviso-geral');
  const colunas = container.querySelector('#colunas');
  const rodape = container.querySelector('#rodape');
  const rodapeTexto = container.querySelector('#rodape-texto');
  const erroReenvio = container.querySelector('#erro-reenvio');
  const botaoReenviar = container.querySelector('#botao-reenviar');
  const sucesso = container.querySelector('#sucesso');
  const sucessoTexto = container.querySelector('#sucesso-texto');
  const sucessoNota = container.querySelector('#sucesso-nota');

  const busca = container.querySelector('#busca');
  const soLivres = container.querySelector('#so-livres');
  const resumo = container.querySelector('#resumo');
  const vazio = container.querySelector('#empresas-vazio');
  const cartoes = container.querySelector('#cartoes');

  const form = container.querySelector('#form-peca');
  const escolhaMaterial = container.querySelector('#escolha-material');

  // O helper de modal não é usado aqui; mantém a assinatura destruir() igual às outras telas
  modalFalso = criarModal(elemento('div'));

  function mostrarAviso(html) {
    avisoGeral.replaceChildren(...html);
    avisoGeral.hidden = false;
  }

  function linkVoltar(texto = 'Voltar para o acompanhamento') {
    const a = elemento('a', '', texto);
    a.href = '#/painel-aacd';
    return a;
  }

  // ----- Pedido -----

  function desenharPedido() {
    container.querySelector('#pedido-id').textContent = pedido.id;
    container.querySelector('#pedido-status').textContent = ROTULO_STATUS[pedido.status] ?? pedido.status;
    container.querySelector('#pedido-titulo').textContent = pedido.titulo;
    container.querySelector('#pedido-enviado').textContent = formatarDataHora(pedido.criadoEm) || '—';
    container.querySelector('#pedido-impressora').textContent = pedido.impressora || 'não informada';
    container.querySelector('#recusa-empresa').textContent = pedido.empresa || 'Empresa não informada';
    container.querySelector('#recusa-motivo').textContent = pedido.justificativa
      ? `Motivo: ${pedido.justificativa}`
      : 'Motivo não informado.';
    container.querySelector('#pedido-origem').textContent = pedido.criadoPor
      ? `Enviado originalmente por ${pedido.criadoPor}`
      : 'Enviado originalmente pela AACD';

    descricao.textContent = `O pedido ${pedido.id} foi ${
      pedido.status === 'RECUSADA' ? `recusado por ${pedido.empresa ?? 'a empresa'}`
        : pedido.status === 'CANCELADA' ? 'cancelado'
          : `marcado como falha por ${pedido.empresa ?? 'a empresa'}`
    }. Escolha outra empresa para reenviá-lo.`;
  }

  function desenharMateriais(impressora) {
    const suportados = codigosMateriais(impressora);
    const marcado = form.querySelector('input[name="material"]:checked')?.value;
    escolhaMaterial.replaceChildren(...MATERIAIS.map((m) => {
      const rotulo = elemento('label');
      const entrada = document.createElement('input');
      entrada.type = 'radio';
      entrada.name = 'material';
      entrada.value = m.codigo;
      entrada.disabled = suportados.length > 0 && !suportados.includes(m.codigo);
      entrada.checked = marcado === m.codigo && !entrada.disabled;
      rotulo.appendChild(entrada);
      rotulo.appendChild(document.createTextNode(m.rotulo));
      return rotulo;
    }));
  }

  // ----- Impressoras -----

  function montarCartao(i) {
    const cartao = elemento('article', 'cartao');
    if (escolhida?.id === i.id) cartao.classList.add('selecionado');

    const topo = elemento('div', 'cartao__topo');
    topo.appendChild(elemento('h3', 'cartao__titulo', i.empresa?.nome ?? 'Empresa parceira'));
    const disp = DISPONIBILIDADE[i.disponibilidade] ?? { rotulo: i.disponibilidade, classe: 'chip--neutro' };
    topo.appendChild(chip(disp.classe, disp.rotulo));
    cartao.appendChild(topo);

    const detalhe = elemento('p', 'cartao__detalhe');
    detalhe.appendChild(elemento('strong', '', i.modelo));
    if (i.cidade) detalhe.appendChild(document.createTextNode(` · ${i.cidade}`));
    cartao.appendChild(detalhe);

    const chips = elemento('div', 'cartao__chips');
    if (pedido?.empresa && i.empresa?.nome === pedido.empresa) {
      chips.appendChild(chip('chip--erro', 'Recusou este pedido'));
    }
    codigosMateriais(i).forEach((m) => chips.appendChild(chip('chip--contorno', rotuloMaterial(m))));
    cartao.appendChild(chips);

    const rodapeCartao = elemento('div', 'cartao__rodape');
    const mesa = medidas(i);
    rodapeCartao.appendChild(elemento('span', 'cartao__detalhe', mesa ? `Mesa ${mesa}` : `Impressora ${i.id}`));
    const botao = elemento('button', 'botao-selecionar', escolhida?.id === i.id ? '✓ Selecionada' : 'Selecionar');
    botao.type = 'button';
    botao.setAttribute('role', 'radio');
    botao.setAttribute('aria-checked', String(escolhida?.id === i.id));
    botao.dataset.id = i.id;
    rodapeCartao.appendChild(botao);
    cartao.appendChild(rodapeCartao);

    return cartao;
  }

  function renderizar() {
    const filtradas = filtrarImpressoras(impressoras, { busca: busca.value, soLivres: soLivres.checked });
    resumo.textContent = `${filtradas.length} de ${impressoras.length} impressora${impressoras.length === 1 ? '' : 's'} da rede`;
    vazio.hidden = filtradas.length > 0;
    cartoes.replaceChildren(...filtradas.map(montarCartao));
  }

  async function completarMedidas(impressora) {
    const empresaId = impressora.empresa?.id;
    if (!empresaId) return impressora;
    if (!medidasPorEmpresa[empresaId]) {
      try {
        const resposta = await api.impressorasDoParceiro(empresaId);
        const mapa = {};
        if (resposta.ok && Array.isArray(resposta.corpo)) resposta.corpo.forEach((i) => { mapa[i.id] = i; });
        medidasPorEmpresa[empresaId] = mapa;
      } catch {
        return impressora;
      }
    }
    const completa = medidasPorEmpresa[empresaId][impressora.id];
    return completa ? { ...impressora, ...completa, empresa: impressora.empresa, cidade: impressora.cidade } : impressora;
  }

  async function escolher(id) {
    const base = impressoras.find((i) => i.id === id);
    if (!base) return;
    escolhida = base;
    erroReenvio.hidden = true;
    rodapeTexto.textContent = textoReenvio(escolhida);
    botaoReenviar.disabled = false;
    renderizar();
    desenharMateriais(escolhida);

    const completa = await completarMedidas(base);
    if (escolhida?.id === base.id) {
      escolhida = completa;
      impressoras = impressoras.map((i) => (i.id === base.id ? completa : i));
      renderizar();
      desenharMateriais(escolhida);
    }
  }

  cartoes.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-id]');
    if (botao) escolher(Number(botao.dataset.id));
  });

  [busca, soLivres].forEach((campo) => campo.addEventListener('input', renderizar));

  // ----- Reenvio -----

  function lerFormulario() {
    return {
      titulo: pedido.titulo,
      quantidade: form.querySelector('#campo-quantidade').value,
      material: form.querySelector('input[name="material"]:checked')?.value ?? '',
      comprimentoMm: form.querySelector('#campo-comprimento').value,
      larguraMm: form.querySelector('#campo-largura').value,
      alturaMm: form.querySelector('#campo-altura').value,
      observacao: form.querySelector('#campo-observacao').value,
    };
  }

  function mostrarErros(erros) {
    ['quantidade', 'material', 'medidas'].forEach((campo) => {
      container.querySelector(`#erro-${campo}`).textContent = erros[campo] ?? '';
    });
    form.querySelector('#campo-quantidade').classList.toggle('com-erro', Boolean(erros.quantidade));
    ['comprimento', 'largura', 'altura'].forEach((m) =>
      form.querySelector(`#campo-${m}`).classList.toggle('com-erro', Boolean(erros.medidas)));
  }

  function falharReenvio(texto) {
    erroReenvio.textContent = texto;
    erroReenvio.hidden = false;
    botaoReenviar.disabled = false;
    botaoReenviar.textContent = 'Reenviar pedido';
  }

  botaoReenviar.addEventListener('click', async () => {
    if (!escolhida || !pedido) return;

    const dados = lerFormulario();
    const erros = validarPeca(dados, escolhida);
    mostrarErros(erros);
    if (Object.keys(erros).length > 0) {
      falharReenvio('Confira os dados da peça na coluna da esquerda.');
      container.querySelector(`#erro-${Object.keys(erros)[0]}`)?.scrollIntoView({ block: 'center' });
      return;
    }

    erroReenvio.hidden = true;
    botaoReenviar.disabled = true;
    botaoReenviar.textContent = 'Reenviando...';

    let arquivo;
    try {
      arquivo = await api.arquivoSolicitacao(pedido.id);
    } catch {
      falharReenvio('Sem conexão com o servidor. Tente de novo em instantes.');
      return;
    }
    if (!arquivo.ok) {
      falharReenvio(arquivo.status === 404
        ? 'O arquivo do pedido antigo não foi encontrado. Crie um pedido novo em Impressoras.'
        : (arquivo.corpo?.erro ?? 'Não foi possível baixar o arquivo do pedido.'));
      return;
    }

    const formData = new FormData();
    formData.append('titulo', pedido.titulo);
    formData.append('descricao', montarDescricao({
      material: dados.material,
      observacao: observacaoReenvio(pedido.id, dados.observacao),
    }));
    formData.append('quantidade', String(Number(dados.quantidade)));
    formData.append('comprimentoMm', String(Number(dados.comprimentoMm)));
    formData.append('larguraMm', String(Number(dados.larguraMm)));
    formData.append('alturaMm', String(Number(dados.alturaMm)));
    formData.append('impressoraId', String(escolhida.id));
    formData.append('arquivo', arquivo.blob, arquivo.nome);

    let criado;
    try {
      criado = await api.criarSolicitacao(formData);
    } catch {
      falharReenvio('Sem conexão com o servidor. Tente de novo em instantes.');
      return;
    }
    if (criado.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!criado.ok) {
      falharReenvio(criado.corpo?.erro ?? 'Não foi possível reenviar o pedido.');
      return;
    }

    // O antigo sai da lista de recusadas; se falhar, o novo já existe e a pessoa é avisada
    let removido = false;
    try {
      removido = (await api.excluirSolicitacao(pedido.id)).ok;
    } catch { /* fica na lista */ }

    colunas.hidden = true;
    rodape.hidden = true;
    descricao.hidden = true;
    sucessoTexto.textContent = `O pedido ${pedido.id} virou o pedido ${criado.corpo?.id ?? ''} para ${
      escolhida.empresa?.nome ?? 'a empresa escolhida'} (${escolhida.modelo}).`;
    sucessoNota.hidden = removido;
    sucessoNota.textContent = removido ? '' : `O pedido ${pedido.id} continua na lista de recusadas; remova-o pelo Acompanhamento.`;
    sucesso.hidden = false;
    sucesso.querySelector('a')?.focus();
  });

  // ----- Carga -----

  async function carregar() {
    if (!pedidoId) {
      descricao.hidden = true;
      mostrarAviso([document.createTextNode('Nenhum pedido informado. '), linkVoltar()]);
      return;
    }

    let respostas;
    try {
      respostas = await Promise.all([api.solicitacoes(), api.painelImpressoras(), api.parceiros(), api.eu()]);
    } catch {
      descricao.hidden = true;
      mostrarAviso([document.createTextNode('Sem conexão com o servidor. Recarregue a página para tentar de novo.')]);
      return;
    }

    const [rSolicitacoes, rImpressoras, rParceiros, rEu] = respostas;
    if (rSolicitacoes.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!rSolicitacoes.ok) {
      descricao.hidden = true;
      mostrarAviso([document.createTextNode(rSolicitacoes.corpo?.erro ?? 'Não foi possível carregar o pedido.')]);
      return;
    }

    pedido = (Array.isArray(rSolicitacoes.corpo) ? rSolicitacoes.corpo : []).find((s) => s.id === pedidoId) ?? null;
    if (!pedido) {
      descricao.hidden = true;
      mostrarAviso([document.createTextNode(`O pedido ${pedidoId} não foi encontrado. `), linkVoltar()]);
      return;
    }
    if (!podeReenviar(pedido)) {
      descricao.hidden = true;
      mostrarAviso([
        document.createTextNode(`O pedido ${pedidoId} não está recusado, cancelado nem com falha, então não precisa ser reenviado. `),
        linkVoltar(),
      ]);
      return;
    }

    // Motivo mais completo, se o back tiver
    try {
      const detalhe = await api.verSolicitacao(pedido.id);
      if (detalhe.ok && detalhe.corpo?.justificativa) pedido.justificativa = detalhe.corpo.justificativa;
    } catch { /* fica o da lista */ }

    parceirosPorId = {};
    if (rParceiros.ok && Array.isArray(rParceiros.corpo)) rParceiros.corpo.forEach((p) => { parceirosPorId[p.id] = p; });
    impressoras = (rImpressoras.ok && Array.isArray(rImpressoras.corpo) ? rImpressoras.corpo : [])
      .map((i) => ({ ...i, cidade: cidadeUf(parceirosPorId[i.empresa?.id]?.endereco) }));

    const eu = rEu.ok ? rEu.corpo ?? {} : {};
    const nome = eu.nome || 'Você';
    container.querySelector('#eu-nome').textContent = nome;
    container.querySelector('#eu-avatar').textContent = eu.nome ? iniciais(eu.nome) : 'EU';
    container.querySelector('#eu-perfil').textContent = ROTULO_PERFIL[eu.perfil] ?? 'Equipe da AACD';

    desenharPedido();
    desenharMateriais(null);
    colunas.hidden = false;
    rodape.hidden = false;
    renderizar();
  }

  carregar();
}
