import { api } from '../../shared/js/api.js';

function mensagemDe(corpo, padrao) {
    return corpo?.erro || corpo?.mensagem || corpo?.message || padrao;
}

// "100 x 80 x 50 mm" -> [100, 80, 50]
function parseMedidas(texto) {
    const n = String(texto || '').match(/\d+(?:[.,]\d+)?/g);
    return n && n.length >= 3
        ? n.slice(0, 3).map(v => parseFloat(v.replace(',', '.')))
        : null;
}

const fmtMedidas = m => m.join(' × ') + ' mm';
const medidasValidas = m => m.every(v => Number.isFinite(v) && v > 0);

// Endpoint que entrega o arquivo da peça (a autenticação é a mesma do detalhe)
const URL_ARQUIVO = '/api/solicitacao/arquivo';

const ROTULO_STATUS = {
    PENDENTE: 'Pendente',
    EM_ANDAMENTO: 'Em andamento',
    RECUSADA: 'Recusada',
    CANCELADA: 'Cancelada',
    CONCLUIDA: 'Concluída',
    FALHOU: 'Falhou'
};

function rotuloStatus(valor) {
    return valor ? (ROTULO_STATUS[String(valor).toUpperCase()] || valor) : '';
}

// "2026-10-15" -> "15/10/2026"
function formatarDataISO(valor) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : valor;
}

let raiz = null;

