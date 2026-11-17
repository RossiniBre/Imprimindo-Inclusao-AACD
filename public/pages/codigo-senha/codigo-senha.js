// Tela "Confira seu e-mail": segundo passo da recuperação de senha.

import {
  VARIANTES, variante, emailGuardado, codigoGuardado, guardarCodigo, pegarAvisoDoCodigo,
} from '../esqueci-senha/esqueci-senha.js';

import { api } from '../../shared/js/api.js';

export const TAMANHO_CODIGO = 6;

// ---------- Funções puras (testadas em tests/redefinir-senha.test.js) ----------

// Deixa só os dígitos: quem cola "123 456" ou "123-456" do e-mail não precisa corrigir
export function soDigitos(texto) {
  return String(texto ?? '').replace(/\D/g, '').slice(0, TAMANHO_CODIGO);
}

export function validarCodigo(codigo) {
  if (!codigo) return 'Digite o código que chegou no seu e-mail.';
  if (!/^\d{6}$/.test(codigo)) return 'O código tem 6 números.';
  return null;
}

// ---------- Tela ----------

export function iniciar(container, { params } = {}) {
  const nomeVariante = variante(params);
  const v = VARIANTES[nomeVariante];
  const sufixo = nomeVariante === 'aacd' ? '?perfil=aacd' : '';

  const email = emailGuardado();

  // Sem e-mail (link direto ou aba nova) não há para quem conferir o código: volta ao passo 1
  if (!email) {
    location.hash = `#/esqueci-senha${sufixo}`;
    return;
  }

  container.querySelector('#codigo-painel-titulo').textContent = v.painelTitulo;
  container.querySelector('#codigo-painel-rodape').textContent = v.painelRodape;
  if (nomeVariante === 'aacd') {
    container.querySelector('#codigo-painel-descricao').textContent =
      'Use o código que chegou no seu e-mail institucional para criar uma nova senha.';
  }
  container.querySelector('#codigo-email').textContent = email;
  container.querySelector('#link-novo-codigo').href = `#/esqueci-senha${sufixo}`;

  const formulario = container.querySelector('#form-codigo');
  const caixas = [...container.querySelectorAll('.codigo-senha__digito')];
  const erro = container.querySelector('#erro-codigo');
  const aviso = container.querySelector('#aviso-codigo');

  // ----- As seis caixas -----

  const lerCodigo = () => caixas.map((caixa) => caixa.value).join('');

  // Espalha os dígitos pelas caixas a partir de `inicio` e devolve a posição seguinte ao último
  function espalhar(digitos, inicio = 0) {
    let posicao = inicio;
    [...digitos].forEach((digito) => {
      if (posicao < caixas.length) caixas[posicao++].value = digito;
    });
    return posicao;
  }

  function focar(indice) {
    const caixa = caixas[Math.max(0, Math.min(indice, caixas.length - 1))];
    caixa.focus();
    caixa.select();
  }

  function marcarErro(comErro) {
    caixas.forEach((caixa) => caixa.classList.toggle('com-erro', comErro));
  }

  function limparAvisos() {
    erro.textContent = '';
    aviso.hidden = true;
    marcarErro(false);
  }

  caixas.forEach((caixa, indice) => {
    // Digitou (ou o navegador preencheu o código inteiro na primeira caixa)
    caixa.addEventListener('input', () => {
      const digitos = soDigitos(caixa.value);
      caixa.value = '';
      limparAvisos();
      if (digitos) focar(espalhar(digitos, indice));
    });

    caixa.addEventListener('keydown', (evento) => {
      if (evento.key === 'Backspace' && caixa.value === '' && indice > 0) {
        // Caixa vazia: apaga a anterior e volta para ela
        evento.preventDefault();
        caixas[indice - 1].value = '';
        limparAvisos();
        focar(indice - 1);
      } else if (evento.key === 'ArrowLeft' && indice > 0) {
        evento.preventDefault();
        focar(indice - 1);
      } else if (evento.key === 'ArrowRight' && indice < caixas.length - 1) {
        evento.preventDefault();
        focar(indice + 1);
      }
    });

    // Colar o código inteiro em qualquer caixa preenche todas, desde a primeira
    caixa.addEventListener('paste', (evento) => {
      const digitos = soDigitos(evento.clipboardData?.getData('text'));
      evento.preventDefault();
      if (!digitos) return;
      caixas.forEach((c) => { c.value = ''; });
      limparAvisos();
      focar(espalhar(digitos));
    });

    caixa.addEventListener('focus', () => caixa.select());
  });

  // Voltou do passo 3 por conta própria: o código digitado continua nas caixas
  espalhar(codigoGuardado());

  // Voltou do passo 3 porque o back recusou o código
  const recusa = pegarAvisoDoCodigo();
  if (recusa) {
    aviso.textContent = recusa;
    aviso.hidden = false;
    marcarErro(true);
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.hidden = true;

    const codigo = lerCodigo();
    const problema = validarCodigo(codigo);
    erro.textContent = problema ?? '';
    marcarErro(Boolean(problema));
    if (problema) {
      focar(Math.max(0, caixas.findIndex((caixa) => caixa.value === '')));
      return;
    }

    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Conferindo...';

    try {
      const resposta = await api.validarCodigoSenha(email, codigo);

      if (resposta.ok) {
        guardarCodigo(codigo);
        location.hash = `#/redefinir-senha${sufixo}`;
        return;
      }

      // Código errado ou vencido: fica nesta tela, limpa as caixas e avisa
      aviso.textContent = resposta.status === 400
        ? 'Código inválido ou expirado. Confira o código no e-mail ou peça outro.'
        : (resposta.corpo?.erro ?? 'Não foi possível conferir o código. Tente de novo.');
      aviso.hidden = false;
      marcarErro(true);
      caixas.forEach((caixa) => { caixa.value = ''; });
      focar(0);
    } catch {
      aviso.textContent = 'Sem conexão com o servidor. Tente de novo em instantes.';
      aviso.hidden = false;
    }

    botao.disabled = false;
    botao.textContent = 'Continuar';
  });
}
