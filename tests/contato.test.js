import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

const ok = (corpo) => Promise.resolve({ ok: true, status: 200, corpo })

vi.mock('../public/shared/js/api.js', () => ({
  api: {
    contatoAacd: vi.fn(() => ok({
      nome: 'Ana Martins', email: 'ana@aacd.org.br', setor: 'Impressão 3D', ramal: '2214',
    })),
  },
}))

import { api } from '../public/shared/js/api.js'
import { iniciar, CONTATO_AACD, linkDeEmail } from '../public/pages/contato/contato.js'

const $ = (seletor) => document.querySelector(seletor)
const esperar = () => new Promise((r) => setTimeout(r, 0))

async function abrir() {
  carregarHtml('contato', 'contato')
  iniciar($('#conteudo'))
  await vi.waitFor(() => expect($('#email').textContent).toBe('ana@aacd.org.br'))
}

// Para os casos em que o back não entrega o contato
async function abrirSemContato() {
  carregarHtml('contato', 'contato')
  iniciar($('#conteudo'))
  await vi.waitFor(() => expect(api.contatoAacd).toHaveBeenCalled())
  await esperar()
}

const cartaoDe = (seletor) => $(seletor).closest('.contato__cartao')

describe('contato: funções puras', () => {
  it('monta o link do Gmail com destinatário, assunto e texto', () => {
    const url = new URL(linkDeEmail({ para: 'a@aacd.org.br', assunto: 'Dúvida', corpo: 'Olá\nmundo' }))
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/')
    expect(url.searchParams.get('to')).toBe('a@aacd.org.br')
    expect(url.searchParams.get('su')).toBe('Dúvida')
    expect(url.searchParams.get('body')).toBe('Olá\nmundo')
    expect(new URL(linkDeEmail({ para: 'a@aacd.org.br' })).searchParams.has('su')).toBe(false)
  })
})

describe('contato: tela', () => {
  beforeEach(() => {
    location.hash = ''
    vi.clearAllMocks()
  })

  it('mostra telefone, horário e ramal da AACD', async () => {
    await abrir()
    expect($('#telefone').textContent).toBe(CONTATO_AACD.telefone)
    expect($('#telefone-horario').textContent).toBe(CONTATO_AACD.telefoneHorario)
    expect($('#telefone-ramal').textContent).toBe(`Ramal do projeto: ${CONTATO_AACD.ramal}`)
  })

  it('"Copiar número" copia o telefone', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await abrir()
    $('#copiar-telefone').click()
    await vi.waitFor(() => expect($('#copiar-telefone').textContent).toBe('Copiado!'))
    expect(writeText).toHaveBeenCalledWith(CONTATO_AACD.telefone)
  })

  it('e-mail do projeto e responsável vêm do back e viram links de e-mail', async () => {
    await abrir()
    expect(cartaoDe('#email').hidden).toBe(false)
    expect(cartaoDe('#responsavel').hidden).toBe(false)

    expect(new URL($('#escrever-email').href).searchParams.get('to')).toBe('ana@aacd.org.br')

    expect($('#responsavel').textContent).toBe('Ana Martins')
    expect($('#responsavel-setor').textContent).toBe('Impressão 3D')
    expect($('#responsavel-contato').textContent).toBe('ana@aacd.org.br · ramal 2214')
    expect($('#escrever-responsavel').textContent).toBe('Escrever para Ana')
    expect(new URL($('#escrever-responsavel').href).searchParams.get('to')).toBe('ana@aacd.org.br')
  })

  it('sem o contato do back, os cartões de e-mail e responsável ficam ocultos e o telefone continua', async () => {
    api.contatoAacd.mockImplementationOnce(() => Promise.reject(new Error('rede')))
    await abrirSemContato()
    expect(cartaoDe('#email').hidden).toBe(true)
    expect(cartaoDe('#responsavel').hidden).toBe(true)
    expect($('#telefone').textContent).toBe(CONTATO_AACD.telefone)
  })

  it('perfil sem nome ou sem e-mail não mostra os cartões', async () => {
    api.contatoAacd.mockImplementationOnce(() => ok({ nome: 'Ana Martins', email: '' }))
    await abrirSemContato()
    expect(cartaoDe('#email').hidden).toBe(true)
    expect(cartaoDe('#responsavel').hidden).toBe(true)
  })

  it('sessão expirada manda para o login', async () => {
    api.contatoAacd.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 401, corpo: null }))
    carregarHtml('contato', 'contato')
    iniciar($('#conteudo'))
    await vi.waitFor(() => expect(location.hash).toBe('#/login'))
  })

  it('explica a entrega: a plataforma não cuida de envios e a conversa é por e-mail ou telefone', async () => {
    await abrir()
    expect($('#titulo-entrega').textContent).toBe('Como funciona a entrega')
    expect($('#titulo-entrega').closest('section').textContent).toMatch(/não cuida de envios/)
    expect($('#retirada-endereco')).toBeNull()
    expect($('#ver-mapa')).toBeNull()
    expect($('#form-mensagem')).toBeNull()
  })

  it('tem dúvidas frequentes, todas fechadas no início', async () => {
    await abrir()
    const duvidas = [...document.querySelectorAll('.contato__duvida')]
    expect(duvidas.length).toBeGreaterThan(0)
    expect(duvidas.every((d) => d.querySelector('summary') && !d.open)).toBe(true)
  })
})