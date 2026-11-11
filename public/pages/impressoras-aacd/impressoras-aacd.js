// Impressoras da rede (lado AACD): lista TODAS as impressoras das empresas parceiras, separadas
// em seções (Livres, Em uso e Desativadas), filtra por UF e material e abre o modal de nova
// solicitação de impressão para a impressora escolhida.

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

let modal = null;
let modalFiltros = null;

export function destruir() {
  modal?.destruir();
  modalFiltros?.destruir();
  modal = null;
  modalFiltros = null;
}

export function iniciar(container, { params } = {}) {
  let impressoras = [];
  let parceirosPorId = {};
  const medidasPorEmpresa = {};   // empresaId -> { impressoraId -> impressora com medidas }
  let impressoraAberta = null;

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

  const fundo = container.querySelector('#modal-solicitacao');
  const modalImpressora = container.querySelector('#modal-impressora');
  const ficha = container.querySelector('#modal-ficha');
  const form = container.querySelector('#form-solicitacao');
  const escolhaMaterial = container.querySelector('#escolha-material');
  const checagemLista = container.querySelector('#checagem');
  const erroModal = container.querySelector('#erro-modal');
  const botaoEnviar = container.querySelector('#botao-enviar');
  const sucesso = container.querySelector('#modal-sucesso');
  const sucessoId = container.querySelector('#sucesso-id');
  const descricao = container.querySelector('#campo-descricao');
  const contador = container.querySelector('#contador-descricao');

  modal = criarModal(fundo, { aoFechar: () => { impressoraAberta = null; } });
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

  // ----- Modal de solicitação -----

  async function medidasDaImpressora(impressora) {
    const empresaId = impressora.empresa?.id;
    if (!empresaId) return null;

    if (!medidasPorEmpresa[empresaId]) {
      try {
        const resposta = await api.impressorasDoParceiro(empresaId);
        const mapa = {};
        if (resposta.ok && Array.isArray(resposta.corpo)) {
          resposta.corpo.forEach((i) => { mapa[i.id] = i; });
        }
        medidasPorEmpresa[empresaId] = mapa;
      } catch {
        return null;
      }
    }
    return medidasPorEmpresa[empresaId][impressora.id] ?? null;
  }

  function lerFormulario() {
    const material = form.querySelector('input[name="material"]:checked')?.value ?? '';
    return {
      arquivo: form.querySelector('#campo-arquivo').files?.[0] ?? null,
      titulo: form.querySelector('#campo-titulo').value,
      quantidade: form.querySelector('#campo-quantidade').value,
      material,
      comprimentoMm: form.querySelector('#campo-comprimento').value,
      larguraMm: form.querySelector('#campo-largura').value,
      alturaMm: form.querySelector('#campo-altura').value,
      prazo: form.querySelector('#campo-prazo').value,
      observacao: descricao.value,
    };
  }

  function mostrarErros(erros) {
    ['arquivo', 'titulo', 'quantidade', 'material', 'medidas', 'prazo'].forEach((campo) => {
      const alvo = container.querySelector(`#erro-${campo}`);
      if (alvo) alvo.textContent = erros[campo] ?? '';
    });
    form.querySelector('#campo-titulo').classList.toggle('com-erro', Boolean(erros.titulo));
    form.querySelector('#campo-quantidade').classList.toggle('com-erro', Boolean(erros.quantidade));
    form.querySelector('#campo-prazo').classList.toggle('com-erro', Boolean(erros.prazo));
    ['comprimento', 'largura', 'altura'].forEach((m) =>
      form.querySelector(`#campo-${m}`).classList.toggle('com-erro', Boolean(erros.medidas)));
  }

  function desenharFicha(i) {
    const disp = DISPONIBILIDADE[i.disponibilidade] ?? { rotulo: i.disponibilidade, classe: 'chip--neutro' };
    const itens = [chip(disp.classe, disp.rotulo)];
    const mesa = medidas(i);
    itens.push(chip('chip--neutro', mesa ? `Mesa ${mesa}` : 'Mesa não informada'));
    codigosMateriais(i).forEach((m) => itens.push(chip('chip--contorno', rotuloMaterial(m))));
    ficha.replaceChildren(...itens);
  }

  function desenharMateriais(i) {
    const suportados = codigosMateriais(i);
    escolhaMaterial.replaceChildren(...MATERIAIS.map((m) => {
      const rotulo = elemento('label');
      const entrada = document.createElement('input');
      entrada.type = 'radio';
      entrada.name = 'material';
      entrada.value = m.codigo;
      entrada.disabled = suportados.length > 0 && !suportados.includes(m.codigo);
      if (suportados.length === 1 && suportados[0] === m.codigo) entrada.checked = true;
      rotulo.appendChild(entrada);
      rotulo.appendChild(document.createTextNode(m.rotulo));
      return rotulo;
    }));
  }

  function atualizarChecagem() {
    if (!impressoraAberta) return;
    const itens = checagens(lerFormulario(), impressoraAberta);
    checagemLista.replaceChildren(...itens.map((c) => {
      const li = elemento('li', c.estado);
      li.appendChild(elemento('span', 'checagem__icone', c.estado === 'ok' ? '✓' : c.estado === 'falha' ? '✕' : '?'));
      li.appendChild(elemento('span', '', c.rotulo));
      li.appendChild(elemento('span', 'checagem__valor', c.valor));
      return li;
    }));
  }

  async function abrirSolicitacao(id) {
    const base = impressoras.find((i) => i.id === id);
    if (!base) return;

    // Impressora desativada não recebe pedidos (cobre também o link direto ?impressora=)
    if (base.ativo === false) {
      mostrarAviso(`A impressora ${base.modelo} está desativada e não recebe pedidos no momento.`);
      return;
    }

    // Se o modal de filtros estiver aberto (link direto), fecha antes
    if (!fundoFiltros.hidden) modalFiltros.fechar?.();

    form.reset();
    mostrarErros({});
    erroModal.hidden = true;
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = 'Enviar solicitação';
    contador.textContent = '0';
    form.hidden = false;
    sucesso.hidden = true;

    impressoraAberta = { ...base };
    modalImpressora.textContent = `${base.modelo} · ${base.empresa?.nome ?? ''}${base.cidade ? ` · ${base.cidade}` : ''}`;
    desenharFicha(impressoraAberta);
    desenharMateriais(impressoraAberta);
    checagemLista.replaceChildren();
    modal.abrir(form.querySelector('#campo-arquivo'));

    // As medidas da mesa vêm de outra rota; completa a ficha quando chegarem
    const completa = await medidasDaImpressora(base);
    if (completa && impressoraAberta?.id === base.id) {
      impressoraAberta = {
        ...impressoraAberta, ...completa, empresa: base.empresa, cidade: base.cidade, uf: base.uf, ativo: base.ativo,
      };
      desenharFicha(impressoraAberta);
      desenharMateriais(impressoraAberta);
      atualizarChecagem();
    }
  }

  areaGrupos.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-id]');
    if (botao) abrirSolicitacao(Number(botao.dataset.id));
  });

  form.addEventListener('input', () => {
    contador.textContent = String(descricao.value.length);
    atualizarChecagem();
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!impressoraAberta) return;

    const dados = lerFormulario();
    const erros = validar(dados, impressoraAberta);
    mostrarErros(erros);
    erroModal.hidden = true;
    if (Object.keys(erros).length > 0) {
      container.querySelector(`#erro-${Object.keys(erros)[0]}`)?.scrollIntoView({ block: 'center' });
      return;
    }

    const formData = new FormData();
    formData.append('titulo', dados.titulo.trim());
    formData.append('descricao', montarDescricao(dados));
    formData.append('quantidade', String(Number(dados.quantidade)));
    formData.append('comprimentoMm', String(Number(dados.comprimentoMm)));
    formData.append('larguraMm', String(Number(dados.larguraMm)));
    formData.append('alturaMm', String(Number(dados.alturaMm)));
    formData.append('impressoraId', String(impressoraAberta.id));
    formData.append('arquivo', dados.arquivo, dados.arquivo.name);

    botaoEnviar.disabled = true;
    botaoEnviar.textContent = 'Enviando...';

    try {
      const resposta = await api.criarSolicitacao(formData);
      if (resposta.ok) {
        sucessoId.textContent = resposta.corpo?.id ?? '';
        form.hidden = true;
        sucesso.hidden = false;
        sucesso.querySelector('a')?.focus();
        carregar();
        return;
      }
      if (resposta.status === 401) {
        location.hash = '#/login';
        return;
      }
      erroModal.textContent = resposta.status === 413
        ? 'O arquivo passa de 50 MB.'
        : resposta.status === 403
          ? 'Só funcionários e administradores da AACD criam pedidos.'
          : (resposta.corpo?.erro ?? 'Não foi possível enviar o pedido. Tente de novo.');
    } catch {
      erroModal.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
    }
    erroModal.hidden = false;
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = 'Enviar solicitação';
  });

  // ----- Parâmetros da URL (#/impressoras-aacd?impressora=12 ou ?empresa=3) -----

  carregar().then((ok) => {
    if (!ok) return;
    const empresaId = Number(params?.get('empresa'));
    if (empresaId && parceirosPorId[empresaId]) {
      busca.value = parceirosPorId[empresaId].nome;
      renderizar();
    }
    const impressoraId = Number(params?.get('impressora'));
    if (impressoraId) {
      const alvo = impressoras.find((i) => i.id === impressoraId);
      if (alvo) {
        abrirSolicitacao(impressoraId);
      } else {
        mostrarAviso(`A impressora ${impressoraId} não está mais disponível na rede.`);
      }
    }
  });
}