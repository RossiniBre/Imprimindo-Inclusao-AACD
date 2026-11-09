// Solicitações de doação (lado AACD): lista o que as empresas ofereceram (impressora, filamento ou
// os dois), com filtro por tipo e modal de detalhes. "Aceitar" tira a doação da lista.

import { api } from '../../shared/js/api.js';
import { rotuloTipoDoacao, cidadeUf } from '../../shared/js/dominio.js';
import { elemento, chip, iniciais, tempoRelativo, criarModal, copiarTexto } from '../../shared/js/ui.js';

// ---------- Funções puras (testadas em tests/doacoes.test.js) ----------

export function filtrarDoacoes(lista, tipo = '') {
  return tipo ? lista.filter((d) => d.tipo === tipo) : lista;
}

// Mais recentes primeiro; sem data vai para o fim
export function ordenarDoacoes(lista) {
  const valor = (d) => {
    const t = new Date(d.dataManifestacao ?? '').getTime();
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...lista].sort((a, b) => valor(b) - valor(a));
}

export function contarPorTipo(lista) {
  const totais = { '': lista.length, IMPRESSORA: 0, FILAMENTO: 0, AMBOS: 0 };
  for (const d of lista) {
    if (d.tipo in totais) totais[d.tipo] += 1;
  }
  return totais;
}

// 231 -> "0231"
export function numeroDoacao(id) {
  return String(id ?? '').padStart(4, '0');
}

export function resumoItens(d) {
  const q = Number(d.quantidade) || 1;
  return `${q} unidade${q === 1 ? '' : 's'} · ${rotuloTipoDoacao(d.tipo)}`;
}

export const CLASSE_DO_TIPO = {
  IMPRESSORA: 'chip--neutro',
  FILAMENTO: 'chip--destaque',
  AMBOS: 'chip--sucesso',
};

// ---------- Tela ----------

let modal = null;

export function destruir() {
  modal?.destruir();
  modal = null;
}

