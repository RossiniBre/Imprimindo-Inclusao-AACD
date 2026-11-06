// Router por hash: lê a parte depois do # (ex.: /#/login), carrega o
// fragmento da tela em pages/<pasta>/ e coloca o conteúdo dentro do <main>.

const rotas = new Map();
let paginaAtual = null;
let navegacao = 0;

export function rota(caminho, config) {
  rotas.set(caminho, config);
}

export function lerHash(hash) {
  const [caminho, consulta = ''] = hash.replace(/^#/, '').split('?');
  return { caminho: caminho || '/', params: new URLSearchParams(consulta) };
}

export function resolver(hash) {
  const { caminho } = lerHash(hash);
  return rotas.get(caminho) ?? rotas.get('/404');
}

function trocarCss(href) {
  document.getElementById('css-pagina')?.remove();
  const link = document.createElement('link');
  link.id = 'css-pagina';
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function limparPaginaAtual() {
  paginaAtual?.destruir?.();
  paginaAtual = null;
}

export function iniciar(container, { autenticado = () => true } = {}) {
  async function desenhar() {
    const hash = location.hash;

    // Ignora hashes que não são rotas (ex.: o link "Pular para o conteúdo")
    if (hash && !hash.startsWith('#/')) return;

    const minha = ++navegacao;
    const { caminho, params } = lerHash(hash);
    const cfg = resolver(hash);

    if (!cfg.publica && !(await autenticado())) {
      location.hash = '#/login';
      return;
    }
    if (minha !== navegacao) return;

    // pasta e nome dos arquivos podem ser diferentes
    const pasta = cfg.pasta ?? cfg.pagina;
    const base = `/pages/${pasta}/${cfg.pagina}`;

    let resposta;
    try {
      resposta = await fetch(`${base}.html`);
    } catch (erro) {
      console.error(`Erro de rede ao buscar "${base}.html":`, erro);
    }
    if (minha !== navegacao) return;

    if (!resposta?.ok) {
      limparPaginaAtual();
      container.textContent = 'Não foi possível carregar esta tela.';
      return;
    }

    const html = await resposta.text();
    if (minha !== navegacao) return;

    limparPaginaAtual();
    container.innerHTML = html;
    trocarCss(`${base}.css`);

    let modulo = null;
    try {
      modulo = await import(`${base}.js`);
    } catch (erro) {
      console.error(`Erro ao carregar o JS da tela "${cfg.pagina}":`, erro);
    }
    if (minha !== navegacao) return;

    paginaAtual = modulo;
    paginaAtual?.iniciar?.(container, { caminho, params });

    document.title = `${cfg.titulo ?? cfg.pagina} - Imprimindo Inclusão`;
    container.focus(); // o leitor de tela anuncia a troca de tela
  }

  window.addEventListener('hashchange', desenhar);
  desenhar();
}