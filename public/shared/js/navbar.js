import { perfilAtual } from './sessao.js';

const MENUS = {
  EMPRESA:     [['/impressoras', 'Minhas impressoras'], ['/solicitacoes', 'Solicitações recebidas'], ['/contato', 'Entre em contato']],
  FUNCIONARIO: [['/impressoras-aacd', 'Impressoras'], ['/painel-aacd', 'Acompanhamento'], ['/parceiros', 'Parceiros'], ['/doacoes', 'Doações']],
  ADMIN:       [['/impressoras-aacd', 'Impressoras'], ['/painel-aacd', 'Acompanhamento'], ['/parceiros', 'Parceiros'], ['/doacoes', 'Doações'], ['/funcionarios', 'Funcionários']],
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
  const linkPerfil = header.querySelector('a[aria-label="Minha conta"]');
  linkPerfil.onmouseenter = () => moverIndicador(linkPerfil);
  linkPerfil.onmouseleave = () => moverIndicador(linkAtivo());

  nav.innerHTML = itens.map(([rota, texto]) => `<a href="#${rota}">${texto}</a>`).join('');
  obterIndicador();

  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('mouseenter', () => moverIndicador(a)));
  nav.addEventListener('mouseleave', () => moverIndicador(linkAtivo()));

  marcarAtivo(false);
  document.fonts?.ready.then(() => marcarAtivo(false));
}

function linkAtivo() {
  return document.querySelector(
    '#menu nav a.ativo, #menu a[aria-label="Minha conta"].ativo'
  );
}

function obterIndicador() {
  const header = document.getElementById('menu');
  if (!header) return null;
  if (!indicador || !indicador.isConnected) {
    indicador = document.createElement('span');
    indicador.className = 'menu__indicador';
    header.append(indicador);   // agora no header, não no nav
  }
  return indicador;
}

function moverIndicador(link, animar = true) {
  const barra = obterIndicador();
  if (!barra) return;

  if (!link) {
    barra.style.opacity = '0';
    return;
  }

  const h = barra.parentElement.getBoundingClientRect();
  const l = link.getBoundingClientRect();

  if (l.width === 0) {
    requestAnimationFrame(() => moverIndicador(link, animar));
    return;
  }

  if (!animar) barra.style.transition = 'none';
  barra.style.width = `${l.width}px`;
  barra.style.transform = `translateX(${l.left - h.left}px)`;
  barra.style.opacity = '1';
  if (!animar) {
    barra.offsetWidth;
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

  const perfil = document.querySelector('#menu a[aria-label="Minha conta"]');
  if (perfil) perfil.classList.toggle('ativo', mesmaRota(perfil));

  moverIndicador(linkAtivo(), animar);
}