export function iniciar(container) {
  let doacoes = [];
  let parceirosPorId = {};
  let tipoAtivo = '';
  let doacaoAberta = null;

  const filtros = container.querySelectorAll('.filtro');
  const avisoGeral = container.querySelector('#aviso-geral');
  const avisoSucesso = container.querySelector('#aviso-sucesso');
  const carregando = container.querySelector('#lista-carregando');
  const vazia = container.querySelector('#lista-vazia');
  const cartoes = container.querySelector('#cartoes');

  const fundo = container.querySelector('#modal-doacao');
  const modalAvatar = container.querySelector('#modal-avatar');
  const modalTitulo = container.querySelector('#modal-titulo');
  const modalSubtitulo = container.querySelector('#modal-subtitulo');
  const modalChips = container.querySelector('#modal-chips');
  const modalItens = container.querySelector('#modal-itens');
  const modalDescricao = container.querySelector('#modal-descricao');
  const modalContatos = container.querySelector('#modal-contatos');
  const detalhes = container.querySelector('#modal-detalhes');
  const confirmar = container.querySelector('#modal-confirmar');
  const erroModal = container.querySelector('#erro-modal');
  const erroConfirmar = container.querySelector('#erro-confirmar');
  const botaoAceitar = container.querySelector('#botao-aceitar');
  const botaoVoltar = container.querySelector('#botao-voltar');
  const botaoConfirmar = container.querySelector('#botao-confirmar');

  modal = criarModal(fundo, { aoFechar: () => { doacaoAberta = null; } });

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  // ----- Cartões -----

  function montarCartao(d) {
    const cartao = elemento('article', 'cartao');
    const nome = d.empresa?.nome ?? 'Empresa parceira';

    const topo = elemento('div', 'cartao__topo');
    const quem = elemento('div', 'cartao__quem');
    quem.appendChild(elemento('span', 'avatar', iniciais(nome)));
    const textos = elemento('div');
    textos.appendChild(elemento('h3', 'cartao__titulo', nome));
    const quando = tempoRelativo(d.dataManifestacao);
    textos.appendChild(elemento('p', 'cartao__detalhe', quando ? `recebida ${quando}` : `Doação ${numeroDoacao(d.id)}`));
    quem.appendChild(textos);
    topo.appendChild(quem);
    topo.appendChild(chip(CLASSE_DO_TIPO[d.tipo] ?? 'chip--neutro', rotuloTipoDoacao(d.tipo)));
    cartao.appendChild(topo);

    const caixa = elemento('div', 'cartao__caixa');
    caixa.appendChild(elemento('strong', '', resumoItens(d)));
    caixa.appendChild(elemento('span', '', d.descricao ?? ''));
    cartao.appendChild(caixa);

    const rodape = elemento('div', 'cartao__rodape');
    const botao = elemento('button', 'botao-principal', 'Ver detalhes');
    botao.type = 'button';
    botao.dataset.id = d.id;
    rodape.appendChild(botao);
    cartao.appendChild(rodape);

    return cartao;
  }

  function renderizar() {
    const totais = contarPorTipo(doacoes);
    filtros.forEach((f) => {
      f.setAttribute('aria-pressed', String(f.dataset.tipo === tipoAtivo));
      f.querySelector('[data-total]').textContent = totais[f.dataset.tipo] || '';
    });

    const lista = filtrarDoacoes(ordenarDoacoes(doacoes), tipoAtivo);
    carregando.hidden = true;
    vazia.hidden = lista.length > 0;
    cartoes.replaceChildren(...lista.map(montarCartao));
  }

  async function carregar() {
    avisoGeral.hidden = true;

    let rDoacoes;
    let rParceiros;
    try {
      [rDoacoes, rParceiros] = await Promise.all([api.doacoes(), api.parceiros()]);
    } catch {
      carregando.hidden = true;
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
      return;
    }

    if (rDoacoes.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!rDoacoes.ok) {
      carregando.hidden = true;
      mostrarAviso(rDoacoes.status === 403
        ? 'Só funcionários e administradores da AACD acessam esta tela.'
        : (rDoacoes.corpo?.erro ?? 'Não foi possível carregar as doações.'));
      return;
    }

    doacoes = Array.isArray(rDoacoes.corpo) ? rDoacoes.corpo : [];
    parceirosPorId = {};
    if (rParceiros.ok && Array.isArray(rParceiros.corpo)) {
      rParceiros.corpo.forEach((p) => { parceirosPorId[p.id] = p; });
    }
    renderizar();
  }

  filtros.forEach((f) => f.addEventListener('click', () => {
    tipoAtivo = f.dataset.tipo;
    renderizar();
  }));

  // ----- Modal -----

  function contato(icone, texto, detalhe) {
    const li = elemento('li');
    const botao = elemento('button');
    botao.type = 'button';
    botao.title = 'Copiar';
    const marca = elemento('span', 'contatos__icone');
    marca.textContent = icone;
    marca.setAttribute('aria-hidden', 'true');
    botao.appendChild(marca);
    const corpo = elemento('span', '', texto);
    if (detalhe) corpo.appendChild(elemento('small', '', detalhe));
    botao.appendChild(corpo);
    const copiado = elemento('span', 'contatos__copiado', '');
    botao.appendChild(copiado);
    botao.addEventListener('click', () => copiarTexto(detalhe ? `${texto}, ${detalhe}` : texto, copiado));
    li.appendChild(botao);
    return li;
  }

  function abrirDetalhes(id) {
    const d = doacoes.find((x) => x.id === id);
    if (!d) return;
    doacaoAberta = d;
    const empresa = d.empresa ?? {};
    const parceiro = parceirosPorId[empresa.id];
    const endereco = parceiro?.endereco;

    modalAvatar.textContent = iniciais(empresa.nome);
    modalTitulo.textContent = empresa.nome ?? 'Empresa parceira';
    const quando = tempoRelativo(d.dataManifestacao);
    modalSubtitulo.textContent = `Doação ${numeroDoacao(d.id)}${quando ? ` · recebida ${quando}` : ''}`;

    const chips = [chip(CLASSE_DO_TIPO[d.tipo] ?? 'chip--neutro', rotuloTipoDoacao(d.tipo))];
    if (empresa.ativa === false) chips.push(chip('chip--erro', 'Empresa inativa'));
    modalChips.replaceChildren(...chips);

    modalItens.textContent = resumoItens(d);
    modalDescricao.textContent = d.descricao || 'A empresa não deixou observação.';

    const contatos = [];
    if (empresa.telefone) contatos.push(contato('☎', empresa.telefone));
    if (empresa.email) contatos.push(contato('✉', empresa.email));
    if (endereco) {
      const rua = [endereco.rua, endereco.numero].filter(Boolean).join(', ');
      const linha = [rua, endereco.bairro].filter(Boolean).join(' — ');
      contatos.push(contato('⌖', linha || 'Endereço cadastrado', cidadeUf(endereco)));
    }
    if (contatos.length === 0) {
      const li = elemento('li');
      li.appendChild(elemento('p', 'modal__subtitulo', 'A empresa não tem contatos cadastrados.'));
      contatos.push(li);
    }
    modalContatos.replaceChildren(...contatos);

    detalhes.hidden = false;
    confirmar.hidden = true;
    erroModal.hidden = true;
    erroConfirmar.hidden = true;
    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = 'Confirmar aceite';

    modal.abrir(fundo.querySelector('.modal__fechar'));
  }

  cartoes.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-id]');
    if (botao) abrirDetalhes(Number(botao.dataset.id));
  });

  botaoAceitar.addEventListener('click', () => {
    detalhes.hidden = true;
    confirmar.hidden = false;
    botaoConfirmar.focus();
  });

  botaoVoltar.addEventListener('click', () => {
    confirmar.hidden = true;
    detalhes.hidden = false;
    botaoAceitar.focus();
  });

  botaoConfirmar.addEventListener('click', async () => {
    if (!doacaoAberta) return;
    const d = doacaoAberta;
    erroConfirmar.hidden = true;
    botaoConfirmar.disabled = true;
    botaoConfirmar.textContent = 'Confirmando...';

    try {
      const resposta = await api.excluirDoacao(d.id);
      if (resposta.ok) {
        modal.fechar();
        avisoSucesso.textContent = `Doação ${numeroDoacao(d.id)} de ${d.empresa?.nome ?? 'empresa parceira'} aceita e retirada da lista.`;
        avisoSucesso.hidden = false;
        await carregar();
        return;
      }
      if (resposta.status === 401) {
        location.hash = '#/login';
        return;
      }
      erroConfirmar.textContent = resposta.corpo?.erro ?? 'Não foi possível concluir. Tente de novo.';
    } catch {
      erroConfirmar.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
    }
    erroConfirmar.hidden = false;
    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = 'Confirmar aceite';
  });

  carregar();
}
