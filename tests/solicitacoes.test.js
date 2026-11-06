
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { iniciar } from '../public/pages/Solicitacoes-empresa/solicitacoes.js'

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
      impressora: 'Prusa',
    },
    {
      id: 3,
      titulo: 'Prótese infantil',
      status: 'RECUSADA',
    },
    {
      id: 4,
      titulo: 'Peça de reposição',
      status: 'FALHOU',
    }
  ]

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
          <span data-campo="titulo"></span>
          <span data-campo="criadoPor"></span>
          <span data-campo="statusTexto"></span>

          <input name="pedido">
          <input name="impressora">
        </div>
      </main>
    `

    container = document.getElementById('conteudo')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => solicitacoesExemplo
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  async function aguardarCarregamento() {
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.pedido').length).toBeGreaterThan(0)
    })
  }

  it('carrega as solicitações da API', async () => {
    iniciar(container)

    await aguardarCarregamento()

    expect(fetch).toHaveBeenCalledWith('/api/solicitacoes', {
      method: 'GET',
      credentials: 'include'
    })

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

    expect(primeiroPedido.textContent).toContain('João')
    expect(primeiroPedido.textContent).toContain('Ender 3')
    expect(primeiroPedido.textContent).toContain('200 x 100 x 50')
    expect(primeiroPedido.textContent).toContain('Pendente')
  })

  it('mostra os botões de aceitar e recusar apenas para solicitações pendentes', async () => {
    iniciar(container)

    await aguardarCarregamento()

    const pedidos = document.querySelectorAll('.pedido')

    expect(pedidos[0].querySelector('[data-acao="aceitar"]')).not.toBeNull()
    expect(pedidos[0].querySelector('[data-acao="recusar"]')).not.toBeNull()

    expect(pedidos[1].querySelector('[data-acao="aceitar"]')).toBeNull()
    expect(pedidos[1].querySelector('[data-acao="recusar"]')).toBeNull()

    expect(pedidos[1].textContent).toContain('Ver detalhes')
  })

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

  it('preenche os dados do modal com a solicitação selecionada', async () => {
    iniciar(container)

    await aguardarCarregamento()

    const pedido = document.querySelector('.pedido')
    const botao = pedido.querySelector('[data-acao="aceitar"]')

    const modal = document.querySelector('.modal')
    const evento = new Event('show.bs.modal')

    Object.defineProperty(evento, 'relatedTarget', {
      value: botao
    })

    modal.dispatchEvent(evento)

    expect(modal.querySelector('[data-campo="titulo"]').textContent)
      .toBe('Prótese de braço')

    expect(modal.querySelector('[data-campo="criadoPor"]').textContent)
      .toBe('João')

    expect(modal.querySelector('[data-campo="statusTexto"]').textContent)
      .toBe('Pendente')

    expect(modal.querySelector('[name="pedido"]').value).toBe('1')
    expect(modal.querySelector('[name="impressora"]').value).toBe('Ender 3')
  })

  it('mostra o estado vazio quando não existem solicitações', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

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
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 5,
        titulo: '<img src=x onerror=alert(1)>',
        status: 'PENDENTE',
        criadoPor: '<script>alert(1)</script>'
      }]
    })

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

    fetch.mockResolvedValueOnce({
      ok: false
    })

    iniciar(container)

    await vi.waitFor(() => {
      expect(erro).toHaveBeenCalledWith(
        'Erro ao carregar solicitações:',
        expect.any(Error)
      )
    })
  })
})