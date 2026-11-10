/* global bootstrap */
import { api } from '../../shared/js/api.js';

let modais = [];

// "Situação" que a empresa informa no cadastro (campo disponibilidade do banco).
// É só informação do cadastro: NÃO decide Livre/Imprimindo e NÃO impede receber pedidos.
const ROTULO_SITUACAO = { OCIOSA: 'Ociosa', EM_USO: 'Em uso' };
const rotuloSituacao = (s) => ROTULO_SITUACAO[s] ?? s;

// Materiais disponíveis nos modais (códigos do enum Material do back)
const MATERIAIS = ['PLA', 'ABS', 'PETG', 'TPU', 'RESINA', 'NYLON'];

function normalizar(i) {
  return {
    id: i.id,
    nome: i.modelo ?? '',
    x: i.comprimentoMm ?? '',
    y: i.larguraMm ?? '',
    z: i.alturaMm ?? '',
    situacao: String(i.disponibilidade ?? '').toUpperCase(),
    materiais: Array.isArray(i.materiais) ? i.materiais.map((m) => m.codigo) : [],
    // Pedidos da AACD em andamento nesta impressora: [{ id, titulo, solicitante }].
    // Se o back ainda não mandar, vira lista vazia e a impressora aparece em "Livres".
    pedidos: Array.isArray(i.solicitacoesAtivas) ? i.solicitacoesAtivas : [],
    ativo: !(i.ativo === false || i.ativo === 0),
  };
}

function paraBack(v) {
  return {
    modelo: v.nome,
    comprimentoMm: v.x,
    larguraMm: v.y,
    alturaMm: v.z,
    disponibilidade: v.situacao,
    materiais: v.materiais.join(','),
  };
}

const $ = (id) => document.getElementById(id);
const medidas = (i) => `${i.x} × ${i.y} × ${i.z}`;
const lerMateriais = (pre) =>
  MATERIAIS.filter((m) => $(`${pre}-${m.toLowerCase()}`).checked);
const marcarMateriais = (pre, lista) =>
  MATERIAIS.forEach((m) => { $(`${pre}-${m.toLowerCase()}`).checked = lista.includes(m); });
const textoPedido = (p) => `Pedido ${p.id}${p.titulo ? ` · ${p.titulo}` : ''}`;

