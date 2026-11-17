// Tela "Esqueci minha senha": primeiro passo da recuperação de senha.
//   1. esqueci-senha   -> (aqui) a pessoa informa o e-mail e o back envia um código de 6 dígitos
//   2. codigo-senha    -> a pessoa informa o código
//   3. redefinir-senha -> a pessoa escolhe a nova senha
// Este arquivo também guarda o que passa de uma tela para a outra (e-mail e código).

import { api } from '../../shared/js/api.js';

// O e-mail digitado aqui vai para as telas seguintes pelo sessionStorage (e não pela URL,
// para não ficar no histórico do navegador). Some ao fechar a aba ou ao trocar a senha.
const CHAVE_EMAIL = 'redefinicao-email';

export function guardarEmail(email) {
  try { sessionStorage.setItem(CHAVE_EMAIL, email); } catch { /* sem sessionStorage: o campo fica vazio */ }
}

export function emailGuardado() {
  try { return sessionStorage.getItem(CHAVE_EMAIL) ?? ''; } catch { return ''; }
}

export function esquecerEmail() {
  try { sessionStorage.removeItem(CHAVE_EMAIL); } catch { /* nada a limpar */ }
}

// O código digitado no passo 2 fica só na memória da página, até a senha ser trocada.
// O aviso é a recusa do back ("código inválido"), mostrada quando a pessoa volta ao passo 2.
let codigoDigitado = '';
let avisoDoCodigo = '';

export function guardarCodigo(codigo) {
  codigoDigitado = codigo;
}

export function codigoGuardado() {
  return codigoDigitado;
}

export function guardarAvisoDoCodigo(texto) {
  avisoDoCodigo = texto;
}

// Lê o aviso uma vez só: depois de mostrado, ele some
export function pegarAvisoDoCodigo() {
  const texto = avisoDoCodigo;
  avisoDoCodigo = '';
  return texto;
}

// Senha trocada (ou recuperação abandonada): nada fica guardado
export function esquecerRecuperacao() {
  esquecerEmail();
  codigoDigitado = '';
  avisoDoCodigo = '';
}

export const VARIANTES = {
  empresa: {
    painelTitulo: 'Sua impressora 3D pode mudar a vida de alguém.',
    painelDescricao: 'Conecte sua empresa à AACD e ajude a produzir próteses e órteses para quem mais precisa.',
    painelRodape: 'Portal de empresas parceiras',
    placeholder: 'empresa@exemplo.com.br',
    linkVoltar: '#/login',
  },
  aacd: {
    painelTitulo: 'Seu trabalho ajuda milhares de pessoas que mais precisam',
    painelDescricao: 'Informe seu e-mail institucional para receber o código de recuperação.',
    painelRodape: 'Portal do funcionário',
    placeholder: 'nome@aacd.com',
    linkVoltar: '#/login',
  },
};

export function variante(params) {
  return params?.get('perfil') === 'aacd' ? 'aacd' : 'empresa';
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function aplicarVariante(container, nome) {
  const v = VARIANTES[nome];
  container.querySelector('#esqueci-painel-titulo').textContent = v.painelTitulo;
  container.querySelector('#esqueci-painel-descricao').textContent = v.painelDescricao;
  container.querySelector('#esqueci-painel-rodape').textContent = v.painelRodape;
  container.querySelector('#esqueci-email').placeholder = v.placeholder;
  container.querySelector('#link-voltar').href = v.linkVoltar;
}

export function iniciar(container, { params } = {}) {
  aplicarVariante(container, variante(params));
  const sufixo = variante(params) === 'aacd' ? '?perfil=aacd' : '';

  const formulario = container.querySelector('#form-esqueci');
  const campoEmail = container.querySelector('#esqueci-email');
  const erroEmail = container.querySelector('#erro-email');
  const erroGeral = container.querySelector('#erro-geral');
  const botao = container.querySelector('#botao-enviar');

  const linkVoltar = container.querySelector('#link-voltar');

  linkVoltar.addEventListener('click', (evento) => {
    if (history.length > 1) {
      evento.preventDefault();
      history.back();
    }
  });

  function mostrarErro(texto) {
    erroEmail.textContent = texto;
    campoEmail.classList.add('com-erro');
    campoEmail.focus();
  }

  function limparErro() {
    erroEmail.textContent = '';
    campoEmail.classList.remove('com-erro');
  }

  campoEmail.addEventListener('input', limparErro);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const email = campoEmail.value.trim();

    if (email === '') {
      mostrarErro('Digite o e-mail cadastrado.');
      return;
    }
    if (!emailValido(email)) {
      mostrarErro('Esse e-mail não parece válido. Ex.: ' + campoEmail.placeholder);
      return;
    }

    limparErro();
    botao.disabled = true;
    botao.textContent = 'Enviando...';

    try {
      const resposta = await api.esqueciSenha(email);

      if (resposta.ok) {
        // O back responde igual existindo ou não a conta. A tela seguinte pede o código.
        guardarEmail(email);
        guardarCodigo('');   // código novo a caminho: o antigo não vale mais
        location.hash = `#/codigo-senha${sufixo}`;
        return;
      }

      erroGeral.textContent = resposta.corpo?.erro ?? 'Não foi possível enviar. Tente de novo.';
      erroGeral.hidden = false;
    } catch {
      erroGeral.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      erroGeral.hidden = false;
    }

    botao.disabled = false;
    botao.textContent = 'Enviar código de recuperação';
  });
}
