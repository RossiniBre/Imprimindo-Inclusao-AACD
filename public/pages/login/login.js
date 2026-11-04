// Tela de login. A mesma tela serve empresa e funcionário da AACD:
//   #/login              -> textos da empresa parceira (padrão)
//   #/login  -> textos do funcionário da AACD
// O back decide quem é quem pelo identificador (e-mail ou login).

import { api } from '../../shared/js/api.js';

const VARIANTES = {
  empresa: {
    painelTitulo: 'Sua impressora 3D pode mudar a vida de alguém.',
    painelDescricao: 'Conecte-se à AACD e ajude a produzir próteses e órteses para quem mais precisa.',
    painelNota: '',
    painelRodape: 'Portal AACD',
    subtitulo: 'Entre para acessar a sua conta.',
    placeholder: 'e-mail ou login',
    mostrarCadastro: true,
    linkEsqueci: '#/esqueci-senha',
  },
  aacd: {
    painelTitulo: 'Seu trabalho ajuda milhares de pessoas que mais precisam',
    painelDescricao: 'Faça o login com seus respectivos dados para acessar sua conta.',
    painelNota: '(caso esteja enfrentando problemas, consulte o suporte)',
    painelRodape: 'Portal do funcionário',
    subtitulo: 'Entre para gerenciar as solicitações da AACD.',
    placeholder: 'nome@aacd.com',
    mostrarCadastro: false,
    linkEsqueci: '#/esqueci-senha',
  },
};

// Qual variante mostrar, a partir dos parâmetros da URL
// Login único para todos: o back decide o perfil pelo identificador
export function variante() {
  return 'empresa';
}

// Para onde cada perfil vai depois de entrar
export function destinoPorPerfil(perfil) {
  switch (perfil) {
    case 'ADMIN':       return '#/funcionarios';
    case 'FUNCIONARIO': return '#/painel-aacd';
    case 'EMPRESA':     return '#/painel-empresa';
    default:            return '#/';
  }
}

function aplicarVariante(container, nome) {
  const v = VARIANTES[nome];

  container.querySelector('#login-painel-titulo').textContent = v.painelTitulo;
  container.querySelector('#login-painel-descricao').textContent = v.painelDescricao;
  container.querySelector('#login-painel-rodape').textContent = v.painelRodape;
  container.querySelector('#login-subtitulo').textContent = v.subtitulo;
  container.querySelector('#login-identificador').placeholder = v.placeholder;
  container.querySelector('#link-esqueci').href = v.linkEsqueci;
  container.querySelector('#login-cadastro').hidden = !v.mostrarCadastro;

  const nota = container.querySelector('#login-painel-nota');
  nota.textContent = v.painelNota;
  nota.hidden = v.painelNota === '';
}

export function iniciar(container, { params } = {}) {
  aplicarVariante(container, variante(params));

  const formulario = container.querySelector('#form-login');
  const campoIdentificador = container.querySelector('#login-identificador');
  const campoSenha = container.querySelector('#login-senha');
  const erroIdentificador = container.querySelector('#erro-identificador');
  const erroSenha = container.querySelector('#erro-senha');
  const erroGeral = container.querySelector('#erro-geral');
  const botaoEntrar = container.querySelector('#botao-entrar');
  const botaoOlho = container.querySelector('#botao-olho');
  const olhoAberto = botaoOlho.querySelector('.login__olho-aberto');
  const olhoFechado = botaoOlho.querySelector('.login__olho-fechado');

  function mostrarErro(campo, elemento, texto) {
    elemento.textContent = texto;
    campo.classList.add('com-erro');
  }

  function limparErro(campo, elemento) {
    elemento.textContent = '';
    campo.classList.remove('com-erro');
  }

  // Mostrar / esconder a senha
  botaoOlho.addEventListener('click', () => {
    const mostrando = campoSenha.classList.toggle('visivel');
    olhoAberto.hidden = mostrando;
    olhoFechado.hidden = !mostrando;
    botaoOlho.setAttribute('aria-pressed', String(mostrando));
    botaoOlho.setAttribute('aria-label', mostrando ? 'Esconder senha' : 'Mostrar senha');
    campoSenha.focus();
  });

  campoIdentificador.addEventListener('input', () => limparErro(campoIdentificador, erroIdentificador));
  campoSenha.addEventListener('input', () => limparErro(campoSenha, erroSenha));

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const identificador = campoIdentificador.value.trim();
    const senha = campoSenha.value;
    let temErro = false;

    if (identificador === '') {
      mostrarErro(campoIdentificador, erroIdentificador, 'Digite seu e-mail ou login.');
      temErro = true;
    }
    if (senha === '') {
      mostrarErro(campoSenha, erroSenha, 'Digite sua senha.');
      temErro = true;
    }
    if (temErro) {
      formulario.querySelector('input.com-erro')?.focus();
      return;
    }

    botaoEntrar.disabled = true;
    botaoEntrar.textContent = 'Entrando...';

    try {
      const resposta = await api.login(identificador, senha);

      if (resposta.ok) {
        location.hash = destinoPorPerfil(resposta.corpo?.perfil);
        return;
      }

      // 401: login/senha inválidos; 403: conta desativada pela AACD
      erroGeral.textContent = resposta.corpo?.erro ?? 'Não foi possível entrar. Tente de novo.';
      erroGeral.hidden = false;
    } catch {
      erroGeral.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      erroGeral.hidden = false;
    }

    botaoEntrar.disabled = false;
    botaoEntrar.textContent = 'Entrar';
  });
}
