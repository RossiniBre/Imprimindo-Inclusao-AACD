import { perfilAtual } from './sessao.js';

const MENUS = {
  EMPRESA:     [['/impressoras', 'Impressoras'], ['/solicitacoes', 'Solicitações'], ['/contato', 'Contato']],
  FUNCIONARIO: [['/impressoras-aacd', 'Impressoras'], ['/painel-aacd', 'Solicitações'], ['/parceiros', 'Parceiros'], ['/doacoes', 'Doações']],
  ADMIN:       [['/impressoras-aacd', 'Impressoras'], ['/painel-aacd', 'Solicitações'], ['/parceiros', 'Parceiros'], ['/doacoes', 'Doações'], ['/funcionarios', 'Funcionários']],
};

const ATIVO = ['border-bottom', 'border-3', 'border-white', 'pb-1', 'fw-bold', 'pe-none'];

export function desenharMenu() {
  const header = document.getElementById('menu');
  const itens = MENUS[perfilAtual()];
  header.hidden = !itens;  // deslogado (login, cadastro): sem menu
  if (!itens) return;
  header.querySelector('nav').innerHTML =
    itens.map(([rota, texto]) => `<a href="#${rota}">${texto}</a>`).join('');
  marcarAtivo();
}

// marca o link da tela atual
export function marcarAtivo() {
  document.querySelectorAll('#menu nav a').forEach(a => {
    const atual = a.hash === location.hash.split('?')[0];
    a.classList[atual ? 'add' : 'remove'](...ATIVO);
  });
}