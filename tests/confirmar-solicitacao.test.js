import { describe, it, expect, beforeEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

vi.mock('../public/shared/js/api.js', () => ({
  api: {
    eu: vi.fn(() => Promise.resolve({ ok: true, status: 200, corpo: { perfil: 'FUNCIONARIO', nome: 'Ana Martins' } })),
    criarSolicitacao: vi.fn(() => Promise.resolve({ ok: true, status: 201, corpo: { id: 6605 } })),
  },
}))

import { api } from '../public/shared/js/api.js'
import {
  iniciar, linhasDoPedido, montarFormulario, mensagemDeErro,
} from '../public/pages/confirmar-solicitacao/confirmar-solicitacao.js'
import { rascunhoAtual, limparRascunho, salvarRascunho } from '../public/shared/js/rascunho-solicitacao.js'

const arquivo = new File([new Uint8Array(2048)], 'protese_mao_v2.stl')

const impressora = {
  id: 11, modelo: 'Ender 3 V2', disponibilidade: 'OCIOSA', ativo: true,
  empresa: { id: 1, nome: 'Mackenzie' }, cidade: 'São Paulo, SP',
  comprimentoMm: 220, larguraMm: 220, alturaMm: 250,
  materiais: [{ codigo: 'PLA' }, { codigo: 'PETG' }],
}

const pedido = {
  arquivo, titulo: 'Prótese de mão', prazo: '2026-12-15', material: 'PLA',
  comprimentoMm: 180, larguraMm: 95, alturaMm: 60, quantidade: 2,
  observacao: 'Peça infantil.', impressoraId: 11, impressora,
}

const $ = (seletor) => document.querySelector(seletor)

function abrir() {
  carregarHtml('confirmar-solicitacao', 'confirmar-solicitacao')
  iniciar($('#conteudo'))
}

describe('confirmar solicitação: funções puras', () => {
  it('monta as linhas de detalhe do pedido', () => {
    expect(linhasDoPedido(pedido)).toEqual([
      ['Nome da peça', 'Prótese de mão'],
      ['Arquivo', 'protese_mao_v2.stl (2 KB)'],
      ['Material', 'PLA'],
      ['Tamanho', '180 × 95 × 60 mm'],
      ['Quantidade', '2 peças'],
      ['Prazo desejado', '15/12/2026'],
      ['Observação', 'Peça infantil.'],
    ])
    const semOpcionais = linhasDoPedido({ ...pedido, prazo: '', observacao: '', quantidade: 1 })
    expect(semOpcionais.slice(4)).toEqual([
      ['Quantidade', '1 peça'],
      ['Prazo desejado', 'Sem prazo definido'],
      ['Observação', 'Nenhuma'],
    ])
  })

  it('monta o formulário com os campos que o back exige', () => {
    const fd = montarFormulario(pedido)
    expect(fd.get('titulo')).toBe('Prótese de mão')
    expect(fd.get('descricao')).toBe('Material: PLA. Prazo desejado: 15/12/2026. Peça infantil.')
    expect(fd.get('quantidade')).toBe('2')
    expect(fd.get('comprimentoMm')).toBe('180')
    expect(fd.get('larguraMm')).toBe('95')
    expect(fd.get('alturaMm')).toBe('60')
    expect(fd.get('impressoraId')).toBe('11')
    expect(fd.get('arquivo').name).toBe('protese_mao_v2.stl')
  })

  it('traduz as falhas do back', () => {
    expect(mensagemDeErro({ status: 413 })).toMatch(/50 MB/)
    expect(mensagemDeErro({ status: 403 })).toMatch(/funcionários/)
    expect(mensagemDeErro({ status: 400, corpo: { erro: 'Arquivo não enviado.' } })).toBe('Arquivo não enviado.')
    expect(mensagemDeErro({ status: 500 })).toMatch(/Não foi possível/)
  })
})

describe('confirmar solicitação: tela', () => {
  beforeEach(() => {
    limparRascunho()
    location.hash = ''
    vi.clearAllMocks()
  })

  it('sem rascunho volta ao passo 1; sem impressora, ao passo 2', () => {
    abrir()
    expect(location.hash).toBe('#/nova-solicitacao')

    salvarRascunho({ ...pedido, impressora: null })
    abrir()
    expect(location.hash).toBe('#/escolher-impressora')
    expect(api.criarSolicitacao).not.toHaveBeenCalled()
  })

  it('mostra os detalhes da impressora e da peça, com os passos 1 e 2 feitos', () => {
    salvarRascunho(pedido)
    abrir()

    const passos = [...document.querySelectorAll('.ns__passo')]
    expect(passos.map((p) => p.classList.contains('ns__passo--feito'))).toEqual([true, true, false])
    expect(passos[2].getAttribute('aria-current')).toBe('step')

    expect($('#imp-modelo').textContent).toBe('Ender 3 V2')
    expect($('#imp-local').textContent).toBe('Mackenzie · São Paulo, SP')
    expect($('#imp-chips').textContent).toMatch(/Livre.*Mesa 220 × 220 × 250 mm.*PLA.*PETG/)
    expect($('#dados').textContent).toMatch(/protese_mao_v2.stl/)
    expect($('#dados').textContent).toMatch(/Peça infantil\./)
    expect(document.querySelectorAll('#checagem li')).toHaveLength(3)
    expect($('#botao-confirmar').textContent).toBe('Confirmar solicitação')
    expect($('#sucesso').hidden).toBe(true)
  })

  it('"Confirmar solicitação" envia o pedido, mostra o número e apaga o rascunho', async () => {
    salvarRascunho(pedido)
    abrir()
    $('#botao-confirmar').click()
    expect($('#botao-confirmar').disabled).toBe(true)

    await vi.waitFor(() => expect($('#sucesso').hidden).toBe(false))
    expect(api.criarSolicitacao).toHaveBeenCalledTimes(1)
    expect(api.criarSolicitacao.mock.calls[0][0].get('impressoraId')).toBe('11')
    expect($('#sucesso-titulo').textContent).toBe('Pedido 6605 enviado!')
    expect($('#sucesso-texto').textContent).toMatch(/Mackenzie/)
    expect($('#revisao').hidden).toBe(true)
    expect(rascunhoAtual()).toBeNull()
  })

  it('se o back recusar, mostra o erro, mantém o rascunho e deixa tentar de novo', async () => {
    api.criarSolicitacao.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 400, corpo: { erro: 'Impressora indisponível.' } }))
    salvarRascunho(pedido)
    abrir()
    $('#botao-confirmar').click()

    await vi.waitFor(() => expect($('#erro-envio').hidden).toBe(false))
    expect($('#erro-envio').textContent).toBe('Impressora indisponível.')
    expect($('#botao-confirmar').disabled).toBe(false)
    expect($('#sucesso').hidden).toBe(true)
    expect(rascunhoAtual()).not.toBeNull()
  })

  it('sem conexão avisa e não perde o rascunho; sessão expirada manda para o login', async () => {
    api.criarSolicitacao.mockImplementationOnce(() => Promise.reject(new Error('rede')))
    salvarRascunho(pedido)
    abrir()
    $('#botao-confirmar').click()
    await vi.waitFor(() => expect($('#erro-envio').hidden).toBe(false))
    expect($('#erro-envio').textContent).toMatch(/Sem conexão/)
    expect(rascunhoAtual()).not.toBeNull()

    api.criarSolicitacao.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 401, corpo: null }))
    $('#botao-confirmar').click()
    await vi.waitFor(() => expect(location.hash).toBe('#/login'))
  })
})
