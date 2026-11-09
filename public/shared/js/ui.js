// Ajudantes de interface usados por mais de uma tela: elementos, chips, iniciais,
// tempo relativo, modal acessível e copiar texto.

export function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined && texto !== null) el.textContent = texto;
  return el;
}

export function chip(classe, texto) {
  return elemento('span', `chip ${classe}`.trim(), texto);
}

// "IMT Mauá" -> "IM"; "Mackenzie" -> "MA"
export function iniciais(nome) {
  const palavras = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return '?';
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

// "há 2h", "há 3 dias", "agora"
export function tempoRelativo(dataTexto, agora = new Date()) {
  const data = new Date(dataTexto);
  if (!dataTexto || Number.isNaN(data.getTime())) return '';
  const minutos = Math.floor((agora - data) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias === 1 ? '' : 's'}`;
}

// Modal acessível: abre/fecha, Esc, clique no fundo e devolve o foco a quem abriu.
// `fundo` é o elemento .modal-fundo; botões com data-fechar fecham o modal.
export function criarModal(fundo, { aoFechar } = {}) {
  let anterior = null;

  function abrir(focoInicial) {
    anterior = document.activeElement;
    fundo.hidden = false;
    document.body.style.overflow = 'hidden';
    const alvo = focoInicial
      ?? fundo.querySelector('[autofocus], input:not([type="hidden"]), select, textarea, button:not([data-fechar])')
      ?? fundo.querySelector('button');
    alvo?.focus?.();
  }

  function fechar() {
    if (fundo.hidden) return;
    fundo.hidden = true;
    document.body.style.overflow = '';
    anterior?.focus?.();
    anterior = null;
    aoFechar?.();
  }

  const aoApertarEsc = (evento) => {
    if (evento.key === 'Escape' && !fundo.hidden) fechar();
  };
  document.addEventListener('keydown', aoApertarEsc);
  fundo.addEventListener('click', (evento) => {
    if (evento.target === fundo) fechar();
  });
  fundo.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fechar));

  return {
    abrir,
    fechar,
    get aberto() { return !fundo.hidden; },
    destruir() {
      document.removeEventListener('keydown', aoApertarEsc);
      document.body.style.overflow = '';
    },
  };
}

// Copia um texto; se receber um elemento, troca o texto dele por "Copiado!" por 1,5 s
export async function copiarTexto(texto, aviso) {
  try {
    await navigator.clipboard.writeText(texto);
    if (aviso) {
      const original = aviso.textContent;
      aviso.textContent = 'Copiado!';
      setTimeout(() => { aviso.textContent = original; }, 1500);
    }
    return true;
  } catch {
    return false;
  }
}
