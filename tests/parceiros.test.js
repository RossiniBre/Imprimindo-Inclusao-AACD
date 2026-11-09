import { describe, it, expect, beforeEach } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'
import {
  filtrarParceiros,
  contarImpressoras,
  contarPecas,
  plural,
  enderecoCurto,
} from '../public/pages/parceiros/parceiros.js'

const parceiros = [
  { id: 1, nome: 'Mackenzie', endereco: { cidade: 'São Paulo', uf: 'SP' } },
  { id: 2, nome: 'IMT Mauá', endereco: { cidade: 'São Caetano do Sul', uf: 'SP' } },
  { id: 3, nome: 'UFABC', endereco: null },
]

describe('parceiros', () => {
  it('busca por nome ou cidade, sem acento', () => {
    expect(filtrarParceiros(parceiros, 'maua').map((p) => p.id)).toEqual([2])
    expect(filtrarParceiros(parceiros, 'sao').map((p) => p.id)).toEqual([1, 2])
    expect(filtrarParceiros(parceiros, '')).toHaveLength(3)
  })

  it('conta impressoras por empresa a partir do painel da rede', () => {
    const painel = [
      { id: 1, empresa: { id: 1 } },
      { id: 2, empresa: { id: 1 } },
      { id: 3, empresa: { id: 2 } },
      { id: 4, empresa: null },
    ]
    expect(contarImpressoras(painel)).toEqual({ 1: 2, 2: 1 })
  })

  it('conta só pedidos concluídos, pelo nome da empresa', () => {
    const pedidos = [
      { status: 'CONCLUIDA', empresa: 'Mackenzie' },
      { status: 'CONCLUIDA', empresa: 'Mackenzie' },
      { status: 'PENDENTE', empresa: 'Mackenzie' },
      { status: 'CONCLUIDA', empresa: 'UFABC' },
      { status: 'CONCLUIDA', empresa: null },
    ]
    expect(contarPecas(pedidos)).toEqual({ Mackenzie: 2, UFABC: 1 })
  })

  it('plural e endereço curto', () => {
    expect(plural(1, 'impressora', 'impressoras')).toBe('1 impressora')
    expect(plural(3, 'impressora', 'impressoras')).toBe('3 impressoras')
    expect(enderecoCurto({ rua: 'Rua Vergueiro', numero: '1200', bairro: 'Liberdade', cidade: 'São Paulo', uf: 'SP' }))
      .toBe('Rua Vergueiro, 1200 · Liberdade · São Paulo, SP')
    expect(enderecoCurto(null)).toBe('')
  })
})

describe('parceiros: tela', () => {
  beforeEach(() => carregarHtml('parceiros', 'parceiros'))

  it('tem os três números da rede, a busca e o modal escondido', () => {
    expect(document.querySelector('#total-parceiros')).not.toBeNull()
    expect(document.querySelector('#total-impressoras')).not.toBeNull()
    expect(document.querySelector('#total-pecas')).not.toBeNull()
    expect(document.querySelector('#busca')).not.toBeNull()
    expect(document.querySelector('#modal-parceiro').hidden).toBe(true)
  })

  it('"+ Nova solicitação" leva para as impressoras da rede', () => {
    const link = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Nova solicitação'))
    expect(link.getAttribute('href')).toBe('#/impressoras-aacd')
  })
})
