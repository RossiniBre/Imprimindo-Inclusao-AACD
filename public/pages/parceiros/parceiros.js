// Parceiros da AACD: empresas parceiras em cartões, números da rede e modal de detalhes
// com as impressoras da empresa (cada uma leva ao modal de nova solicitação).

import { api } from '../../shared/js/api.js';
import { DISPONIBILIDADE, cidadeUf, medidas, codigosMateriais, rotuloMaterial } from '../../shared/js/dominio.js';
import { elemento, chip, iniciais, criarModal } from '../../shared/js/ui.js';

// ---------- Funções puras (testadas em tests/parceiros.test.js) ----------

export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filtrarParceiros(lista, busca = '') {
  const termo = normalizar(busca).trim();
  if (!termo) return lista;
  return lista.filter((p) => normalizar(`${p.nome} ${cidadeUf(p.endereco)}`).includes(termo));
}

// Quantas impressoras cada empresa tem, a partir da lista do painel da rede
export function contarImpressoras(impressoras) {
  const porEmpresa = {};
  for (const i of impressoras) {
    const id = i.empresa?.id;
    if (id === undefined || id === null) continue;
    porEmpresa[id] = (porEmpresa[id] ?? 0) + 1;
  }
  return porEmpresa;
}

// Quantas peças concluídas cada empresa imprimiu (a lista de pedidos traz só o nome da empresa)
export function contarPecas(solicitacoes) {
  const porNome = {};
  for (const s of solicitacoes) {
    if (s.status !== 'CONCLUIDA' || !s.empresa) continue;
    porNome[s.empresa] = (porNome[s.empresa] ?? 0) + 1;
  }
  return porNome;
}

export function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

// Endereço em uma linha: "Rua Vergueiro, 1200 · Liberdade · São Paulo, SP"
export function enderecoCurto(endereco) {
  if (!endereco) return '';
  const rua = [endereco.rua, endereco.numero].filter(Boolean).join(', ');
  return [rua, endereco.bairro, cidadeUf(endereco)].filter(Boolean).join(' · ');
}

// ---------- Tela ----------

let modal = null;

export function destruir() {
  modal?.destruir();
  modal = null;
}

