// Guarda global contra senha vazada.

import { senhaVazada, MENSAGEM_SENHA_VAZADA } from './senha-vazada.js';

const CAMPO_NOVA_SENHA = 'input[autocomplete="new-password"]';
const liberados = new WeakSet();   // formulários já checados, podem seguir

function mostrarErro(campo) {
  let aviso = campo.parentElement.querySelector('.erro-senha-vazada');
  if (!aviso) {
    aviso = document.createElement('p');
    aviso.className = 'erro-senha-vazada';
    aviso.setAttribute('role', 'alert');
    campo.insertAdjacentElement('afterend', aviso);
  }
  aviso.textContent = MENSAGEM_SENHA_VAZADA;
  campo.setAttribute('aria-invalid', 'true');
  campo.focus();
}

function limparErro(campo) {
  campo.parentElement.querySelector('.erro-senha-vazada')?.remove();
  campo.removeAttribute('aria-invalid');
}

// Fase de captura: roda antes de qualquer listener da própria tela
document.addEventListener('submit', async (evento) => {
  const formulario = evento.target;
  if (!(formulario instanceof HTMLFormElement)) return;

  const campo = formulario.querySelector(CAMPO_NOVA_SENHA);
  if (!campo || !campo.value) return;

  if (liberados.has(formulario)) {   // segunda passada, já checado
    liberados.delete(formulario);
    return;
  }

  evento.preventDefault();
  evento.stopImmediatePropagation();
  limparErro(campo);

  if (await senhaVazada(campo.value)) {
    mostrarErro(campo);
    return;
  }

  liberados.add(formulario);
  formulario.requestSubmit(evento.submitter ?? undefined);   // reenvia, agora liberado
}, true);

// Some o erro assim que a pessoa volta a digitar
document.addEventListener('input', (evento) => {
  if (evento.target.matches?.(CAMPO_NOVA_SENHA)) limparErro(evento.target);
});