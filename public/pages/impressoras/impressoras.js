// O router chama iniciar() toda vez que a tela abre e destruir() quando sai.
// Por isso todo o código fica dentro de iniciar() (o módulo só é importado uma vez).

// guarda os modais pra poder limpar quando sair da tela
let modais = [];

export function iniciar() {
  // ----- botão "Ver todos" / "Ver menos" -----
  // guarda se cada seção está mostrando tudo
  const mostrandoTodos = { livres: false, imprimindo: false };

  // atualiza uma seção (livres ou imprimindo)
  function atualizarSecao(id) {
    const cards = document.querySelectorAll('#' + id + ' .col');
    const total = cards.length;
    const botao = document.querySelector('#' + id + ' .btn-ver');

    // se tem 4 ou menos, não precisa do botão
    if (total <= 4) mostrandoTodos[id] = false;

    // esconde do 5º card em diante (se não estiver mostrando todos)
    cards.forEach((card, i) => {
      card.classList.toggle('d-none', i >= 4 && !mostrandoTodos[id]);
    });

    const visiveis = mostrandoTodos[id] ? total : Math.min(total, 4);
    document.querySelector('#' + id + ' .badge').textContent = total;
    document.querySelector('#' + id + ' .ms-auto').textContent = 'Mostrando ' + visiveis + ' de ' + total;
    // mensagem de "nenhuma impressora" só aparece quando está vazio
    document.getElementById(id + '-vazio').classList.toggle('d-none', total > 0);

    botao.classList.toggle('d-none', total <= 4);
    botao.textContent = mostrandoTodos[id] ? 'Ver menos' : 'Ver todos (' + total + ')';
  }

  // os botões "Ver todos" funcionam do mesmo jeito
  document.querySelectorAll('.btn-ver').forEach(botao => {
    botao.addEventListener('click', () => {
      const id = botao.closest('section').id;
      mostrandoTodos[id] = !mostrandoTodos[id];
      atualizarSecao(id);
    });
  });

  // ----- MODAIS -----
  const modalCancelar = new bootstrap.Modal(document.getElementById('modal-cancelar'));
  const modalRemover = new bootstrap.Modal(document.getElementById('modal-remover'));
  const modalEditar = new bootstrap.Modal(document.getElementById('modal-editar'));
  const modalAdicionar = new bootstrap.Modal(document.getElementById('modal-adicionar'));
  modais = [modalCancelar, modalRemover, modalEditar, modalAdicionar];

  // guarda o card que foi clicado
  let cardAtual;

  // pedidos que a AACD mandou e ainda não estão em nenhuma impressora
  // (são de mentira por enquanto, porque ainda não tem back-end)
  const pedidosPendentes = [
    { numero: 6520, peca: 'Órtese de cotovelo', enviadoPor: 'Juliana Prado' },
    { numero: 6521, peca: 'Prótese de antebraço', enviadoPor: 'Ricardo Alves' },
    { numero: 6522, peca: 'Órtese de dedo', enviadoPor: 'Marta Silva' },
    { numero: 6523, peca: 'Prótese de mão', enviadoPor: 'Lucas Freitas' },
    { numero: 6524, peca: 'Órtese de punho', enviadoPor: 'Sara Costa' }
  ];

  // muda o selo "Filamento incluso" / "Sem filamento" do card
  function colocarFilamento(card, incluso) {
    const selo = card.querySelector('.badge');
    if (incluso) {
      selo.textContent = 'Filamento incluso';
      selo.className = 'info badge rounded-pill bg-success-subtle text-success-emphasis';
    } else {
      selo.textContent = 'Sem filamento';
      selo.className = 'info badge rounded-pill bg-secondary-subtle text-secondary-emphasis';
    }
  }

  // só a FDM tem tipo aberta/fechada (SLA e SLS não têm)
  function mostrarTipo(tecnologia, divTipo) {
    divTipo.classList.toggle('d-none', tecnologia != 'FDM');
  }

  // -- Criar cards --
  // cria um card de impressora livre e coloca na seção Livres
  function criarCardLivre(nome, medidas, incluso, tecnologia, tipo) {
    const card = document.createElement('div');
    card.className = 'col';
    card.innerHTML = `
      <div class="border-2 rounded-4 card h-100 p-4">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
          <h3 class="fs-4 fw-bold mb-0">${nome}</h3>
          <span class="info badge rounded-pill"></span>
        </div>
        <p class="small text-body-secondary mb-4">Capacidade: ${medidas} mm</p>
        <div class="d-flex gap-2">
          <button type="button" class="border-2 btn btn-sm btn-outline-warning fw-semibold">Imprimir</button>
          <button type="button" class="border-2 btn btn-sm btn-outline-secondary fw-semibold">Editar</button>
          <button type="button" class="border-2 btn btn-sm btn-outline-danger fw-semibold">Remover</button>
        </div>
      </div>`;

    card.dataset.tecnologia = tecnologia;
    card.dataset.tipo = tipo;
    colocarFilamento(card, incluso);

    document.querySelector('#livres .row').appendChild(card);
    ligarBotoes(card);
    mostrandoTodos.livres = true; // pra aparecer o card que chegou
    atualizarSecao('livres');
  }

  // cria um card de impressora imprimindo (impressora em cima, pedido embaixo)
  function criarCardImpressao(nome, pedido, medidas, incluso, tecnologia, tipo) {
    const card = document.createElement('div');
    card.className = 'col';
    card.innerHTML = `
      <div class="card-imp rounded-4 card border-2 h-100 p-4">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
          <h3 class="fs-4 fw-bold mb-0">${nome}</h3>
          <span class="info warning badge rounded-pill bg-warning-subtle"><span class="text-warning">●</span> Imprimindo</span>
        </div>
        <p class="small mb-3 fw-semibold">Pedido ${pedido.numero} · ${pedido.peca}</p>
        <div class="d-flex gap-2 mb-3">
          <button type="button" class="border-2 btn btn-sm btn-outline-success fw-semibold">Concluir</button>
          <button type="button" class="border-2 btn btn-sm btn-outline-danger fw-semibold">Cancelar</button>
        </div>
        <div class="border-top pt-2 small">Enviado por <b>${pedido.enviadoPor}</b></div>
      </div>`;

    // guarda os dados da impressora pra ela poder voltar pra Livres
    card.dataset.medidas = medidas;
    card.dataset.filamento = incluso ? 'sim' : 'nao';
    card.dataset.tecnologia = tecnologia;
    card.dataset.tipo = tipo;

    document.querySelector('#imprimindo .row').appendChild(card);
    ligarBotoesImpressao(card);
    mostrandoTodos.imprimindo = true; // pra aparecer o card que chegou
    atualizarSecao('imprimindo');
  }

  // manda a impressora de Imprimindo de volta pra Livres
  function voltarParaLivres(card) {
    criarCardLivre(
      card.querySelector('h3').textContent,
      card.dataset.medidas,
      card.dataset.filamento == 'sim',
      card.dataset.tecnologia || 'FDM',
      card.dataset.tipo || 'Aberta'
    );
    card.remove();
    atualizarSecao('imprimindo');
  }

  // -- Cancelar impressão --
  const motivo = document.getElementById('cancelar-motivo');
  const justificativa = document.getElementById('cancelar-just');
  const btnConfirmarCancelar = document.getElementById('cancelar-confirmar');

  // o botão só fica ativo com motivo escolhido e justificativa preenchida
  function verificarCancelamento() {
    document.getElementById('cancelar-contador').textContent = justificativa.value.length + '/300';
    btnConfirmarCancelar.disabled = motivo.value == '' || justificativa.value.trim() == '';
  }
  motivo.addEventListener('change', verificarCancelamento);
  justificativa.addEventListener('input', verificarCancelamento);

  btnConfirmarCancelar.addEventListener('click', () => {
    voltarParaLivres(cardAtual); // a impressora fica livre de novo
    modalCancelar.hide();
  });

  // -- Botões dos cards de Imprimindo (Concluir e Cancelar) --
  function ligarBotoesImpressao(card) {
    // CONCLUIR
    card.querySelector('.btn-outline-success').addEventListener('click', () => {
      voltarParaLivres(card);
    });

    // CANCELAR
    card.querySelector('.btn-outline-danger').addEventListener('click', () => {
      cardAtual = card;

      // coloca os dados no modal
      document.getElementById('cancelar-pedido').textContent = card.querySelector('h3').textContent;
      document.getElementById('cancelar-titulo').textContent = card.querySelector('p').textContent;

      // limpa os campos
      motivo.value = '';
      justificativa.value = '';
      verificarCancelamento();

      modalCancelar.show();
    });
  }

  // liga os botões dos cards que já existem
  document.querySelectorAll('#imprimindo .col').forEach(ligarBotoesImpressao);

  // -- Botões dos cards de Livres (Imprimir, Editar e Remover) --
  // essa função liga os botões de um card (também usada nos cards novos)
  function ligarBotoes(card) {
    // IMPRIMIR (é o primeiro botão do card)
    card.querySelector('button').addEventListener('click', () => {
      // pega o próximo pedido da fila
      const pedido = pedidosPendentes.shift();
      if (!pedido) {
        alert('Não há pedidos pendentes da AACD no momento.');
        return;
      }

      // "Capacidade: 220 × 220 × 250 mm" -> "220 × 220 × 250"
      const medidas = card.querySelector('p').textContent.replace('Capacidade: ', '').replace(' mm', '');

      criarCardImpressao(
        card.querySelector('h3').textContent,
        pedido,
        medidas,
        card.querySelector('.badge').textContent == 'Filamento incluso',
        card.dataset.tecnologia || 'FDM',
        card.dataset.tipo || 'Aberta'
      );
      card.remove();
      atualizarSecao('livres');
    });

    // REMOVER
    card.querySelector('.btn-outline-danger').addEventListener('click', () => {
      cardAtual = card;
      document.getElementById('remover-nome').textContent = card.querySelector('h3').textContent;
      modalRemover.show();
    });

    // EDITAR
    card.querySelector('.btn-outline-secondary').addEventListener('click', () => {
      cardAtual = card;

      // "220 × 220 × 250" -> ["220", "220", "250"]
      const texto = card.querySelector('p').textContent;
      const medidas = texto.replace('Capacidade: ', '').replace(' mm', '').split(' × ');

      document.getElementById('editar-nome').value = card.querySelector('h3').textContent;
      document.getElementById('editar-tecnologia').value = card.dataset.tecnologia || 'FDM';
      document.getElementById('editar-tipo').value = card.dataset.tipo || 'Aberta';
      mostrarTipo(document.getElementById('editar-tecnologia').value, document.getElementById('editar-tipo-div'));
      document.getElementById('editar-x').value = medidas[0];
      document.getElementById('editar-y').value = medidas[1];
      document.getElementById('editar-z').value = medidas[2];
      document.getElementById('editar-filamento').checked = card.querySelector('.badge').textContent == 'Filamento incluso';

      modalEditar.show();
    });
  }

  // liga os botões dos cards que já existem
  document.querySelectorAll('#livres .col').forEach(ligarBotoes);

  document.getElementById('remover-confirmar').addEventListener('click', () => {
    cardAtual.remove();
    atualizarSecao('livres');
    modalRemover.hide();
  });

  // ao trocar a tecnologia, mostra ou esconde o tipo
  const editarTecnologia = document.getElementById('editar-tecnologia');
  editarTecnologia.addEventListener('change', () => {
    mostrarTipo(editarTecnologia.value, document.getElementById('editar-tipo-div'));
  });

  document.getElementById('editar-salvar').addEventListener('click', () => {
    const x = document.getElementById('editar-x').value;
    const y = document.getElementById('editar-y').value;
    const z = document.getElementById('editar-z').value;

    cardAtual.querySelector('h3').textContent = document.getElementById('editar-nome').value;
    cardAtual.querySelector('p').textContent = 'Capacidade: ' + x + ' × ' + y + ' × ' + z + ' mm';
    colocarFilamento(cardAtual, document.getElementById('editar-filamento').checked);

    // guarda tecnologia e tipo no card (o tipo só existe na FDM)
    cardAtual.dataset.tecnologia = editarTecnologia.value;
    cardAtual.dataset.tipo = editarTecnologia.value == 'FDM' ? document.getElementById('editar-tipo').value : '';

    modalEditar.hide();
  });

  // -- Adicionar impressora --
  const adicionarTecnologia = document.getElementById('adicionar-tecnologia');
  adicionarTecnologia.addEventListener('change', () => {
    mostrarTipo(adicionarTecnologia.value, document.getElementById('adicionar-tipo-div'));
  });

  document.getElementById('btn-adicionar').addEventListener('click', () => {
    document.getElementById('adicionar-erro').classList.add('d-none');
    adicionarTecnologia.value = 'FDM';
    mostrarTipo('FDM', document.getElementById('adicionar-tipo-div'));
    modalAdicionar.show();
  });

  document.getElementById('adicionar-salvar').addEventListener('click', () => {
    const modelo = document.getElementById('adicionar-modelo').value;
    const x = document.getElementById('adicionar-x').value;
    const y = document.getElementById('adicionar-y').value;
    const z = document.getElementById('adicionar-z').value;

    // se faltar algum campo, mostra o erro e para
    if (modelo == '' || x == '' || y == '' || z == '') {
      document.getElementById('adicionar-erro').classList.remove('d-none');
      return;
    }

    criarCardLivre(
      modelo,
      x + ' × ' + y + ' × ' + z,
      document.getElementById('adicionar-filamento').checked,
      adicionarTecnologia.value,
      adicionarTecnologia.value == 'FDM' ? document.getElementById('adicionar-tipo').value : ''
    );

    // limpa os campos
    document.getElementById('adicionar-modelo').value = '';
    document.getElementById('adicionar-x').value = '';
    document.getElementById('adicionar-y').value = '';
    document.getElementById('adicionar-z').value = '';
    document.getElementById('adicionar-filamento').checked = false;

    modalAdicionar.hide();
  });

  // ao abrir a página
  atualizarSecao('imprimindo');
  atualizarSecao('livres');
}

// o router chama quando o usuário sai da tela
// (se sair com um modal aberto, não deixa o fundo escuro travado)
export function destruir() {
  modais.forEach(modal => modal.dispose());
  modais = [];
  document.querySelectorAll('.modal-backdrop').forEach(fundo => fundo.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}
