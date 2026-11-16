// Nova solicitação de impressão, passo 3 de 3 (Confirmar e enviar), lado AACD.

import { api } from '../../shared/js/api.js';
import { medidas, rotuloMaterial, codigosMateriais, DISPONIBILIDADE } from '../../shared/js/dominio.js';
import { elemento } from '../../shared/js/ui.js';
import { formatarPrazo, montarDescricao, checagens } from '../impressoras-aacd/impressoras-aacd.js';
import { mostrarQuemPreenche, formatarTamanho } from '../nova-solicitacao/nova-solicitacao.js';
import { rascunhoAtual, limparRascunho } from '../../shared/js/rascunho-solicitacao.js';

// Linhas do "Resumo do pedido": [rótulo, valor]. O nome da peça vira o título do card
export function linhasDoPedido(pedido) {
  const quantidade = Number(pedido.quantidade);
  return [
    ['Arquivo', `${pedido.arquivo.name} (${formatarTamanho(pedido.arquivo.size)})`],
    ['Material', rotuloMaterial(pedido.material)],
    ['Tamanho', medidas(pedido)],
    ['Quantidade', `${quantidade} peça${quantidade === 1 ? '' : 's'}`],
    ['Prazo desejado', pedido.prazo ? formatarPrazo(pedido.prazo) : 'Sem prazo definido'],
  ];
}

export function linhasDaChecagem(pedido, impressora) {
  const estados = Object.fromEntries(checagens(pedido, impressora).map((c) => [c.rotulo, c.estado]));
  const materiais = codigosMateriais(impressora).map(rotuloMaterial).join(', ');
  const mesa = medidas(impressora);
  const disp = DISPONIBILIDADE[impressora.disponibilidade]?.rotulo ?? impressora.disponibilidade;
  return [
    {
      rotulo: 'Material',
      precisa: rotuloMaterial(pedido.material),
      tem: materiais || 'Não informados',
      estado: estados.Material ?? 'incerto',
    },
    {
      rotulo: 'Tamanho',
      precisa: medidas(pedido),
      tem: mesa ? `Mesa até ${mesa}` : 'Mesa não informada',
      estado: estados.Tamanho ?? 'incerto',
    },
    {
      rotulo: 'Disponibilidade',
      precisa: pedido.prazo ? `Entrega até ${formatarPrazo(pedido.prazo)}` : 'Sem prazo definido',
      tem: disp ?? 'Não informada',
      estado: estados.Disponibilidade ?? 'incerto',
    },
  ];
}

export function montarFormulario(pedido) {
  const formData = new FormData();
  formData.append('titulo', pedido.titulo);
  formData.append('descricao', montarDescricao(pedido));
  formData.append('quantidade', String(pedido.quantidade));
  formData.append('material', pedido.material);
  formData.append('comprimentoMm', String(pedido.comprimentoMm));
  formData.append('larguraMm', String(pedido.larguraMm));
  formData.append('alturaMm', String(pedido.alturaMm));
  if (pedido.prazo) formData.append('prazoDesejado', pedido.prazo);
  formData.append('impressoraId', String(pedido.impressora.id));
  formData.append('arquivo', pedido.arquivo, pedido.arquivo.name);
  return formData;
}

export function mensagemDeErro(resposta) {
  if (resposta.status === 413) return 'O arquivo passa de 50 MB.';
  if (resposta.status === 403) return 'Só funcionários e administradores da AACD criam pedidos.';
  return resposta.corpo?.erro ?? 'Não foi possível enviar o pedido. Tente de novo.';
}

// ---------- Tela ----------

const ROTULO_BOTAO = 'Enviar solicitação';

export function iniciar(container) {
  const pedido = rascunhoAtual();

  if (!pedido?.arquivo) {
    location.hash = '#/nova-solicitacao';
    return;
  }
  if (!pedido.impressora) {
    location.hash = '#/escolher-impressora';
    return;
  }

  const { impressora } = pedido;
  const empresa = impressora.empresa?.nome ?? 'empresa parceira';
  const revisao = container.querySelector('#revisao');
  const sucesso = container.querySelector('#sucesso');
  const erro = container.querySelector('#erro-envio');
  const botao = container.querySelector('#botao-confirmar');

  // ----- Impressora e tabela de requisitos -----

  container.querySelector('#imp-modelo').textContent = impressora.modelo;
  container.querySelector('#imp-local').textContent = [empresa, impressora.cidade].filter(Boolean).join(' · ');

  container.querySelector('#checagem').replaceChildren(...linhasDaChecagem(pedido, impressora).map((l) => {
    const linha = elemento('tr', '');

    const requisito = elemento('th', 'cs__requisito', l.rotulo);
    requisito.scope = 'row';
    linha.appendChild(requisito);

    linha.appendChild(elemento('td', '', l.precisa));
    linha.appendChild(elemento('td', '', l.tem));

    const sinal = { ok: '✓', falha: '✕' }[l.estado] ?? '?';
    const legenda = { ok: 'Atende', falha: 'Não atende' }[l.estado] ?? 'A confirmar';
    const estado = elemento('td', `cs__estado cs__estado--${l.estado}`, sinal);
    estado.setAttribute('aria-label', legenda);
    linha.appendChild(estado);

    return linha;
  }));

  // ----- Observação -----

  container.querySelector('#observacao-texto').textContent = pedido.observacao || 'Nenhuma observação.';

  // ----- Resumo do pedido -----

  container.querySelector('#resumo-titulo').textContent = pedido.titulo;
  container.querySelector('#dados').replaceChildren(...linhasDoPedido(pedido).flatMap(([rotulo, valor]) => {
    const dd = elemento('dd', '', valor);
    dd.title = valor; 
    return [elemento('dt', '', rotulo), dd];
  }));

  function mostrarResponsavel() {
    const texto = (seletor) => container.querySelector(seletor)?.textContent.trim() ?? '';
    const nome = texto('#ns-usuario-nome');
    if (!nome) return;
    container.querySelector('#resp-nome').textContent = nome;
    container.querySelector('#resp-papel').textContent = texto('#ns-usuario-papel');
    container.querySelector('#resp-iniciais').textContent = texto('#ns-usuario-iniciais');
    container.querySelector('#responsavel').hidden = false;
  }
  Promise.resolve(mostrarQuemPreenche(container)).then(mostrarResponsavel);

  // ----- Envio -----

  function mostrarErro(texto) {
    erro.textContent = texto;
    erro.hidden = false;
    botao.disabled = false;
    botao.textContent = ROTULO_BOTAO;
  }

  botao.addEventListener('click', async () => {
    erro.hidden = true;
    botao.disabled = true;
    botao.textContent = 'Enviando...';

    let resposta;
    try {
      resposta = await api.criarSolicitacao(montarFormulario(pedido));
    } catch {
      mostrarErro('Sem conexão com o servidor. Tente de novo em instantes.');
      return;
    }

    if (resposta.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!resposta.ok) {
      mostrarErro(mensagemDeErro(resposta));
      return;
    }

    limparRascunho();
    const numero = resposta.corpo?.id;
    const titulo = container.querySelector('#sucesso-titulo');
    titulo.textContent = numero ? `Pedido ${numero} enviado!` : 'Pedido enviado!';
    container.querySelector('#sucesso-texto').textContent =
      `${empresa} recebe o pedido agora para a impressora ${impressora.modelo}. Você acompanha a resposta na aba Acompanhamento.`;
    revisao.hidden = true;
    sucesso.hidden = false;
    titulo.focus();
  });
}