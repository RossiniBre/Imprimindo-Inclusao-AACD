import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

const ok = (corpo) => Promise.resolve({ ok: true, status: 200, corpo })

vi.mock('../public/shared/js/api.js', () => ({
  api: {
    perfilEmpresa: vi.fn(() => ok({ nome: 'Nexa Engenharia', email: 'pedidos@nexa.com.br', telefone: '(11) 4002-8922' })),
    solicitacoes: vi.fn(() => ok([
      { id: 6500, titulo: 'Órtese de punho', status: 'CONCLUIDA' },
      { id: 6502, titulo: 'Prótese de mão', status: 'PENDENTE' },
    ])),
  },
}))

import { api } from '../public/shared/js/api.js'
import {
  iniciar, CONTATO_AACD, ASSUNTOS, linkDeEmail, linkDoMapa, opcoesDePedidos, validarMensagem, montarEmail,
} from '../public/pages/contato/contato.js'

const $ = (seletor) => document.querySelector(seletor)
const enviar = () => $('#form-mensagem').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

async function abrir() {
  carregarHtml('contato', 'contato')
  iniciar($('#conteudo'))
  await vi.waitFor(() => expect($('#campo-pedido').options.length).toBe(3))
  await vi.waitFor(() => expect($('#resposta-para').hidden).toBe(false))
}

describe('contato: funções puras', () => {
  it('monta o link do Gmail com destinatário, assunto e texto', () => {
    const url = new URL(linkDeEmail({ para: 'a@aacd.org.br', assunto: 'Dúvida', corpo: 'Olá\nmundo' }))
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/')
    expect(url.searchParams.get('to')).toBe('a@aacd.org.br')
    expect(url.searchParams.get('su')).toBe('Dúvida')
    expect(url.searchParams.get('body')).toBe('Olá\nmundo')
    expect(new URL(linkDeEmail({ para: 'a@aacd.org.br' })).searchParams.has('su')).toBe(false)
  })

  it('monta o link do mapa a partir do endereço', () => {
    expect(new URL(linkDoMapa('Av. Exemplo, 1000 · São Paulo, SP')).searchParams.get('query'))
      .toBe('Av. Exemplo, 1000, São Paulo, SP')
  })

  it('lista os pedidos do mais novo para o mais antigo', () => {
    expect(opcoesDePedidos([{ id: 6500, titulo: 'Órtese' }, { id: 6502, titulo: 'Prótese de mão' }, { id: 6501 }]))
      .toEqual([
        { valor: '6502', rotulo: 'Pedido 6502 · Prótese de mão' },
        { valor: '6501', rotulo: 'Pedido 6501' },
        { valor: '6500', rotulo: 'Pedido 6500 · Órtese' },
      ])
    expect(opcoesDePedidos(null)).toEqual([])
  })

  it('valida a mensagem: obrigatória, mínimo e máximo', () => {
    expect(validarMensagem('  ')).toMatch(/Escreva/)
    expect(validarMensagem('oi')).toMatch(/pelo menos 10/)
    expect(validarMensagem('x'.repeat(1501))).toMatch(/máximo 1500/)
    expect(validarMensagem('Quando posso retirar a peça?')).toBeNull()
  })

  it('monta o e-mail com o número do pedido no assunto e a assinatura da empresa', () => {
    const empresa = { nome: 'Nexa Engenharia', email: 'pedidos@nexa.com.br', telefone: '(11) 4002-8922' }
    expect(montarEmail({ assunto: 'Dúvida sobre um pedido', pedido: 'Pedido 6502 · Prótese de mão', mensagem: ' Qual o prazo? ', empresa }))
      .toEqual({
        assunto: '[Pedido 6502] Dúvida sobre um pedido - Nexa Engenharia',
        corpo: 'Qual o prazo?\n\n--\nEmpresa: Nexa Engenharia\nPedido relacionado: 6502 · Prótese de mão\nResponder para: pedidos@nexa.com.br\nTelefone: (11) 4002-8922',
      })
    expect(montarEmail({ assunto: 'Outro assunto', mensagem: 'Olá, tudo bem?' }))
      .toEqual({ assunto: 'Outro assunto', corpo: 'Olá, tudo bem?\n\n--' })
  })
})

