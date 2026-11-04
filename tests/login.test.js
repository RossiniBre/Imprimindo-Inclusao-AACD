import { describe, it, expect } from 'vitest'
import { variante, destinoPorPerfil } from '../public/pages/login/login.js'

describe('tela de login', () => {
  it('mostra a variante da empresa por padrão', () => {
    expect(variante(new URLSearchParams(''))).toBe('empresa')
    expect(variante(undefined)).toBe('empresa')
  })

  it('mostra a variante da AACD com #/login', () => {
    expect(variante(new URLSearchParams('perfil=aacd'))).toBe('aacd')
  })

  it('manda cada perfil para a sua tela inicial', () => {
    expect(destinoPorPerfil('ADMIN')).toBe('#/funcionarios')
    expect(destinoPorPerfil('FUNCIONARIO')).toBe('#/painel-aacd')
    expect(destinoPorPerfil('EMPRESA')).toBe('#/painel-empresa')
    expect(destinoPorPerfil(undefined)).toBe('#/')
  })
})