export function iniciar(container) {
  let parceiros = [];
  let impressorasPorEmpresa = {};
  let pecasPorNome = {};
  const impressorasDetalhadas = {};   // empresaId -> lista com medidas e materiais

  const busca = container.querySelector('#busca');
  const avisoGeral = container.querySelector('#aviso-geral');
  const carregando = container.querySelector('#lista-carregando');
  const vazia = container.querySelector('#lista-vazia');
  const cartoes = container.querySelector('#cartoes');
  const totalParceiros = container.querySelector('#total-parceiros');
  const totalImpressoras = container.querySelector('#total-impressoras');
  const totalPecas = container.querySelector('#total-pecas');

  const fundo = container.querySelector('#modal-parceiro');
  const modalAvatar = container.querySelector('#modal-avatar');
  const modalTitulo = container.querySelector('#modal-titulo');
  const modalSubtitulo = container.querySelector('#modal-subtitulo');
  const dadosEmpresa = container.querySelector('#dados-empresa');
  const dadosEndereco = container.querySelector('#dados-endereco');
  const dadosContato = container.querySelector('#dados-contato');
  const impressorasContagem = container.querySelector('#impressoras-contagem');
  const impressorasEstado = container.querySelector('#impressoras-estado');
  const impressorasLista = container.querySelector('#impressoras-lista');
  const linkSolicitar = container.querySelector('#link-solicitar');
  let parceiroAberto = null;

  modal = criarModal(fundo, { aoFechar: () => { parceiroAberto = null; } });

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  // ----- Cartões -----

  function montarCartao(p) {
    const cartao = elemento('article', 'cartao');
    const cidade = cidadeUf(p.endereco);

    const topo = elemento('div', 'cartao__topo');
    topo.appendChild(elemento('span', 'avatar', iniciais(p.nome)));
    const nomes = elemento('div');
    nomes.appendChild(elemento('h3', 'cartao__titulo', p.nome));
    nomes.appendChild(elemento('p', 'cartao__detalhe', p.email ?? ''));
    topo.appendChild(nomes);
    cartao.appendChild(topo);

    const caixa = elemento('div', 'cartao__caixa');
    const nImp = impressorasPorEmpresa[p.id] ?? 0;
    const nPecas = pecasPorNome[p.nome] ?? 0;
    caixa.appendChild(elemento('strong', '', plural(nImp, 'impressora cadastrada', 'impressoras cadastradas')));
    caixa.appendChild(elemento('span', '', `${plural(nPecas, 'peça impressa', 'peças impressas')} para a AACD`));
    cartao.appendChild(caixa);

    const rodape = elemento('div', 'cartao__rodape');
    rodape.appendChild(elemento('span', 'cartao__detalhe', cidade || 'Cidade não informada'));
    const botao = elemento('button', 'botao-principal', 'Ver detalhes');
    botao.type = 'button';
    botao.dataset.id = p.id;
    rodape.appendChild(botao);
    cartao.appendChild(rodape);

    return cartao;
  }

  function renderizar() {
    const filtrados = filtrarParceiros(parceiros, busca.value);
    carregando.hidden = true;
    vazia.hidden = filtrados.length > 0;
    cartoes.replaceChildren(...filtrados.map(montarCartao));
  }

  async function carregar() {
    avisoGeral.hidden = true;

    let respostas;
    try {
      respostas = await Promise.all([api.parceiros(), api.painelImpressoras(), api.solicitacoes()]);
    } catch {
      carregando.hidden = true;
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
      return;
    }

    const [rParceiros, rImpressoras, rSolicitacoes] = respostas;
    if (rParceiros.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!rParceiros.ok) {
      carregando.hidden = true;
      mostrarAviso(rParceiros.status === 403
        ? 'Só funcionários e administradores da AACD acessam esta tela.'
        : (rParceiros.corpo?.erro ?? 'Não foi possível carregar os parceiros.'));
      return;
    }

    parceiros = Array.isArray(rParceiros.corpo) ? rParceiros.corpo : [];
    const impressoras = rImpressoras.ok && Array.isArray(rImpressoras.corpo) ? rImpressoras.corpo : [];
    const solicitacoes = rSolicitacoes.ok && Array.isArray(rSolicitacoes.corpo) ? rSolicitacoes.corpo : [];
    impressorasPorEmpresa = contarImpressoras(impressoras);
    pecasPorNome = contarPecas(solicitacoes);

    totalParceiros.textContent = parceiros.length;
    totalImpressoras.textContent = impressoras.length;
    totalPecas.textContent = Object.values(pecasPorNome).reduce((soma, n) => soma + n, 0);

    renderizar();
  }

  busca.addEventListener('input', renderizar);

  // ----- Modal -----

  function dado(rotulo, valor) {
    const bloco = elemento('div');
    bloco.appendChild(elemento('dt', '', rotulo));
    const dd = elemento('dd');
    if (valor instanceof Node) dd.appendChild(valor);
    else dd.textContent = valor || '—';
    bloco.appendChild(dd);
    return bloco;
  }

  function linkDe(prefixo, valor) {
    if (!valor) return '';
    const a = elemento('a', '', valor);
    a.href = `${prefixo}${valor}`;
    return a;
  }

  function montarImpressora(i) {
    const li = elemento('li');
    const nome = elemento('span', 'impressoras__nome', i.modelo);
    const mesa = medidas(i);
    nome.appendChild(elemento('small', '', mesa ? `Mesa ${mesa}` : 'Mesa não informada'));
    li.appendChild(nome);

    const chips = elemento('span', 'impressoras__chips');
    const disp = DISPONIBILIDADE[i.disponibilidade] ?? { rotulo: i.disponibilidade, classe: 'chip--neutro' };
    chips.appendChild(chip(disp.classe, disp.rotulo));
    codigosMateriais(i).forEach((m) => chips.appendChild(chip('chip--contorno', rotuloMaterial(m))));
    li.appendChild(chips);

    const link = elemento('a', 'botao-linha', 'Solicitar');
    link.href = `#/impressoras-aacd?impressora=${i.id}`;
    li.appendChild(link);
    return li;
  }

  async function listarImpressoras(p) {
    impressorasLista.replaceChildren();
    impressorasContagem.textContent = '';
    impressorasEstado.hidden = false;
    impressorasEstado.textContent = 'Carregando impressoras...';

    if (!impressorasDetalhadas[p.id]) {
      try {
        const resposta = await api.impressorasDoParceiro(p.id);
        impressorasDetalhadas[p.id] = resposta.ok && Array.isArray(resposta.corpo) ? resposta.corpo : null;
      } catch {
        impressorasDetalhadas[p.id] = null;
      }
    }
    if (parceiroAberto?.id !== p.id) return;   // fechou ou trocou de parceiro enquanto carregava

    const lista = impressorasDetalhadas[p.id];
    if (lista === null) {
      impressorasEstado.textContent = 'Não foi possível carregar as impressoras desta empresa.';
      return;
    }
    impressorasContagem.textContent = lista.length;
    impressorasEstado.hidden = lista.length > 0;
    impressorasEstado.textContent = 'Esta empresa ainda não cadastrou impressoras.';
    impressorasLista.replaceChildren(...lista.map(montarImpressora));
  }

  function abrirDetalhes(id) {
    const p = parceiros.find((x) => x.id === id);
    if (!p) return;
    parceiroAberto = p;
    const e = p.endereco ?? {};

    modalAvatar.textContent = iniciais(p.nome);
    modalTitulo.textContent = p.nome;
    modalSubtitulo.textContent = cidadeUf(e) ? `Parceira em ${cidadeUf(e)}` : 'Empresa parceira';

    dadosEmpresa.replaceChildren(
      dado('Razão social', p.nome),
      dado('Impressoras cadastradas', String(impressorasPorEmpresa[p.id] ?? 0)),
      dado('Peças impressas para a AACD', String(pecasPorNome[p.nome] ?? 0)),
    );
    dadosEndereco.replaceChildren(
      dado('Estado', e.uf),
      dado('Cidade', e.cidade),
      dado('Bairro', e.bairro),
      dado('CEP', e.cep),
      dado('Logradouro', e.rua),
      dado('Número', e.numero),
    );
    dadosContato.replaceChildren(
      dado('E-mail corporativo', linkDe('mailto:', p.email)),
      dado('Telefone', linkDe('tel:', p.telefone)),
    );
    linkSolicitar.href = `#/impressoras-aacd?empresa=${p.id}`;

    modal.abrir(fundo.querySelector('.modal__fechar'));
    listarImpressoras(p);
  }

  cartoes.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-id]');
    if (botao) abrirDetalhes(Number(botao.dataset.id));
  });

  carregar();
}
