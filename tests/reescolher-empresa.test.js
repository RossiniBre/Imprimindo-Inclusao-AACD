import { describe, it, expect, beforeEach } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'
import {
  podeReenviar,
  textoReenvio,
  observacaoReenvio,
  STATUS_REENVIAVEIS,
} from '../public/pages/reescolher-empresa/reescolher-empresa.js'

describe('reescolher empresa', () => {
  it('só reenvia pedidos recusados, cancelados ou com falha', () => {
    expect(STATUS_REENVIAVEIS).toEqual(['RECUSADA', 'CANCELADA', 'FALHOU'])
    expect(podeReenviar({ status: 'RECUSADA' })).toBe(true)
    expect(podeReenviar({ status: 'FALHOU' })).toBe(true)
    expect(podeReenviar({ status: 'PENDENTE' })).toBe(false)
    expect(podeReenviar({ status: 'CONCLUIDA' })).toBe(false)
    expect(podeReenviar(null)).toBe(false)
  })

  it('monta o texto do rodapé com empresa, modelo e cidade', () => {
    expect(textoReenvio(null)).toMatch(/Escolha uma impressora/)
    expect(textoReenvio({ modelo: 'Ender 3', empresa: { nome: 'Nexa' }, cidade: 'São Paulo, SP' }))
      .toBe('Reenviando para Nexa · Ender 3 · São Paulo, SP · A empresa recebe um novo pedido.')
  })

  it('a observação registra que é um reenvio', () => {
    expect(observacaoReenvio(6505, '')).toBe('Reenvio do pedido 6505.')
    expect(observacaoReenvio(6505, ' Urgente. ')).toBe('Reenvio do pedido 6505. Urgente.')
  })
})

describe('reescolher empresa: tela', () => {
  beforeEach(() => carregarHtml('reescolher-empresa', 'reescolher-empresa'))

  it('começa com as colunas, o rodapé e o sucesso escondidos', () => {
    expect(document.querySelector('#colunas').hidden).toBe(true)
    expect(document.querySelector('#rodape').hidden).toBe(true)
    expect(document.querySelector('#sucesso').hidden).toBe(true)
    expect(document.querySelector('#botao-reenviar').disabled).toBe(true)
  })

  it('volta e cancela levam ao acompanhamento', () => {
    expect(document.querySelector('.voltar').getAttribute('href')).toBe('#/painel-aacd')
    const cancelar = [...document.querySelectorAll('a')].find((a) => a.textContent === 'Cancelar')
    expect(cancelar.getAttribute('href')).toBe('#/painel-aacd')
  })
})
