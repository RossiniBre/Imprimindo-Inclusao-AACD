// Nova solicitação de impressão, passo 1 de 3 (Dados da peça), lado AACD.
// A pessoa descreve a peça ANTES de escolher a impressora: o passo 2 (escolher-impressora)
// mostra só as impressoras que atendem a estes dados. Aqui nada vai para o back:
// "Continuar" valida, guarda o rascunho em shared/js/rascunho-solicitacao.js e vai ao passo 2.

import { api } from '../../shared/js/api.js';
import { MATERIAIS } from '../../shared/js/dominio.js';
import { elemento, iniciais } from '../../shared/js/ui.js';
import { validar, validarArquivo } from '../impressoras-aacd/impressoras-aacd.js';
import { salvarRascunho, rascunhoAtual, limparRascunho } from '../../shared/js/rascunho-solicitacao.js';

// Rota do passo 2 (Escolher impressora)
export const PROXIMO_PASSO = '#/escolher-impressora';

const PAPEIS = { ADMIN: 'Administrador AACD', FUNCIONARIO: 'Funcionário AACD' };

// Ordem em que os erros aparecem na tela (o primeiro com erro recebe o foco)
const ORDEM_ERROS = ['arquivo', 'titulo', 'prazo', 'material', 'medidas', 'quantidade', 'observacao'];

