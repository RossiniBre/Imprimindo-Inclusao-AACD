// Minha conta (empresa parceira).
// Reaproveita as funções puras da tela do funcionário.

import { api } from '../../shared/js/api.js';
import {
  DIAS_LIMPEZA,
  iniciais,
  estatisticas,
  recentes,
  rotuloStatus,
  formatarData,
} from '../minha-conta/minha-conta.js';

// ---------- Funções puras ----------

export function soDigitos(texto) {
  return (texto ?? '').replace(/\D/g, '');
}

export function formatarCnpj(texto) {
  const d = soDigitos(texto).slice(0, 14);
  if (d.length !== 14) return texto ?? '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function mascaraTelefone(texto) {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(texto) {
  const d = soDigitos(texto).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function rotuloCadastro(status) {
  switch (status) {
    case 'APROVADA':
    case 'APROVADO':
    case 'ATIVA':
    case 'ATIVO':     return { texto: 'Cadastro aprovado', classe: 'chip--sucesso' };
    case 'PENDENTE':
    case 'EM_ANALISE': return { texto: 'Em análise', classe: 'chip--destaque' };
    case 'RECUSADA':
    case 'RECUSADO':  return { texto: 'Cadastro recusado', classe: 'chip--erro' };
    default:          return { texto: 'Empresa parceira', classe: 'chip--neutro' };
  }
}

// Campos que a empresa edita
const EDITAVEIS = [
  'nome', 'email', 'responsavel', 'telefone',
  'cep', 'uf', 'cidade', 'bairro', 'logradouro', 'numero', 'complemento',
];

function valorDe(eu, ...chaves) {
  for (const c of chaves) if (eu?.[c] != null) return String(eu[c]);
  return '';
}

export function validar(v) {
  const erros = {};
  if (v.responsavel === '') erros.responsavel = 'Digite o nome do responsável.';
  const tel = soDigitos(v.telefone).length;
  if (tel !== 10 && tel !== 11) erros.telefone = 'Digite um telefone com DDD.';
  if (soDigitos(v.cep).length !== 8) erros.cep = 'Digite um CEP com 8 números.';
  if (v.cidade === '') erros.cidade = 'Digite a cidade.';
  if (v.bairro === '') erros.bairro = 'Digite o bairro.';
  if (v.logradouro === '') erros.logradouro = 'Digite o logradouro.';
  if (v.numero === '') erros.numero = 'Digite o número.';
  if (v.nome === '') erros.nome = 'Digite a razão social.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) erros.email = 'Digite um e-mail válido.';
  return erros;
}

// ---------- Tela ----------

export function iniciar(container) {
  let eu = {};
  let pedidos = [];

  const q = (seletor) => container.querySelector(seletor);

  const avisoGeral = q('#aviso-geral');
  const resumo = {
    avatar: q('#avatar'),
    nome: q('#resumo-nome'),
    cnpj: q('#resumo-cnpj'),
    email: q('#resumo-email'),
    status: q('#resumo-status'),
    enviados: q('#total-enviados'),
    imprimindo: q('#total-imprimindo'),
    aguardando: q('#total-aguardando'),
    recusados: q('#total-recusados'),
  };

  const form = q('#form-dados');
  const travados = {
    cnpj: q('#dado-cnpj'),
  };
  const campos = {};
  for (const nome of EDITAVEIS) campos[nome] = q(`#dado-${nome}`);
  const erros = {};
  for (const nome of EDITAVEIS) erros[nome] = q(`#erro-${nome}`);

  const erroForm = q('#erro-form');
  const sucessoForm = q('#sucesso-form');
  const botaoSalvar = q('#botao-salvar');
  const botaoCancelar = q('#botao-cancelar');
  const botaoSair = q('#botao-sair');

  const corpoPedidos = q('#corpo-pedidos');
  const pedidosVazio = q('#pedidos-vazio');
  const pedidosRodape = q('#pedidos-rodape');
  q('#dias-limpeza').textContent = DIAS_LIMPEZA;

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  function valoresDoForm() {
    const v = {};
    for (const nome of EDITAVEIS) v[nome] = campos[nome].value.trim();
    return v;
  }

  function valoresSalvos() {
    return {
      nome: valorDe(eu, 'razaoSocial', 'razao', 'nome'),
      email: valorDe(eu, 'email'),
      responsavel: valorDe(eu, 'responsavel', 'nomeResponsavel'),
      telefone: mascaraTelefone(valorDe(eu, 'telefone')),
      cep: mascaraCep(valorDe(eu, 'cep')),
      uf: valorDe(eu, 'uf', 'estado') || 'SP',
      cidade: valorDe(eu, 'cidade'),
      bairro: valorDe(eu, 'bairro'),
      logradouro: valorDe(eu, 'logradouro'),
      numero: valorDe(eu, 'numero'),
      complemento: valorDe(eu, 'complemento'),
    };
  }

  function houveMudanca() {
    const atual = valoresDoForm();
    const salvo = valoresSalvos();
    return EDITAVEIS.some((n) => atual[n] !== salvo[n]);
  }

  function atualizarBotaoCancelar() {
    botaoCancelar.disabled = !houveMudanca();
  }

  function limparErros() {
    for (const nome of EDITAVEIS) {
      if (erros[nome]) erros[nome].textContent = '';
      campos[nome].classList.remove('com-erro');
    }
    erroForm.hidden = true;
  }

  // ----- Preenchimento -----

  function preencherResumo() {
    const razao = valorDe(eu, 'razaoSocial', 'razao', 'nome');
    resumo.avatar.textContent = iniciais(razao);
    resumo.nome.textContent = razao || 'Nome não informado';
    resumo.cnpj.textContent = formatarCnpj(valorDe(eu, 'cnpj'));
    resumo.email.textContent = valorDe(eu, 'email');

    const { texto, classe } = rotuloCadastro(eu.statusCadastro ?? eu.status);
    resumo.status.textContent = texto;
    resumo.status.className = `chip ${classe}`;
  }

  function preencherFormulario() {
    travados.cnpj.value = formatarCnpj(valorDe(eu, 'cnpj'));
    const salvo = valoresSalvos();
    for (const nome of EDITAVEIS) campos[nome].value = salvo[nome];

    limparErros();
    sucessoForm.hidden = true;
    atualizarBotaoCancelar();
  }

  function preencherPedidos() {
    const e = estatisticas(pedidos);
    resumo.enviados.textContent = e.enviados;
    resumo.imprimindo.textContent = e.imprimindo;
    resumo.aguardando.textContent = e.aguardando;
    resumo.recusados.textContent = e.recusados;

    const lista = recentes(pedidos);
    corpoPedidos.replaceChildren(...lista.map((p) => {
      const tr = document.createElement('tr');
      const { texto, classe } = rotuloStatus(p.status);
      tr.innerHTML = `
        <td class="tabela__pedido"></td>
        <td class="tabela__empresa"></td>
        <td><span class="chip ${classe}"></span></td>
        <td class="tabela__data"></td>
      `;
      tr.querySelector('.tabela__pedido').textContent = `#${p.id}`;
      tr.querySelector('.tabela__empresa').textContent = p.titulo ?? '';
      tr.querySelector('.chip').textContent = texto;
      tr.querySelector('.tabela__data').textContent = formatarData(p.criadoEm);
      return tr;
    }));

    pedidosVazio.hidden = lista.length > 0;
    pedidosRodape.hidden = pedidos.length <= lista.length;
  }

    // ----- Excluir a própria conta -----

  const botaoExcluirConta = q('#botao-excluir-conta');
  const modalExcluir = q('#modal-excluir-conta');
  const nomeExcluir = q('#excluir-conta-nome');
  const campoSenhaExcluir = q('#excluir-conta-senha');
  const erroExcluir = q('#erro-excluir-conta');
  const botaoConfirmarExcluir = q('#botao-confirmar-excluir-conta');

  function abrirModalExcluir() {
    nomeExcluir.textContent = valorDe(eu, 'razaoSocial', 'razao', 'nome') || 'sua empresa';
    campoSenhaExcluir.value = '';
    erroExcluir.hidden = true;
    modalExcluir.hidden = false;
    document.body.style.overflow = 'hidden';
    campoSenhaExcluir.focus();
  }

  function fecharModalExcluir() {
    modalExcluir.hidden = true;
    document.body.style.overflow = '';
    campoSenhaExcluir.value = '';
    erroExcluir.hidden = true;
    botaoConfirmarExcluir.disabled = false;
    botaoConfirmarExcluir.textContent = 'Excluir minha conta';
    botaoExcluirConta.focus();
  }

  botaoExcluirConta.addEventListener('click', abrirModalExcluir);
  q('#botao-fechar-excluir-conta').addEventListener('click', fecharModalExcluir);
  q('#botao-cancelar-excluir-conta').addEventListener('click', fecharModalExcluir);
  modalExcluir.addEventListener('click', (evento) => {
    if (evento.target === modalExcluir) fecharModalExcluir();
  });

  // o foco fica dentro do modal, então não precisa de listener no document
  modalExcluir.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharModalExcluir();
  });
  campoSenhaExcluir.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      botaoConfirmarExcluir.click();
    }
  });

  botaoConfirmarExcluir.addEventListener('click', async () => {
    const senha = campoSenhaExcluir.value;
    if (senha === '') {
      erroExcluir.textContent = 'Digite a sua senha para confirmar.';
      erroExcluir.hidden = false;
      campoSenhaExcluir.focus();
      return;
    }

    erroExcluir.hidden = true;
    botaoConfirmarExcluir.disabled = true;
    botaoConfirmarExcluir.textContent = 'Excluindo...';

    try {
      const r = await api.excluirMinhaConta(senha);
      if (r.ok) {
        document.body.style.overflow = '';
        location.hash = '#/login';
        return;
      }
      erroExcluir.textContent = r.corpo?.erro ?? 'Não foi possível excluir. Tente de novo.';
      erroExcluir.hidden = false;
      campoSenhaExcluir.value = '';
      campoSenhaExcluir.focus();
    } catch {
      erroExcluir.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      erroExcluir.hidden = false;
    }

    botaoConfirmarExcluir.disabled = false;
    botaoConfirmarExcluir.textContent = 'Excluir minha conta';
  });

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
      location.hash = '#/login';
      return;
    }
    if (!respostaEu.ok) {
      resumo.nome.textContent = '';
      mostrarAviso(respostaEu.corpo?.erro ?? 'Não foi possível carregar os dados da empresa.');
      return;
    }

    eu = respostaEu.corpo ?? {};

    // Quem não é empresa usa a tela do funcionário.
    if (eu.perfil && eu.perfil !== 'EMPRESA') {
      location.hash = '#/minha-conta';
      return;
    }

    try {
      const r = await api.solicitacoes();
      pedidos = r.ok && Array.isArray(r.corpo) ? r.corpo : [];
    } catch {
      mostrarAviso('Não foi possível carregar os pedidos. Os dados da empresa continuam disponíveis.');
    }

    try {
      const p = await api.perfilEmpresa();
      if (p.status === 401) { location.hash = '#/login'; return; }
      if (!p.ok) {
        mostrarAviso(p.corpo?.erro ?? 'Não foi possível carregar os dados da empresa.');
      } else {
        // O back devolve o endereço aninhado e usa "rua"; o form usa "logradouro".
        const { endereco = {}, ...resto } = p.corpo ?? {};
        eu = { ...eu, ...resto, ...endereco, logradouro: endereco.rua };
      }
    } catch {
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
    }

    preencherResumo();
    preencherFormulario();
    preencherPedidos();
  }

  // ----- Formulário -----

  campos.telefone.addEventListener('input', () => {
    campos.telefone.value = mascaraTelefone(campos.telefone.value);
  });
  campos.cep.addEventListener('input', () => {
    campos.cep.value = mascaraCep(campos.cep.value);
  });

  form.addEventListener('input', (evento) => {
    sucessoForm.hidden = true;
    const nome = evento.target.name;
    if (erros[nome]) {
      erros[nome].textContent = '';
      campos[nome].classList.remove('com-erro');
    }
    atualizarBotaoCancelar();
  });

  botaoCancelar.addEventListener('click', preencherFormulario);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros();
    sucessoForm.hidden = true;

    if (!houveMudanca()) {
      sucessoForm.textContent = 'Nada para salvar.';
      sucessoForm.hidden = false;
      return;
    }

    const v = valoresDoForm();
    const falhas = validar(v);
    const nomesComErro = Object.keys(falhas);
    if (nomesComErro.length > 0) {
      for (const nome of nomesComErro) {
        erros[nome].textContent = falhas[nome];
        campos[nome].classList.add('com-erro');
      }
      campos[nomesComErro[0]].focus();
      return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando...';

    try {
      if (typeof api.editarEmpresa !== 'function') {
        throw { corpo: { erro: 'O envio dos dados da empresa ainda não foi ligado ao servidor.' } };
      }
      const r = await api.editarEmpresa({
        ...v,
        telefone: soDigitos(v.telefone),
        cep: soDigitos(v.cep),
      });
      if (!r.ok) throw r;

      eu = { ...eu, ...v };
      preencherResumo(); 
      preencherFormulario();
      sucessoForm.textContent = 'Alterações salvas.';
      sucessoForm.hidden = false;
    } catch (falha) {
      // 400 dados inválidos · sem corpo = sem conexão
      erroForm.textContent = falha?.corpo?.erro
        ?? (falha?.status
          ? 'Não foi possível salvar. Tente de novo.'
          : 'Sem conexão com o servidor. Tente de novo em instantes.');
      erroForm.hidden = false;
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
      // sem conexão: sai mesmo assim
    }
    location.hash = '#/login';
  });

  carregar();
}