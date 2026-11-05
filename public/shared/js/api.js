// Tudo que vai pro back passa por aqui.
// Mesma origem (localhost).

async function requisitar(metodo, url, formulario) {
  const opcoes = { method: metodo, headers: {} };

  if (formulario) {
    opcoes.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opcoes.body = new URLSearchParams(formulario).toString();
  }

  const resposta = await fetch(url, opcoes);

  let corpo = null;
  try { corpo = await resposta.json(); } catch { /* resposta sem JSON */ }

  return { ok: resposta.ok, status: resposta.status, corpo };
}

export const api = {
  login:   (identificador, senha) => requisitar('POST', '/api/login', { identificador, senha }),
  logout:  () => requisitar('POST', '/api/logout'),
  eu:      () => requisitar('GET', '/api/me'),
  editarNome: (nome) => requisitar('POST', '/api/usuario/nome', { nome }),
  esqueciSenha: (email) => requisitar('POST', '/api/esqueci-senha', { email }),
  cadastrarEmpresa:  (dados) => requisitar('POST', '/api/empresas', dados),
  cadastrarImpressora: (dados) => requisitar('POST', '/api/impressoras', dados),

  // Funcionários (só o admin)
  funcionarios: () => requisitar('GET', '/api/funcionarios'),
  cadastrarFuncionario: (dados) => requisitar('POST', '/api/funcionarios', dados),
  editarFuncionario: (dados) => requisitar('POST', '/api/funcionario/editar', dados),
  desativarConta: (id) => requisitar('POST', '/api/conta/desativar', { id }),
  reativarConta:  (id) => requisitar('POST', '/api/conta/reativar', { id }),

  // Solicitações de impressão (funcionário e admin da AACD)
  solicitacoes: () => requisitar('GET', '/api/solicitacoes'),
  verSolicitacao: (id) => requisitar('GET', `/api/solicitacao/ver?id=${encodeURIComponent(id)}`),
  cancelarSolicitacao: (id, justificativa) =>
    requisitar('POST', '/api/solicitacao/cancelar', justificativa ? { id, justificativa } : { id }),
  excluirSolicitacao: (id) => requisitar('POST', '/api/solicitacao/excluir', { id }),
  editarNomeUsuario: (dados) => requisitar('POST', '/api/usuario/nome', dados),
  editarIdentificadorUsuario: (dados) => requisitar('POST', '/api/usuario/identificador', dados),
  excluirConta: (id, senha) => requisitar('POST', '/api/conta/excluir', { id, senha }),
};
