// Tela "Esqueci minha senha".
//   #/esqueci-senha              -> textos da empresa parceira (padrão)
//   #/esqueci-senha -> textos do funcionário da AACD
// O back (POST /api/esqueci-senha) envia um código por e-mail; a resposta é
// sempre 200 para não revelar se o e-mail existe.

import { api } from '../../shared/js/api.js';

const VARIANTES = {
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

  const formulario = container.querySelector('#form-esqueci');
  const campoEmail = container.querySelector('#esqueci-email');
  const erroEmail = container.querySelector('#erro-email');
  const erroGeral = container.querySelector('#erro-geral');
  const botao = container.querySelector('#botao-enviar');
  const sucesso = container.querySelector('#mensagem-sucesso');
  const textoSucesso = container.querySelector('#texto-sucesso');

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
        formulario.hidden = true;
        textoSucesso.textContent =
          resposta.corpo?.mensagem ??
          `Se ${email} estiver cadastrado, você vai receber o código em alguns minutos.`;
        sucesso.hidden = false;
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