describe('contato: tela', () => {
  beforeEach(() => {
    location.hash = ''
    vi.clearAllMocks()
    window.open = vi.fn()
  })

  it('mostra os contatos da AACD, a retirada e os links', async () => {
    await abrir()
    expect($('#telefone').textContent).toBe(CONTATO_AACD.telefone)
    expect($('#email').textContent).toBe(CONTATO_AACD.email)
    expect($('#responsavel').textContent).toBe('Ana Martins')
    expect($('#escrever-responsavel').textContent).toBe('Escrever para Ana')
    expect($('#retirada-endereco').textContent).toBe(CONTATO_AACD.retirada.endereco)
    expect($('#escrever-email').href).toContain(encodeURIComponent(CONTATO_AACD.email))
    expect($('#escrever-responsavel').href).toContain(encodeURIComponent(CONTATO_AACD.responsavel.email))
    expect($('#ver-mapa').href).toMatch(/^https:\/\/www\.google\.com\/maps/)
  })

  it('"Copiar número" copia o telefone', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await abrir()
    $('#copiar-telefone').click()
    await vi.waitFor(() => expect($('#copiar-telefone').textContent).toBe('Copiado!'))
    expect(writeText).toHaveBeenCalledWith(CONTATO_AACD.telefone)
  })

  it('preenche assuntos, pedidos da empresa e o e-mail de resposta', async () => {
    await abrir()
    expect([...$('#campo-assunto').options].map((o) => o.value)).toEqual(ASSUNTOS)
    expect([...$('#campo-pedido').options].map((o) => o.textContent))
      .toEqual(['Nenhum pedido', 'Pedido 6502 · Prótese de mão', 'Pedido 6500 · Órtese de punho'])
    expect($('#resposta-email').textContent).toBe('pedidos@nexa.com.br')
  })

  it('não envia mensagem vazia ou curta demais', async () => {
    await abrir()
    enviar()
    expect($('#erro-mensagem').textContent).toMatch(/Escreva/)
    $('#campo-mensagem').value = 'oi'
    enviar()
    expect($('#erro-mensagem').textContent).toMatch(/pelo menos/)
    expect(window.open).not.toHaveBeenCalled()
    expect($('#aviso-envio').hidden).toBe(true)
  })

  it('"Enviar mensagem" abre o e-mail pronto para o projeto e avisa', async () => {
    await abrir()
    $('#campo-pedido').value = '6502'
    $('#campo-mensagem').value = 'Quando posso retirar a peça?'
    enviar()

    expect(window.open).toHaveBeenCalledTimes(1)
    const [endereco, alvo] = window.open.mock.calls[0]
    const url = new URL(endereco)
    expect(alvo).toBe('_blank')
    expect(url.searchParams.get('to')).toBe(CONTATO_AACD.email)
    expect(url.searchParams.get('su')).toBe('[Pedido 6502] Dúvida sobre um pedido - Nexa Engenharia')
    expect(url.searchParams.get('body')).toMatch(/^Quando posso retirar a peça\?/)
    expect(url.searchParams.get('body')).toMatch(/Responder para: pedidos@nexa\.com\.br/)
    expect($('#aviso-envio').hidden).toBe(false)
    expect($('#erro-mensagem').textContent).toBe('')
  })

  it('sem sessão vai para o login; sem pedidos e sem perfil a tela continua de pé', async () => {
    api.perfilEmpresa.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500, corpo: null }))
    api.solicitacoes.mockImplementationOnce(() => Promise.reject(new Error('rede')))
    carregarHtml('contato', 'contato')
    iniciar($('#conteudo'))
    await Promise.resolve()
    expect($('#resposta-para').hidden).toBe(true)
    expect($('#campo-pedido').options.length).toBe(1)
    expect($('#telefone').textContent).toBe(CONTATO_AACD.telefone)

    api.perfilEmpresa.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 401, corpo: null }))
    carregarHtml('contato', 'contato')
    iniciar($('#conteudo'))
    await vi.waitFor(() => expect(location.hash).toBe('#/login'))
  })
})
