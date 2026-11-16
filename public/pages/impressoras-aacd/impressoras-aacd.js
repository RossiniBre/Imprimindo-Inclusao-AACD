// Impressoras da rede (lado AACD): lista TODAS as impressoras das empresas parceiras, separadas
// em seções (Livres, Em uso e Desativadas) e filtra por UF e material. "Ver detalhes" leva para
// a tela Nova solicitação (#/nova-solicitacao), que substituiu o modal que ficava aqui.
// As funções puras de validação continuam neste arquivo e são usadas pelas telas
// nova-solicitacao e reescolher-empresa.

import { api } from '../../shared/js/api.js';
import {
  MATERIAIS, DISPONIBILIDADE, cidadeUf, medidas, cabeNaImpressora, codigosMateriais, rotuloMaterial,
} from '../../shared/js/dominio.js';
import { elemento, chip, criarModal } from '../../shared/js/ui.js';

// Regras do back (ConteudoSolicitacao.java e SolicitacaoHandler.java)
export const EXTENSOES_ACEITAS = ['stl', 'obj', '3mf'];
export const TAMANHO_ARQUIVO_MAX = 50 * 1024 * 1024;
export const TITULO_MAX = 100;
export const QUANTIDADE_MAX = 1000;

// ---------- Funções puras (testadas em tests/impressoras-aacd.test.js) ----------

export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// 'São Paulo, SP' -> 'SP'
export function ufDaCidade(cidade) {
  const m = /[,/\-\s]\s*([A-Za-z]{2})\s*$/.exec(String(cidade ?? '').trim());
  return m ? m[1].toUpperCase() : '';
}

// Dentro de cada grupo vale "ou" (SP ou RJ; PLA ou PETG). Entre os grupos vale "e".
// `material` (string única) e `soLivres` continuam aceitos para não quebrar os testes antigos,
// mas a tela não usa mais `soLivres`: "em uso" também recebe pedidos.
export function filtrarImpressoras(
  lista,
  { busca = '', material = '', materiais = [], ufs = [], soLivres = false } = {},
) {
  const termo = normalizar(busca).trim();
  const exigidos = material ? [...materiais, material] : materiais;
  return lista.filter((i) => {
    if (soLivres && i.disponibilidade !== 'OCIOSA') return false;
    if (ufs.length > 0 && !ufs.includes(i.uf)) return false;
    if (exigidos.length > 0) {
      const suportados = codigosMateriais(i);
      if (!exigidos.some((m) => suportados.includes(m))) return false;
    }
    if (!termo) return true;
    const texto = normalizar([
      i.modelo, i.empresa?.nome, i.cidade, ...codigosMateriais(i).map(rotuloMaterial),
    ].join(' '));
    return texto.includes(termo);
  });
}

// Separa em seções: desativadas (não recebem pedidos), livres e em uso.
// "Em uso" é só a situação informada pela empresa e NÃO impede receber solicitações.
export function agruparImpressoras(lista) {
  const grupos = { livres: [], emUso: [], desativadas: [] };
  lista.forEach((i) => {
    if (i.ativo === false) grupos.desativadas.push(i);
    else if (i.disponibilidade === 'OCIOSA') grupos.livres.push(i);
    else grupos.emUso.push(i);
  });
  return grupos;
}

export function extensaoValida(nomeArquivo) {
  const partes = String(nomeArquivo ?? '').toLowerCase().split('.');
  return partes.length > 1 && EXTENSOES_ACEITAS.includes(partes.at(-1));
}

