// Tela Funcionários (só o admin).

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

  // Modal: adicionar
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

  // Modal: editar
  const modalEditar = container.querySelector('#modal-editar');
  const formEditar = container.querySelector('#form-editar');
  const erroEditar = container.querySelector('#erro-editar');
  const botaoSalvarEditar = container.querySelector('#botao-salvar-editar');
  const camposEditar = {
    nome:          container.querySelector('#editar-nome'),
    identificador: container.querySelector('#editar-login'),
    email:         container.querySelector('#editar-email'),
    cargo:         container.querySelector('#editar-cargo'),
    setor:         container.querySelector('#editar-setor'),
  };
  const errosEditar = {
    nome:          container.querySelector('#editar-erro-nome'),
    identificador: container.querySelector('#editar-erro-identificador'),
    email:         container.querySelector('#editar-erro-email'),
  };
  let editandoId = null;

  // Modal: excluir
  const modalExcluir = container.querySelector('#modal-excluir');
  const erroExcluir = container.querySelector('#erro-excluir');
  const nomeExcluir = container.querySelector('#excluir-nome');
  const botaoCancelarExcluir = container.querySelector('#botao-cancelar-excluir');
  const botaoConfirmarExcluir = container.querySelector('#botao-confirmar-excluir');
  let excluindoId = null;

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

    // Admin não é excluído pelo painel, igual ao desativar.
    const botaoExcluir = admin
      ? ''
      : `<button type="button" class="botao-linha botao-linha--excluir" data-acao="excluir" data-id="${f.id}">Excluir</button>`;

      // Admin edita os próprios dados na tela de perfil, não aqui.
    const botaoEditar = admin
      ? ''
      : `<button type="button" class="botao-linha" data-acao="editar" data-id="${f.id}">Editar</button>`;

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
          ${botaoEditar}
          ${botaoStatus}
          ${botaoExcluir}
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
      location.hash = '#/login';
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
      const alvo = funcionarios.find((f) => f.id === id);
      if (alvo?.perfil === 'ADMIN') return;
      abrirModalEditar(alvo);
      return;
    }

    if (acao === 'excluir') {
      abrirModalExcluir(funcionarios.find((f) => f.id === id));
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
    if (evento.key !== 'Escape') return;
    if (!modal.hidden) fecharModal();
    if (!modalEditar.hidden) fecharModalEditar();
    if (!modalExcluir.hidden) fecharModalExcluir();
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

  // ----- Modal: editar funcionário -----

  function erroEditarCampo(nome, texto) {
    errosEditar[nome].textContent = texto;
    camposEditar[nome].classList.add('com-erro');
  }

  function limparErrosEditar() {
    Object.keys(errosEditar).forEach((nome) => {
      errosEditar[nome].textContent = '';
      camposEditar[nome].classList.remove('com-erro');
    });
    erroEditar.hidden = true;
  }

  function abrirModalEditar(f) {
    if (!f) return;
    editandoId = f.id;
    camposEditar.nome.value = f.nome ?? '';
    camposEditar.identificador.value = f.identificador ?? '';
    camposEditar.email.value = f.email ?? '';
    camposEditar.cargo.value = f.cargo ?? '';
    camposEditar.setor.value = f.setor ?? '';
    limparErrosEditar();
    modalEditar.hidden = false;
    document.body.style.overflow = 'hidden';
    camposEditar.nome.focus();
  }

  function fecharModalEditar() {
    modalEditar.hidden = true;
    document.body.style.overflow = '';
    limparErrosEditar();
    botaoSalvarEditar.disabled = false;
    botaoSalvarEditar.textContent = 'Salvar alterações';
    editandoId = null;
  }

  container.querySelector('#botao-fechar-editar').addEventListener('click', fecharModalEditar);
  container.querySelector('#botao-cancelar-editar').addEventListener('click', fecharModalEditar);
  modalEditar.addEventListener('click', (evento) => {
    if (evento.target === modalEditar) fecharModalEditar();
  });
  Object.keys(errosEditar).forEach((nome) => {
    camposEditar[nome].addEventListener('input', () => {
      errosEditar[nome].textContent = '';
      camposEditar[nome].classList.remove('com-erro');
    });
  });

  formEditar.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErrosEditar();

    const original = funcionarios.find((f) => f.id === editandoId);
    const dados = {
      id: editandoId,
      nome: camposEditar.nome.value.trim(),
      identificador: camposEditar.identificador.value.trim(),
      email: camposEditar.email.value.trim().toLowerCase(),
      cargo: camposEditar.cargo.value.trim(),
      setor: camposEditar.setor.value.trim(),
    };
    let temErro = false;

    if (dados.nome === '') {
      erroEditarCampo('nome', 'Digite o nome completo.');
      temErro = true;
    }
    if (dados.identificador === '') {
      erroEditarCampo('identificador', 'Digite o login.');
      temErro = true;
    } else if (dados.identificador.includes('@')) {
      erroEditarCampo('identificador', 'O login não pode conter @.');
      temErro = true;
    }
    if (!emailInstitucionalValido(dados.email)) {
      erroEditarCampo('email', `O e-mail precisa terminar em ${DOMINIO_AACD}.`);
      temErro = true;
    }
    if (temErro) {
      formEditar.querySelector('input.com-erro')?.focus();
      return;
    }

    botaoSalvarEditar.disabled = true;
    botaoSalvarEditar.textContent = 'Salvando...';

    try {
      // Cada etapa guarda o campo do modal a que pertence, para mostrar o erro no lugar certo
      const etapas = [];
      if (dados.nome !== original?.nome) {
        etapas.push({
          campo: 'nome',
          chamar: () => api.editarNomeUsuario({ id: dados.id, nome: dados.nome }),
        });
      }
      if (dados.identificador !== original?.identificador) {
        etapas.push({
          campo: 'identificador',
          chamar: () => api.editarIdentificadorUsuario({ id: dados.id, identificador: dados.identificador }),
        });
      }
      etapas.push({
        campo: 'email',
        chamar: () => api.editarFuncionario({
          id: dados.id, email: dados.email, cargo: dados.cargo, setor: dados.setor,
        }),
      });

      let resposta = { ok: true };
      let campoFalhou = null;
      for (const etapa of etapas) {
        resposta = await etapa.chamar();
        if (!resposta.ok) {
          campoFalhou = etapa.campo;
          break;
        }
      }

      if (resposta.ok) {
        fecharModalEditar();
        await carregar();
        return;
      }

      const mensagem = resposta.corpo?.erro ?? 'Não foi possível salvar. Tente de novo.';
      const campo = campoDoErro(mensagem) ?? campoFalhou;
      if (campo && errosEditar[campo]) {
        erroEditarCampo(campo, mensagem);
        camposEditar[campo].focus();
      } else {
        erroEditar.textContent = mensagem;
        erroEditar.hidden = false;
      }
    } catch {
      erroEditar.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      erroEditar.hidden = false;
    }

    botaoSalvarEditar.disabled = false;
    botaoSalvarEditar.textContent = 'Salvar alterações';
  });

  // ----- Modal: excluir funcionário -----

  const campoSenhaExcluir = container.querySelector('#excluir-senha');

  function abrirModalExcluir(f) {
    if (!f) return;
    excluindoId = f.id;
    nomeExcluir.textContent = f.nome;
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
    botaoConfirmarExcluir.textContent = 'Excluir funcionário';
    excluindoId = null;
  }

  container.querySelector('#botao-fechar-excluir').addEventListener('click', fecharModalExcluir);
  botaoCancelarExcluir.addEventListener('click', fecharModalExcluir);
  modalExcluir.addEventListener('click', (evento) => {
    if (evento.target === modalExcluir) fecharModalExcluir();
  });
  campoSenhaExcluir.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      botaoConfirmarExcluir.click();
    }
  });

  botaoConfirmarExcluir.addEventListener('click', async () => {
    if (excluindoId === null) return;

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
      const resposta = await api.excluirConta(excluindoId, senha);
      if (resposta.ok) {
        fecharModalExcluir();
        await carregar();
        return;
      }
      erroExcluir.textContent = resposta.corpo?.erro ?? 'Não foi possível excluir. Tente de novo.';
      erroExcluir.hidden = false;
      campoSenhaExcluir.value = '';
      campoSenhaExcluir.focus();
    } catch {
      erroExcluir.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      erroExcluir.hidden = false;
    }

    botaoConfirmarExcluir.disabled = false;
    botaoConfirmarExcluir.textContent = 'Excluir funcionário';
  });

  limpar = () => {
    document.removeEventListener('keydown', aoApertarEsc);
    document.body.style.overflow = '';
  };

  carregar();
}
