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

// Telefone só com dígitos e DDI do Brasil; null se não der para montar
export function telefoneParaWhatsapp(telefone) {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  return digitos.startsWith('55') && digitos.length >= 12 ? digitos : `55${digitos}`;
}

export function mensagemDoacao(d) {
  const nome = d.empresa?.nome ?? 'empresa parceira';
  return `Olá, ${nome}! Aqui é da AACD. Recebemos a sua doação ${numeroDoacao(d.id)} `
    + `(${resumoItens(d)}) e gostaríamos de combinar a retirada ou a entrega. Pode nos ajudar?`;
}

export function linkWhatsapp(d) {
  const numero = telefoneParaWhatsapp(d.empresa?.telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagemDoacao(d))}` : null;
}

export function linkEmail(d) {
  const email = d.empresa?.email;
  if (!email) return null;
  const assunto = `Doação ${numeroDoacao(d.id)} - AACD`;
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagemDoacao(d))}`;
}

export function linkMapa(endereco) {
  const texto = [endereco?.rua, endereco?.numero, endereco?.bairro, cidadeUf(endereco)]
    .filter(Boolean).join(', ');
  return texto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}` : null;
}

export const CLASSE_DO_TIPO = {
  IMPRESSORA: 'chip--neutro',
  FILAMENTO: 'chip--destaque',
  AMBOS: 'chip--sucesso',
};

const ICONE_WHATSAPP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

const ICONE_LOCAL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

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

    function contato(icone, texto, detalhe, href, dica) {
    const li = elemento('li');
    const el = elemento(href ? 'a' : 'button');
    if (href) {
      el.href = href;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      el.title = dica;
    } else {
      el.type = 'button';
      el.title = 'Copiar';
    }
    const marca = elemento('span', 'contatos__icone');
    if (icone.startsWith('<svg')) marca.innerHTML = icone;
    else marca.textContent = icone;
    marca.setAttribute('aria-hidden', 'true');
    el.appendChild(marca);
    const corpo = elemento('span', '', texto);
    if (detalhe) corpo.appendChild(elemento('small', '', detalhe));
    el.appendChild(corpo);
    if (href) {
      el.appendChild(elemento('span', 'contatos__acao', dica));
    } else {
      const copiado = elemento('span', 'contatos__copiado', '');
      el.appendChild(copiado);
      el.addEventListener('click', () => copiarTexto(detalhe ? `${texto}, ${detalhe}` : texto, copiado));
    }
    li.appendChild(el);
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
    if (empresa.telefone) {
      const zap = linkWhatsapp(d);
      contatos.push(contato(ICONE_WHATSAPP, empresa.telefone, null, zap, 'Abrir no WhatsApp'));
    }
    if (empresa.email) {
      contatos.push(contato('✉', empresa.email, null, linkEmail(d), 'Escrever e-mail'));
    }
    if (endereco) {
      const rua = [endereco.rua, endereco.numero].filter(Boolean).join(', ');
      const linha = [rua, endereco.bairro].filter(Boolean).join(' — ');
      contatos.push(contato(ICONE_LOCAL, linha || 'Endereço cadastrado', cidadeUf(endereco), linkMapa(endereco), 'Ver no mapa'));
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
