import { perfilAtual } from './sessao.js';

const MENUS = {
  EMPRESA:     [['/impressoras', 'Minhas impressoras'], ['/solicitacoes', 'Solicitações recebidas'], ['/contato', 'Entre em contato']],
  FUNCIONARIO: [['/impressoras-aacd', 'Impressoras'], ['/painel-aacd', 'Solicitações'], ['/parceiros', 'Parceiros'], ['/doacoes', 'Doações']],
  ADMIN:       [['/impressoras-aacd', 'Impressoras'], ['/painel-aacd', 'Solicitações'], ['/parceiros', 'Parceiros'], ['/doacoes', 'Doações'], ['/funcionarios', 'Funcionários']],
};

// telas em que o menu nunca aparece, mesmo com sessão ativa
const SEM_MENU = ['/', '/login', '/esqueci-senha', '/vire-apoiador', '/cadastro-empresa/cadastro1', '/cadastro-empresa/cadastro2'];

// para onde o ícone de perfil leva, conforme quem está logado
const PERFIL_ROTA = {
  EMPRESA:     '/minha-conta-empresa',
  FUNCIONARIO: '/minha-conta',
  ADMIN:       '/minha-conta',
};

function rotaAtual() {
  return location.hash.slice(1).split('?')[0].replace(/\/$/, '') || '/';
}

let indicador = null;
let perfilDesenhado = null;

export function desenharMenu() {
  const header = document.getElementById('menu');
  const perfil = perfilAtual();
  const itens = MENUS[perfil];

  const esconder = !itens || SEM_MENU.includes(rotaAtual());
  header.hidden = esconder;

  if (!itens) {
    perfilDesenhado = null;
    return;
  }
  if (esconder) return;   // tem sessão, mas a tela não usa menu

  // mesmo perfil: o nav já existe, só reposiciona a barra
  if (perfil === perfilDesenhado) {
    marcarAtivo();
    return;
  }

  perfilDesenhado = perfil;

  header.querySelector('a[aria-label="Minha conta"]').href = `#${PERFIL_ROTA[perfil]}`;
  header.querySelector('.logo-menu').href = `#${itens[0][0]}`;

  const nav = header.querySelector('nav');
  indicador = null;
  nav.innerHTML = itens.map(([rota, texto]) => `<a href="#${rota}">${texto}</a>`).join('');
  obterIndicador();

  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('mouseenter', () => moverIndicador(a)));
  nav.addEventListener('mouseleave', () => moverIndicador(linkAtivo()));

  marcarAtivo(false);
  document.fonts?.ready.then(() => marcarAtivo(false));
}

function linkAtivo() {
  return document.querySelector('#menu nav a.ativo');
}

function obterIndicador() {
  const nav = document.querySelector('#menu nav');
  if (!nav) return null;
  if (!indicador || !indicador.isConnected) {
    indicador = document.createElement('span');
    indicador.className = 'menu__indicador';
    nav.append(indicador);
  }
  return indicador;
}

function moverIndicador(link, animar = true) {
  const barra = obterIndicador();
  if (!barra) return;

  // sem link ativo (ex.: #/minha-conta): esconde a barra
  if (!link) {
    barra.style.opacity = '0';
    return;
  }

  // layout ainda sem medida: tenta de novo no próximo frame
  if (link.offsetWidth === 0) {
    requestAnimationFrame(() => moverIndicador(link, animar));
    return;
  }

  if (!animar) barra.style.transition = 'none';
  barra.style.width = `${link.offsetWidth}px`;
  barra.style.transform = `translateX(${link.offsetLeft}px)`;
  barra.style.opacity = '1';
  if (!animar) {
    barra.offsetWidth;   // força aplicar sem animação
    barra.style.transition = '';
  }
}

function mesmaRota(a) {
  const limpar = (h) => h.split('?')[0].replace(/\/$/, '');
  return limpar(a.hash) === limpar(location.hash);
}

// marca o link da tela atual
export function marcarAtivo(animar = true) {
  document.querySelectorAll('#menu nav a').forEach((a) => {
    a.classList.toggle('ativo', mesmaRota(a));
  });
  moverIndicador(linkAtivo(), animar);
}