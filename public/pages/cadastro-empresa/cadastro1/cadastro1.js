// Cadastro de empresa, etapa 1: dados da empresa e do acesso.

import {
  idsDaEtapa, validarEtapa,
  lerRascunho, salvarRascunho, limparRascunho,
  lerCampos, preencherCampos,
  marcarObrigatorios, mostrarErroCampo, revalidarMarcados,
  criarProgresso, mascaraCnpj, mascaraTelefone,
} from './cadastro-empresa-comum.js';

export function iniciar(container) {
  const campo = (id) => container.querySelector('#' + id);
  const formulario = campo('cadastro-form');
  const erroGeral = campo('erro-geral');
  const ids = idsDaEtapa(1);

  // As mensagens são nossas: desliga a validação nativa do navegador
  formulario.noValidate = true;

  marcarObrigatorios(container, ids);
  const barra = criarProgresso(formulario, 1);

  // Se a pessoa voltou da etapa 2, os campos aparecem como ela deixou
  const guardado = lerRascunho();
  preencherCampos(container, guardado, ids);
  barra.atualizar(guardado);

  function sincronizar() {
    const rascunho = salvarRascunho(lerCampos(container, ids));
    barra.atualizar(rascunho);
    return rascunho;
  }

  // Máscaras + rascunho + progresso a cada alteração
  function aoAlterar(evento) {
    const alvo = evento.target;
    if (!ids.includes(alvo.id)) return;

    if (alvo.id === 'cnpj') alvo.value = mascaraCnpj(alvo.value);
    if (alvo.id === 'telefone') alvo.value = mascaraTelefone(alvo.value);

    const rascunho = sincronizar();
    revalidarMarcados(container, ids, rascunho);
  }
  formulario.addEventListener('input', aoAlterar);
  formulario.addEventListener('change', aoAlterar);

  // Envio: valida TODOS os campos de uma vez antes de ir para a etapa 2
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const rascunho = sincronizar();
    const erros = validarEtapa(1, rascunho);
    ids.forEach((id) => mostrarErroCampo(container, id, erros[id] ?? null));

    const invalidos = Object.keys(erros);
    if (invalidos.length > 0) {
      erroGeral.textContent = invalidos.length === 1
        ? 'Corrija o campo destacado para continuar.'
        : `Corrija os ${invalidos.length} campos destacados para continuar.`;
      erroGeral.hidden = false;
      campo(invalidos[0]).focus();
      return;
    }

    location.hash = '#/cadastro-empresa/cadastro2';
  });

  // Cancelar: descarta o rascunho e volta para o login
  campo('btn-cancelar').addEventListener('click', () => {
    limparRascunho();
    location.hash = '#/login';
  });

  // Mostrar / ocultar senha
  container.querySelectorAll('.botao-senha').forEach((botao) => {
    botao.addEventListener('click', () => {
      const input = campo(botao.dataset.target);
      const mostrar = input.type === 'password';

      input.type = mostrar ? 'text' : 'password';
      botao.querySelector('i').className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
      botao.setAttribute('aria-pressed', String(mostrar));
    });
  });
}