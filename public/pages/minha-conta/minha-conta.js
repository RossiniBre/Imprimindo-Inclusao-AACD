// Meu perfil (funcionário e admin da AACD).
// Lê GET /api/me: hoje o back devolve só { perfil }; a tela já usa também
// { nome, identificador, email, cargo, setor } quando vierem (pedido ao back).
// Altera o nome por POST /api/usuario/nome e cargo/setor por
// POST /api/funcionario/editar (sem id = a própria conta).
// Os pedidos vêm de GET /api/solicitacoes, filtrados por quem criou.

import { api } from '../../shared/js/api.js';

export const DIAS_LIMPEZA = 60;           // regra do back (PrazosSolicitacao)
const PEDIDOS_RECENTES = 5;

// ---------- Funções puras (testáveis) ----------

// "Ana Martins" -> "AM"
export function iniciais(nome) {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function nomeFuncao(perfil) {
  switch (perfil) {
    case 'ADMIN':       return 'Admin';
    case 'FUNCIONARIO': return 'Funcionário';
    case 'EMPRESA':     return 'Empresa parceira';
    default:            return '';
  }
}

export function descricaoFuncao(perfil) {
  switch (perfil) {
    case 'ADMIN':       return 'ADM · gerencia os funcionários e suas permissões';
    case 'FUNCIONARIO': return 'Funcionário · pode criar e acompanhar pedidos de impressão';
    default:            return nomeFuncao(perfil);
  }
}

// Pedidos criados por este usuário (o back manda o nome de quem criou)
export function meusPedidos(pedidos, nome) {
  const alvo = (nome ?? '').trim().toLowerCase();
  if (alvo === '') return [];
  return pedidos.filter((p) => (p.criadoPor ?? '').trim().toLowerCase() === alvo);
}

export function estatisticas(pedidos) {
  return {
    enviados: pedidos.length,
    imprimindo: pedidos.filter((p) => p.status === 'EM_ANDAMENTO').length,
    aguardando: pedidos.filter((p) => p.status === 'PENDENTE').length,
    recusados: pedidos.filter((p) => p.status === 'RECUSADA' || p.status === 'FALHOU').length,
  };
}

// Mais novos primeiro (o back lista por id crescente = ordem de criação)
export function recentes(pedidos, limite = PEDIDOS_RECENTES) {
  return [...pedidos].sort((a, b) => b.id - a.id).slice(0, limite);
}

// Resumo do painel do admin, a partir de GET /api/funcionarios
export function estatisticasEquipe(funcionarios) {
  return {
    ativos: funcionarios.filter((f) => f.ativo && f.perfil !== 'ADMIN').length,
    inativos: funcionarios.filter((f) => !f.ativo).length,
    admins: funcionarios.filter((f) => f.perfil === 'ADMIN').length,
  };
}

// Últimos adicionados primeiro (id maior = mais novo)
export function equipeRecente(funcionarios, limite = PEDIDOS_RECENTES) {
  return [...funcionarios].sort((a, b) => b.id - a.id).slice(0, limite);
}

export function rotuloStatus(status) {
  switch (status) {
    case 'PENDENTE':     return { texto: 'Aguardando resposta', classe: 'chip--destaque' };
    case 'EM_ANDAMENTO': return { texto: 'Imprimindo', classe: 'chip--destaque' };
    case 'CONCLUIDA':    return { texto: 'Pronta', classe: 'chip--sucesso' };
    case 'RECUSADA':     return { texto: 'Recusada', classe: 'chip--erro' };
    case 'FALHOU':       return { texto: 'Falhou', classe: 'chip--erro' };
    case 'CANCELADA':    return { texto: 'Cancelada', classe: 'chip--neutro' };
    default:             return { texto: status ?? '', classe: 'chip--neutro' };
  }
}

// "2026-10-14T16:30:00" -> "14/10" (data local, sem fuso, como o back manda)
export function formatarData(texto) {
  if (!texto) return '';
  const d = new Date(texto);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------- Tela ----------

export function iniciar(container) {
  let eu = {};          // dados do usuário logado
  let pedidos = [];

  let equipe = [];      // só para o admin
  const ehAdmin = () => eu.perfil === 'ADMIN';

  const avisoGeral = container.querySelector('#aviso-geral');
  const abaPainelAdm = container.querySelector('#aba-painel-adm');
  const abaAcompanhamento = container.querySelector('#aba-acompanhamento');
  const descricao = container.querySelector('#descricao');
  const blocoPedidos = container.querySelector('#bloco-pedidos');
  const blocoPainel = container.querySelector('#bloco-painel');
  const cartaoPedidos = container.querySelector('#cartao-pedidos');
  const cartaoEquipe = container.querySelector('#cartao-equipe');
  const corpoEquipe = container.querySelector('#corpo-equipe');
  const equipeVazia = container.querySelector('#equipe-vazia');
  const totaisEquipe = {
    ativos: container.querySelector('#total-ativos'),
    inativos: container.querySelector('#total-inativos'),
    admins: container.querySelector('#total-admins'),
  };

  const resumo = {
    avatar: container.querySelector('#avatar'),
    nome: container.querySelector('#resumo-nome'),
    cargo: container.querySelector('#resumo-cargo'),
    email: container.querySelector('#resumo-email'),
    funcao: container.querySelector('#resumo-funcao'),
    enviados: container.querySelector('#total-enviados'),
    imprimindo: container.querySelector('#total-imprimindo'),
    aguardando: container.querySelector('#total-aguardando'),
    recusados: container.querySelector('#total-recusados'),
  };

  const form = container.querySelector('#form-dados');
  const campos = {
    nome: container.querySelector('#dado-nome'),
    cargo: container.querySelector('#dado-cargo'),
    setor: container.querySelector('#dado-setor'),
    email: container.querySelector('#dado-email'),
    login: container.querySelector('#dado-login'),
    funcao: container.querySelector('#dado-funcao'),
  };
  const erroNome = container.querySelector('#erro-nome');
  const erroForm = container.querySelector('#erro-form');
  const sucessoForm = container.querySelector('#sucesso-form');
  const botaoSalvar = container.querySelector('#botao-salvar');
  const botaoCancelar = container.querySelector('#botao-cancelar');
  const botaoSair = container.querySelector('#botao-sair');

  const corpoPedidos = container.querySelector('#corpo-pedidos');
  const pedidosVazio = container.querySelector('#pedidos-vazio');
  const pedidosRodape = container.querySelector('#pedidos-rodape');
  container.querySelector('#dias-limpeza').textContent = DIAS_LIMPEZA;

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  // ----- Preenchimento -----

  function preencherResumo() {
    const nome = eu.nome ?? '';
    resumo.avatar.textContent = iniciais(nome);
    resumo.nome.textContent = nome || 'Nome não informado';
    resumo.cargo.textContent = [eu.cargo, eu.setor].filter(Boolean).join(' · ');
    resumo.email.textContent = eu.email ?? '';
    resumo.funcao.textContent = ehAdmin() ? 'ADM' : nomeFuncao(eu.perfil);
    resumo.funcao.className = `chip ${ehAdmin() ? 'chip--erro' : 'chip--destaque'}`;

    // Admin vê o painel de administração; funcionário vê o acompanhamento
    abaPainelAdm.hidden = !ehAdmin();
    abaAcompanhamento.hidden = ehAdmin();
    descricao.textContent = ehAdmin()
      ? 'Seus dados de acesso ao painel de administração da AACD.'
      : 'Seus dados e os pedidos que você enviou em nome da AACD.';
    blocoPedidos.hidden = ehAdmin();
    blocoPainel.hidden = !ehAdmin();
    cartaoPedidos.hidden = ehAdmin();
    cartaoEquipe.hidden = !ehAdmin();
  }

  function preencherEquipe() {
    const e = estatisticasEquipe(equipe);
    totaisEquipe.ativos.textContent = e.ativos;
    totaisEquipe.inativos.textContent = e.inativos;
    totaisEquipe.admins.textContent = e.admins;

    const lista = equipeRecente(equipe);
    corpoEquipe.replaceChildren(...lista.map((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="tabela__pedido"><span class="tabela__nome"></span><span class="tabela__email"></span></td>
        <td><span class="chip chip--funcao"></span></td>
        <td><span class="chip chip--status"></span></td>
      `;
      tr.querySelector('.tabela__nome').textContent = f.nome ?? '';
      tr.querySelector('.tabela__email').textContent = f.email ?? '';
      const funcao = tr.querySelector('.chip--funcao');
      funcao.textContent = f.perfil === 'ADMIN' ? 'Admin' : 'Funcionário';
      funcao.className = `chip ${f.perfil === 'ADMIN' ? 'chip--erro' : 'chip--neutro'}`;
      const status = tr.querySelector('.chip--status');
      status.textContent = f.ativo ? 'Ativo' : 'Inativo';
      status.className = `chip ${f.ativo ? 'chip--sucesso' : 'chip--neutro'}`;
      return tr;
    }));
    equipeVazia.hidden = lista.length > 0;
  }

  function preencherFormulario() {
    campos.nome.value = eu.nome ?? '';
    campos.cargo.value = eu.cargo ?? '';
    campos.setor.value = eu.setor ?? '';
    campos.email.value = eu.email ?? '';
    campos.login.value = eu.identificador ?? '';
    campos.funcao.value = descricaoFuncao(eu.perfil);
    erroNome.textContent = '';
    campos.nome.classList.remove('com-erro');
    erroForm.hidden = true;
    sucessoForm.hidden = true;
  }

  function preencherPedidos() {
    const meus = meusPedidos(pedidos, eu.nome);
    const e = estatisticas(meus);
    resumo.enviados.textContent = e.enviados;
    resumo.imprimindo.textContent = e.imprimindo;
    resumo.aguardando.textContent = e.aguardando;
    resumo.recusados.textContent = e.recusados;

    const lista = recentes(meus);
    corpoPedidos.replaceChildren(...lista.map((p) => {
      const tr = document.createElement('tr');
      const { texto, classe } = rotuloStatus(p.status);
      tr.innerHTML = `
        <td class="tabela__pedido"></td>
        <td class="tabela__empresa"></td>
        <td><span class="chip ${classe}"></span></td>
        <td class="tabela__data"></td>
      `;
      tr.querySelector('.tabela__pedido').textContent = `${p.id} · ${p.titulo}`;
      tr.querySelector('.tabela__empresa').textContent = p.empresa ?? '';
      tr.querySelector('.chip').textContent = texto;
      tr.querySelector('.tabela__data').textContent = formatarData(p.criadoEm);
      return tr;
    }));

    pedidosVazio.hidden = lista.length > 0;
    pedidosRodape.hidden = meus.length <= lista.length;
  }

  // ----- Carregamento -----

  async function carregar() {
    let respostaEu;
    try {
      respostaEu = await api.eu();
    } catch {
      resumo.nome.textContent = 'Sem conexão';
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
      return;
    }

    if (respostaEu.status === 401) {
      location.hash = '#/login?perfil=aacd';
      return;
    }
    if (!respostaEu.ok) {
      resumo.nome.textContent = '';
      mostrarAviso(respostaEu.corpo?.erro ?? 'Não foi possível carregar seus dados.');
      return;
    }

    eu = respostaEu.corpo ?? {};

    // Admin: resumo da equipe. Funcionário: os próprios pedidos.
    try {
      const r = ehAdmin() ? await api.funcionarios() : await api.solicitacoes();
      const lista = r.ok && Array.isArray(r.corpo) ? r.corpo : [];
      if (ehAdmin()) equipe = lista; else pedidos = lista;
    } catch {
      mostrarAviso('Não foi possível carregar a lista. Os dados pessoais continuam disponíveis.');
    }

    if (eu.perfil === 'EMPRESA') {
      mostrarAviso('Esta é a página de perfil da AACD. A tela "Minha conta" da empresa parceira ainda não existe.');
    } else if (!eu.nome) {
      mostrarAviso('O servidor ainda não informa nome, e-mail, cargo e setor nesta rota. Os campos aparecem vazios até isso existir.');
    }

    preencherResumo();
    preencherFormulario();
    if (ehAdmin()) preencherEquipe(); else preencherPedidos();
  }

  // Depois de trocar o nome, o back passa a listar os pedidos com o nome novo;
  // busca de novo para os contadores não ficarem zerados.
  async function recarregarPedidos() {
    try {
      const r = await api.solicitacoes();
      if (r.ok && Array.isArray(r.corpo)) pedidos = r.corpo;
    } catch {
      // mantém a lista que já estava na tela
    }
    preencherPedidos();
  }

  // ----- Formulário -----

  campos.nome.addEventListener('input', () => {
    erroNome.textContent = '';
    campos.nome.classList.remove('com-erro');
    sucessoForm.hidden = true;
  });
  [campos.cargo, campos.setor].forEach((c) => c.addEventListener('input', () => { sucessoForm.hidden = true; }));

  botaoCancelar.addEventListener('click', preencherFormulario);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroForm.hidden = true;
    sucessoForm.hidden = true;

    const nome = campos.nome.value.trim();
    const cargo = campos.cargo.value.trim();
    const setor = campos.setor.value.trim();

    if (nome === '') {
      erroNome.textContent = 'Digite seu nome completo.';
      campos.nome.classList.add('com-erro');
      campos.nome.focus();
      return;
    }

    const mudouNome = nome !== (eu.nome ?? '');
    const mudouCargoSetor = cargo !== (eu.cargo ?? '') || setor !== (eu.setor ?? '');
    if (!mudouNome && !mudouCargoSetor) {
      sucessoForm.textContent = 'Nada para salvar.';
      sucessoForm.hidden = false;
      return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando...';

    try {
      if (mudouNome) {
        const r = await api.editarNome(nome);
        if (!r.ok) throw r;
        eu.nome = nome;
      }
      if (mudouCargoSetor) {
        if (!eu.email) {
          throw { corpo: { erro: 'Cargo e setor só podem ser salvos quando o servidor informar seu e-mail.' } };
        }
        const r = await api.editarFuncionario({ email: eu.email, cargo, setor });
        if (!r.ok) throw r;
        eu.cargo = cargo;
        eu.setor = setor;
      }
      sucessoForm.textContent = 'Alterações salvas.';
      sucessoForm.hidden = false;
      preencherResumo();
      if (ehAdmin()) preencherEquipe();
      else if (mudouNome) await recarregarPedidos();
      else preencherPedidos();
    } catch (falha) {
      // 400 dados inválidos · 409 sem permissão / e-mail em uso · sem corpo = sem conexão
      const mensagem = falha?.corpo?.erro
        ?? (falha?.status ? 'Não foi possível salvar. Tente de novo.' : 'Sem conexão com o servidor. Tente de novo em instantes.');
      if (mensagem.toLowerCase().includes('nome')) {
        erroNome.textContent = mensagem;
        campos.nome.classList.add('com-erro');
        campos.nome.focus();
      } else {
        erroForm.textContent = mensagem;
        erroForm.hidden = false;
      }
    }

    botaoSalvar.disabled = false;
    botaoSalvar.textContent = 'Salvar alterações';
  });

  // ----- Sair -----

  botaoSair.addEventListener('click', async () => {
    botaoSair.disabled = true;
    try {
      await api.logout();
    } catch {
      // Sem conexão: a sessão do navegador já era; segue para o login mesmo assim
    }
    location.hash = '#/login?perfil=aacd';
  });

  carregar();
}
