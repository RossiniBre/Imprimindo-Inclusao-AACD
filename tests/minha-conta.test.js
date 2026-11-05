import { describe, it, expect } from 'vitest'
import {
  iniciais,
  nomeFuncao,
  meusPedidos,
  estatisticas,
  recentes,
  rotuloStatus,
  formatarData,
} from '../public/pages/minha-conta/minha-conta.js'

const pedidos = [
  { id: 6502, titulo: 'Prótese de mão', status: 'EM_ANDAMENTO', criadoPor: 'Ana Martins', criadoEm: '2026-10-15T09:00:00' },
  { id: 6498, titulo: 'Órtese de punho', status: 'CONCLUIDA', criadoPor: 'ana martins ', criadoEm: '2026-10-12T09:00:00' },
  { id: 6511, titulo: 'Prótese infantil', status: 'PENDENTE', criadoPor: 'Ana Martins', criadoEm: '2026-10-20T09:00:00' },
  { id: 6505, titulo: 'Prótese infantil', status: 'RECUSADA', criadoPor: 'Ana Martins', criadoEm: '2026-10-01T09:00:00' },
  { id: 6500, titulo: 'Prótese infantil', status: 'FALHOU', criadoPor: 'Ana Martins', criadoEm: '2026-09-28T09:00:00' },
  { id: 6490, titulo: 'Órtese', status: 'CANCELADA', criadoPor: 'Ana Martins', criadoEm: '2026-09-20T09:00:00' },
  { id: 6503, titulo: 'Outro', status: 'PENDENTE', criadoPor: 'Diego Ramos', criadoEm: '2026-10-16T09:00:00' },
]

describe('meu perfil', () => {
  it('monta as iniciais e o nome da função', () => {
    expect(iniciais('Ana Martins')).toBe('AM')
    expect(iniciais('')).toBe('?')
    expect(nomeFuncao('ADMIN')).toBe('Admin')
    expect(nomeFuncao('FUNCIONARIO')).toBe('Funcionário')
  })

  it('separa os pedidos criados por mim, ignorando caixa e espaços', () => {
    expect(meusPedidos(pedidos, 'Ana Martins').map((p) => p.id)).toEqual([6502, 6498, 6511, 6505, 6500, 6490])
    expect(meusPedidos(pedidos, '')).toEqual([])
    expect(meusPedidos(pedidos, undefined)).toEqual([])
  })

  it('calcula os contadores do resumo', () => {
    expect(estatisticas(meusPedidos(pedidos, 'Ana Martins'))).toEqual({
      enviados: 6, imprimindo: 1, aguardando: 1, recusados: 2,
    })
  })

  it('lista os mais recentes primeiro, no máximo 5', () => {
    expect(recentes(meusPedidos(pedidos, 'Ana Martins')).map((p) => p.id)).toEqual([6511, 6505, 6502, 6500, 6498])
    expect(recentes(pedidos, 2).map((p) => p.id)).toEqual([6511, 6505])
  })

  it('traduz o status para o chip da tabela', () => {
    expect(rotuloStatus('PENDENTE')).toEqual({ texto: 'Aguardando resposta', classe: 'chip--destaque' })
    expect(rotuloStatus('CONCLUIDA').texto).toBe('Pronta')
    expect(rotuloStatus('FALHOU').classe).toBe('chip--erro')
    expect(rotuloStatus('X').texto).toBe('X')
  })

  it('formata a data como dia/mês', () => {
    expect(formatarData('2026-10-14T16:30:00')).toBe('14/10')
    expect(formatarData(null)).toBe('')
  })
})

import { estatisticasEquipe, equipeRecente, descricaoFuncao } from '../public/pages/minha-conta/minha-conta.js'

const equipe = [
  { id: 1, nome: 'Ana Martins', perfil: 'ADMIN', ativo: true },
  { id: 2, nome: 'Fernanda Lopes', perfil: 'ADMIN', ativo: true },
  { id: 3, nome: 'Diego Ramos', perfil: 'FUNCIONARIO', ativo: true },
  { id: 4, nome: 'Henrique Alves', perfil: 'FUNCIONARIO', ativo: false },
  { id: 5, nome: 'Marcos Vieira', perfil: 'FUNCIONARIO', ativo: false },
  { id: 6, nome: 'Patrícia Lima', perfil: 'FUNCIONARIO', ativo: true },
  { id: 7, nome: 'Bruno Teixeira', perfil: 'FUNCIONARIO', ativo: true },
]

describe('meu perfil (admin)', () => {
  it('resume a equipe para o painel', () => {
    expect(estatisticasEquipe(equipe)).toEqual({ ativos: 3, inativos: 2, admins: 2 })
    expect(estatisticasEquipe([])).toEqual({ ativos: 0, inativos: 0, admins: 0 })
  })

  it('lista os últimos adicionados primeiro, no máximo 5', () => {
    expect(equipeRecente(equipe).map((f) => f.id)).toEqual([7, 6, 5, 4, 3])
  })

  it('descreve a função do admin', () => {
    expect(descricaoFuncao('ADMIN')).toMatch(/^ADM /)
  })
})
