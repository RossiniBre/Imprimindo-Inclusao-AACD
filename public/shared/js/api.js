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

// Formulário com arquivo (multipart): o navegador monta o Content-Type sozinho.
async function requisitarMultipart(url, formData) {
  const resposta = await fetch(url, { method: 'POST', body: formData });
  let corpo = null;
  try { corpo = await resposta.json(); } catch { /* resposta sem JSON */ }
  return { ok: resposta.ok, status: resposta.status, corpo };
}

// Nome do arquivo no cabeçalho Content-Disposition (filename*=UTF-8''... ou filename="...")
export function lerNomeArquivo(disposicao) {
  if (!disposicao) return null;
  const utf8 = disposicao.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try { return decodeURIComponent(utf8[1].trim()); } catch { /* cai no filename simples */ }
  }
  const simples = disposicao.match(/filename="?([^";]+)"?/i);
  return simples ? simples[1].trim() : null;
}

export const api = {
  login:   (identificador, senha) => requisitar('POST', '/api/login', { identificador, senha }),
  logout:  () => requisitar('POST', '/api/logout'),
  eu:      () => requisitar('GET', '/api/me'),
  perfilEmpresa: () => requisitar('GET', '/api/empresa/perfil'),
  editarEmpresa: ({ logradouro, ...resto }) =>
    requisitar('POST', '/api/empresa/editar', { ...resto, rua: logradouro }),
  editarNome: (nome) => requisitar('POST', '/api/usuario/nome', { nome }),
  esqueciSenha: (email) => requisitar('POST', '/api/esqueci-senha', { email }),
  cadastrarEmpresa:  (dados) => requisitar('POST', '/api/empresas', dados),
  cadastrarImpressora: (dados) => requisitar('POST', '/api/impressoras', dados),
  impressoras: () => requisitar('GET', '/api/impressoras'),
  editarImpressora: (dados) => requisitar('POST', '/api/impressora/editar', dados),
  removerImpressora: (id) => requisitar('POST', '/api/impressora/remover', { id }),
  alterarAtivoImpressora: (id, ativo) => requisitar('POST', '/api/impressora/ativo', { id, ativo }),

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

  // Lado AACD: parceiros, impressoras da rede e doações
  parceiros: () => requisitar('GET', '/api/parceiros'),
  impressorasDoParceiro: (idEmpresa) =>
    requisitar('GET', `/api/parceiros/${encodeURIComponent(idEmpresa)}/impressoras`),
  painelImpressoras: ({ empresaId, disponibilidade, material } = {}) => {
    const q = new URLSearchParams();
    if (empresaId) q.set('empresaId', empresaId);
    if (disponibilidade) q.set('disponibilidade', disponibilidade);
    if (material) q.set('material', material);
    const consulta = q.toString();
    return requisitar('GET', `/api/impressoras/painel${consulta ? `?${consulta}` : ''}`);
  },
  doacoes: () => requisitar('GET', '/api/doacoes'),
  excluirDoacao: (id) => requisitar('POST', '/api/doacoes/excluir', { id }),

  // Criar solicitação: multipart com titulo, descricao, quantidade, comprimentoMm,
  // larguraMm, alturaMm, impressoraId e o arquivo 3D no campo "arquivo".
  criarSolicitacao: (formData) => requisitarMultipart('/api/solicitacoes', formData),

  // Baixa o arquivo 3D de um pedido (usado para reenviar o pedido a outra empresa)
  arquivoSolicitacao: async (id) => {
    const resposta = await fetch(`/api/solicitacao/arquivo?id=${encodeURIComponent(id)}`);
    if (!resposta.ok) {
      let corpo = null;
      try { corpo = await resposta.json(); } catch { /* sem JSON */ }
      return { ok: false, status: resposta.status, corpo };
    }
    return {
      ok: true,
      status: resposta.status,
      blob: await resposta.blob(),
      nome: lerNomeArquivo(resposta.headers.get('Content-Disposition')) ?? `pedido-${id}.stl`,
    };
  },
};
