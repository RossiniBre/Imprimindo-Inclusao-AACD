// Nova solicitação de impressão, passo 3 de 3 (Confirmar e enviar), lado AACD.
// Mostra os detalhes do rascunho (peça do passo 1 + impressora do passo 2) e, em
// "Confirmar solicitação", cria o pedido no back (POST /api/solicitacoes, multipart).

import { api } from '../../shared/js/api.js';
import { medidas, rotuloMaterial } from '../../shared/js/dominio.js';
import { elemento } from '../../shared/js/ui.js';
import { formatarPrazo, montarDescricao } from '../impressoras-aacd/impressoras-aacd.js';
import { mostrarQuemPreenche, formatarTamanho } from '../nova-solicitacao/nova-solicitacao.js';
import { chipsDaImpressora, desenharChecagem } from '../escolher-impressora/escolher-impressora.js';
import { rascunhoAtual, limparRascunho } from '../../shared/js/rascunho-solicitacao.js';

// ---------- Funções puras (testadas em tests/confirmar-solicitacao.test.js) ----------

// Linhas da tabela "Dados da peça": [rótulo, valor]
export function linhasDoPedido(pedido) {
  const quantidade = Number(pedido.quantidade);
  return [
    ['Nome da peça', pedido.titulo],
    ['Arquivo', `${pedido.arquivo.name} (${formatarTamanho(pedido.arquivo.size)})`],
    ['Material', rotuloMaterial(pedido.material)],
    ['Tamanho', medidas(pedido)],
    ['Quantidade', `${quantidade} peça${quantidade === 1 ? '' : 's'}`],
    ['Prazo desejado', pedido.prazo ? formatarPrazo(pedido.prazo) : 'Sem prazo definido'],
    ['Observação', pedido.observacao || 'Nenhuma'],
  ];
}

// Campos que o back espera (SolicitacaoHandler.java). Material e prazo não têm campo
// próprio: vão no começo da descrição, montada por montarDescricao.
export function montarFormulario(pedido) {
  const formData = new FormData();
  formData.append('titulo', pedido.titulo);
  formData.append('descricao', montarDescricao(pedido));
  formData.append('quantidade', String(pedido.quantidade));
  formData.append('comprimentoMm', String(pedido.comprimentoMm));
  formData.append('larguraMm', String(pedido.larguraMm));
  formData.append('alturaMm', String(pedido.alturaMm));
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

export function iniciar(container) {
  const pedido = rascunhoAtual();

  // Sem rascunho (página recarregada ou link direto) volta ao começo; sem impressora, ao passo 2
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

  mostrarQuemPreenche(container);

  container.querySelector('#imp-modelo').textContent = impressora.modelo;
  container.querySelector('#imp-local').textContent = [empresa, impressora.cidade].filter(Boolean).join(' · ');
  container.querySelector('#imp-chips').replaceChildren(...chipsDaImpressora(impressora));

  container.querySelector('#dados').replaceChildren(...linhasDoPedido(pedido).flatMap(([rotulo, valor]) => [
    elemento('dt', '', rotulo),
    elemento('dd', '', valor),
  ]));

  desenharChecagem(container.querySelector('#checagem'), pedido, impressora);

  function mostrarErro(texto) {
    erro.textContent = texto;
    erro.hidden = false;
    botao.disabled = false;
    botao.textContent = 'Confirmar solicitação';
  }

  botao.addEventListener('click', async () => {
    erro.hidden = true;
    botao.disabled = true;   // evita criar o pedido duas vezes com dois cliques
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

    // Pedido criado: o rascunho acabou (voltar no navegador não reenvia nada)
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
