// Cadastro de empresa, etapa 2: endereço, termos e envio.

import {
  OPCIONAIS, idsDaEtapa, validarEtapa, soDigitos,
  lerRascunho, salvarRascunho, limparRascunho,
  lerCampos, preencherCampos,
  marcarObrigatorios, mostrarErroCampo, revalidarMarcados,
  criarProgresso, mascaraCep,
} from './cadastro-empresa-comum.js';

export function iniciar(container) {
  const campo = (id) => container.querySelector('#' + id);
  const formulario = campo('endereco-form');
  const erroGeral = campo('erro-geral');
  const botaoCadastrar = formulario.querySelector('button[type="submit"]');
  const campoCep = campo('cep');

  const idsObrigatorios = idsDaEtapa(2);
  const idsDaTela = [...idsObrigatorios, ...OPCIONAIS[2]];

  // Sem a etapa 1 completa e válida, volta para ela
  const inicial = lerRascunho();
  if (Object.keys(validarEtapa(1, inicial)).length > 0) {
    location.hash = '#/cadastro-empresa/cadastro1';
    return;
  }

  formulario.noValidate = true;

  marcarObrigatorios(container, idsObrigatorios);
  const barra = criarProgresso(formulario, 2);

  // Se a pessoa voltou para esta etapa, os campos aparecem como ela deixou
  preencherCampos(container, inicial, idsDaTela);
  barra.atualizar(inicial);

  function sincronizar() {
    const rascunho = salvarRascunho(lerCampos(container, idsDaTela));
    barra.atualizar(rascunho);
    return rascunho;
  }

  function mostrarErro(texto) {
    erroGeral.textContent = texto;
    erroGeral.hidden = false;
  }

  // ----- CEP: máscara + preenchimento automático (ViaCEP) -----
  let consultaAtual = 0;

  async function buscarCep(cep) {
    const minhaConsulta = ++consultaAtual;
    campoCep.disabled = true;
    erroGeral.hidden = true;

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (minhaConsulta !== consultaAtual) return;

      if (dados.erro) {
        mostrarErro('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }

      campo('uf').value = dados.uf ?? campo('uf').value;
      campo('cidade').value = dados.localidade ?? '';
      campo('bairro').value = dados.bairro ?? '';
      campo('logradouro').value = dados.logradouro ?? '';

      // O preenchimento automático não dispara "input": salva e atualiza a barra aqui
      revalidarMarcados(container, idsObrigatorios, sincronizar());
      campo('numero').focus();
    } catch {
      mostrarErro('Não foi possível buscar o CEP agora. Preencha o endereço manualmente.');
    } finally {
      campoCep.disabled = false;
    }
  }

  campoCep.addEventListener('input', () => {
    campoCep.value = mascaraCep(campoCep.value);
    const digitos = soDigitos(campoCep.value);
    if (digitos.length === 8) buscarCep(digitos);
  });

  // Rascunho + progresso a cada alteração (roda depois da máscara do CEP, que é mais específica)
  function aoAlterar(evento) {
    if (!idsDaTela.includes(evento.target.id)) return;
    revalidarMarcados(container, idsObrigatorios, sincronizar());
  }
  formulario.addEventListener('input', aoAlterar);
  formulario.addEventListener('change', aoAlterar);

  // Voltar: o rascunho já está salvo, então a etapa 1 reaparece preenchida
  campo('btn-voltar')?.addEventListener('click', () => {
    sincronizar();
    location.hash = '#/cadastro-empresa/cadastro1';
  });

  // ----- Envio -----
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

    const rascunho = sincronizar();

    // Valida TODA a etapa 2 de uma vez, e reconfere a etapa 1, para nada falhar só no servidor
    const erros = validarEtapa(2, rascunho);
    idsObrigatorios.forEach((id) => mostrarErroCampo(container, id, erros[id] ?? null));

    const invalidos = Object.keys(erros);
    if (invalidos.length > 0) {
      mostrarErro(invalidos.length === 1
        ? 'Corrija o campo destacado para continuar.'
        : `Corrija os ${invalidos.length} campos destacados para continuar.`);
      campo(invalidos[0]).focus();
      return;
    }

    if (Object.keys(validarEtapa(1, rascunho)).length > 0) {
      location.hash = '#/cadastro-empresa/cadastro1';
      return;
    }

    botaoCadastrar.disabled = true;
    botaoCadastrar.textContent = 'Cadastrando...';

    try {
      const { api } = await import('/shared/js/api.js');
      const resposta = await api.cadastrarEmpresa({
        nome: rascunho.razao.trim(),
        responsavel: rascunho.responsavel.trim(),   // faltava: o back recusava "responsável obrigatório"
        cnpj: soDigitos(rascunho.cnpj),
        senha: rascunho.senha,
        email: rascunho.email.trim(),
        telefone: soDigitos(rascunho.telefone),
        cep: soDigitos(rascunho.cep),
        rua: rascunho.logradouro.trim(),
        numero: rascunho.numero.trim(),
        // complemento: (rascunho.complemento ?? '').trim(),   // descomente se o back aceitar
        bairro: rascunho.bairro.trim(),
        cidade: rascunho.cidade.trim(),
        uf: rascunho.uf,
      });

      if (resposta.ok) {
        limparRascunho();
        location.hash = '#/login';
        return;
      }
      mostrarErro(resposta.corpo?.erro ?? 'Não foi possível cadastrar. Tente de novo.');
    } catch (erro) {
      console.error(erro);
      mostrarErro('Não foi possível enviar o cadastro. Tente de novo em instantes.');
    }

    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = 'Cadastrar';
  });
}