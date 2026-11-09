import { describe, it, expect } from 'vitest'
import {
  soDigitos,
  formatarCnpj,
  mascaraTelefone,
  mascaraCep,
  rotuloCadastro,
  validar,
} from '../public/pages/minha-conta-empresa/minha-conta-empresa.js'
import { estatisticas, recentes } from '../public/pages/minha-conta/minha-conta.js'

const valido = {
  responsavel: 'Carla Souza',
  email: 'contato@acme.com',
  telefone: '(11) 98765-4321',
  cep: '01310-100',
  uf: 'SP',
  cidade: 'São Paulo',
  bairro: 'Bela Vista',
  logradouro: 'Avenida Paulista',
  numero: '1000',
  complemento: '',
}

describe('minha conta (empresa): formatação', () => {
  it('deixa só os dígitos', () => {
    expect(soDigitos('(11) 98765-4321')).toBe('11987654321')
    expect(soDigitos('12.345.678/0001-95')).toBe('12345678000195')
    expect(soDigitos(null)).toBe('')
    expect(soDigitos(undefined)).toBe('')
  })

  it('formata o CNPJ quando tem 14 dígitos', () => {
    expect(formatarCnpj('12345678000195')).toBe('12.345.678/0001-95')
    expect(formatarCnpj('12.345.678/0001-95')).toBe('12.345.678/0001-95')
  })

  it('devolve o CNPJ como veio se estiver incompleto', () => {
    expect(formatarCnpj('123')).toBe('123')
    expect(formatarCnpj(null)).toBe('')
  })

  it('aplica a máscara de telefone fixo e celular', () => {
    expect(mascaraTelefone('')).toBe('')
    expect(mascaraTelefone('11')).toBe('11')
    expect(mascaraTelefone('119')).toBe('(11) 9')
    expect(mascaraTelefone('1133334444')).toBe('(11) 3333-4444')
    expect(mascaraTelefone('11987654321')).toBe('(11) 98765-4321')
  })

  it('ignora letras e dígitos a mais no telefone', () => {
    expect(mascaraTelefone('(11) 98765-4321 99')).toBe('(11) 98765-4321')
    expect(mascaraTelefone('ab11cd987654321')).toBe('(11) 98765-4321')
  })

  it('aplica a máscara de CEP', () => {
    expect(mascaraCep('01310')).toBe('01310')
    expect(mascaraCep('013101')).toBe('01310-1')
    expect(mascaraCep('01310100')).toBe('01310-100')
    expect(mascaraCep('ab01310100')).toBe('01310-100')
    expect(mascaraCep('')).toBe('')
  })
})

describe('minha conta (empresa): chip do cadastro', () => {
  it('traduz o status do cadastro', () => {
    expect(rotuloCadastro('APROVADA')).toEqual({ texto: 'Cadastro aprovado', classe: 'chip--sucesso' })
    expect(rotuloCadastro('ATIVA').classe).toBe('chip--sucesso')
    expect(rotuloCadastro('EM_ANALISE')).toEqual({ texto: 'Em análise', classe: 'chip--destaque' })
    expect(rotuloCadastro('PENDENTE').texto).toBe('Em análise')
    expect(rotuloCadastro('RECUSADA')).toEqual({ texto: 'Cadastro recusado', classe: 'chip--erro' })
  })

  it('usa um rótulo neutro quando o status é desconhecido ou falta', () => {
    expect(rotuloCadastro('X')).toEqual({ texto: 'Empresa parceira', classe: 'chip--neutro' })
    expect(rotuloCadastro(undefined).classe).toBe('chip--neutro')
  })
})

describe('minha conta (empresa): validação do formulário', () => {
  it('aceita os dados completos', () => {
    expect(validar(valido)).toEqual({})
  })

  it('o complemento é opcional', () => {
    expect(validar({ ...valido, complemento: '' })).toEqual({})
  })

  it('aceita telefone fixo (10 dígitos) e celular (11)', () => {
    expect(validar({ ...valido, telefone: '(11) 3333-4444' })).toEqual({})
    expect(validar({ ...valido, telefone: '(11) 98765-4321' })).toEqual({})
  })

  it('recusa telefone com dígitos a menos', () => {
    expect(validar({ ...valido, telefone: '(11) 9876-543' })).toHaveProperty('telefone')
    expect(validar({ ...valido, telefone: '' })).toHaveProperty('telefone')
  })

  it('recusa CEP incompleto', () => {
    expect(validar({ ...valido, cep: '01310-10' })).toHaveProperty('cep')
    expect(validar({ ...valido, cep: '' })).toHaveProperty('cep')
  })

    it('aponta cada campo obrigatório vazio', () => {
    const erros = validar({
      responsavel: '', email: '', telefone: '', cep: '', uf: 'SP',
      cidade: '', bairro: '', logradouro: '', numero: '', complemento: '',
    })
    expect(Object.keys(erros).sort()).toEqual([
      'bairro', 'cep', 'cidade', 'email', 'logradouro', 'numero', 'responsavel', 'telefone',
    ])
  })

  it('devolve só o campo com problema', () => {
    expect(Object.keys(validar({ ...valido, numero: '' }))).toEqual(['numero'])
  })
})

describe('minha conta (empresa): pedidos', () => {
  // a empresa recebe do back só os próprios pedidos, sem filtro por nome
  const pedidos = [
    { id: 10, titulo: 'Prótese de mão', status: 'EM_ANDAMENTO', criadoEm: '2026-10-15T09:00:00' },
    { id: 11, titulo: 'Órtese de punho', status: 'PENDENTE', criadoEm: '2026-10-20T09:00:00' },
    { id: 12, titulo: 'Prótese infantil', status: 'RECUSADA', criadoEm: '2026-10-01T09:00:00' },
    { id: 13, titulo: 'Órtese', status: 'CONCLUIDA', criadoEm: '2026-09-28T09:00:00' },
    { id: 14, titulo: 'Prótese', status: 'FALHOU', criadoEm: '2026-09-20T09:00:00' },
    { id: 15, titulo: 'Outra órtese', status: 'CANCELADA', criadoEm: '2026-09-10T09:00:00' },
  ]

  it('conta todos os pedidos da lista no resumo', () => {
    expect(estatisticas(pedidos)).toEqual({
      enviados: 6, imprimindo: 1, aguardando: 1, recusados: 2,
    })
  })

  it('mostra os 5 mais recentes na tabela', () => {
    expect(recentes(pedidos).map((p) => p.id)).toEqual([15, 14, 13, 12, 11])
  })

  it('funciona com a lista vazia', () => {
    expect(estatisticas([])).toEqual({ enviados: 0, imprimindo: 0, aguardando: 0, recusados: 0 })
    expect(recentes([])).toEqual([])
  })
})

  it('recusa e-mail inválido', () => {
    expect(validar({ ...valido, email: '' })).toHaveProperty('email')
    expect(validar({ ...valido, email: 'sem-arroba' })).toHaveProperty('email')
  })