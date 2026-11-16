// Rascunho da nova solicitação de impressão, guardado só na memória enquanto a pessoa
// passa pelos passos (dados da peça -> escolher empresa -> confirmar e enviar).
// Fica em memória porque o arquivo 3D (File) não cabe no sessionStorage: recarregar a
// página apaga o rascunho.

let rascunho = null;

export function salvarRascunho(dados) {
  rascunho = { ...dados };
}

export function rascunhoAtual() {
  return rascunho;
}

export function limparRascunho() {
  rascunho = null;
}
