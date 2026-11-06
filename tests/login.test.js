import { describe, it, expect } from 'vitest'
import { variante, destinoPorPerfil } from '../public/pages/login/login.js'

describe('tela de login', () => {
  it('mostra a variante da empresa por padrão', () => {
    expect(variante(new URLSearchParams(''))).toBe('empresa')
    expect(variante(undefined)).toBe('empresa')
  })

  it('usa login único: mesmo com perfil=aacd na URL, mostra a variante da empresa', () => {
    expect(variante(new URLSearchParams('perfil=aacd'))).toBe('empresa')
  })

  it('manda cada perfil para a sua tela inicial', () => {
    expect(destinoPorPerfil('ADMIN')).toBe('#/painel-aacd')
    expect(destinoPorPerfil('FUNCIONARIO')).toBe('#/painel-aacd')
    expect(destinoPorPerfil('EMPRESA')).toBe('#/impressoras')
    expect(destinoPorPerfil(undefined)).toBe('#/')
  })
})