import { describe, it, expect, beforeEach } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'
import {
  filtrarDoacoes,
  ordenarDoacoes,
  contarPorTipo,
  numeroDoacao,
  resumoItens,
} from '../public/pages/doacoes/doacoes.js'

const doacoes = [
  { id: 1, tipo: 'FILAMENTO', quantidade: 10, dataManifestacao: '2026-11-09T10:00:00Z' },
  { id: 2, tipo: 'IMPRESSORA', quantidade: 1, dataManifestacao: '2026-11-09T12:00:00Z' },
  { id: 3, tipo: 'AMBOS', quantidade: 2, dataManifestacao: null },
]

describe('doações', () => {
  it('filtra por tipo; vazio devolve tudo', () => {
    expect(filtrarDoacoes(doacoes, 'AMBOS').map((d) => d.id)).toEqual([3])
    expect(filtrarDoacoes(doacoes, '')).toHaveLength(3)
  })

  it('ordena as mais recentes primeiro e deixa sem data por último', () => {
    expect(ordenarDoacoes(doacoes).map((d) => d.id)).toEqual([2, 1, 3])
  })

  it('conta por tipo (e o total em "")', () => {
    expect(contarPorTipo(doacoes)).toEqual({ '': 3, IMPRESSORA: 1, FILAMENTO: 1, AMBOS: 1 })
  })

  it('numera a doação com quatro dígitos e resume os itens', () => {
    expect(numeroDoacao(231)).toBe('0231')
    expect(resumoItens(doacoes[0])).toBe('10 unidades · Filamento')
    expect(resumoItens(doacoes[1])).toBe('1 unidade · Impressora')
    expect(resumoItens(doacoes[2])).toBe('2 unidades · Impressora + Filamento')
  })
})

describe('doações: tela', () => {
  beforeEach(() => carregarHtml('doacoes', 'doacoes'))

  it('tem os quatro filtros e o modal escondido', () => {
    const tipos = [...document.querySelectorAll('.filtro')].map((f) => f.dataset.tipo)
    expect(tipos).toEqual(['', 'IMPRESSORA', 'FILAMENTO', 'AMBOS'])
    expect(document.querySelector('#modal-doacao').hidden).toBe(true)
  })

  it('o aceite pede confirmação antes de chamar o back', () => {
    expect(document.querySelector('#botao-aceitar')).not.toBeNull()
    expect(document.querySelector('#modal-confirmar').hidden).toBe(true)
    expect(document.querySelector('#botao-confirmar')).not.toBeNull()
  })
})
