// Tela Funcionários (só o admin).
// Lista vem de GET /api/funcionarios:
//   { id, nome, identificador, email, perfil, cargo, setor, ativo }
// Cadastro: POST /api/funcionarios. Status: POST /api/conta/desativar | reativar.

import { api } from '../../shared/js/api.js';

// E-mail de funcionário precisa ser institucional (regra do back: EmailValidador)
const DOMINIO_AACD = '@aacd.com';

// ---------- Funções puras (testáveis) ----------

// "Ana Martins" -> "AM"
export function iniciais(nome) {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function filtrar(lista, termo, filtro) {
  const t = (termo ?? '').trim().toLowerCase();

  return lista.filter((f) => {
    const bateStatus =
      filtro === 'todos' ||
      (filtro === 'ativo' && f.ativo) ||
      (filtro === 'inativo' && !f.ativo);

    const bateBusca =
      t === '' ||
      f.nome.toLowerCase().includes(t) ||
      (f.email ?? '').toLowerCase().includes(t) ||
      (f.identificador ?? '').toLowerCase().includes(t);

    return bateStatus && bateBusca;
  });
}

export function emailInstitucionalValido(email) {
  const e = (email ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.endsWith(DOMINIO_AACD);
}

// Encaixa a mensagem de erro do back no campo certo do modal
export function campoDoErro(mensagem) {
  const m = (mensagem ?? '').toLowerCase();
  if (m.includes('login')) return 'identificador';
  if (m.includes('e-mail')) return 'email';
  if (m.includes('senha')) return 'senha';
  if (m.includes('nome')) return 'nome';
  return null;
}

// ---------- Tela ----------

// O router chama destruir() do módulo ao sair da tela; iniciar() registra aqui o que limpar.
let limpar = null;

export function destruir() {
  limpar?.();
  limpar = null;
}

export function iniciar(container) {
  let funcionarios = [];
  let filtroAtual = 'todos';

  const corpoTabela = container.querySelector('#corpo-tabela');
  const tabelaVazia = container.querySelector('#tabela-vazia');
  const tabelaCarregando = container.querySelector('#tabela-carregando');
  const campoBusca = container.querySelector('#campo-busca');
  const botoesFiltro = container.querySelectorAll('.funcionarios__filtro');
  const contadorMostrando = container.querySelector('#contador-mostrando');
  const totalTodos = container.querySelector('#total-todos');
  const totalAtivos = container.querySelector('#total-ativos');
  const totalInativos = container.querySelector('#total-inativos');
  const avisoGeral = container.querySelector('#aviso-geral');
  const botaoAdicionar = container.querySelector('#botao-adicionar');

  const modal = container.querySelector('#modal-adicionar');
  const formAdicionar = container.querySelector('#form-adicionar');
  const botaoFecharModal = container.querySelector('#botao-fechar-modal');
  const botaoCancelarModal = container.querySelector('#botao-cancelar-modal');
  const botaoCadastrar = container.querySelector('#botao-cadastrar');
  const erroModal = container.querySelector('#erro-modal');

  const campos = {
    nome:          container.querySelector('#novo-nome'),
    identificador: container.querySelector('#novo-login'),
    email:         container.querySelector('#novo-email'),
    senha:         container.querySelector('#nova-senha'),
    cargo:         container.querySelector('#novo-cargo'),
    setor:         container.querySelector('#novo-setor'),
  };
  const erros = {
    nome:          container.querySelector('#erro-nome'),
    identificador: container.querySelector('#erro-login'),
    email:         container.querySelector('#erro-email'),
    senha:         container.querySelector('#erro-senha'),
  };

  // ----- Avisos -----

  function mostrarAviso(texto) {
    avisoGeral.textContent = texto;
    avisoGeral.hidden = false;
  }

  function limparAviso() {
    avisoGeral.hidden = true;
  }

  // ----- Lista -----

  function atualizarContadores() {
    const ativos = funcionarios.filter((f) => f.ativo).length;
    totalTodos.textContent = funcionarios.length;
    totalAtivos.textContent = ativos;
    totalInativos.textContent = funcionarios.length - ativos;
  }

  function montarLinha(f) {
    const tr = document.createElement('tr');
    const admin = f.perfil === 'ADMIN';

    const chipFuncao = admin ? '<span class="chip chip--admin">Admin</span>' : 'Funcionário';
    const chipStatus = f.ativo
      ? '<span class="chip chip--ativo">Ativo</span>'
      : '<span class="chip chip--inativo">Inativo</span>';

    // O back não deixa alterar contas de administrador.
    let botaoStatus = '';
    if (!admin) {
      botaoStatus = f.ativo
        ? `<button type="button" class="botao-linha botao-linha--desativar" data-acao="desativar" data-id="${f.id}">Desativar</button>`
        : `<button type="button" class="botao-linha botao-linha--reativar" data-acao="reativar" data-id="${f.id}">Reativar</button>`;
    }

    tr.innerHTML = `
      <td>
        <div class="pessoa">
          <span class="avatar ${f.ativo ? '' : 'inativo'}"></span>
          <div>
            <div class="pessoa__nome"></div>
            <div class="pessoa__email"></div>
          </div>
        </div>
      </td>
      <td class="celula-login"></td>
      <td>${chipFuncao}</td>
      <td class="celula-cargo"></td>
      <td class="celula-setor"></td>
      <td>${chipStatus}</td>
      <td>
        <div class="acoes">
          <button type="button" class="botao-linha" data-acao="editar" data-id="${f.id}">Editar</button>
          ${botaoStatus}
        </div>
      </td>
    `;

    // Textos vindos do back entram como texto, nunca como HTML
    tr.querySelector('.avatar').textContent = iniciais(f.nome);
    tr.querySelector('.pessoa__nome').textContent = f.nome;
    tr.querySelector('.pessoa__email').textContent = f.email ?? '';
    tr.querySelector('.celula-login').textContent = f.identificador ?? '';
    preencherOpcional(tr.querySelector('.celula-cargo'), f.cargo);
    preencherOpcional(tr.querySelector('.celula-setor'), f.setor);

    return tr;
  }

  function preencherOpcional(celula, valor) {
    if (valor) {
      celula.textContent = valor;
    } else {
      celula.textContent = '—';
      celula.classList.add('texto-suave');
    }
  }

  function renderizar() {
    const lista = filtrar(funcionarios, campoBusca.value, filtroAtual);

    corpoTabela.replaceChildren(...lista.map(montarLinha));

    tabelaCarregando.hidden = true;
    tabelaVazia.hidden = lista.length > 0;
    contadorMostrando.textContent =
      `Mostrando ${lista.length} de ${funcionarios.length} funcionário${funcionarios.length === 1 ? '' : 's'}`;

    atualizarContadores();
  }

  async function carregar() {
    limparAviso();

    let resposta;
    try {
      resposta = await api.funcionarios();
    } catch {
      tabelaCarregando.hidden = true;
      mostrarAviso('Sem conexão com o servidor. Recarregue a página para tentar de novo.');
      return;
    }

    if (resposta.status === 401) {
      location.hash = '#/login?perfil=aacd';
      return;
    }
    if (!resposta.ok) {
      tabelaCarregando.hidden = true;
      mostrarAviso(resposta.corpo?.erro ?? 'Não foi possível carregar os funcionários.');
      return;
    }

    funcionarios = Array.isArray(resposta.corpo) ? resposta.corpo : [];
    renderizar();
  }

  campoBusca.addEventListener('input', renderizar);

  botoesFiltro.forEach((botao) => {
    botao.addEventListener('click', () => {
      botoesFiltro.forEach((b) => b.classList.remove('ativo'));
      botao.classList.add('ativo');
      filtroAtual = botao.dataset.filtro;
      renderizar();
    });
  });

  // Ações da tabela
  corpoTabela.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;

    const id = Number(botao.dataset.id);
    const acao = botao.dataset.acao;

    if (acao === 'editar') {
      // O modal "Editar funcionário" é outra tela do Figma; ligar aqui quando existir.
      console.log('Editar funcionário', id);
      return;
    }

    limparAviso();
    botao.disabled = true;

    try {
      const resposta = acao === 'desativar'
        ? await api.desativarConta(id)
        : await api.reativarConta(id);

      if (resposta.ok) {
        await carregar();
        return;
      }
      mostrarAviso(resposta.corpo?.erro ?? 'Não foi possível alterar o status.');
    } catch {
      mostrarAviso('Sem conexão com o servidor. Tente de novo em instantes.');
    }

    botao.disabled = false;
  });

  // ----- Modal: adicionar funcionário -----

  function mostrarErroCampo(nome, texto) {
    erros[nome].textContent = texto;
    campos[nome].classList.add('com-erro');
  }

  function limparErroCampo(nome) {
    erros[nome].textContent = '';
    campos[nome].classList.remove('com-erro');
  }

  function limparErrosModal() {
    Object.keys(erros).forEach(limparErroCampo);
    erroModal.hidden = true;
  }

  function abrirModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    campos.nome.focus();
  }

  function fecharModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    formAdicionar.reset();
    limparErrosModal();
    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = 'Cadastrar funcionário';
    botaoAdicionar.focus();
  }

  function aoApertarEsc(evento) {
    if (evento.key === 'Escape' && !modal.hidden) fecharModal();
  }

  botaoAdicionar.addEventListener('click', abrirModal);
  botaoFecharModal.addEventListener('click', fecharModal);
  botaoCancelarModal.addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) fecharModal();
  });
  document.addEventListener('keydown', aoApertarEsc);

  Object.keys(erros).forEach((nome) => {
    campos[nome].addEventListener('input', () => limparErroCampo(nome));
  });

  formAdicionar.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErrosModal();

    const dados = {
      nome: campos.nome.value.trim(),
      identificador: campos.identificador.value.trim(),
      email: campos.email.value.trim().toLowerCase(),
      senha: campos.senha.value,
      cargo: campos.cargo.value.trim(),
      setor: campos.setor.value.trim(),
    };
    let temErro = false;

    if (dados.nome === '') {
      mostrarErroCampo('nome', 'Digite o nome completo.');
      temErro = true;
    }
    if (dados.identificador === '') {
      mostrarErroCampo('identificador', 'Digite o login.');
      temErro = true;
    } else if (dados.identificador.includes('@')) {
      mostrarErroCampo('identificador', 'O login não pode conter @. Ex.: camila.duarte');
      temErro = true;
    }
    if (dados.email === '') {
      mostrarErroCampo('email', 'Digite o e-mail institucional.');
      temErro = true;
    } else if (!emailInstitucionalValido(dados.email)) {
      mostrarErroCampo('email', `O e-mail precisa terminar em ${DOMINIO_AACD}.`);
      temErro = true;
    }
    if (dados.senha.length < 8) {
      mostrarErroCampo('senha', 'A senha precisa ter pelo menos 8 caracteres.');
      temErro = true;
    }

    if (temErro) {
      formAdicionar.querySelector('input.com-erro')?.focus();
      return;
    }

    botaoCadastrar.disabled = true;
    botaoCadastrar.textContent = 'Cadastrando...';

    try {
      const resposta = await api.cadastrarFuncionario(dados);

      if (resposta.ok) {
        fecharModal();
        campoBusca.value = '';
        await carregar();
        return;
      }

      // 400 (dados inválidos) ou 409 (login/e-mail já em uso)
      const mensagem = resposta.corpo?.erro ?? 'Não foi possível cadastrar. Tente de novo.';
      const campo = campoDoErro(mensagem);
      if (campo) {
        mostrarErroCampo(campo, mensagem);
        campos[campo].focus();
      } else {
        erroModal.textContent = mensagem;
        erroModal.hidden = false;
      }
    } catch {
      erroModal.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      erroModal.hidden = false;
    }

    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = 'Cadastrar funcionário';
  });

  limpar = () => {
    document.removeEventListener('keydown', aoApertarEsc);
    document.body.style.overflow = '';
  };

  carregar();
}
