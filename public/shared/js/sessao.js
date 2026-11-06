const CHAVE = 'sessao';

export function salvarSessao(dados) {
  localStorage.setItem(CHAVE, JSON.stringify(dados));
}

export function sessaoAtual() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function perfilAtual() {
  return sessaoAtual()?.perfil ?? null;
}

export function limparSessao() {
  localStorage.removeItem(CHAVE);
}