// Tela "Crie uma nova senha": terceiro e último passo da recuperação de senha.

import { api } from '../../shared/js/api.js';
import {
  VARIANTES, variante, emailGuardado, codigoGuardado, guardarCodigo, guardarAvisoDoCodigo, esquecerRecuperacao,
} from '../esqueci-senha/esqueci-senha.js';

export const SENHA_MIN = 8;   // mesmo mínimo do cadastro

// ---------- Funções puras (testadas em tests/redefinir-senha.test.js) ----------

export function validar({ senha, confirmacao }) {
  const erros = {};

  if (!senha) erros.senha = 'Digite a nova senha.';
  else if (senha.trim() === '') erros.senha = 'A senha não pode ter só espaços.';
  else if (senha.length < SENHA_MIN) erros.senha = `Use pelo menos ${SENHA_MIN} caracteres.`;

  if (!confirmacao) erros.confirmacao = 'Repita a nova senha.';
  else if (confirmacao !== senha) erros.confirmacao = 'As senhas não são iguais.';

  return erros;
}

// O back responde 400 "Código inválido ou expirado." para qualquer problema com o código
// (errado, vencido, já usado, tentativas esgotadas ou e-mail que não confere), sem dizer qual.
export function erroDoCodigo(resposta) {
  return resposta.status === 400 && /c[oó]digo/i.test(resposta.corpo?.erro ?? '');
}

// ---------- Tela ----------

const ORDEM = ['senha', 'confirmacao'];

export function iniciar(container, { params } = {}) {
  const nomeVariante = variante(params);
  const v = VARIANTES[nomeVariante];
  const sufixo = nomeVariante === 'aacd' ? '?perfil=aacd' : '';

  const email = emailGuardado();
  const codigo = codigoGuardado();

  // Sem e-mail ou sem código (link direto ou página recarregada) volta ao passo que falta
  if (!email) {
    location.hash = `#/esqueci-senha${sufixo}`;
    return;
  }
  if (!codigo) {
    location.hash = `#/codigo-senha${sufixo}`;
    return;
  }

  container.querySelector('#redefinir-painel-titulo').textContent = v.painelTitulo;
  container.querySelector('#redefinir-painel-rodape').textContent = v.painelRodape;
  if (nomeVariante === 'aacd') {
    container.querySelector('#redefinir-painel-descricao').textContent =
      'Escolha uma nova senha para voltar a acessar o portal do funcionário.';
  }
  container.querySelector('#redefinir-email').textContent = email;
  container.querySelector('#link-codigo').href = `#/codigo-senha${sufixo}`;

  const formulario = container.querySelector('#form-redefinir');
  const erroGeral = container.querySelector('#erro-geral');
  const botao = container.querySelector('#botao-redefinir');
  const sucesso = container.querySelector('#mensagem-sucesso');
  const titulo = container.querySelector('#redefinir-titulo');
  const descricao = container.querySelector('#redefinir-descricao');

  const campos = {
    senha: container.querySelector('#redefinir-senha'),
    confirmacao: container.querySelector('#redefinir-confirmacao'),
  };

  function mostrarErros(erros) {
    ORDEM.forEach((nome) => {
      container.querySelector(`#erro-${nome}`).textContent = erros[nome] ?? '';
      campos[nome].classList.toggle('com-erro', Boolean(erros[nome]));
    });
  }

  ORDEM.forEach((nome) => {
    campos[nome].addEventListener('input', () => {
      container.querySelector(`#erro-${nome}`).textContent = '';
      campos[nome].classList.remove('com-erro');
    });
  });

  // Botões do olho: mostram e escondem a senha do campo indicado em data-olho
  container.querySelectorAll('[data-olho]').forEach((olho) => {
    const campo = container.querySelector(`#${olho.dataset.olho}`);
    const rotulo = olho.getAttribute('aria-label').replace(/^Mostrar /, '');
    olho.addEventListener('click', () => {
      const mostrando = campo.type === 'password';
      campo.type = mostrando ? 'text' : 'password';
      olho.setAttribute('aria-pressed', String(mostrando));
      olho.setAttribute('aria-label', `${mostrando ? 'Esconder' : 'Mostrar'} ${rotulo}`);
      olho.querySelector('.redefinir__olho-aberto').toggleAttribute('hidden', mostrando);
      olho.querySelector('.redefinir__olho-fechado').toggleAttribute('hidden', !mostrando);
    });
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const dados = { senha: campos.senha.value, confirmacao: campos.confirmacao.value };
    const erros = validar(dados);
    mostrarErros(erros);
    const primeiro = ORDEM.find((nome) => erros[nome]);
    if (primeiro) {
      campos[primeiro].focus();
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const resposta = await api.redefinirSenha(email, codigo, dados.senha);

      if (resposta.ok) {
        esquecerRecuperacao();
        formulario.reset();   // tira a senha dos campos
        formulario.hidden = true;
        descricao.hidden = true;
        titulo.textContent = 'Tudo certo!';
        sucesso.hidden = false;
        container.querySelector('#link-voltar').hidden = true;
        titulo.focus();
        return;
      }

      // Código recusado: volta ao passo do código, já com o aviso
      if (erroDoCodigo(resposta)) {
        guardarCodigo('');
        guardarAvisoDoCodigo('Código inválido ou expirado. Confira o código no e-mail ou peça outro.');
        location.hash = `#/codigo-senha${sufixo}`;
        return;
      }

      erroGeral.textContent = resposta.corpo?.erro ?? 'Não foi possível redefinir a senha. Tente de novo.';
    } catch {
      erroGeral.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
    }

    erroGeral.hidden = false;
    botao.disabled = false;
    botao.textContent = 'Redefinir senha';
  });
}