// '2026-11-20' -> '20/11/2026'
export function formatarPrazo(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// O back só tem um campo de texto livre: material e prazo vão dentro da descrição.
export function montarDescricao({ material, prazo, observacao } = {}) {
  const partes = [];
  if (material) partes.push(`Material: ${rotuloMaterial(material)}.`);
  if (prazo) partes.push(`Prazo desejado: ${formatarPrazo(prazo)}.`);
  const obs = String(observacao ?? '').trim();
  if (obs) partes.push(obs);
  return partes.join(' ');
}

function medidasDaPeca(dados) {
  const peca = {
    comprimentoMm: Number(dados.comprimentoMm),
    larguraMm: Number(dados.larguraMm),
    alturaMm: Number(dados.alturaMm),
  };
  const validas = Object.values(peca).every((v) => Number.isInteger(v) && v > 0);
  return { peca, validas };
}

// Valida só o arquivo (a tela Reescolher empresa reaproveita o arquivo do pedido antigo)
export function validarArquivo(arquivo) {
  if (!arquivo) return 'Escolha o arquivo da peça.';
  if (!extensaoValida(arquivo.name)) return 'Formato inválido. Use .stl, .obj ou .3mf.';
  if (arquivo.size > TAMANHO_ARQUIVO_MAX) return 'O arquivo passa de 50 MB.';
  return null;
}

// Valida os dados da peça (sem o arquivo): nome, quantidade, material, medidas e prazo
export function validarPeca(dados, impressora, hoje = new Date()) {
  const erros = {};

  const titulo = String(dados.titulo ?? '').trim();
  if (!titulo) erros.titulo = 'Dê um nome à peça.';
  else if (titulo.length > TITULO_MAX) erros.titulo = `No máximo ${TITULO_MAX} caracteres.`;

  const quantidade = Number(dados.quantidade);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAX) {
    erros.quantidade = `Entre 1 e ${QUANTIDADE_MAX}.`;
  }

  const materiaisDaImpressora = codigosMateriais(impressora);
  if (!dados.material) {
    erros.material = 'Escolha o material.';
  } else if (materiaisDaImpressora.length > 0 && !materiaisDaImpressora.includes(dados.material)) {
    erros.material = 'Esta impressora não trabalha com esse material.';
  }

  const { peca, validas } = medidasDaPeca(dados);
  if (!validas) {
    erros.medidas = 'Informe as três medidas em mm, com números inteiros maiores que zero.';
  } else if (cabeNaImpressora(peca, impressora) === false) {
    erros.medidas = `A peça não cabe na mesa da impressora (${medidas(impressora)}).`;
  }

  if (dados.prazo) {
    const data = new Date(`${dados.prazo}T23:59:59`);
    const inicioDeHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (Number.isNaN(data.getTime())) erros.prazo = 'Data inválida.';
    else if (data < inicioDeHoje) erros.prazo = 'O prazo já passou.';
  }

  return erros;
}

export function validar(dados, impressora, hoje = new Date()) {
  const erros = validarPeca(dados, impressora, hoje);
  const erroArquivo = validarArquivo(dados.arquivo);
  if (erroArquivo) erros.arquivo = erroArquivo;
  return erros;
}

// Tabela "a peça precisa × a impressora tem", atualizada enquanto a pessoa preenche
export function checagens(dados, impressora) {
  const itens = [];
  const materiaisDaImpressora = codigosMateriais(impressora);

  if (dados.material) {
    const ok = materiaisDaImpressora.length === 0 ? null : materiaisDaImpressora.includes(dados.material);
    itens.push({
      rotulo: 'Material',
      estado: ok === null ? 'duvida' : ok ? 'ok' : 'falha',
      valor: `${rotuloMaterial(dados.material)} · impressora: ${materiaisDaImpressora.map(rotuloMaterial).join(', ') || 'não informado'}`,
    });
  }

  const { peca, validas } = medidasDaPeca(dados);
  if (validas) {
    const cabe = cabeNaImpressora(peca, impressora);
    itens.push({
      rotulo: 'Tamanho',
      estado: cabe === null ? 'duvida' : cabe ? 'ok' : 'falha',
      valor: `${medidas(peca)} · mesa: ${medidas(impressora) || 'não informada'}`,
    });
  }

  if (impressora?.disponibilidade) {
    const livre = impressora.disponibilidade === 'OCIOSA';
    itens.push({
      rotulo: 'Disponibilidade',
      estado: livre ? 'ok' : 'duvida',
      valor: livre ? 'Livre agora' : 'Em uso: a empresa pode demorar para aceitar',
    });
  }

  return itens;
}

// ---------- Tela ----------

let modalFiltros = null;

export function destruir() {
  modalFiltros?.destruir();
  modalFiltros = null;
}

