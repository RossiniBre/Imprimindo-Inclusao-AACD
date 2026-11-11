import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { iniciar } from '../public/pages/Solicitacoes-empresa/solicitacoes.js'
import { api } from '../public/shared/js/api.js'

vi.mock('../public/shared/js/api.js', () => ({
  api: {
    solicitacoes: vi.fn(),
    detalheSolicitacaoEmpresa: vi.fn(),
    responderSolicitacao: vi.fn()
  }
}))

describe('tela de solicitações', () => {
  let container

  const solicitacoesExemplo = [
    {
      id: 1,
      titulo: 'Prótese de braço',
      status: 'PENDENTE',
      criadoPor: 'João',
      impressora: 'Ender 3',
      comprimentoMm: 200,
      larguraMm: 100,
      alturaMm: 50,
      criadoEm: '2026-11-01T10:00:00'
    },
    {
      id: 2,
      titulo: 'Órtese de perna',
      status: 'EM_ANDAMENTO',
      criadoPor: 'Maria',
      impressora: 'Prusa'
    },
    {
      id: 3,
      titulo: 'Prótese infantil',
      status: 'RECUSADA'
    },
    {
      id: 4,
      titulo: 'Peça de reposição',
      status: 'FALHOU'
    }
  ]

  const ok = corpo => ({ ok: true, status: 200, corpo })

  beforeEach(() => {
    document.body.innerHTML = `
      <main id="conteudo">
        <button class="filtro active" data-status="todos">Todos</button>
        <button class="filtro" data-status="pendente">Pendentes</button>
        <button class="filtro" data-status="aceita">Aceitos</button>
        <button class="filtro" data-status="recusada">Recusados</button>

        <span id="total-recebidos"></span>
        <span id="total-pendentes"></span>
        <span id="total-aceitos"></span>
        <span id="total-recusados"></span>
        <span id="total-falhados"></span>

        <div id="estado-vazio" class="d-none">
          Nenhuma solicitação encontrada.
        </div>

        <div id="lista-solicitacoes"></div>

        <div class="modal" id="modalSolicitacao">
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          <h5 data-modal-titulo></h5>
          <p data-modal-subtitulo></p>
          <span data-status-chip></span>
          <div data-erro class="d-none"></div>

          <span data-campo="titulo"></span>
          <span data-campo="criadoPor"></span>
          <span data-campo="statusTexto"></span>

          <div data-painel="detalhes">
            <div data-linha="quantidade"><span data-detalhe="quantidade"></span></div>
            <div data-linha="nomeArquivo"><span data-detalhe="nomeArquivo"></span></div>
            <a data-arquivo-link class="d-none"></a>
            <div data-linha="descricao"><span data-detalhe="descricao"></span></div>
            <div data-linha="prazoEstimado"><span data-detalhe="prazoEstimado"></span></div>
            <div data-linha="justificativa"><span data-detalhe="justificativa"></span></div>
            <div data-linha="historico"><ul data-detalhe="historico"></ul></div>
          </div>

          <div data-painel="prazo" class="d-none">
            <dl>
              <dt>Impressora</dt><dd data-aceite="impressora"></dd>
              <dt>Peça</dt><dd data-aceite="peca"></dd>
            </dl>
            <ul data-checks></ul>
            <input id="campoPrazo" type="date">
          </div>

          <div data-painel="justificativa" class="d-none">
            <div data-grupo-motivos>
              <button type="button" data-motivo="Sem material">Sem material</button>
              <button type="button" data-motivo="Sem capacidade">Sem capacidade</button>
            </div>
            <label data-rotulo-justificativa></label>
            <small data-ajuda-justificativa></small>
            <textarea id="campoJustificativa"></textarea>
            <p data-aviso-justificativa></p>
          </div>

          <div class="modal-footer" data-rodape="detalhes">
            <button type="button" data-acao="ir-prazo">Aceitar</button>
            <button type="button" data-acao="ir-recusar">Recusar</button>
            <button type="button" data-acao="ir-falhar">Falhou</button>
            <button type="button" data-acao="concluir">Concluir</button>
          </div>
          <div class="modal-footer d-none" data-rodape="prazo">
            <button type="button" data-acao="voltar">Voltar</button>
            <button type="button" data-acao="confirmar-aceite">Confirmar</button>
          </div>
          <div class="modal-footer d-none" data-rodape="justificativa">
            <button type="button" data-acao="voltar">Voltar</button>
            <button type="button" data-acao="confirmar-justificativa">Confirmar</button>
          </div>
        </div>
      </main>
    `

    container = document.getElementById('conteudo')

    api.solicitacoes.mockReset()
    api.detalheSolicitacaoEmpresa.mockReset()
    api.responderSolicitacao.mockReset()

    api.solicitacoes.mockResolvedValue(ok(solicitacoesExemplo))
    api.detalheSolicitacaoEmpresa.mockResolvedValue(ok({}))
    api.responderSolicitacao.mockResolvedValue(ok({}))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  async function aguardarCarregamento() {
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.pedido').length).toBeGreaterThan(0)
    })
  }

  // Dispara o evento do Bootstrap como se o botão "Ver detalhes" do card tivesse sido clicado
  function abrirModal(indice = 0) {
    const botao = document
      .querySelectorAll('.pedido')[indice]
      .querySelector('[data-bs-toggle="modal"]')

    const modal = document.querySelector('.modal')
    const evento = new Event('show.bs.modal')
    Object.defineProperty(evento, 'relatedTarget', { value: botao })
    modal.dispatchEvent(evento)

    return modal
  }

  const clicar = (modal, acao) => modal.querySelector(`[data-acao="${acao}"]`).click()
  const erroVisivel = modal => modal.querySelector('[data-erro]')

  describe('lista', () => {
    it('carrega as solicitações da API', async () => {
      iniciar(container)

      await aguardarCarregamento()

      expect(api.solicitacoes).toHaveBeenCalledTimes(1)
      expect(document.querySelectorAll('.pedido')).toHaveLength(4)
    })

    it('atualiza corretamente os contadores dos filtros', async () => {
      iniciar(container)

      await aguardarCarregamento()

      expect(document.getElementById('total-recebidos').textContent).toBe('4')
      expect(document.getElementById('total-pendentes').textContent).toBe('1')
      expect(document.getElementById('total-aceitos').textContent).toBe('1')
      expect(document.getElementById('total-recusados').textContent).toBe('1')
      expect(document.getElementById('total-falhados').textContent).toBe('1')
    })

    it('renderiza os dados das solicitações nos cards', async () => {
      iniciar(container)

      await aguardarCarregamento()

      const primeiroPedido = document.querySelector('.pedido')

      expect(primeiroPedido.dataset.pedido).toBe('1')
      expect(primeiroPedido.dataset.impressora).toBe('Ender 3')
      expect(primeiroPedido.dataset.status).toBe('pendente')
      expect(primeiroPedido.dataset.titulo).toBe('Prótese de braço')
      expect(primeiroPedido.dataset.dimensoes).toBe('200 x 100 x 50 mm')

      expect(primeiroPedido.textContent).toContain('João')
      expect(primeiroPedido.textContent).toContain('Ender 3')
      expect(primeiroPedido.textContent).toContain('200 x 100 x 50')
      expect(primeiroPedido.textContent).toContain('Pendente')
    })

    it('usa textos padrão quando a API não envia todos os campos', async () => {
      iniciar(container)

      await aguardarCarregamento()

      const semDados = document.querySelectorAll('.pedido')[2]

      expect(semDados.textContent).toContain('Não informado')
      expect(semDados.textContent).toContain('Não informadas')
      expect(semDados.textContent).toContain('Não informada')
      expect(semDados.textContent).toContain('Recusada')
    })

    it('mostra o botão "Ver detalhes" que abre o modal em todos os cards', async () => {
      iniciar(container)

      await aguardarCarregamento()

      document.querySelectorAll('.pedido').forEach(pedido => {
        const botao = pedido.querySelector('[data-bs-toggle="modal"]')

        expect(botao).not.toBeNull()
        expect(botao.dataset.bsTarget).toBe('#modalSolicitacao')
        expect(botao.textContent).toContain('Ver detalhes')
      })
    })

    it('mostra o estado vazio quando não existem solicitações', async () => {
      api.solicitacoes.mockResolvedValueOnce(ok([]))

      iniciar(container)

      await vi.waitFor(() => {
        expect(document.getElementById('total-recebidos').textContent).toBe('0')
      })

      expect(document.querySelectorAll('.pedido')).toHaveLength(0)
      expect(document.getElementById('estado-vazio').classList.contains('d-none'))
        .toBe(false)
    })

    it('oculta o estado vazio quando existem solicitações', async () => {
      iniciar(container)

      await aguardarCarregamento()

      expect(document.getElementById('estado-vazio').classList.contains('d-none'))
        .toBe(true)
    })

    it('escapa conteúdo HTML recebido da API', async () => {
      api.solicitacoes.mockResolvedValueOnce(ok([{
        id: 5,
        titulo: '<img src=x onerror=alert(1)>',
        status: 'PENDENTE',
        criadoPor: '<script>alert(1)</script>'
      }]))

      iniciar(container)

      await aguardarCarregamento()

      const pedido = document.querySelector('.pedido')

      expect(pedido.querySelector('img')).toBeNull()
      expect(pedido.querySelector('script')).toBeNull()
      expect(pedido.textContent).toContain('<img src=x onerror=alert(1)>')
    })

    it('não atualiza os contadores de falhas se o elemento não existir', async () => {
      document.getElementById('total-falhados').remove()

      expect(() => iniciar(container)).not.toThrow()

      await aguardarCarregamento()

      expect(document.getElementById('total-recebidos').textContent).toBe('4')
    })

    it('registra erro quando a API retorna uma resposta inválida', async () => {
      const erro = vi.spyOn(console, 'error').mockImplementation(() => {})

      api.solicitacoes.mockResolvedValueOnce({ ok: false, status: 500 })

      iniciar(container)

      await vi.waitFor(() => {
        expect(erro).toHaveBeenCalledWith(
          'Erro ao carregar solicitações:',
          expect.any(Error)
        )
      })
    })
  })

  describe('filtros', () => {
    it('filtra as solicitações pelo status selecionado', async () => {
      iniciar(container)

      await aguardarCarregamento()

      const filtroPendentes = document.querySelector('[data-status="pendente"]')
      const filtroAceitos = document.querySelector('[data-status="aceita"]')
      const colunas = document.querySelectorAll('#lista-solicitacoes > .col')

      filtroPendentes.click()

      expect(filtroPendentes.classList.contains('active')).toBe(true)
      expect(filtroAceitos.classList.contains('active')).toBe(false)

      expect(colunas[0].style.display).toBe('')
      expect(colunas[1].style.display).toBe('none')
      expect(colunas[2].style.display).toBe('none')
      expect(colunas[3].style.display).toBe('none')

      filtroAceitos.click()

      expect(filtroAceitos.classList.contains('active')).toBe(true)
      expect(colunas[0].style.display).toBe('none')
      expect(colunas[1].style.display).toBe('')
    })

    it('mostra todas as solicitações ao selecionar o filtro todos', async () => {
      iniciar(container)

      await aguardarCarregamento()

      document.querySelector('[data-status="pendente"]').click()
      document.querySelector('[data-status="todos"]').click()

      const colunas = document.querySelectorAll('#lista-solicitacoes > .col')

      colunas.forEach(coluna => {
        expect(coluna.style.display).toBe('')
      })
    })
  })

  describe('modal', () => {
    it('preenche os dados do modal com a solicitação selecionada', async () => {
      iniciar(container)

      await aguardarCarregamento()

      const modal = abrirModal(0)

      expect(modal.querySelector('[data-campo="titulo"]').textContent)
        .toBe('Prótese de braço')
      expect(modal.querySelector('[data-campo="criadoPor"]').textContent)
        .toBe('João')
      expect(modal.querySelector('[data-campo="statusTexto"]').textContent)
        .toBe('Pendente')
      expect(modal.querySelector('[data-modal-titulo]').textContent)
        .toBe('Detalhes da solicitação')
      expect(modal.querySelector('[data-modal-subtitulo]').textContent)
        .toBe('Solicitação #1')
      expect(modal.querySelector('[data-status-chip]').dataset.status)
        .toBe('pendente')

      await vi.waitFor(() => {
        expect(api.detalheSolicitacaoEmpresa).toHaveBeenCalledWith('1')
      })
    })

    it('mostra os detalhes retornados pela API', async () => {
      api.detalheSolicitacaoEmpresa.mockResolvedValue(ok({
        quantidade: 3,
        nomeArquivo: 'braco.stl',
        descricao: 'Prótese para criança',
        prazoEstimado: '2026-12-15',
        historico: [
          { de: null, para: 'PENDENTE', data: '2026-11-01T10:00:00' },
          { de: 'PENDENTE', para: 'EM_ANDAMENTO', observacao: 'ok', data: '2026-11-02T10:00:00' }
        ]
      }))

      iniciar(container)

      await aguardarCarregamento()

      const modal = abrirModal(0)

      await vi.waitFor(() => {
        expect(modal.querySelector('[data-detalhe="quantidade"]').textContent).toBe('3')
      })

      expect(modal.querySelector('[data-detalhe="nomeArquivo"]').textContent).toBe('braco.stl')
      expect(modal.querySelector('[data-detalhe="descricao"]').textContent)
        .toBe('Prótese para criança')
      expect(modal.querySelector('[data-detalhe="prazoEstimado"]').textContent)
        .toBe('15/12/2026')

      const link = modal.querySelector('[data-arquivo-link]')
      expect(link.classList.contains('d-none')).toBe(false)
      expect(link.getAttribute('href')).toBe('/api/solicitacao/arquivo?id=1')
      expect(link.getAttribute('download')).toBe('braco.stl')

      const itens = modal.querySelectorAll('[data-detalhe="historico"] li')
      expect(itens).toHaveLength(2)
      expect(itens[0].textContent).toContain('Pendente')
      expect(itens[1].textContent).toContain('Pendente → Em andamento: ok')

      // linha sem valor continua escondida
      expect(modal.querySelector('[data-linha="justificativa"]').classList.contains('d-none'))
        .toBe(true)
    })

    it('mostra erro quando os detalhes não carregam', async () => {
      api.detalheSolicitacaoEmpresa.mockResolvedValue({
        ok: false,
        status: 500,
        corpo: { erro: 'Falha no servidor' }
      })

      iniciar(container)

      await aguardarCarregamento()

      const modal = abrirModal(0)

      await vi.waitFor(() => {
        expect(erroVisivel(modal).textContent).toBe('Falha no servidor')
      })

      expect(erroVisivel(modal).classList.contains('d-none')).toBe(false)
    })

    it('confirma que a peça cabe na impressora', async () => {
      api.detalheSolicitacaoEmpresa.mockResolvedValue(ok({
        impressora: { modelo: 'Ender 3', comprimentoMm: 220, larguraMm: 220, alturaMm: 250 }
      }))

      iniciar(container)

      await aguardarCarregamento()

      const modal = abrirModal(0)

      await vi.waitFor(() => {
        expect(modal.querySelector('[data-checks]').textContent).toContain('A peça cabe')
      })

      expect(modal.querySelector('[data-acao="confirmar-aceite"]').disabled).toBe(false)
    })

    it('bloqueia o aceite quando a peça não cabe na impressora', async () => {
      api.detalheSolicitacaoEmpresa.mockResolvedValue(ok({
        impressora: { modelo: 'Ender 3', comprimentoMm: 100, larguraMm: 100, alturaMm: 100 }
      }))

      iniciar(container)

      await aguardarCarregamento()

      const modal = abrirModal(0)

      await vi.waitFor(() => {
        expect(modal.querySelector('[data-checks]').textContent).toContain('não cabe')
      })

      expect(modal.querySelector('[data-acao="confirmar-aceite"]').disabled).toBe(true)
    })
  })

  describe('ações do modal', () => {
    async function abrirComDetalhesCarregados() {
      api.detalheSolicitacaoEmpresa.mockResolvedValue(ok({
        impressora: { modelo: 'Ender 3', comprimentoMm: 220, larguraMm: 220, alturaMm: 250 }
      }))

      iniciar(container)
      await aguardarCarregamento()

      const modal = abrirModal(0)

      await vi.waitFor(() => {
        expect(modal.querySelector('[data-checks]').textContent).toContain('A peça cabe')
      })

      return modal
    }

    it('exige o prazo para aceitar a solicitação', async () => {
      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'ir-prazo')

      expect(modal.querySelector('[data-modal-titulo]').textContent)
        .toBe('Aceitar solicitação')

      clicar(modal, 'confirmar-aceite')

      expect(erroVisivel(modal).textContent).toBe('Informe o prazo estimado.')
      expect(api.responderSolicitacao).not.toHaveBeenCalled()
    })

    it('aceita a solicitação com o prazo informado e recarrega a lista', async () => {
      const modal = await abrirComDetalhesCarregados()
      const fechou = vi.fn()
      modal.querySelector('[data-bs-dismiss="modal"]').addEventListener('click', fechou)

      clicar(modal, 'ir-prazo')
      modal.querySelector('#campoPrazo').value = '2026-12-01'
      clicar(modal, 'confirmar-aceite')

      await vi.waitFor(() => {
        expect(api.responderSolicitacao).toHaveBeenCalledWith({
          id: '1',
          decisao: 'ACEITAR',
          prazo: '2026-12-01'
        })
      })

      await vi.waitFor(() => {
        expect(api.solicitacoes).toHaveBeenCalledTimes(2)
      })

      expect(fechou).toHaveBeenCalled()
    })

    it('mostra o erro da API e atualiza a lista quando o status mudou (409)', async () => {
      api.responderSolicitacao.mockResolvedValue({
        ok: false,
        status: 409,
        corpo: { erro: 'A solicitação foi cancelada.' }
      })

      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'ir-prazo')
      modal.querySelector('#campoPrazo').value = '2026-12-01'
      clicar(modal, 'confirmar-aceite')

      await vi.waitFor(() => {
        expect(erroVisivel(modal).textContent).toBe('A solicitação foi cancelada.')
      })

      expect(api.solicitacoes).toHaveBeenCalledTimes(2)
    })

    it('exige o motivo para recusar a solicitação', async () => {
      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'ir-recusar')

      expect(modal.querySelector('[data-modal-titulo]').textContent)
        .toBe('Recusar solicitação')

      clicar(modal, 'confirmar-justificativa')

      expect(erroVisivel(modal).textContent).toBe('Selecione o motivo da recusa.')
      expect(api.responderSolicitacao).not.toHaveBeenCalled()
    })

    it('recusa a solicitação com motivo e observação', async () => {
      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'ir-recusar')

      const chip = modal.querySelector('[data-motivo="Sem material"]')
      chip.click()
      expect(chip.classList.contains('ativo')).toBe(true)
      expect(chip.getAttribute('aria-checked')).toBe('true')

      modal.querySelector('#campoJustificativa').value = 'sem PETG até dia 20'
      clicar(modal, 'confirmar-justificativa')

      await vi.waitFor(() => {
        expect(api.responderSolicitacao).toHaveBeenCalledWith({
          id: '1',
          decisao: 'RECUSAR',
          justificativa: 'Sem material: sem PETG até dia 20'
        })
      })
    })

    it('rejeita justificativas acima de 500 caracteres', async () => {
      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'ir-falhar')

      expect(modal.querySelector('[data-modal-titulo]').textContent).toBe('Informar falha')

      modal.querySelector('#campoJustificativa').value = 'a'.repeat(501)
      clicar(modal, 'confirmar-justificativa')

      expect(erroVisivel(modal).textContent).toBe('O texto passou de 500 caracteres.')
      expect(api.responderSolicitacao).not.toHaveBeenCalled()
    })

    it('volta para o painel de detalhes', async () => {
      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'ir-prazo')
      expect(modal.querySelector('[data-painel="prazo"]').classList.contains('d-none'))
        .toBe(false)

      modal.querySelector('[data-rodape="prazo"] [data-acao="voltar"]').click()

      expect(modal.querySelector('[data-painel="detalhes"]').classList.contains('d-none'))
        .toBe(false)
      expect(modal.querySelector('[data-painel="prazo"]').classList.contains('d-none'))
        .toBe(true)
    })

    it('conclui a solicitação', async () => {
      const modal = await abrirComDetalhesCarregados()

      clicar(modal, 'concluir')

      await vi.waitFor(() => {
        expect(api.responderSolicitacao).toHaveBeenCalledWith({
          id: '1',
          decisao: 'CONCLUIR'
        })
      })
    })
  })
}) 