// Chamada pelo router toda vez que a tela abre
export function iniciar(container) {
    raiz = container;

    configurarModal(container);

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

function hojeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function configurarModal(container) {
    const modal = container.querySelector('#modalSolicitacao');
    if (!modal) return;

    const q = seletor => modal.querySelector(seletor);
    const qa = seletor => modal.querySelectorAll(seletor);

    let atual = null;             // { id, status, dimensoes, impressora }
    let detalhes = null;          // resposta de detalheSolicitacaoEmpresa
    let modoJustificativa = null; // 'RECUSAR' | 'FALHAR'
    let aceiteBloqueado = false;  // true quando a peça não cabe na impressora
    let motivoRecusa = null;      // chip escolhido no painel de recusa

    function mostrarErro(msg) {
        const caixa = q('[data-erro]');
        caixa.textContent = msg || '';
        caixa.classList.toggle('d-none', !msg);
    }

    // Título e subtítulo do cabeçalho conforme o painel ativo
    function atualizarCabecalho(painel) {
        const t = q('[data-modal-titulo]');
        const s = q('[data-modal-subtitulo]');
        if (!t || !s) return;

        let titulo;
        let subtitulo;

        if (painel === 'prazo') {
            titulo = 'Aceitar solicitação';
            subtitulo = 'Confirme a impressora que vai fazer este pedido.';
        } else if (painel === 'justificativa') {
            const recusa = modoJustificativa === 'RECUSAR';
            titulo = recusa ? 'Recusar solicitação' : 'Informar falha';
            subtitulo = recusa
                ? 'A AACD vê o motivo e pode enviar o pedido para outra empresa.'
                : 'Conte o que aconteceu. A AACD vai ver essa mensagem.';
        } else {
            titulo = 'Detalhes da solicitação';
            subtitulo = atual ? `Solicitação #${atual.id}` : '';
        }

        t.textContent = titulo;
        s.textContent = subtitulo;
    }

    function mostrarPainel(nome) {
        qa('[data-painel]').forEach(el =>
            el.classList.toggle('d-none', el.dataset.painel !== nome));
        qa('[data-rodape]').forEach(el =>
            el.classList.toggle('d-none', el.dataset.rodape !== nome));
        mostrarErro('');
        atualizarCabecalho(nome);
    }

    function definirBotoesPorStatus(status) {
        qa('[data-visivel]').forEach(btn =>
            btn.classList.toggle('d-none', btn.dataset.visivel !== status));
    }

    function marcarChip(chip, ativo) {
        chip.classList.toggle('ativo', ativo);
        chip.setAttribute('aria-checked', String(ativo));
    }

    function limparDetalhes() {
        qa('[data-detalhe]').forEach(el => {
            if (el.dataset.detalhe === 'historico') el.innerHTML = '';
            else el.textContent = '—';
        });
        qa('[data-linha]').forEach(el => el.classList.add('d-none'));
        q('#campoPrazo').value = '';
        q('#campoJustificativa').value = '';
        const link = q('[data-arquivo-link]');
        if (link) {
            link.classList.add('d-none');
            link.removeAttribute('href');
            link.removeAttribute('download');
        }
        detalhes = null;
        aceiteBloqueado = false;
        motivoRecusa = null;
        qa('[data-motivo]').forEach(c => marcarChip(c, false));
    }

    function definirDetalhe(nome, valor) {
        const el = q(`[data-detalhe="${nome}"]`);
        const tem = valor !== undefined && valor !== null && valor !== '';
        if (el && tem) el.textContent = valor;
        // linhas opcionais só aparecem quando há valor
        qa(`[data-linha="${nome}"]`).forEach(l => l.classList.toggle('d-none', !tem));
    }

    function preencherHistorico(historico) {
        const lista = q('[data-detalhe="historico"]');
        lista.innerHTML = '';
        const itens = Array.isArray(historico) ? historico : [];
        itens.forEach(h => {
            const li = document.createElement('li');

            const de = rotuloStatus(h.de);
            const para = rotuloStatus(h.para);
            const texto = document.createElement('span');
            texto.className = 'hist-texto';
            texto.textContent = (de ? `${de} → ${para}` : para) +
                (h.observacao ? `: ${h.observacao}` : '');

            const data = document.createElement('span');
            data.className = 'hist-data';
            data.textContent = h.data ? new Date(h.data).toLocaleString('pt-BR') : '';

            li.append(texto, data);
            lista.appendChild(li);
        });
        qa('[data-linha="historico"]').forEach(l =>
            l.classList.toggle('d-none', itens.length === 0));
    }

    // Linha do cartão-resumo do painel "Aceitar".
    // opcional = true: esconde a linha inteira (rótulo + valor) quando não há dado real
    function definirAceite(nome, valor, opcional = false) {
        const dd = q(`[data-aceite="${nome}"]`);
        if (!dd) return;
        const tem = valor !== undefined && valor !== null && valor !== '';
        dd.textContent = tem ? valor : '—';
        if (opcional) {
            dd.classList.toggle('d-none', !tem);
            dd.previousElementSibling?.classList.toggle('d-none', !tem);
        }
    }

    // Cartão-resumo + checklist do painel "Aceitar"
    function preencherAceite() {
        if (!atual) return;

        const peca = parseMedidas(atual.dimensoes);
        const imp = (detalhes && typeof detalhes.impressora === 'object' && detalhes.impressora) || {};
        const volume = [imp.comprimentoMm, imp.larguraMm, imp.alturaMm];
        const materiais = Array.isArray(imp.materiais) ? imp.materiais.join(', ') : '';

        definirAceite('impressora', imp.modelo || atual.impressora);
        definirAceite('materiais', materiais, true);
        definirAceite('peca', peca ? fmtMedidas(peca) : '');
        definirAceite('quantidade', detalhes?.quantidade != null ? `${detalhes.quantidade} un.` : '');

        const lista = q('[data-checks]');
        const li = document.createElement('li');
        aceiteBloqueado = false;

        if (!peca) {
            li.className = 'info';
            li.textContent = 'Dimensões da peça não informadas';
        } else if (!detalhes) {
            li.className = 'info';
            li.textContent = 'Conferindo se a peça cabe na impressora…';
        } else if (!medidasValidas(volume)) {
            li.className = 'info';
            li.textContent = `Peça de ${fmtMedidas(peca)} (medidas da impressora indisponíveis)`;
        } else {
            // Mesma regra do ValidadorVolume.cabe: compara as medidas ordenadas
            const a = [...peca].sort((x, y) => x - y);
            const b = [...volume].sort((x, y) => x - y);
            const cabe = a.every((v, i) => v <= b[i]);

            aceiteBloqueado = !cabe;
            li.className = cabe ? '' : 'erro';
            li.textContent = cabe
                ? `A peça cabe nesta impressora (${fmtMedidas(peca)} em ${fmtMedidas(volume)})`
                : `A peça não cabe nesta impressora (${fmtMedidas(peca)}, limite ${fmtMedidas(volume)})`;
        }

        lista.innerHTML = '';
        lista.append(li);
        q('[data-acao="confirmar-aceite"]').disabled = aceiteBloqueado;
    }

    async function carregarDetalhes(id) {
        try {
            const r = await api.detalheSolicitacaoEmpresa(id);
            if (!atual || String(atual.id) !== String(id)) return; // modal já mudou de card

            if (!r.ok) {
                return mostrarErro(mensagemDe(r.corpo, 'Não foi possível carregar os detalhes.'));
            }
            const d = r.corpo ?? {};
            detalhes = d;

            definirDetalhe('quantidade', d.quantidade);
            definirDetalhe('nomeArquivo', d.nomeArquivo);

            const link = q('[data-arquivo-link]');
            if (link) {
                const temArquivo = Boolean(d.nomeArquivo);
                link.classList.toggle('d-none', !temArquivo);
                if (temArquivo) {
                    link.href = `${URL_ARQUIVO}?id=${encodeURIComponent(id)}`;
                    link.setAttribute('download', d.nomeArquivo);
                }
            }
            definirDetalhe('descricao', d.descricao);
            definirDetalhe('prazoEstimado', formatarDataISO(d.prazoEstimado));
            definirDetalhe('justificativa', d.justificativa);
            preencherHistorico(d.historico);
            preencherAceite();
        } catch {
            if (atual && String(atual.id) === String(id)) {
                mostrarErro('Não foi possível carregar os detalhes.');
            }
        }
    }

    async function enviar(decisao, extras = {}) {
        const botoes = qa('.modal-footer button');
        botoes.forEach(b => b.disabled = true);
        mostrarErro('');

        try {
            const r = await api.responderSolicitacao({ id: atual.id, decisao, ...extras });

            if (!r.ok) {
                // 409: o status mudou (AACD cancelou ou expirou). Atualiza a lista também
                if (r.status === 409) carregarSolicitacoes().catch(() => {});
                throw new Error(mensagemDe(r.corpo, 'Não foi possível concluir a ação.'));
            }

            q('[data-bs-dismiss="modal"]').click();
            await carregarSolicitacoes();
            raiz.querySelector('.filtro.active')?.click();
        } catch (erro) {
            mostrarErro(erro.message || 'Não foi possível concluir a ação.');
        } finally {
            botoes.forEach(b => b.disabled = false);
            if (aceiteBloqueado) q('[data-acao="confirmar-aceite"]').disabled = true;
        }
    }

    // ao abrir: preenche com os dados do card clicado e busca o restante
    modal.addEventListener('show.bs.modal', e => {
        const pedido = e.relatedTarget.closest('.pedido');
        atual = {
            id: pedido.dataset.pedido,
            status: pedido.dataset.status,
            dimensoes: pedido.dataset.dimensoes,
            impressora: pedido.dataset.impressora
        };

        limparDetalhes();
        qa('[data-campo]').forEach(el => {
            el.textContent = pedido.dataset[el.dataset.campo] || '—';
        });

        const chip = q('[data-status-chip]');
        if (chip) chip.dataset.status = atual.status;

        definirBotoesPorStatus(atual.status);
        mostrarPainel('detalhes');
        carregarDetalhes(atual.id);
    });

    modal.addEventListener('hidden.bs.modal', () => {
        atual = null;
        detalhes = null;
    });

    modal.addEventListener('click', e => {
        const chip = e.target.closest('[data-motivo]');
        if (chip) {
            qa('[data-motivo]').forEach(c => marcarChip(c, c === chip));
            motivoRecusa = chip.dataset.motivo;
            mostrarErro('');
            return;
        }

        const botao = e.target.closest('[data-acao]');
        if (!botao || !atual) return;

        switch (botao.dataset.acao) {
            case 'voltar':
                mostrarPainel('detalhes');
                break;

            case 'ir-prazo':
                q('#campoPrazo').min = hojeISO();
                preencherAceite();
                mostrarPainel('prazo');
                q('#campoPrazo').focus();
                break;

            case 'ir-recusar':
            case 'ir-falhar': {
                modoJustificativa = botao.dataset.acao === 'ir-recusar' ? 'RECUSAR' : 'FALHAR';
                const recusa = modoJustificativa === 'RECUSAR';
                const campo = q('#campoJustificativa');

                q('[data-grupo-motivos]').classList.toggle('d-none', !recusa);
                q('[data-rotulo-justificativa]').textContent =
                    recusa ? 'Observação (opcional)' : 'O que aconteceu?';
                q('[data-ajuda-justificativa]').textContent =
                    recusa ? '' : 'A AACD verá este texto.';
                campo.placeholder = recusa
                    ? 'Ex.: sem PETG no estoque até 20/10. Isso ajuda a AACD a escolher outra empresa.'
                    : '';
                campo.maxLength = recusa ? 460 : 500; // sobra espaço para o motivo
                q('[data-aviso-justificativa]').textContent = recusa
                    ? 'O pedido vai para Recusadas. A AACD poderá reenviá-lo a outra empresa ou removê-lo. Essa ação não pode ser desfeita.'
                    : 'A AACD vê o motivo e pode enviar o pedido para outra empresa. Essa ação não pode ser desfeita.';
                q('[data-acao="confirmar-justificativa"]').textContent =
                    recusa ? 'Confirmar recusa' : 'Confirmar';

                mostrarPainel('justificativa');
                (recusa ? q('[data-motivo]') : campo).focus();
                break;
            }

            case 'confirmar-aceite': {
                if (aceiteBloqueado) return mostrarErro('A peça não cabe nesta impressora.');
                const prazo = q('#campoPrazo').value;
                if (!prazo) return mostrarErro('Informe o prazo estimado.');
                enviar('ACEITAR', { prazo });
                break;
            }

            case 'confirmar-justificativa': {
                const observacao = q('#campoJustificativa').value.trim();
                let justificativa = observacao;

                if (modoJustificativa === 'RECUSAR') {
                    if (!motivoRecusa) return mostrarErro('Selecione o motivo da recusa.');
                    justificativa = observacao ? `${motivoRecusa}: ${observacao}` : motivoRecusa;
                }
                if (justificativa.length > 500) {
                    return mostrarErro('O texto passou de 500 caracteres.');
                }
                enviar(modoJustificativa, { justificativa });
                break;
            }

            case 'concluir':
                enviar('CONCLUIR');
                break;
        }
    });
}

async function carregarSolicitacoes() {
    const r = await api.solicitacoes();
    if (!r.ok) throw new Error('Não foi possível carregar as solicitações.');

    const solicitacoes = r.corpo ?? [];
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
        const dimensoes = (s.comprimentoMm && s.larguraMm && s.alturaMm)
            ? `${s.comprimentoMm} x ${s.larguraMm} x ${s.alturaMm} mm`
            : 'Não informadas';
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
                 data-dimensoes="${escaparHTML(dimensoes)}"
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
                            <strong>Dimensões da peça:</strong>
                            <span>${escaparHTML(dimensoes)}</span>
                        </p>

                        <p class="card-text">
                            <strong>Recebida em:</strong>
                            <span>${escaparHTML(data)}</span>
                        </p>
                    </div>

                    <div class="mt-auto">
                        <button type="button"
                            class="btn btn-outline-primary btn-sm w-100"
                            data-bs-toggle="modal"
                            data-bs-target="#modalSolicitacao">
                            Ver detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;

        lista.appendChild(card);
    });
}