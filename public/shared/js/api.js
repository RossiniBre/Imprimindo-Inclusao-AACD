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
  cadastrarEmpresa:  (dados) => requisitar('POST', '/api/empresas', dados),
  cadastrarImpressora: (dados) => requisitar('POST', '/api/impressoras', dados),
};