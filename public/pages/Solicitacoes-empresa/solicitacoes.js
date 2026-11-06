// Chamada pelo router toda vez que a tela abre
export function iniciar(container) {
    // ao abrir a janela de aceitar/recusar: preenche com os dados do card que foi clicado
    container.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('show.bs.modal', e => {
            const pedido = e.relatedTarget.closest('.pedido');

            modal.querySelectorAll('[data-campo]').forEach(el => {
                el.textContent = pedido.dataset[el.dataset.campo];
            });

            modal.querySelector('[name=pedido]').value = pedido.dataset.pedido;
            modal.querySelector('[name=impressora]').value = pedido.dataset.impressora;
        });
    });

    container.querySelectorAll('.filtro').forEach(filtro => {
        filtro.addEventListener('click', function () {

            container.querySelectorAll('.filtro').forEach(card => {
                card.classList.remove('active');
            });

            this.classList.add('active');

            const status = this.dataset.status;

            container.querySelectorAll('.pedido').forEach(pedido => {
                pedido.closest('.col').style.display =
                    status === 'todos' || pedido.dataset.status === status
                        ? ''
                        : 'none';
            });
        });
    });

    carregarSolicitacoes().catch(erro => {
        console.error('Erro ao carregar solicitações:', erro);
    });
}

async function carregarSolicitacoes() {
    const resposta = await fetch('/api/solicitacoes', {
        method: 'GET',
        credentials: 'include'
    });

    if (!resposta.ok) {
        throw new Error('Não foi possível carregar as solicitações.');
    }

    const solicitacoes = await resposta.json();

    atualizarContadores(solicitacoes);
    renderizarSolicitacoes(solicitacoes);
}

// Evita inserir conteúdo HTML não confiável diretamente nos cards
function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// Converte os status do banco para os filtros da interface
function normalizarStatus(status) {
    const mapa = {
        PENDENTE: 'pendente',
        EM_ANDAMENTO: 'aceita',
        RECUSADA: 'recusada',
        CANCELADA: 'cancelada',
        CONCLUIDA: 'concluida',
        FALHOU: 'falhou'
    };

    return mapa[String(status ?? '').toUpperCase()] || 'desconhecido';
}

// Atualiza os números dos filtros
function atualizarContadores(solicitacoes) {
    document.getElementById('total-recebidos').textContent =
        solicitacoes.length;

    document.getElementById('total-pendentes').textContent =
        solicitacoes.filter(s => normalizarStatus(s.status) === 'pendente').length;

    document.getElementById('total-aceitos').textContent =
        solicitacoes.filter(s => normalizarStatus(s.status) === 'aceita').length;

    document.getElementById('total-recusados').textContent =
        solicitacoes.filter(s => normalizarStatus(s.status) === 'recusada').length;

    // só atualiza se o botão "Falhados" existir no HTML
    const totalFalhados = document.getElementById('total-falhados');
    if (totalFalhados) {
        totalFalhados.textContent =
            solicitacoes.filter(s => normalizarStatus(s.status) === 'falhou').length;
    }
}

// Cria os cards das solicitações
function renderizarSolicitacoes(solicitacoes) {
    const lista = document.getElementById('lista-solicitacoes');
    const estadoVazio = document.getElementById('estado-vazio');

    lista.innerHTML = '';

    estadoVazio.classList.toggle('d-none', solicitacoes.length > 0);

    solicitacoes.forEach(s => {
        const id = s.id;
        const titulo = s.titulo;
        const statusOriginal = s.status;
        const status = normalizarStatus(statusOriginal);
        const criador = s.criadoPor || 'Não informado';
        const impressora = s.impressora || '';
        const capacidade = (s.comprimentoMm && s.larguraMm && s.alturaMm)
            ? `${s.comprimentoMm} x ${s.larguraMm} x ${s.alturaMm}`
            : 'Não informada';
        const data = s.criadoEm
            ? new Date(s.criadoEm).toLocaleString('pt-BR')
            : 'Não informada';

        const statusTexto = {
            pendente: 'Pendente',
            aceita: 'Em andamento',
            recusada: 'Recusada',
            cancelada: 'Cancelada',
            concluida: 'Concluída',
            falhou: 'Falhou'
        }[status] || statusOriginal;

        const card = document.createElement('div');
        card.className = 'col';

        card.innerHTML = `
            <div class="pedido card h-100 shadow-sm"
                 data-pedido="${escaparHTML(id)}"
                 data-impressora="${escaparHTML(impressora)}"
                 data-status="${escaparHTML(status)}"
                 data-titulo="${escaparHTML(titulo)}"
                 data-criado-por="${escaparHTML(criador)}"
                 data-data-criacao="${escaparHTML(data)}"
                 data-status-texto="${escaparHTML(statusTexto)}">

                <div class="card-body d-flex flex-column">

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="text-muted small">
                            Solicitação #${escaparHTML(id)}
                        </span>

                        <span class="badge status-badge status-${escaparHTML(status)}">
                            ${escaparHTML(statusTexto)}
                        </span>
                    </div>

                    <h5 class="card-title">
                        ${escaparHTML(titulo)}
                    </h5>

                    <div class="pedido-info">
                        <p class="card-text">
                            <strong>Enviado por:</strong>
                            <span>${escaparHTML(criador)}</span>
                        </p>

                        <p class="card-text">
                            <strong>Impressora:</strong>
                            <span>${escaparHTML(impressora || 'Não informada')}</span>
                        </p>

                        <p class="card-text">
                            <strong>Capacidade:</strong>
                            <span>${escaparHTML(capacidade)}</span>
                        </p>

                        <p class="card-text">
                            <strong>Recebida em:</strong>
                            <span>${escaparHTML(data)}</span>
                        </p>
                    </div>

                    <div class="mt-auto d-flex gap-2">
                        ${
                            status === 'pendente' ? `
                                <button type="button"
                                    class="btn btn-success btn-sm flex-fill"
                                    data-acao="aceitar"
                                    data-bs-toggle="modal"
                                    data-bs-target="#modalSolicitacao">
                                    Aceitar
                                </button>

                                <button type="button"
                                    class="btn btn-danger btn-sm flex-fill"
                                    data-acao="recusar"
                                    data-bs-toggle="modal"
                                    data-bs-target="#modalSolicitacao">
                                    Recusar
                                </button>
                            ` : `
                                <button type="button"
                                    class="btn btn-outline-primary btn-sm w-100"
                                    data-bs-toggle="modal"
                                    data-bs-target="#modalSolicitacao">
                                    Ver detalhes
                                </button>
                            `
                        }
                    </div>
                </div>
            </div>
        `;

        lista.appendChild(card);
    });
}