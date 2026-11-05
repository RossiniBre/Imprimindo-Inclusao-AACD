import { describe, it, expect } from 'vitest'
import {
  agrupar,
  lerData,
  formatarDataHora,
  formatarData,
  duracao,
  tempoEsperando,
  progresso,
  diasParaSumir,
} from '../public/pages/painel-aacd/painel-aacd.js'

const lista = [
  { id: 1, status: 'PENDENTE' },
  { id: 2, status: 'EM_ANDAMENTO' },
  { id: 3, status: 'CONCLUIDA' },
  { id: 4, status: 'RECUSADA' },
  { id: 5, status: 'CANCELADA' },
  { id: 6, status: 'FALHOU' },
  { id: 7, status: 'INVENTADO' },
]

describe('painel da AACD', () => {
  it('separa os pedidos nas quatro seções pelo status do back', () => {
    const g = agrupar(lista)
    expect(g.esperando.map((p) => p.id)).toEqual([1])
    expect(g.imprimindo.map((p) => p.id)).toEqual([2])
    expect(g.prontas.map((p) => p.id)).toEqual([3])
    expect(g.recusadas.map((p) => p.id)).toEqual([4, 5, 6])
  })

  it('lê as datas do back como horário local', () => {
    const comHora = lerData('2026-10-14T16:30:00')
    expect(comHora.getDate()).toBe(14)
    expect(comHora.getHours()).toBe(16)

    const soDia = lerData('2026-11-10')
    expect(soDia.getDate()).toBe(10)
    expect(soDia.getHours()).toBe(23)

    expect(lerData(null)).toBeNull()
    expect(lerData('nada')).toBeNull()
  })

  it('formata data e hora no padrão da tela', () => {
    expect(formatarDataHora('2026-10-14T16:30:00')).toBe('14/10, 16h30')
    expect(formatarData('2026-10-05')).toBe('05/10')
    expect(formatarDataHora(null)).toBe('')
  })

  it('descreve durações em dias, horas e minutos', () => {
    const h = 3600000
    expect(duracao(27 * h)).toBe('1 dia e 3h')
    expect(duracao(48 * h)).toBe('2 dias')
    expect(duracao(5 * h + 10 * 60000)).toBe('5h10')
    expect(duracao(40 * 60000)).toBe('40 min')
    expect(duracao(10000)).toBe('menos de 1 min')
  })

  it('calcula há quanto tempo o pedido espera', () => {
    const agora = new Date(2026, 10, 3, 12, 0)
    expect(tempoEsperando('2026-11-02T09:00:00', agora)).toBe('Esperando há 1 dia e 3h')
  })

  it('calcula o progresso entre a aceitação e o prazo estimado', () => {
    const agora = new Date(2026, 10, 6, 0, 0)
    const p = progresso('2026-11-01T00:00:00', '2026-11-11', agora)
    expect(p.porcentagem).toBeGreaterThanOrEqual(40)
    expect(p.porcentagem).toBeLessThanOrEqual(50)
    expect(p.texto).toMatch(/^faltam cerca de /)

    const atrasado = progresso('2026-11-01T00:00:00', '2026-11-02', new Date(2026, 10, 5))
    expect(atrasado.porcentagem).toBe(100)
    expect(atrasado.texto).toMatch(/^prazo passou há /)

    expect(progresso('2026-11-01T00:00:00', null, agora)).toBeNull()
  })

  it('conta os dias até o pedido sumir da lista', () => {
    expect(diasParaSumir('2026-10-01T00:00:00', 60, new Date(2026, 9, 11, 0, 0))).toBe(50)
    expect(diasParaSumir('2026-01-01T00:00:00', 60, new Date(2026, 10, 3))).toBe(0)
    expect(diasParaSumir(null)).toBeNull()
  })
})