// 2516582 -> '2,4 MB'; 51200 -> '50 KB'
export function formatarTamanho(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// '2026-11-16' no fuso de quem está usando (para o min do campo de data)
export function dataDeHoje(hoje = new Date()) {
  const dois = (v) => String(v).padStart(2, '0');
  return `${hoje.getFullYear()}-${dois(hoje.getMonth() + 1)}-${dois(hoje.getDate())}`;
}

// Rodapé do painel vermelho: nome e papel de quem está logado. Os outros passos usam a mesma função.
export function mostrarQuemPreenche(container) {
  return api.eu().then((resposta) => {
    if (resposta.status === 401) {
      location.hash = '#/login';
      return;
    }
    if (!resposta.ok || !resposta.corpo) return;
    const { nome, perfil } = resposta.corpo;
    const papel = PAPEIS[perfil] ?? '';
    if (!nome && !papel) return;
    container.querySelector('#ns-usuario-iniciais').textContent = iniciais(nome || 'AACD');
    container.querySelector('#ns-usuario-nome').textContent = nome || papel;
    container.querySelector('#ns-usuario-papel').textContent = nome ? papel : '';
    container.querySelector('#ns-usuario').hidden = false;
  }).catch(() => { /* sem conexão: o rodapé só não aparece */ });
}

export function iniciar(container, { params } = {}) {
  const form = container.querySelector('#form-peca');
  const entradaArquivo = form.querySelector('#campo-arquivo');
  const arquivoVazio = form.querySelector('#arquivo-vazio');
  const arquivoEscolhido = form.querySelector('#arquivo-escolhido');
  const arquivoNome = form.querySelector('#arquivo-nome');
  const arquivoTamanho = form.querySelector('#arquivo-tamanho');
  const escolhaMaterial = form.querySelector('#escolha-material');
  const observacao = form.querySelector('#campo-observacao');
  const contador = form.querySelector('#contador-observacao');

  const campos = {
    titulo: form.querySelector('#campo-titulo'),
    prazo: form.querySelector('#campo-prazo'),
    comprimentoMm: form.querySelector('#campo-comprimento'),
    larguraMm: form.querySelector('#campo-largura'),
    alturaMm: form.querySelector('#campo-altura'),
    quantidade: form.querySelector('#campo-quantidade'),
  };

  // O arquivo fica nesta variável (e não só no input) para sobreviver ao arrastar-e-soltar
  // e à volta do passo 2, quando o input de arquivo não pode ser preenchido por código.
  let arquivo = null;
  let errosVisiveis = {};

  // Veio de "Ver detalhes"/"Solicitar" de uma impressora: guarda a preferência para o passo 2
  const impressoraId = Number(params?.get('impressora')) || rascunhoAtual()?.impressoraId || null;

  // ----- Material -----

  escolhaMaterial.replaceChildren(...MATERIAIS.map((m) => {
    const rotulo = elemento('label');
    const entrada = document.createElement('input');
    entrada.type = 'radio';
    entrada.name = 'material';
    entrada.value = m.codigo;
    rotulo.appendChild(entrada);
    rotulo.appendChild(document.createTextNode(m.rotulo));
    return rotulo;
  }));

  // ----- Erros -----

  function mostrarErros(erros) {
    errosVisiveis = Object.fromEntries(Object.entries(erros).filter(([, texto]) => texto));
    ORDEM_ERROS.forEach((campo) => {
      form.querySelector(`#erro-${campo}`).textContent = errosVisiveis[campo] ?? '';
    });
    campos.titulo.classList.toggle('com-erro', Boolean(errosVisiveis.titulo));
    campos.prazo.classList.toggle('com-erro', Boolean(errosVisiveis.prazo));
    campos.quantidade.classList.toggle('com-erro', Boolean(errosVisiveis.quantidade));
    [campos.comprimentoMm, campos.larguraMm, campos.alturaMm].forEach((c) =>
      c.classList.toggle('com-erro', Boolean(errosVisiveis.medidas)));
    arquivoVazio.classList.toggle('com-erro', Boolean(errosVisiveis.arquivo));
    observacao.classList.toggle('com-erro', Boolean(errosVisiveis.observacao));
  }

  function focarPrimeiroErro() {
    const primeiro = ORDEM_ERROS.find((campo) => errosVisiveis[campo]);
    const alvos = {
      arquivo: entradaArquivo,
      titulo: campos.titulo,
      prazo: campos.prazo,
      material: form.querySelector('input[name="material"]'),
      medidas: campos.comprimentoMm,
      quantidade: campos.quantidade,
      observacao: observacao,
    };
    alvos[primeiro]?.focus();
  }

  // ----- Arquivo -----

  function desenharArquivo() {
    arquivoVazio.hidden = Boolean(arquivo);
    arquivoEscolhido.hidden = !arquivo;
    arquivoNome.textContent = arquivo?.name ?? '';
    arquivoTamanho.textContent = arquivo ? formatarTamanho(arquivo.size) : '';
  }

  function trocarArquivo(novo) {
    if (!novo) return;   // cancelou a janela de escolha: mantém o que já estava
    arquivo = novo;
    desenharArquivo();
    // Já avisa se o formato ou o tamanho não servem, sem esperar o "Continuar"
    mostrarErros({ ...errosVisiveis, arquivo: validarArquivo(arquivo) });
  }

  entradaArquivo.addEventListener('change', () => trocarArquivo(entradaArquivo.files?.[0]));
  form.querySelector('#botao-trocar').addEventListener('click', () => entradaArquivo.click());

  arquivoVazio.addEventListener('dragover', (evento) => {
    evento.preventDefault();
    arquivoVazio.classList.add('ns__arquivo--sobre');
  });
  arquivoVazio.addEventListener('dragleave', () => arquivoVazio.classList.remove('ns__arquivo--sobre'));
  arquivoVazio.addEventListener('drop', (evento) => {
    evento.preventDefault();
    arquivoVazio.classList.remove('ns__arquivo--sobre');
    trocarArquivo(evento.dataTransfer?.files?.[0]);
  });

  // ----- Formulário -----

  function lerFormulario() {
    return {
      arquivo,
      titulo: campos.titulo.value,
      prazo: campos.prazo.value,
      material: form.querySelector('input[name="material"]:checked')?.value ?? '',
      comprimentoMm: campos.comprimentoMm.value,
      larguraMm: campos.larguraMm.value,
      alturaMm: campos.alturaMm.value,
      quantidade: campos.quantidade.value,
      observacao: observacao.value,
    };
  }

  function preencher(dados) {
    arquivo = dados.arquivo ?? null;
    campos.titulo.value = dados.titulo ?? '';
    campos.prazo.value = dados.prazo ?? '';
    campos.comprimentoMm.value = dados.comprimentoMm ?? '';
    campos.larguraMm.value = dados.larguraMm ?? '';
    campos.alturaMm.value = dados.alturaMm ?? '';
    campos.quantidade.value = dados.quantidade ?? '1';
    observacao.value = dados.observacao ?? '';
    contador.textContent = String(observacao.value.length);
    const marcado = [...form.querySelectorAll('input[name="material"]')].find((r) => r.value === dados.material);
    if (marcado) marcado.checked = true;
  }

  campos.prazo.min = dataDeHoje();

  // Voltando do passo 2, a tela reabre com o que já foi preenchido
  const anterior = rascunhoAtual();
  if (anterior) preencher(anterior);
  desenharArquivo();

  form.addEventListener('input', () => {
    contador.textContent = String(observacao.value.length);
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const dados = lerFormulario();
    // Ainda não há impressora escolhida: aqui só valem as regras da própria peça
    const erros = { ...validar(dados, null) };
    if (!dados.observacao.trim()) {
      erros.observacao = 'Descreva a peça ou deixe uma instrução para a empresa.';
    }
    mostrarErros(erros);
    if (Object.keys(errosVisiveis).length > 0) {
      focarPrimeiroErro();
      return;
    }

    salvarRascunho({
      ...dados,
      titulo: dados.titulo.trim(),
      quantidade: Number(dados.quantidade),
      comprimentoMm: Number(dados.comprimentoMm),
      larguraMm: Number(dados.larguraMm),
      alturaMm: Number(dados.alturaMm),
      observacao: dados.observacao.trim(),
      impressoraId,
      impressora: rascunhoAtual()?.impressora ?? null,
    });

    location.hash = PROXIMO_PASSO;
  });

  form.querySelector('#botao-cancelar').addEventListener('click', () => {
    limparRascunho();
    location.hash = '#/painel-aacd';
  });

  mostrarQuemPreenche(container);
}
