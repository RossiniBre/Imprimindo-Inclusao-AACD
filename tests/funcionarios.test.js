import { describe, it, expect } from 'vitest'
import {
  iniciais,
  filtrar,
  emailInstitucionalValido,
  campoDoErro,
} from '../public/pages/funcionarios/funcionarios.js'

const lista = [
  { id: 1, nome: 'Ana Martins',    identificador: 'ana.martins',    email: 'ana.martins@aacd.com',    perfil: 'ADMIN',       ativo: true },
  { id: 2, nome: 'Diego Ramos',    identificador: 'diego.ramos',    email: 'diego.ramos@aacd.com',    perfil: 'FUNCIONARIO', ativo: true },
  { id: 3, nome: 'Henrique Alves', identificador: 'henrique.alves', email: 'henrique.alves@aacd.com', perfil: 'FUNCIONARIO', ativo: false },
]

describe('tela funcionários', () => {
  it('monta as iniciais do avatar', () => {
    expect(iniciais('Ana Martins')).toBe('AM')
    expect(iniciais('Patrícia de Lima')).toBe('PL')
    expect(iniciais('Ana')).toBe('A')
    expect(iniciais('')).toBe('?')
  })

  it('filtra por status', () => {
    expect(filtrar(lista, '', 'todos')).toHaveLength(3)
    expect(filtrar(lista, '', 'ativo').map((f) => f.id)).toEqual([1, 2])
    expect(filtrar(lista, '', 'inativo').map((f) => f.id)).toEqual([3])
  })

  it('busca por nome, e-mail ou login sem diferenciar maiúsculas', () => {
    expect(filtrar(lista, 'DIEGO', 'todos').map((f) => f.id)).toEqual([2])
    expect(filtrar(lista, 'henrique.alves@', 'todos').map((f) => f.id)).toEqual([3])
    expect(filtrar(lista, 'ana.martins', 'inativo')).toHaveLength(0)
  })

  it('exige e-mail institucional @aacd.com', () => {
    expect(emailInstitucionalValido('camila.duarte@aacd.com')).toBe(true)
    expect(emailInstitucionalValido('Camila.Duarte@AACD.COM')).toBe(true)
    expect(emailInstitucionalValido('camila@gmail.com')).toBe(false)
    expect(emailInstitucionalValido('camila@aacd.org.br')).toBe(false)
    expect(emailInstitucionalValido('')).toBe(false)
  })

  it('encaixa a mensagem de erro do back no campo certo', () => {
    expect(campoDoErro('Login já em uso!')).toBe('identificador')
    expect(campoDoErro('E-mail já em uso!')).toBe('email')
    expect(campoDoErro('Senha não pode estar vazia')).toBe('senha')
    expect(campoDoErro('Erro interno.')).toBeNull()
  })
})