export async function iniciar() {
  const mostrandoTodos = { livres: false, imprimindo: false, desativadas: false };
  let impressoras = [];
  let atual = null;            // impressora selecionada nos modais
  let pedidoSelecionado = null; // pedido escolhido para cancelar

  const modalCancelar = new bootstrap.Modal($('modal-cancelar'));
  const modalRemover = new bootstrap.Modal($('modal-remover'));
  const modalEditar = new bootstrap.Modal($('modal-editar'));
  const modalAdicionar = new bootstrap.Modal($('modal-adicionar'));
  modais = [modalCancelar, modalRemover, modalEditar, modalAdicionar];

  // ----- Desenho -----
  const cabecalhoCard = (col, imp) => {
    col.querySelector('h3').textContent = imp.nome;
    col.querySelector('[data-campo="capacidade"]').textContent = `Capacidade: ${medidas(imp)} mm`;
    const sit = col.querySelector('[data-campo="situacao"]');
    if (imp.situacao) sit.textContent = `Na empresa: ${rotuloSituacao(imp.situacao)}`;
    else sit.remove();
  };

  function cardLivre(imp) {
    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.id = imp.id;
    col.innerHTML = `
      <div class="border-2 rounded-4 card h-100 p-4">
        <h3 class="fs-4 fw-bold mb-1"></h3>
        <p class="small text-body-secondary mb-1" data-campo="capacidade"></p>
        <p class="small text-body-secondary mb-4" data-campo="situacao"></p>
        <div class="d-flex gap-2">
          <button type="button" data-acao="editar" class="border-2 btn btn-sm btn-outline-secondary fw-semibold">Editar</button>
          <button type="button" data-acao="desativar" class="border-2 btn btn-sm btn-outline-secondary fw-semibold">Desativar</button>
          <button type="button" data-acao="remover" class="border-2 btn btn-sm btn-outline-danger fw-semibold">Remover</button>
        </div>
      </div>`;
    cabecalhoCard(col, imp);
    return col;
  }

  function cardImprimindo(imp) {
    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.id = imp.id;
    col.innerHTML = `
      <div class="card-imp rounded-4 card border-2 h-100 p-4">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
          <h3 class="fs-4 fw-bold mb-0"></h3>
          <span class="info warning badge rounded-pill bg-warning-subtle"><span class="text-warning">●</span> Imprimindo</span>
        </div>
        <p class="small text-body-secondary mb-1" data-campo="capacidade"></p>
        <p class="small text-body-secondary mb-3" data-campo="situacao"></p>
        <div class="pedidos"></div>
      </div>`;
    cabecalhoCard(col, imp);

    const lista = col.querySelector('.pedidos');
    for (const p of imp.pedidos) {
      const linha = document.createElement('div');
      linha.className = 'border-top pt-2 mt-2 d-flex justify-content-between align-items-center gap-2';
      linha.innerHTML = `
        <div class="small">
          <div class="fw-semibold" data-campo="titulo"></div>
          <div class="text-body-secondary" data-campo="quem"></div>
        </div>
        <button type="button" data-acao="cancelar" class="border-2 btn btn-sm btn-outline-danger fw-semibold">Cancelar</button>`;
      linha.querySelector('[data-campo="titulo"]').textContent = textoPedido(p);
      linha.querySelector('[data-campo="quem"]').textContent =
        p.solicitante ? `Enviado por ${p.solicitante}` : 'Enviado pela AACD';
      linha.querySelector('button').dataset.pedido = p.id;
      lista.append(linha);
    }
    return col;
  }

    function cardDesativada(imp) {
    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.id = imp.id;
    col.innerHTML = `
      <div class="card-desativada border-2 rounded-4 card h-100 p-4">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
          <h3 class="fs-4 fw-bold mb-0"></h3>
          <span class="info badge rounded-pill bg-secondary-subtle text-secondary-emphasis">Desativada</span>
        </div>
        <p class="small text-body-secondary mb-1" data-campo="capacidade"></p>
        <p class="small text-body-secondary mb-4" data-campo="situacao"></p>
        <div class="d-flex gap-2">
          <button type="button" data-acao="reativar" class="border-2 btn btn-sm btn-outline-success fw-semibold">Reativar</button>
          <button type="button" data-acao="remover" class="border-2 btn btn-sm btn-outline-danger fw-semibold">Remover</button>
        </div>
      </div>`;
    cabecalhoCard(col, imp);
    return col;
  }

  function atualizarSecao(id) {
    const cards = document.querySelectorAll(`#${id} .col`);
    const total = cards.length;
    if (total <= 4) mostrandoTodos[id] = false;
    cards.forEach((c, i) => c.classList.toggle('d-none', i >= 4 && !mostrandoTodos[id]));
    const visiveis = mostrandoTodos[id] ? total : Math.min(total, 4);
    document.querySelector(`#${id} .badge`).textContent = total;
    document.querySelector(`#${id} .ms-auto`).textContent = `Mostrando ${visiveis} de ${total}`;
    $(`${id}-vazio`).classList.toggle('d-none', total > 0);
    const botao = document.querySelector(`#${id} .btn-ver`);
    botao.classList.toggle('d-none', total <= 4);
    botao.textContent = mostrandoTodos[id] ? 'Ver menos' : `Ver todos (${total})`;
    document.querySelector(`#${id} .badge`).textContent = total;
    const contagem = document.querySelector(`[data-contagem="${id}"]`);
    if (contagem) contagem.textContent = total;
  }

    function desenhar() {
      const livres = [], imprimindo = [], desativadas = [];
      for (const imp of impressoras) {
        if (!imp.ativo) desativadas.push(cardDesativada(imp));
        else if (imp.pedidos.length > 0) imprimindo.push(cardImprimindo(imp));
        else livres.push(cardLivre(imp));
      }
      document.querySelector('#livres .row').replaceChildren(...livres);
      document.querySelector('#imprimindo .row').replaceChildren(...imprimindo);
      document.querySelector('#desativadas .row').replaceChildren(...desativadas);
      atualizarSecao('livres');
      atualizarSecao('imprimindo');
      atualizarSecao('desativadas');
    }

  async function carregar() {
    try {
      const r = await api.impressoras();
      if (r.status === 401) { location.hash = '#/login'; return; }
      if (!r.ok) { alert(r.corpo?.erro ?? 'Não foi possível carregar as impressoras.'); return; }
      impressoras = (Array.isArray(r.corpo) ? r.corpo : []).map(normalizar);
    } catch { alert('Sem conexão com o servidor.'); return; }

    desenhar();
  }

  // ----- Eventos (delegação: vale para cards novos também) -----
  document.querySelectorAll('.btn-ver').forEach((b) => b.addEventListener('click', () => {
    const id = b.closest('section').id;
    mostrandoTodos[id] = !mostrandoTodos[id];
    atualizarSecao(id);
  }));

  // navegação entre seções (Livres / Imprimindo / Desativadas)
  document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
    $(b.dataset.ir).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  document.querySelector('.impressoras').addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-acao]');
    if (!botao) return;
    const col = botao.closest('.col');
    atual = impressoras.find((i) => String(i.id) === col.dataset.id);
    if (!atual) return;

    if (botao.dataset.acao === 'remover') {
      $('remover-nome').textContent = atual.nome;
      modalRemover.show();
    } else if (botao.dataset.acao === 'editar') {
      $('editar-nome').value = atual.nome;
      $('editar-x').value = atual.x;
      $('editar-y').value = atual.y;
      $('editar-z').value = atual.z;
      $('editar-situacao').value = atual.situacao || 'OCIOSA';
      marcarMateriais('editar', atual.materiais);
      modalEditar.show();
      } else if (botao.dataset.acao === 'cancelar') {
      pedidoSelecionado = atual.pedidos.find((p) => String(p.id) === botao.dataset.pedido);
      if (!pedidoSelecionado) return;
      $('cancelar-pedido').textContent = atual.nome;
      $('cancelar-titulo').textContent = textoPedido(pedidoSelecionado);
      $('cancelar-motivo').value = '';
      $('cancelar-just').value = '';
      verificarCancelamento();
      modalCancelar.show();
    } else if (botao.dataset.acao === 'desativar' || botao.dataset.acao === 'reativar') {
      alterarAtivo(atual, botao.dataset.acao === 'reativar');
    }
  });

  // cancelar impressão
  const motivo = $('cancelar-motivo'), just = $('cancelar-just');
  function verificarCancelamento() {
    $('cancelar-contador').textContent = just.value.length + '/300';
    $('cancelar-confirmar').disabled = motivo.value === '' || just.value.trim() === '';
  }
  motivo.addEventListener('change', verificarCancelamento);
  just.addEventListener('input', verificarCancelamento);
  $('cancelar-confirmar').addEventListener('click', async () => {
    if (!pedidoSelecionado) return;
    const r = await api.cancelarSolicitacao(pedidoSelecionado.id, `${motivo.value}: ${just.value.trim()}`);
    if (!r.ok) { alert(r.corpo?.erro ?? 'Não foi possível cancelar.'); return; }
    modalCancelar.hide();
    carregar();
  });

  // remover
  $('remover-confirmar').addEventListener('click', async () => {
    if (typeof api.removerImpressora !== 'function') {
      alert('A remoção ainda não foi ligada ao servidor.');
      return;
    }
    const r = await api.removerImpressora(atual.id);
    if (!r.ok) { alert(r.corpo?.erro ?? 'Não foi possível remover.'); return; }
    modalRemover.hide();
    carregar();
  });

    async function alterarAtivo(imp, ativo) {
    if (typeof api.alterarAtivoImpressora !== 'function') {
      alert('Desativar/reativar ainda não foi ligado ao servidor.');
      return;
    }
    const r = await api.alterarAtivoImpressora(imp.id, ativo);
    if (!r.ok) { alert(r.corpo?.erro ?? 'Não foi possível alterar a situação.'); return; }
    carregar();
  }

  // editar
  $('editar-salvar').addEventListener('click', async () => {
    const v = {
      nome: $('editar-nome').value.trim(),
      x: $('editar-x').value,
      y: $('editar-y').value,
      z: $('editar-z').value,
      situacao: $('editar-situacao').value,
      materiais: lerMateriais('editar'),
    };
    if (!v.nome || !v.x || !v.y || !v.z || v.materiais.length === 0) {
      alert('Preencha o modelo, a capacidade e escolha ao menos um material.');
      return;
    }
    const r = await api.editarImpressora({ id: atual.id, ...paraBack(v) });
    if (!r.ok) { alert(r.corpo?.erro ?? 'Não foi possível salvar.'); return; }
    modalEditar.hide();
    carregar();
  });

  // adicionar
  $('btn-adicionar').addEventListener('click', () => {
    $('adicionar-erro').classList.add('d-none');
    $('adicionar-situacao').value = 'OCIOSA';
    marcarMateriais('adicionar', []);
    modalAdicionar.show();
  });
  $('adicionar-salvar').addEventListener('click', async () => {
    const v = {
      nome: $('adicionar-modelo').value.trim(),
      x: $('adicionar-x').value,
      y: $('adicionar-y').value,
      z: $('adicionar-z').value,
      situacao: $('adicionar-situacao').value,
      materiais: lerMateriais('adicionar'),
    };
    if (!v.nome || !v.x || !v.y || !v.z || v.materiais.length === 0) {
      $('adicionar-erro').classList.remove('d-none');
      return;
    }
    const r = await api.cadastrarImpressora(paraBack(v));
    if (!r.ok) { alert(r.corpo?.erro ?? 'Não foi possível cadastrar.'); return; }
    ['modelo', 'x', 'y', 'z'].forEach((c) => { $('adicionar-' + c).value = ''; });
    modalAdicionar.hide();
    carregar();
  });

  await carregar();
}

