// Parceiros da AACD: empresas parceiras em cartões, números da rede e modal de detalhes
// com as impressoras da empresa. O admin também pode desativar ou apagar a empresa.

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
  const acoesAdmin = container.querySelector('#acoes-admin');
  const botaoDesativar = container.querySelector('#botao-desativar');
  const botaoApagar = container.querySelector('#botao-apagar');
  const fundoConfirmar = container.querySelector('#modal-confirmar');
  const confirmarTitulo = container.querySelector('#confirmar-titulo');
  const confirmarTexto = container.querySelector('#confirmar-texto');
  const campoSenha = container.querySelector('#confirmar-campo-senha');
  const confirmarSenha = container.querySelector('#confirmar-senha');
  const confirmarErro = container.querySelector('#confirmar-erro');
  const confirmarVoltar = container.querySelector('#confirmar-voltar');
  const confirmarOk = container.querySelector('#confirmar-ok');
  let acaoConfirmada = null;
  let parceiroAberto = null;

  const cartoesDesativados = container.querySelector('#cartoes-desativados');
  const secaoDesativadas = container.querySelector('#secao-desativadas');
  const contagemAtivas = container.querySelector('#contagem-ativas');
  const contagemDesativadas = container.querySelector('#contagem-desativadas');

  const confirmarOlho = container.querySelector('#confirmar-olho');

  modal = criarModal(fundo, { aoFechar: () => { parceiroAberto = null; } });

  api.eu()
    .then((r) => { acoesAdmin.hidden = !(r.ok && r.corpo?.perfil === 'ADMIN'); })
    .catch(() => {});

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  // ----- Cartões -----

  function montarCartao(p) {
    const cartao = elemento('article', p.ativo === false ? 'cartao cartao--desativado' : 'cartao');
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
    const ativos = filtrados.filter((p) => p.ativo !== false);
    const desativados = filtrados.filter((p) => p.ativo === false);

    carregando.hidden = true;
    vazia.hidden = filtrados.length > 0;
    cartoes.replaceChildren(...ativos.map(montarCartao));
    cartoesDesativados.replaceChildren(...desativados.map(montarCartao));
    contagemAtivas.textContent = ativos.length;
    contagemDesativadas.textContent = desativados.length;
    secaoDesativadas.hidden = desativados.length === 0;
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

    totalParceiros.textContent = parceiros.filter((p) => p.ativo !== false).length;
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
    if (i.ativo === false) {
      chips.appendChild(chip('chip--neutro', 'Desativada'));
    } else {
      const disp = DISPONIBILIDADE[i.disponibilidade] ?? { rotulo: i.disponibilidade, classe: 'chip--neutro' };
      chips.appendChild(chip(disp.classe, disp.rotulo));
    }
    codigosMateriais(i).forEach((m) => chips.appendChild(chip('chip--contorno', rotuloMaterial(m))));
    li.appendChild(chips);

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

    const local = cidadeUf(e) ? `Parceira em ${cidadeUf(e)}` : 'Empresa parceira';
    const desativada = p.ativo === false;
    modalSubtitulo.textContent = desativada ? `${local} (desativada)` : local;
    botaoDesativar.textContent = desativada ? 'Reativar empresa' : 'Desativar empresa';
    botaoDesativar.classList.toggle('botao-perigo--sucesso', desativada);

    modalAvatar.textContent = iniciais(p.nome);
    modalTitulo.textContent = p.nome;

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

    modal.abrir(fundo.querySelector('.modal__fechar'));
    listarImpressoras(p);
  }

  function definirSenhaVisivel(visivel) {
    confirmarSenha.classList.toggle('visivel', visivel);
    confirmarOlho.querySelector('.olho-aberto').toggleAttribute('hidden', visivel);
    confirmarOlho.querySelector('.olho-fechado').toggleAttribute('hidden', !visivel);
    confirmarOlho.setAttribute('aria-pressed', String(visivel));
    confirmarOlho.setAttribute('aria-label', visivel ? 'Esconder senha' : 'Mostrar senha');
  }

  confirmarOlho.addEventListener('click', () => {
    definirSenhaVisivel(!confirmarSenha.classList.contains('visivel'));
    confirmarSenha.focus();
  });

  // ----- Ações de admin (desativar / apagar empresa) -----

  const idConta = (p) => p.usuarioId;

  function abrirConfirmacao({ titulo, texto, rotulo, pedirSenha = false, positivo = false, executar }) {
    confirmarTitulo.textContent = titulo;
    confirmarTexto.textContent = texto;
    confirmarOk.textContent = rotulo;
    confirmarOk.classList.toggle('botao-perigo--verde', positivo);
    confirmarOk.disabled = false;
    confirmarSenha.value = '';
    definirSenhaVisivel(false);
    campoSenha.hidden = !pedirSenha;
    confirmarErro.hidden = true;
    acaoConfirmada = executar;
    fundoConfirmar.hidden = false;
    (pedirSenha ? confirmarSenha : confirmarVoltar).focus();
  }

  function fecharConfirmacao() {
    fundoConfirmar.hidden = true;
    confirmarSenha.value = '';
    definirSenhaVisivel(false);
    acaoConfirmada = null;
  }

  function erroConfirmacao(texto) {
    confirmarErro.textContent = texto;
    confirmarErro.hidden = false;
    confirmarOk.disabled = false;
  }

  confirmarVoltar.addEventListener('click', fecharConfirmacao);

  fundoConfirmar.addEventListener('click', (evento) => {
    if (evento.target === fundoConfirmar) fecharConfirmacao();
  });

  fundoConfirmar.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.stopPropagation();   // não fecha o modal do parceiro junto
      fecharConfirmacao();
    }
    if (evento.key === 'Enter' && evento.target === confirmarSenha) confirmarOk.click();
  });

  confirmarOk.addEventListener('click', async () => {
    if (!acaoConfirmada) return;
    const senha = confirmarSenha.value;
    if (!campoSenha.hidden && !senha) {
      erroConfirmacao('Digite a sua senha para continuar.');
      return;
    }

    confirmarOk.disabled = true;
    confirmarErro.hidden = true;

    let resposta;
    try {
      resposta = await acaoConfirmada(senha);
    } catch {
      erroConfirmacao('Sem conexão com o servidor.');
      return;
    }
    if (!resposta.ok) {
      erroConfirmacao(resposta.corpo?.erro ?? 'Não foi possível concluir a ação.');
      return;
    }

    fecharConfirmacao();
    fundo.querySelector('[data-fechar]')?.click();   // fecha o modal do parceiro
    carregar();
  });

  botaoDesativar.addEventListener('click', () => {
    if (!parceiroAberto) return;
    const p = parceiroAberto;

    if (p.ativo === false) {
      abrirConfirmacao({
        titulo: 'Reativar empresa?',
        texto: `"${p.nome}" volta a receber solicitações.`,
        rotulo: 'Reativar',
        positivo: true,
        executar: () => api.reativarConta(idConta(p)),
      });
      return;
    }

    abrirConfirmacao({
      titulo: 'Desativar empresa?',
      texto: `"${p.nome}" deixa de receber solicitações. As solicitações já feitas a ele serão apagadas e as impressoras ficam desativadas. Você pode reativar o parceiro depois.`,
      rotulo: 'Desativar',
      executar: () => api.desativarConta(idConta(p)),
    });
  });

  botaoApagar.addEventListener('click', () => {
    if (!parceiroAberto) return;
    const p = parceiroAberto;
    abrirConfirmacao({
      titulo: 'Apagar empresa?',
      texto: `"${p.nome}" será apagada e isso não pode ser desfeito. Digite a sua senha para confirmar.`,
      rotulo: 'Apagar',
      pedirSenha: true,
      executar: (senha) => api.excluirConta(idConta(p), senha),
    });
  });

  function aoClicarNoCartao(evento) {
    const botao = evento.target.closest('button[data-id]');
    if (botao) abrirDetalhes(Number(botao.dataset.id));
  }

  cartoes.addEventListener('click', aoClicarNoCartao);
  cartoesDesativados.addEventListener('click', aoClicarNoCartao);

  carregar();
}