export function iniciar(container, { params } = {}) {
  let impressoras = [];
  let parceirosPorId = {};

  const ufsSel = new Set();
  const materiaisSel = new Set();

  const busca = container.querySelector('#busca');
  const resumo = container.querySelector('#resumo');
  const avisoGeral = container.querySelector('#aviso-geral');
  const carregando = container.querySelector('#lista-carregando');
  const vazia = container.querySelector('#lista-vazia');
  const areaGrupos = container.querySelector('#grupos');

  // Uma seção por grupo: a seção inteira, a lista de cartões e o contador
  const grupos = {
    livres: {
      secao: container.querySelector('#grupo-livres'),
      lista: container.querySelector('#cartoes-livres'),
      contagem: container.querySelector('#contagem-livres'),
    },
    emUso: {
      secao: container.querySelector('#grupo-em-uso'),
      lista: container.querySelector('#cartoes-em-uso'),
      contagem: container.querySelector('#contagem-em-uso'),
    },
    desativadas: {
      secao: container.querySelector('#grupo-desativadas'),
      lista: container.querySelector('#cartoes-desativadas'),
      contagem: container.querySelector('#contagem-desativadas'),
    },
  };

  const botaoFiltro = container.querySelector('#botao-filtro');
  const contagemFiltros = container.querySelector('#contagem-filtros');
  const fundoFiltros = container.querySelector('#modal-filtros');
  const listaUfs = container.querySelector('#filtro-ufs');
  const listaMateriais = container.querySelector('#filtro-materiais');
  const resultadoFiltros = container.querySelector('#filtros-resultado');
  const limparFiltros = container.querySelector('#limpar-filtros');

  modalFiltros = criarModal(fundoFiltros, {});

  // ----- Avisos -----

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  function tratarFalha(resposta, padrao) {
    if (resposta.status === 401) {
      location.hash = '#/login';
      return true;
    }
    if (resposta.status === 403) {
      mostrarAviso('Só funcionários e administradores da AACD acessam esta tela.');
      return true;
    }
    if (!resposta.ok) {
      mostrarAviso(resposta.corpo?.erro ?? padrao);
      return true;
    }
    return false;
  }

  // ----- Filtros (modal de UF e material) -----

  function filtrosAtuais() {
    return {
      busca: busca.value,
      ufs: [...ufsSel],
      materiais: [...materiaisSel],
    };
  }

  function opcaoFiltro(grupo, valor, rotulo, selecionados) {
    const label = elemento('label');
    const entrada = document.createElement('input');
    entrada.type = 'checkbox';
    entrada.value = valor;
    entrada.dataset.grupo = grupo;
    entrada.checked = selecionados.has(valor);
    label.appendChild(entrada);
    label.appendChild(document.createTextNode(rotulo));
    return label;
  }

  function desenharFiltros() {
    const ufs = [...new Set(impressoras.map((i) => i.uf).filter(Boolean))].sort();
    listaUfs.replaceChildren(...ufs.map((uf) => opcaoFiltro('uf', uf, uf, ufsSel)));
    listaMateriais.replaceChildren(
      ...MATERIAIS.map((m) => opcaoFiltro('material', m.codigo, m.rotulo, materiaisSel)),
    );
  }

  // ----- Lista -----

  function montarCartao(i) {
    const desativada = i.ativo === false;
    const cartao = elemento('article', 'cartao');
    if (desativada) cartao.classList.add('cartao--desativada');

    // Nome da impressora em destaque; a empresa vai para a linha de baixo
    const topo = elemento('div', 'cartao__topo');
    topo.appendChild(elemento('h3', 'cartao__titulo', i.modelo));
    const disp = desativada
      ? { rotulo: 'Desativada', classe: 'chip--neutro' }
      : (DISPONIBILIDADE[i.disponibilidade] ?? { rotulo: i.disponibilidade, classe: 'chip--neutro' });
    topo.appendChild(chip(disp.classe, disp.rotulo));
    cartao.appendChild(topo);

    const local = elemento('p', 'cartao__detalhe');
    local.appendChild(elemento('strong', '', i.empresa?.nome ?? 'Empresa parceira'));
    if (i.cidade) local.appendChild(document.createTextNode(` · ${i.cidade}`));
    cartao.appendChild(local);

    const chips = elemento('div', 'cartao__chips');
    const materiais = codigosMateriais(i);
    if (materiais.length === 0) chips.appendChild(chip('chip--neutro', 'Materiais não informados'));
    materiais.forEach((m) => chips.appendChild(chip('chip--contorno', rotuloMaterial(m))));
    cartao.appendChild(chips);

    const rodape = elemento('div', 'cartao__rodape');
    rodape.appendChild(elemento('span', 'cartao__mesa', `Impressora ${i.id}`));
    if (desativada) {
      // Desativada: aparece na lista, mas não dá para solicitar impressão nela
      rodape.appendChild(elemento('span', 'cartao__indisponivel', 'Sem pedidos'));
    } else {
      const botao = elemento('button', 'botao-principal', 'Ver detalhes');
      botao.type = 'button';
      botao.dataset.id = i.id;
      rodape.appendChild(botao);
    }
    cartao.appendChild(rodape);

    return cartao;
  }

  function renderizar() {
    const filtradas = filtrarImpressoras(impressoras, filtrosAtuais());
    const todas = agruparImpressoras(impressoras);
    const porGrupo = agruparImpressoras(filtradas);

    resumo.textContent = impressoras.length === 0
      ? ''
      : `${impressoras.length} impressora${impressoras.length === 1 ? '' : 's'} na rede · ${todas.livres.length} livre${todas.livres.length === 1 ? '' : 's'} · ${todas.emUso.length} em uso · ${todas.desativadas.length} desativada${todas.desativadas.length === 1 ? '' : 's'} · mostrando ${filtradas.length}`;

    const totalFiltros = ufsSel.size + materiaisSel.size;
    contagemFiltros.textContent = String(totalFiltros);
    contagemFiltros.hidden = totalFiltros === 0;
    resultadoFiltros.textContent = `${filtradas.length} impressora${filtradas.length === 1 ? '' : 's'} encontrada${filtradas.length === 1 ? '' : 's'}`;

    // Cada seção só aparece quando tem impressoras (já considerando busca e filtros)
    Object.entries(grupos).forEach(([nome, g]) => {
      const itens = porGrupo[nome];
      g.lista.replaceChildren(...itens.map(montarCartao));
      g.contagem.textContent = String(itens.length);
      g.secao.hidden = itens.length === 0;
    });

    carregando.hidden = true;
    vazia.hidden = filtradas.length > 0;
  }

  async function carregar() {
    avisoGeral.hidden = true;

    let painel;
    let parceiros;
    try {
      [painel, parceiros] = await Promise.all([api.painelImpressoras(), api.parceiros()]);
    } catch {
      carregando.hidden = true;
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
      return false;
    }

    if (tratarFalha(painel, 'Não foi possível carregar as impressoras.')) {
      carregando.hidden = true;
      return false;
    }

    parceirosPorId = {};
    if (parceiros.ok && Array.isArray(parceiros.corpo)) {
      parceiros.corpo.forEach((p) => { parceirosPorId[p.id] = p; });
    }

    impressoras = (Array.isArray(painel.corpo) ? painel.corpo : []).map((i) => {
      const cidade = cidadeUf(parceirosPorId[i.empresa?.id]?.endereco);
      return {
        ...i,
        cidade,
        uf: ufDaCidade(cidade),
        // Sem o campo, a impressora conta como ativa; só `false` (ou 0) é desativada
        ativo: !(i.ativo === false || i.ativo === 0),
      };
    });
    desenharFiltros();
    renderizar();
    return true;
  }

  busca.addEventListener('input', renderizar);

  botaoFiltro.addEventListener('click', () => {
    modalFiltros.abrir(fundoFiltros.querySelector('input') ?? undefined);
  });

  fundoFiltros.addEventListener('change', (evento) => {
    const caixa = evento.target;
    if (!caixa.matches('input[data-grupo]')) return;
    const alvo = caixa.dataset.grupo === 'uf' ? ufsSel : materiaisSel;
    if (caixa.checked) alvo.add(caixa.value);
    else alvo.delete(caixa.value);
    renderizar();
  });

  limparFiltros.addEventListener('click', () => {
    ufsSel.clear();
    materiaisSel.clear();
    fundoFiltros.querySelectorAll('input[data-grupo]').forEach((c) => { c.checked = false; });
    renderizar();
  });

  // ----- Nova solicitação -----

  // O pedido é criado na tela Nova solicitação; a impressora clicada vai como preferência
  areaGrupos.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-id]');
    if (botao) location.hash = `#/nova-solicitacao?impressora=${encodeURIComponent(botao.dataset.id)}`;
  });

  // ----- Parâmetro da URL (#/impressoras-aacd?empresa=3) -----

  carregar().then((ok) => {
    if (!ok) return;
    const empresaId = Number(params?.get('empresa'));
    if (empresaId && parceirosPorId[empresaId]) {
      busca.value = parceirosPorId[empresaId].nome;
      renderizar();
    }
  });
}