export function destruir() {
  modais.forEach((m) => m.dispose());
  modais = [];
  document.querySelectorAll('.modal-backdrop').forEach((f) => f.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}

const modalDoacao = new bootstrap.Modal(document.getElementById('modal-doacao'));
const doacaoErro = document.getElementById('doacao-erro');
const doacaoQuantidades = document.getElementById('doacao-quantidades');
const grupoImpressoras = document.getElementById('doacao-grupo-impressoras');
const grupoFilamento = document.getElementById('doacao-grupo-filamento');
const doacaoDescricao = document.getElementById('doacao-descricao');

function tipoDoacaoSelecionado() {
  return document.querySelector('input[name="doacao-tipo"]:checked')?.value ?? '';
}

function atualizarCamposQuantidade() {
  const tipo = tipoDoacaoSelecionado();
  doacaoQuantidades.classList.toggle('d-none', !tipo);
  grupoImpressoras.classList.toggle('d-none', tipo === 'FILAMENTO');
  grupoFilamento.classList.toggle('d-none', tipo === 'IMPRESSORA');
}

function mostrarErroDoacao(msg) {
  doacaoErro.textContent = msg;
  doacaoErro.classList.remove('d-none');
}

document.querySelectorAll('input[name="doacao-tipo"]').forEach(radio => {
  radio.addEventListener('change', atualizarCamposQuantidade);
});

// botões − e +
document.querySelectorAll('#modal-doacao [data-passo]').forEach(botao => {
  botao.addEventListener('click', () => {
    const campo = document.getElementById(botao.dataset.alvo);
    campo.value = Math.max(1, (Number(campo.value) || 1) + Number(botao.dataset.passo));
  });
});

doacaoDescricao.addEventListener('input', () => {
  document.getElementById('doacao-contador').textContent = `${doacaoDescricao.value.length}/300`;
});

document.getElementById('btn-doacao').addEventListener('click', () => {
  document.querySelectorAll('input[name="doacao-tipo"]').forEach(r => { r.checked = false; });
  document.getElementById('doacao-qtd-impressoras').value = 1;
  document.getElementById('doacao-qtd-filamento').value = 1;
  doacaoDescricao.value = '';
  document.getElementById('doacao-contador').textContent = '0/300';
  doacaoErro.classList.add('d-none');
  atualizarCamposQuantidade();
  modalDoacao.show();
});

document.getElementById('doacao-enviar').addEventListener('click', async () => {
  const tipo = tipoDoacaoSelecionado();
  const descricao = doacaoDescricao.value.trim();
  const qtdImpressoras = Number(document.getElementById('doacao-qtd-impressoras').value);
  const qtdFilamento = Number(document.getElementById('doacao-qtd-filamento').value);

  if (!tipo) {
    mostrarErroDoacao('Escolha o que deseja doar.');
    return;
  }
  if ((tipo !== 'FILAMENTO' && qtdImpressoras < 1) || (tipo !== 'IMPRESSORA' && qtdFilamento < 1)) {
    mostrarErroDoacao('Informe a quantidade (mínimo 1).');
    return;
  }
  if (!descricao) {
    mostrarErroDoacao('Descreva a doação.');
    return;
  }

  const dados = new URLSearchParams({ tipo, descricao });
  if (tipo !== 'FILAMENTO') dados.set('quantidadeImpressoras', qtdImpressoras);
  if (tipo !== 'IMPRESSORA') dados.set('quantidadeFilamento', qtdFilamento);

  const botao = document.getElementById('doacao-enviar');
  botao.disabled = true;
  try {
    const resp = await fetch('/api/doacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: dados
    });

    if (resp.status === 201) {
      modalDoacao.hide();
      mostrarAvisoSucesso('Manifestação de doação enviada com sucesso!');
    } else if (resp.status === 401 || resp.status === 403) {
      mostrarErroDoacao('Sua sessão expirou ou você não tem permissão. Entre novamente.');
    } else {
      mostrarErroDoacao('Não foi possível enviar. Confira os dados e tente de novo.');
    }
  } catch {
    mostrarErroDoacao('Erro de conexão com o servidor.');
  } finally {
    botao.disabled = false;
  }
});

function mostrarAvisoSucesso(msg) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-bg-success border-0';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body"></div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>`;
  toast.querySelector('.toast-body').textContent = msg;
  container.appendChild(toast);

  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  new bootstrap.Toast(toast, { delay: 4000 }).show();
}